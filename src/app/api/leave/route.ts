import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const DEFAULT_LEAVE_TYPES = [
  { id: 'lt-1', type: 'sick', label: 'Sick Leave', description: 'For medical and health reasons', annual_quota: 12, is_active: true, color: 'rose' },
  { id: 'lt-2', type: 'casual', label: 'Casual Leave', description: 'For urgent personal matters', annual_quota: 10, is_active: true, color: 'amber' },
  { id: 'lt-3', type: 'vacation', label: 'Vacation', description: 'Annual paid time off', annual_quota: 15, is_active: true, color: 'blue' },
  { id: 'lt-4', type: 'unpaid', label: 'Unpaid Leave', description: 'Leave without compensation', annual_quota: 99, is_active: true, color: 'slate' },
  { id: 'lt-5', type: 'wfh', label: 'Work From Home', description: 'Remote work allowance', annual_quota: 24, is_active: true, color: 'indigo' },
  { id: 'lt-6', type: 'comp_off', label: 'Compensatory Off', description: 'For extra hours/days worked', annual_quota: 5, is_active: true, color: 'teal' },
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

    // 1. Fetch user profile to verify existence
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, name, company_id')
      .eq('id', userId)
      .single();

    // 2. Fetch or seed leave balances for current year
    let { data: balances, error: balErr } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', currentYear);

    if (balErr || !balances || balances.length === 0) {
      // Auto-seed balances for all default leave types
      const initialBalances = DEFAULT_LEAVE_TYPES.map((lt) => ({
        user_id: userId,
        leave_type: lt.type,
        total_quota: lt.annual_quota,
        used: 0,
        remaining: lt.annual_quota,
        year: currentYear,
      }));

      const { data: seeded, error: seedErr } = await supabase
        .from('leave_balances')
        .insert(initialBalances)
        .select();

      if (!seedErr && seeded) {
        balances = seeded;
      } else {
        balances = initialBalances as any[];
      }
    }

    // 3. Fetch user's leave requests
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
      leaveTypes: DEFAULT_LEAVE_TYPES,
      balances: balances || [],
      requests: formattedRequests,
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
