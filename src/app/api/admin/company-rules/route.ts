import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isLoopbackIp, normalizeIpAddress } from '@/lib/utils/network';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const DEFAULT_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

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

// 1. GET COMPANY RULES
export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const currentIp = getClientIp(req);

    let { data, error } = await supabase
      .from('company_rules')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no row exists yet, initialize a default row
    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('company_rules')
        .insert({
          company_id: DEFAULT_COMPANY_ID,
          standard_start_time: '09:00:00',
          standard_end_time: '18:00:00',
          standard_daily_hours: 8,
          grace_period_minutes: 15,
          late_threshold_minutes: 30,
          very_late_threshold_minutes: 60,
          minimum_hours_full_day: 7,
          minimum_hours_half_day: 4,
          work_days: [1, 2, 3, 4, 5],
          very_late_to_absent_count: 4,
          tardiness_reset_cycle: 'monthly',
          gps_enabled: false,
          gps_radius_meters: 200,
          gps_enforcement: 'warn',
          ip_restriction_enabled: false,
          allowed_ips: [],
          ip_enforcement: 'warn',
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      data = inserted;
    }

    const rawAllowedIps: string[] = Array.isArray(data?.allowed_ips) ? data.allowed_ips : [];
    const singleDevicePolicyEnabled = !rawAllowedIps.includes('__CONFIG__:ALLOW_SHARED_DEVICE');
    const cleanAllowedIps = rawAllowedIps.filter((ip: string) => !ip.startsWith('__CONFIG__:') && !ip.startsWith('__POLICY__:'));

    // Parse extended policy settings from database
    const policyMap: Record<string, any> = {
      early_checkin_window_minutes: 15,
      auto_checkout_enabled: true,
      auto_checkout_buffer_minutes: 30,
      auto_checkout_penalty_status: 'absent',
      casual_leave_quota: 10,
      sick_leave_quota: 12,
      annual_leave_quota: 15,
      maternity_leave_quota: 60,
      comp_off_quota: 5,
      max_carry_over_days: 5,
      standard_working_days_per_month: 26,
      overtime_multiplier: 1.5,
      unexcused_absence_deduction_rate: 1.0,
      late_deduction_rate: 0.5,
    };

    for (const entry of rawAllowedIps) {
      if (entry.startsWith('__POLICY__:')) {
        const [k, v] = entry.replace('__POLICY__:', '').split('=');
        if (k && v !== undefined) {
          if (v === 'true') policyMap[k] = true;
          else if (v === 'false') policyMap[k] = false;
          else policyMap[k] = isNaN(Number(v)) ? v : Number(v);
        }
      }
    }

    return NextResponse.json({
      rules: {
        ...data,
        ...policyMap,
        allowed_ips: cleanAllowedIps,
        single_device_policy_enabled: singleDevicePolicyEnabled,
      },
      currentIp,
      currentIpIsLocal: isLoopbackIp(currentIp),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch company rules' }, { status: 500 });
  }
}

// 2. UPDATE COMPANY RULES
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const rawAllowedIps = Array.isArray(body.allowed_ips)
      ? body.allowed_ips
      : typeof body.allowed_ips === 'string'
      ? body.allowed_ips.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    let allowedIps = Array.from(new Set(
      rawAllowedIps
        .map((ip: string) => normalizeIpAddress(ip))
        .filter((ip: string) => ip && !isLoopbackIp(ip) && !ip.startsWith('__CONFIG__:') && !ip.startsWith('__POLICY__:'))
    ));

    // Store single_device_policy_enabled flag in Supabase DB
    if (body.single_device_policy_enabled === false) {
      allowedIps.push('__CONFIG__:ALLOW_SHARED_DEVICE');
    }

    // Persist extended leave, payroll, auto-checkout and early check-in window policies in Supabase DB
    const extendedPolicies: Record<string, any> = {
      early_checkin_window_minutes: Number(body.early_checkin_window_minutes ?? 15),
      auto_checkout_enabled: body.auto_checkout_enabled !== false,
      auto_checkout_buffer_minutes: Number(body.auto_checkout_buffer_minutes ?? 30),
      auto_checkout_penalty_status: String(body.auto_checkout_penalty_status || 'absent'),
      casual_leave_quota: Number(body.casual_leave_quota ?? 10),
      sick_leave_quota: Number(body.sick_leave_quota ?? 12),
      annual_leave_quota: Number(body.annual_leave_quota ?? 15),
      maternity_leave_quota: Number(body.maternity_leave_quota ?? 60),
      comp_off_quota: Number(body.comp_off_quota ?? 5),
      max_carry_over_days: Number(body.max_carry_over_days ?? 5),
      standard_working_days_per_month: Number(body.standard_working_days_per_month ?? 26),
      overtime_multiplier: Number(body.overtime_multiplier ?? 1.5),
      unexcused_absence_deduction_rate: Number(body.unexcused_absence_deduction_rate ?? 1.0),
      late_deduction_rate: Number(body.late_deduction_rate ?? 0.5),
    };

    for (const [k, v] of Object.entries(extendedPolicies)) {
      allowedIps.push(`__POLICY__:${k}=${v}`);
    }

    const payload: any = {
      standard_start_time: body.standard_start_time || '09:00:00',
      standard_end_time: body.standard_end_time || '18:00:00',
      standard_daily_hours: Number(body.standard_daily_hours) || 8,
      grace_period_minutes: Number(body.grace_period_minutes) || 15,
      late_threshold_minutes: Number(body.late_threshold_minutes) || 30,
      very_late_threshold_minutes: Number(body.very_late_threshold_minutes) || 60,
      minimum_hours_full_day: Number(body.minimum_hours_full_day) || 7,
      minimum_hours_half_day: Number(body.minimum_hours_half_day) || 4,
      work_days: Array.isArray(body.work_days) ? body.work_days : [1, 2, 3, 4, 5],
      very_late_to_absent_count: Number(body.very_late_to_absent_count) || 4,
      tardiness_reset_cycle: body.tardiness_reset_cycle || 'monthly',
      gps_enabled: Boolean(body.gps_enabled),
      gps_radius_meters: Number(body.gps_radius_meters) || 200,
      gps_enforcement: body.gps_enforcement || 'warn',
      ip_restriction_enabled: Boolean(body.ip_restriction_enabled),
      allowed_ips: allowedIps,
      ip_enforcement: body.ip_enforcement || 'warn',
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('company_rules')
      .update(payload)
      .eq('company_id', body.company_id || DEFAULT_COMPANY_ID)
      .select()
      .single();

    if (error) {
      // If updating by company_id failed, try updating the first row by id
      if (body.id) {
        const res = await supabase
          .from('company_rules')
          .update(payload)
          .eq('id', body.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resRawAllowedIps: string[] = Array.isArray(data?.allowed_ips) ? data.allowed_ips : [];
    const resSingleDevicePolicyEnabled = !resRawAllowedIps.includes('__CONFIG__:ALLOW_SHARED_DEVICE');
    const resCleanAllowedIps = resRawAllowedIps.filter((ip: string) => !ip.startsWith('__CONFIG__:') && !ip.startsWith('__POLICY__:'));

    return NextResponse.json({
      success: true,
      rules: {
        ...data,
        ...extendedPolicies,
        allowed_ips: resCleanAllowedIps,
        single_device_policy_enabled: resSingleDevicePolicyEnabled,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update company rules' }, { status: 500 });
  }
}

// 3. POST (Quick Authorize an IP or Subnet)
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { addIp } = body;

    if (!addIp) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    const normalized = normalizeIpAddress(addIp);
    if (!normalized || isLoopbackIp(normalized)) {
      return NextResponse.json({ error: 'Invalid or local IP address' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('company_rules')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Company rules not found' }, { status: 404 });
    }

    const currentIps: string[] = Array.isArray(existing.allowed_ips) ? existing.allowed_ips : [];
    if (!currentIps.includes(normalized)) {
      currentIps.push(normalized);
    }

    const { data: updated, error } = await supabase
      .from('company_rules')
      .update({
        allowed_ips: currentIps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, rules: updated, addedIp: normalized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to authorize IP' }, { status: 500 });
  }
}
