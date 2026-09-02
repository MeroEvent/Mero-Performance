import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  calculateCheckInStatus, 
  calculateHoursWorked, 
  getNepalDateString, 
  getNepalTimeString 
} from '@/lib/utils/attendance';
import { isIpAllowed, isLoopbackIp, normalizeIpAddress } from '@/lib/utils/network';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// Calculate Haversine distance in meters between two GPS coordinates
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Extract client IP address from request headers
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return normalizeIpAddress(forwardedFor.split(',')[0]);
  }
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (realIp) {
    return normalizeIpAddress(realIp);
  }
  return '127.0.0.1';
}

function getEffectiveClientIp(req: NextRequest, browserPublicIp?: unknown): string {
  const requestIp = getClientIp(req);
  const normalizedBrowserIp = typeof browserPublicIp === 'string'
    ? normalizeIpAddress(browserPublicIp)
    : '';

  if (
    process.env.NODE_ENV !== 'production' &&
    isLoopbackIp(requestIp) &&
    normalizedBrowserIp &&
    !isLoopbackIp(normalizedBrowserIp)
  ) {
    return normalizedBrowserIp;
  }

  return requestIp;
}

// Automatic Auto-Checkout & Penalty Sweep
async function sweepAutoCheckoutSessions(supabase: any) {
  try {
    const now = new Date();
    const nepalTimeStr = getNepalTimeString(now);
    const [currH, currM] = nepalTimeStr.split(':').map(Number);
    const currentTotalMinutes = (currH || 0) * 60 + (currM || 0);

    const { data: companyRules } = await supabase
      .from('company_rules')
      .select('*')
      .limit(1)
      .maybeSingle();

    const rawAllowedIps: string[] = Array.isArray(companyRules?.allowed_ips) ? companyRules.allowed_ips : [];
    let autoCheckoutEnabled = companyRules?.auto_checkout_enabled !== false;
    let autoCheckoutBufferMinutes = companyRules?.auto_checkout_buffer_minutes ?? 30;
    let autoCheckoutPenaltyStatus = companyRules?.auto_checkout_penalty_status || 'absent';

    for (const entry of rawAllowedIps) {
      if (entry.startsWith('__POLICY__:auto_checkout_enabled=')) {
        autoCheckoutEnabled = entry.replace('__POLICY__:auto_checkout_enabled=', '') === 'true';
      }
      if (entry.startsWith('__POLICY__:auto_checkout_buffer_minutes=')) {
        const val = Number(entry.replace('__POLICY__:auto_checkout_buffer_minutes=', ''));
        if (!isNaN(val)) autoCheckoutBufferMinutes = val;
      }
      if (entry.startsWith('__POLICY__:auto_checkout_penalty_status=')) {
        autoCheckoutPenaltyStatus = entry.replace('__POLICY__:auto_checkout_penalty_status=', '') || 'absent';
      }
    }

    if (!autoCheckoutEnabled) return;

    // Find all open unclosed sessions
    const { data: openRecords } = await supabase
      .from('attendance_records')
      .select(`
        id,
        user_id,
        date,
        check_in_time,
        notes,
        user:user_profiles!attendance_records_user_id_fkey(
          id,
          name,
          shift:shifts(*)
        )
      `)
      .is('check_out_time', null);

    if (!openRecords || openRecords.length === 0) return;

    const todayStr = getNepalDateString(now);

    for (const record of openRecords) {
      const isFromPreviousDay = record.date !== todayStr;
      const assignedShift = (record as any).user?.shift;
      const shiftEndTime = assignedShift?.end_time?.slice(0, 5) || companyRules?.standard_end_time?.slice(0, 5) || '17:00';
      const [endH, endM] = shiftEndTime.split(':').map(Number);
      const shiftEndTotalMinutes = (endH || 17) * 60 + (endM || 0);
      const cutoffMinutes = shiftEndTotalMinutes + autoCheckoutBufferMinutes;

      // If session is from a previous day, or today's current time has passed shift_end + buffer:
      if (isFromPreviousDay || currentTotalMinutes >= cutoffMinutes) {
        const existingNotes = record.notes || '';
        const penaltyNote = `Auto-Checkout Penalty: Missed check-out deadline (Shift ended at ${shiftEndTime} + ${autoCheckoutBufferMinutes}m buffer). Marked as ${autoCheckoutPenaltyStatus}.`;
        const updatedNotes = existingNotes ? `${existingNotes} | ${penaltyNote}` : penaltyNote;

        await supabase
          .from('attendance_records')
          .update({
            check_out_time: now.toISOString(),
            status: autoCheckoutPenaltyStatus,
            total_hours: 0,
            notes: updatedNotes,
          })
          .eq('id', record.id);
      }
    }
  } catch (err) {
    console.error('Auto-checkout sweep error:', err);
  }
}

// 1. GET ATTENDANCE (SINGLE USER OR ALL EMPLOYEES FOR TODAY)
export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    // Run background auto-checkout sweep
    await sweepAutoCheckoutSessions(supabase);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const all = searchParams.get('all');
    const date = searchParams.get('date') || getNepalDateString();

    // If 'all=true' requested (e.g. for Admin dashboard to show all employee logs for today)
    if (all === 'true') {
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          user:user_profiles!attendance_records_user_id_fkey(
            id,
            name,
            email,
            avatar_url,
            position,
            department_id,
            department:departments(id, name)
          )
        `)
        .eq('date', date)
        .order('check_in_time', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ records: records || [] });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID or all=true is required' }, { status: 400 });
    }

    // 1. First check if user has an open active session (e.g. overnight shift from yesterday)
    const { data: openRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Otherwise get today's record and status metadata
    const [recordRes, holidayRes, leaveRes] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('holidays')
        .select('*')
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date)
        .maybeSingle(),
    ]);

    const [dYear, dMonth, dDay] = date.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(dYear, dMonth - 1, dDay)).getUTCDay();
    const isWeekend = dayOfWeek === 6;

    return NextResponse.json({ 
      record: openRecord || recordRes.data || null,
      holiday: holidayRes.data || null,
      isWeekend,
      approvedLeave: leaveRes.data || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch attendance' }, { status: 500 });
  }
}

// 2. POST (CHECK-IN)
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    // Run background auto-checkout sweep
    await sweepAutoCheckoutSessions(supabase);

    const body = await req.json();
    const { userId, lat, lng, deviceInfo, networkIp } = body;
    const now = new Date();
    const todayStr = getNepalDateString(now);
    const clientIp = getEffectiveClientIp(req, networkIp);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // A. Parallelize all initial database reads into 1 single round-trip (including Holiday & Leave checks)
    const [profileRes, rulesRes, locsRes, existingTodayRes, unclosedRes, holidayRes, leaveRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*, shift:shifts(*)')
        .eq('id', userId)
        .single(),
      supabase
        .from('company_rules')
        .select('*')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('office_locations')
        .select('*'),
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .is('check_out_time', null)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('holidays')
        .select('*')
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .maybeSingle(),
    ]);

    const userProfile = profileRes.data;
    if (profileRes.error || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // B. HOLIDAY, WEEKEND & APPROVED LEAVE GUARDS
    const todayHoliday = holidayRes.data;
    if (todayHoliday) {
      return NextResponse.json(
        {
          error: `Check-in Blocked: Today is an official public holiday (${todayHoliday.name}). Office is closed and attendance check-in is not permitted.`,
          isHolidayError: true,
          holidayName: todayHoliday.name,
        },
        { status: 403 }
      );
    }

    const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(tYear, tMonth - 1, tDay)).getUTCDay();
    const isSaturday = dayOfWeek === 6;
    if (isSaturday) {
      return NextResponse.json(
        {
          error: 'Check-in Blocked: Today is Saturday (Weekly Off). Office is closed and attendance check-in is not permitted.',
          isWeekendError: true,
        },
        { status: 403 }
      );
    }

    const approvedLeave = leaveRes.data;
    if (approvedLeave) {
      return NextResponse.json(
        {
          error: `Check-in Blocked: You have an approved ${approvedLeave.leave_type.toUpperCase()} leave scheduled for today. You are excused from office check-in.`,
          isLeaveError: true,
          leaveType: approvedLeave.leave_type,
        },
        { status: 403 }
      );
    }

    const companyRules = rulesRes.data;
    const officeLocations = locsRes.data || [];
    const assignedShift = userProfile.shift;
    const isFieldShift = assignedShift?.is_flexible || assignedShift?.allow_remote_checkin || false;

    // C. STRICT SINGLE CHECK-IN GUARD (One Check-In & One Check-Out Per Day)
    const existingRecord = existingTodayRes.data;
    if (existingRecord) {
      if (existingRecord.check_in_time && existingRecord.check_out_time) {
        return NextResponse.json(
          { 
            error: 'You have already completed your attendance for today. Multiple check-ins are not permitted.',
            isAlreadyCompleted: true 
          }, 
          { status: 400 }
        );
      }
      if (existingRecord.check_in_time && !existingRecord.check_out_time) {
        return NextResponse.json(
          { 
            error: 'You are already checked in for today.',
            isAlreadyCheckedIn: true 
          }, 
          { status: 400 }
        );
      }
    }

    // Also check for any unclosed session from yesterday
    const unclosedYesterday = unclosedRes.data;
    if (unclosedYesterday) {
      return NextResponse.json(
        { 
          error: 'You have an active open check-in session. Please check out first.',
          isAlreadyCheckedIn: true 
        }, 
        { status: 400 }
      );
    }

    // C2. ANTI-PROXY / BUDDY PUNCHING DEVICE & HARDWARE GUARD
    // Prevent an employee from using the same physical computer or phone to check in for multiple absent coworkers today
    const { deviceId, hardwareId } = body;
    
    // Extract hardwareId and deviceId from payload or deviceInfo string
    let clientHwId: string | null = hardwareId || null;
    let clientDevId: string | null = deviceId || null;
    
    if (typeof deviceInfo === 'string') {
      const tokens = deviceInfo.split('|');
      for (const token of tokens) {
        if (token.startsWith('hw_') && !clientHwId) clientHwId = token;
        if (token.startsWith('dev_') && !clientDevId) clientDevId = token;
      }
    }

    // Check if Single Device Policy is enabled in Company Rules (stored in Supabase DB)
    const rawAllowedIps: string[] = Array.isArray(companyRules?.allowed_ips) ? companyRules.allowed_ips : [];
    const isSingleDevicePolicyActive = !rawAllowedIps.includes('__CONFIG__:ALLOW_SHARED_DEVICE');

    // Check if either hardwareId (same physical laptop/phone) or deviceId has already checked in for another employee today
    if (isSingleDevicePolicyActive && (clientHwId || clientDevId)) {
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          user_id,
          user:user_profiles!attendance_records_user_id_fkey(name, email)
        `)
        .eq('date', todayStr)
        .neq('user_id', userId);

      const conditions: string[] = [];
      if (clientHwId && clientHwId.startsWith('hw_')) {
        conditions.push(`device_info.ilike.%${clientHwId}%`);
      }
      if (clientDevId && clientDevId.startsWith('dev_')) {
        conditions.push(`device_info.ilike.%${clientDevId}%`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
        const { data: duplicateDeviceRecord } = await query.limit(1).maybeSingle();

        if (duplicateDeviceRecord) {
          const checkedInUserName = (duplicateDeviceRecord as any).user?.name || 'another employee';
          return NextResponse.json(
            {
              error: `Proxy Check-in Blocked: This physical computer/device was already used today to check in for ${checkedInUserName}. Opening a different browser or incognito tab on the same laptop is not permitted to prevent buddy punching. Each employee must check in using their own personal device.`,
              isDeviceProxyError: true,
              proxyUser: checkedInUserName,
            },
            { status: 403 }
          );
        }
      }
    }

    // C3. EARLY CHECK-IN WINDOW GUARD
    // Prevent checking in before the configured allowed early window opens
    if (!isFieldShift && !assignedShift?.is_flexible) {
      let earlyCheckInWindowMinutes = 15;
      if (Array.isArray(companyRules?.allowed_ips)) {
        for (const entry of companyRules.allowed_ips) {
          if (entry.startsWith('__POLICY__:early_checkin_window_minutes=')) {
            const val = Number(entry.replace('__POLICY__:early_checkin_window_minutes=', ''));
            if (!isNaN(val)) earlyCheckInWindowMinutes = val;
          }
        }
      }

      const shiftStartTime = assignedShift?.start_time?.slice(0, 5) || companyRules?.standard_start_time?.slice(0, 5) || '10:00';
      const [targetHour, targetMinute] = shiftStartTime.split(':').map(Number);
      const shiftStartTotalMinutes = (targetHour || 10) * 60 + (targetMinute || 0);
      const earliestAllowedMinutes = shiftStartTotalMinutes - earlyCheckInWindowMinutes;

      const nepalTimeStr = getNepalTimeString(now);
      const [actualHour, actualMinute] = nepalTimeStr.split(':').map(Number);
      const actualTotalMinutes = (actualHour || 0) * 60 + (actualMinute || 0);

      if (actualTotalMinutes < earliestAllowedMinutes) {
        const allowedHour = Math.floor((earliestAllowedMinutes + 1440) % 1440 / 60);
        const allowedMin = (earliestAllowedMinutes + 1440) % 60;
        const allowedTimeFormatted = `${String(allowedHour).padStart(2, '0')}:${String(allowedMin).padStart(2, '0')}`;
        const currentTimeFormatted = `${String(actualHour).padStart(2, '0')}:${String(actualMinute).padStart(2, '0')}`;

        return NextResponse.json(
          {
            error: `Early Check-In Not Permitted: Your shift starts at ${shiftStartTime}. Check-in opens ${earlyCheckInWindowMinutes} minutes before shift (at ${allowedTimeFormatted}). Current time: ${currentTimeFormatted}.`,
            isTooEarly: true,
            shiftStartTime,
            allowedFromTime: allowedTimeFormatted,
            earlyWindowMinutes: earlyCheckInWindowMinutes,
          },
          { status: 403 }
        );
      }
    }

    // D. Verify Location / GPS
    let isLocationVerified = true;
    let locationNote = '';

    if (!isFieldShift && companyRules?.gps_enabled) {
      // If GPS is enabled but user provided no coordinates
      if (lat === undefined || lng === undefined || lat === null || lng === null) {
        if (companyRules.gps_enforcement === 'block') {
          return NextResponse.json(
            {
              error: `Location Permission Required: Your shift (${assignedShift?.display_name || 'Standard'}) requires office GPS verification. Please allow location access in your browser.`,
              isLocationError: true,
            },
            { status: 403 }
          );
        } else {
          isLocationVerified = false;
          locationNote = 'GPS coordinates not provided';
        }
      } else {
        // Find closest office location
        let minDistance = Infinity;
        if (officeLocations && officeLocations.length > 0) {
          for (const loc of officeLocations) {
            const d = calculateDistanceMeters(lat, lng, Number(loc.latitude), Number(loc.longitude));
            if (d < minDistance) minDistance = d;
          }
        } else {
          // Default office location: Kathmandu
          minDistance = calculateDistanceMeters(lat, lng, 27.7172453, 85.3239605);
        }

        const allowedRadius = companyRules.gps_radius_meters || 200;

        if (minDistance > allowedRadius) {
          if (companyRules.gps_enforcement === 'block') {
            return NextResponse.json(
              {
                error: `Check-in Blocked: You are ${minDistance}m away from the office building (allowed: ${allowedRadius}m). Your shift requires checking in from the office.`,
                isLocationError: true,
              },
              { status: 403 }
            );
          } else {
            isLocationVerified = false;
            locationNote = `Out of office radius (${minDistance}m away)`;
          }
        }
      }
    }

    // E. Verify WiFi / IP Restriction
    let isIpVerified = true;
    let ipNote = '';

    if (!isFieldShift && companyRules?.ip_restriction_enabled) {
      const allowedIps: string[] = Array.isArray(companyRules.allowed_ips) ? companyRules.allowed_ips : [];

      if (allowedIps.length === 0) {
        isIpVerified = false;
        ipNote = `No authorized office network configured (current IP ${clientIp})`;

        if (companyRules.ip_enforcement === 'block') {
          return NextResponse.json(
            {
              error: 'Check-in Blocked: Office WiFi restriction is active, but no office network has been authorized yet. Ask an admin to allow the current office network from Admin Settings.',
              isIpError: true,
            },
            { status: 403 }
          );
        }
      } else if (!isIpAllowed(clientIp, allowedIps)) {
        if (companyRules.ip_enforcement === 'block') {
          return NextResponse.json(
            {
              error: `Check-in Blocked: You are connected to an unauthorized network (IP: ${clientIp}). Your shift requires connecting to the official office WiFi network.`,
              isIpError: true,
            },
            { status: 403 }
          );
        } else {
          isIpVerified = false;
          ipNote = `Unverified network IP (${clientIp})`;
        }
      }
    }

    // F. Calculate Check-In Arrival Status (Punctuality)
    const shiftStartTime = assignedShift?.start_time?.slice(0, 5) || companyRules?.standard_start_time?.slice(0, 5) || '09:00';
    const graceMins = assignedShift?.grace_period_minutes || companyRules?.grace_period_minutes || 15;
    const lateMins = assignedShift?.late_threshold_minutes || companyRules?.late_threshold_minutes || 30;

    const status = calculateCheckInStatus(now, shiftStartTime, graceMins, lateMins, isFieldShift);

    // G. Assemble Note
    const combinedNotes = [
      isFieldShift ? 'Field / Remote Check-In' : 'Office Check-In',
      locationNote,
      ipNote
    ].filter(Boolean).join(' | ');

    // H. Insert / Save Record in Supabase
    const formattedDeviceRecord = typeof deviceInfo === 'string'
      ? (clientDevId && !deviceInfo.includes(clientDevId) ? `[${clientDevId}] ${deviceInfo}` : deviceInfo)
      : clientDevId ? `[${clientDevId}] Web Client` : 'Web Browser';

    const payload: any = {
      user_id: userId,
      company_id: userProfile.company_id || 'c0000000-0000-0000-0000-000000000001',
      date: todayStr,
      check_in_time: now.toISOString(),
      check_out_time: null,
      total_hours: 0,
      status,
      device_info: formattedDeviceRecord,
      ip_address: clientIp,
      location_lat: lat || null,
      location_lng: lng || null,
      location_verified: isLocationVerified,
      ip_verified: isIpVerified,
      notes: combinedNotes,
    };

    const { data: inserted, error: insErr } = await supabase
      .from('attendance_records')
      .insert(payload)
      .select()
      .single();

    if (insErr) {
      // If unique violation occurred (concurrent check-in)
      if (insErr.code === '23505') {
        return NextResponse.json({ error: 'You have already checked in today.' }, { status: 400 });
      }
      throw insErr;
    }

    return NextResponse.json({
      success: true,
      record: inserted,
      isFieldShift,
      isLocationVerified,
      isIpVerified,
      clientIp,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message || 'Failed to check in' }, { status: 500 });
  }
}

// 3. PUT (CHECK-OUT)
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { userId, networkIp } = body;
    const now = new Date();
    const clientIp = getEffectiveClientIp(req, networkIp);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the most recent OPEN check-in session, user profile, and company rules in 1 round-trip
    const [recordRes, profileRes, rulesRes] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('*, shift:shifts(*)')
        .eq('id', userId)
        .single(),
      supabase
        .from('company_rules')
        .select('*')
        .limit(1)
        .maybeSingle(),
    ]);

    const record = recordRes.data;
    if (!record || !record.check_in_time) {
      return NextResponse.json({ error: 'No active check-in session found. Please check in first.' }, { status: 404 });
    }

    const userProfile = profileRes.data;
    const companyRules = rulesRes.data;
    const assignedShift = userProfile?.shift;
    const isFieldShift = assignedShift?.is_flexible || assignedShift?.allow_remote_checkin || false;
    let isCheckoutIpVerified = true;
    let checkoutIpNote = '';

    if (!isFieldShift && companyRules?.ip_restriction_enabled) {
      const allowedIps: string[] = Array.isArray(companyRules.allowed_ips) ? companyRules.allowed_ips : [];

      if (allowedIps.length === 0) {
        isCheckoutIpVerified = false;
        checkoutIpNote = `Check-out blocked: no authorized office network configured (current IP ${clientIp})`;

        if (companyRules.ip_enforcement === 'block') {
          return NextResponse.json(
            {
              error: 'Connect to an allowed office WiFi network before checking out. Office WiFi restriction is active, but no office network has been authorized yet.',
              isIpError: true,
              clientIp,
            },
            { status: 403 }
          );
        }
      } else if (!isIpAllowed(clientIp, allowedIps)) {
        isCheckoutIpVerified = false;
        checkoutIpNote = `Check-out from unverified network IP (${clientIp})`;

        if (companyRules.ip_enforcement === 'block') {
          return NextResponse.json(
            {
              error: `Connect to an allowed office WiFi network before checking out. Current network IP ${clientIp} is not authorized.`,
              isIpError: true,
              clientIp,
            },
            { status: 403 }
          );
        }
      }
    }

    const totalHours = calculateHoursWorked(record.check_in_time, now);

    // Calculate shift duration automatically from shift start_time and end_time
    let shiftDurationHours = 8.0;
    if (assignedShift?.start_time && assignedShift?.end_time) {
      const [sh, sm] = assignedShift.start_time.slice(0, 5).split(':').map(Number);
      const [eh, em] = assignedShift.end_time.slice(0, 5).split(':').map(Number);
      let diffMinutes = ((eh || 17) * 60 + (em || 0)) - ((sh || 9) * 60 + (sm || 0));
      if (diffMinutes < 0) diffMinutes += 1440;
      shiftDurationHours = Number((diffMinutes / 60).toFixed(2));
    } else if (companyRules?.standard_start_time && companyRules?.standard_end_time) {
      const [sh, sm] = companyRules.standard_start_time.slice(0, 5).split(':').map(Number);
      const [eh, em] = companyRules.standard_end_time.slice(0, 5).split(':').map(Number);
      let diffMinutes = ((eh || 17) * 60 + (em || 0)) - ((sh || 9) * 60 + (sm || 0));
      if (diffMinutes < 0) diffMinutes += 1440;
      shiftDurationHours = Number((diffMinutes / 60).toFixed(2));
    }

    const halfDayThreshold = Number((shiftDurationHours / 2).toFixed(2));
    const fullDayThreshold = Number((shiftDurationHours * 0.9).toFixed(2)); // allow 10% tolerance for full day

    // If total hours is below half-day threshold, mark as ABSENT
    let finalStatus = record.status;
    let departureNote = '';

    if (totalHours < halfDayThreshold) {
      finalStatus = 'absent';
      departureNote = `Early Departure: Left before half-day threshold (${totalHours.toFixed(2)}h worked, needed at least ${halfDayThreshold}h). Marked as Absent.`;
    } else if (totalHours < fullDayThreshold) {
      finalStatus = 'half_day';
      departureNote = `Partial Shift: Completed ${totalHours.toFixed(2)}h of ${shiftDurationHours}h shift. Credited as Half Day.`;
    }

    const combinedNotes = [
      record.notes,
      departureNote,
      checkoutIpNote
    ].filter(Boolean).join(' | ');

    const { data: updated, error: updErr } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: now.toISOString(),
        total_hours: totalHours,
        status: finalStatus,
        ip_verified: record.ip_verified === false ? false : isCheckoutIpVerified,
        notes: [record.notes, checkoutIpNote].filter(Boolean).join(' | ') || null,
        updated_at: now.toISOString(),
      })
      .eq('id', record.id)
      .select()
      .single();

    if (updErr) throw updErr;

    const workdayCredit = finalStatus === 'present' || finalStatus === 'late' ? 1.0 : finalStatus === 'half_day' ? 0.5 : 0.0;

    return NextResponse.json({
      success: true,
      record: updated,
      totalHours,
      workdayCredit,
    });

  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message || 'Failed to check out' }, { status: 500 });
  }
}

// 4. PATCH (ADMIN MANUAL ATTENDANCE OVERRIDE / ADJUSTMENT)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { 
      recordId, 
      status, 
      checkInTime, 
      checkOutTime, 
      totalHours, 
      reason, 
      editorId, 
      editorName 
    } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'A mandatory reason is required for attendance adjustments.' }, { status: 400 });
    }

    // Fetch existing record before adjustment
    const { data: existing, error: fetchErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Update attendance record in Supabase
    const { data: updated, error: updErr } = await supabase
      .from('attendance_records')
      .update({
        status,
        check_in_time: checkInTime || existing.check_in_time,
        check_out_time: checkOutTime !== undefined ? checkOutTime : existing.check_out_time,
        total_hours: totalHours !== undefined ? totalHours : existing.total_hours,
        edited_by: editorId || null,
        edit_reason: reason.trim(),
        updated_at: now,
      })
      .eq('id', recordId)
      .select()
      .single();

    if (updErr) {
      throw updErr;
    }

    // 2. Insert audit log record in Supabase
    try {
      await supabase.from('audit_logs').insert({
        company_id: existing.company_id || 'c0000000-0000-0000-0000-000000000001',
        entity_type: 'attendance',
        entity_id: recordId,
        action: 'override',
        changed_by: editorId,
        old_value: {
          status: existing.status,
          total_hours: existing.total_hours,
          check_in_time: existing.check_in_time,
          check_out_time: existing.check_out_time,
        },
        new_value: {
          status,
          total_hours: totalHours,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          reason: reason.trim(),
        },
        reason: reason.trim(),
        created_at: now,
      });
    } catch (auditErr) {
      console.warn('Non-fatal: Failed to write audit log to Supabase:', auditErr);
    }

    return NextResponse.json({
      success: true,
      record: updated,
    });
  } catch (err: any) {
    console.error('Attendance adjustment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to adjust attendance' }, { status: 500 });
  }
}

// 5. DELETE (DEV TESTING: Clear today's attendance record so admin/employee can test check-in again)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const all = searchParams.get('all');
    const date = searchParams.get('date') || getNepalDateString();

    if (all === 'true') {
      // Clear all attendance records for today
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('date', date);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: `All attendance records for ${date} cleared` });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID or all=true is required' }, { status: 400 });
    }

    // Delete attendance record for this user today
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: `Attendance for user cleared for ${date}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear attendance' }, { status: 500 });
  }
}
