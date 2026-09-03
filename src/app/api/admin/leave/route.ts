import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey (
          id,
          name,
          email,
          avatar_url,
          department_id,
          position,
          department:departments (id, name)
        ),
        reviewer:user_profiles!leave_requests_reviewer_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Admin Leave GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let formatted = (requests || []).map((r: any) => ({
      ...r,
      user_name: r.user?.name || 'Employee',
      user_email: r.user?.email || '',
      department_name: r.user?.department?.name || 'General',
      avatar_url: r.user?.avatar_url,
      position: r.user?.position || 'Staff',
      reviewer_name: r.reviewer?.name || (r.reviewed_at ? 'System Admin' : undefined),
    }));

    if (departmentId && departmentId !== 'all') {
      formatted = formatted.filter((r) => r.user?.department_id === departmentId);
    }

    return NextResponse.json({
      requests: formatted,
    });
  } catch (err: any) {
    console.error('Admin Leave API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { requestId, action, reviewerId, reviewerComment } = body;

    if (!requestId || !action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Valid Request ID and Action (approved/rejected) are required' }, { status: 400 });
    }

    // 1. Fetch current leave request
    const { data: existing, error: fetchErr } = await supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey (
          id,
          name,
          company_id
        )
      `)
      .eq('id', requestId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: `This leave request has already been ${existing.status}.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const comment = reviewerComment?.trim() || (action === 'approved' ? 'Approved by manager' : 'Rejected by manager');

    // 2. Update leave request in Supabase
    const { data: updatedRequest, error: updErr } = await supabase
      .from('leave_requests')
      .update({
        status: action,
        reviewer_id: reviewerId || null,
        reviewer_comment: comment,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updErr) throw updErr;

    // 3. If Approved: Deduct days from leave_balances
    if (action === 'approved') {
      const year = new Date(existing.start_date).getFullYear();
      const totalDays = Number(existing.total_days) || 1;

      const { data: balance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', existing.user_id)
        .eq('leave_type', existing.leave_type)
        .eq('year', year)
        .single();

      if (balance) {
        const newUsed = (balance.used || 0) + totalDays;
        const newRemaining = Math.max(0, balance.total_quota - newUsed);

        await supabase
          .from('leave_balances')
          .update({
            used: newUsed,
            remaining: newRemaining,
          })
          .eq('id', balance.id);
      } else {
        const defaultQuotas: Record<string, number> = {
          sick: 12,
          casual: 10,
          vacation: 15,
          unpaid: 99,
          wfh: 24,
          comp_off: 5,
        };
        const totalQuota = defaultQuotas[existing.leave_type] || 12;
        await supabase
          .from('leave_balances')
          .insert({
            user_id: existing.user_id,
            leave_type: existing.leave_type,
            total_quota: totalQuota,
            used: totalDays,
            remaining: Math.max(0, totalQuota - totalDays),
            year,
          });
      }
    }

    // 4. Log Audit Entry
    try {
      await supabase.from('audit_logs').insert({
        company_id: existing.user?.company_id || 'c0000000-0000-0000-0000-000000000001',
        entity_type: 'leave',
        entity_id: requestId,
        action: action === 'approved' ? 'approve' : 'reject',
        changed_by: reviewerId || null,
        old_value: { status: 'pending', total_days: existing.total_days, dates: `${existing.start_date} to ${existing.end_date}` },
        new_value: { status: action, reviewer_comment: comment, reviewed_at: now },
        reason: comment,
        created_at: now,
      });
    } catch (auditErr) {
      console.warn('Non-fatal: Failed to write leave review audit log:', auditErr);
    }

    // 5. Send Decision Email to Employee asynchronously (non-blocking)
    (async () => {
      try {
        const [empRes, revRes] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('name, email')
            .eq('id', existing.user_id)
            .maybeSingle(),
          reviewerId
            ? supabase
                .from('user_profiles')
                .select('name')
                .eq('id', reviewerId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const employeeEmail = empRes.data?.email;
        const employeeName = empRes.data?.name || 'Employee';
        const reviewerName = revRes.data?.name || 'System Admin';

        if (employeeEmail) {
          const { sendLeaveDecisionToEmployee } = await import('@/lib/services/email');
          await sendLeaveDecisionToEmployee({
            employeeName,
            employeeEmail,
            leaveType: existing.leave_type,
            startDate: existing.start_date,
            endDate: existing.end_date,
            totalDays: Number(existing.total_days) || 1,
            status: action as 'approved' | 'rejected',
            reviewerName,
            reviewerComment: comment,
          });
        }
      } catch (mailErr) {
        console.error('Error dispatching leave decision email to employee:', mailErr);
      }
    })();

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: `Leave request ${action} successfully.`,
    });
  } catch (err: any) {
    console.error('Admin Leave Review error:', err);
    return NextResponse.json({ error: err.message || 'Failed to review leave request' }, { status: 500 });
  }
}
