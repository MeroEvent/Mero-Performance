import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LeaveTypeConfig, LeaveBalance } from '@/types';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: 'lt-1', type: 'sick', label: 'Sick Leave (SL)', description: 'Medical and health leave', annual_quota: 12, is_active: true, color: 'rose' },
  { id: 'lt-2', type: 'vacation', label: 'Home / Annual Leave', description: 'Annual paid leave', annual_quota: 14, is_active: true, color: 'blue' },
  { id: 'lt-3', type: 'mourning', label: 'Mourning / Kiriya Leave', description: 'Bereavement leave', annual_quota: 13, is_active: true, color: 'purple' },
  { id: 'lt-4', type: 'comp_off', label: 'Compensatory Off (Comp-Off)', description: 'Compensatory time off', annual_quota: 5, is_active: true, color: 'teal' },
];

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    // 1. Fetch user profile to verify existence and join date
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, name, email, join_date, created_at, role, company_id')
      .eq('id', userId)
      .single();

    // 2. Fetch company rules to get active admin-configured quotas
    const { data: rulesData } = await supabase
      .from('company_rules')
      .select('*')
      .limit(1)
      .maybeSingle();

    const rawIps: string[] = Array.isArray(rulesData?.allowed_ips) ? rulesData.allowed_ips : [];
    const policyMap: Record<string, any> = {
      sick_leave_quota: 12,
      home_leave_accrual_days: 1,
      mourning_leave_quota: 13,
      comp_off_quota: 5,
      max_carry_over_days: 90,
      casual_leave_quota: 10,
    };

    for (const entry of rawIps) {
      if (entry.startsWith('__POLICY__:')) {
        const [k, v] = entry.replace('__POLICY__:', '').split('=');
        if (k && v !== undefined) {
          policyMap[k] = isNaN(Number(v)) ? v : Number(v);
        }
      }
    }

    // 3. Pro-rata calculation for Sick Leave based on employee join date
    const userJoinDateStr = userProfile?.join_date || userProfile?.created_at?.split('T')[0] || `${currentYear}-01-01`;
    let userSickQuota = Number(policyMap.sick_leave_quota ?? 12);
    if (userJoinDateStr) {
      const joinYear = new Date(userJoinDateStr).getFullYear();
      if (joinYear === currentYear) {
        const joinMonth = new Date(userJoinDateStr).getMonth();
        const monthsRemaining = Math.max(1, 12 - joinMonth);
        userSickQuota = Math.max(1, Math.round((Number(policyMap.sick_leave_quota ?? 12) * monthsRemaining) / 12));
      }
    }

    // 4. Calculate actual worked days for Home / Annual Leave (Section 41: 1 day per 20 days worked)
    const { count: workedDaysCount } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`)
      .not('check_in_time', 'is', null)
      .neq('status', 'absent');

    const workedDays = workedDaysCount || 0;
    // Earned home leave based on real attendance (minimum 1 day baseline or earned)
    const earnedHomeDays = Math.max(1, Math.floor(workedDays / 20));

    // 5. Fetch user's approved leaves in current year to compute real used days
    const { data: approvedLeaves } = await supabase
      .from('leave_requests')
      .select('leave_type, total_days')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('start_date', `${currentYear}-01-01`)
      .lte('start_date', `${currentYear}-12-31`);

    const usedMap: Record<string, number> = {};
    (approvedLeaves || []).forEach((l: any) => {
      usedMap[l.leave_type] = (usedMap[l.leave_type] || 0) + (Number(l.total_days) || 1);
    });

    // 6. Build dynamic leave types for this user (exact 4 active quota categories)
    const dynamicLeaveTypes: LeaveTypeConfig[] = [
      {
        id: 'lt-sick',
        type: 'sick',
        label: 'Sick Leave (SL)',
        description: 'Medical and health leave',
        annual_quota: userSickQuota,
        is_active: true,
        color: 'rose',
      },
      {
        id: 'lt-vacation',
        type: 'vacation',
        label: 'Home / Annual Leave',
        description: 'Annual paid leave',
        annual_quota: earnedHomeDays,
        is_active: true,
        color: 'blue',
      },
      {
        id: 'lt-mourning',
        type: 'mourning',
        label: 'Mourning / Kiriya Leave',
        description: 'Bereavement leave',
        annual_quota: Number(policyMap.mourning_leave_quota ?? 13),
        is_active: true,
        color: 'purple',
      },
      {
        id: 'lt-compoff',
        type: 'comp_off',
        label: 'Compensatory Off (Comp-Off)',
        description: 'Compensatory time off',
        annual_quota: Number(policyMap.comp_off_quota ?? 5),
        is_active: true,
        color: 'teal',
      },
    ];

    // 7. Calculate and sync dynamic balances
    const calculatedBalances: LeaveBalance[] = dynamicLeaveTypes.map((lt) => {
      const used = usedMap[lt.type] || 0;
      const remaining = lt.type === 'unpaid' ? 99 : Math.max(0, lt.annual_quota - used);
      return {
        user_id: userId,
        leave_type: lt.type,
        total_quota: lt.annual_quota,
        used,
        remaining,
        year: currentYear,
      };
    });

    try {
      await supabase.from('leave_balances').upsert(calculatedBalances, {
        onConflict: 'user_id,leave_type,year',
      });
    } catch {
      // Non-fatal
    }

    // 8. Fetch user's leave requests
    const { data: requests, error: reqErr } = await supabase
      .from('leave_requests')
      .select(`
        *,
        reviewer:user_profiles!leave_requests_reviewer_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const formattedRequests = (requests || []).map((r: any) => ({
      ...r,
      reviewer_name: r.reviewer?.name || (r.reviewed_at ? 'System Admin' : undefined),
    }));

    return NextResponse.json({
      leaveTypes: dynamicLeaveTypes,
      balances: calculatedBalances,
      requests: formattedRequests,
      workedDays,
    });
  } catch (err: any) {
    console.error('Leave API GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch leave data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { userId, leaveType, startDate, endDate, totalDays, reason } = body;

    if (!userId || !leaveType || !startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ error: 'All fields (type, start date, end date, reason) are mandatory' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
    }

    const calculatedDays = Number(totalDays) > 0 ? Number(totalDays) : 1;
    const currentYear = new Date(startDate).getFullYear();

    // 1. Check for overlapping existing active leave requests
    const { data: existingLeaves } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

    if (existingLeaves && existingLeaves.length > 0) {
      return NextResponse.json({
        error: `You already have a ${existingLeaves[0].status} leave request covering this date period (${existingLeaves[0].start_date} to ${existingLeaves[0].end_date}).`,
      }, { status: 400 });
    }

    // 2. Check remaining balance quota
    if (leaveType !== 'unpaid') {
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('leave_type', leaveType)
        .eq('year', currentYear)
        .single();

      if (balance && balance.remaining < calculatedDays) {
        return NextResponse.json({
          error: `Insufficient leave balance. You requested ${calculatedDays} day(s) but have only ${balance.remaining} day(s) remaining for ${leaveType.toUpperCase()}.`,
        }, { status: 400 });
      }
    }

    // 3. Insert leave request in Supabase
    const { data: newRequest, error: insertErr } = await supabase
      .from('leave_requests')
      .insert({
        user_id: userId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: calculatedDays,
        reason: reason.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      throw insertErr;
    }

    // 4. Send Email Notification to Admins & Managers asynchronously (non-blocking)
    (async () => {
      try {
        const [empRes, adminRes, balRes] = await Promise.all([
          supabase
            .from('user_profiles')
            .select(`
              id,
              name,
              email,
              position,
              department_id,
              department:departments (id, name)
            `)
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('email')
            .in('role', ['admin', 'manager'])
            .neq('is_active', false),
          supabase
            .from('leave_balances')
            .select('remaining, total_quota')
            .eq('user_id', userId)
            .eq('leave_type', leaveType)
            .eq('year', currentYear)
            .maybeSingle(),
        ]);

        const emp = empRes.data;
        const deptName = Array.isArray(emp?.department)
          ? (emp?.department[0] as any)?.name || 'General'
          : (emp?.department as any)?.name || 'General';

        const adminEmails = (adminRes.data || [])
          .map((a: any) => a.email)
          .filter((em: string) => Boolean(em) && em.includes('@'));

        if (emp && adminEmails.length > 0) {
          const { sendLeaveRequestToAdmins } = await import('@/lib/services/email');
          await sendLeaveRequestToAdmins({
            leaveRequestId: newRequest.id,
            employeeName: emp.name || 'Staff Member',
            employeeEmail: emp.email,
            departmentName: deptName,
            position: emp.position || undefined,
            leaveType,
            startDate,
            endDate,
            totalDays: calculatedDays,
            reason: reason.trim(),
            remainingQuota: balRes.data?.remaining,
            totalQuota: balRes.data?.total_quota,
            adminEmails,
          });
        }
      } catch (mailErr) {
        console.error('Error dispatching leave email notification to admins:', mailErr);
      }
    })();

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: 'Leave application submitted successfully. Awaiting manager approval.',
    });
  } catch (err: any) {
    console.error('Leave API POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit leave request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ error: 'Request ID and User ID are required' }, { status: 400 });
    }

    // Only allow cancelling pending requests
    const { data: request, error: findErr } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findErr || !request) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending leave requests can be cancelled.' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      message: 'Leave request cancelled successfully.',
    });
  } catch (err: any) {
    console.error('Leave API DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to cancel leave request' }, { status: 500 });
  }
}
