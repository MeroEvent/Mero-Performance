import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendLeaveDecisionToEmployee } from '@/lib/services/email';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

function generateLeaveActionToken(leaveId: string, action: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mero-leave-secure-secret';
  return crypto.createHmac('sha256', secret).update(`${leaveId}:${action}`).digest('hex');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const action = searchParams.get('action');
  const token = searchParams.get('token');

  if (!id || !action || !token || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing parameters' },
      { status: 400 }
    );
  }

  // 1. Verify HMAC Token
  const expectedToken = generateLeaveActionToken(id, action);
  if (token !== expectedToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Action token is invalid or expired' },
      { status: 403 }
    );
  }

  try {
    const supabase = getAdminSupabase();

    // 2. Fetch existing request
    const { data: existing, error: fetchErr } = await supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey (
          id,
          name,
          email,
          company_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const employeeName = (existing as any).user?.name || 'Employee';
    const employeeEmail = (existing as any).user?.email;

    if (existing.status !== 'pending') {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        status: existing.status,
        message: `This leave request was already ${existing.status}.`,
        details: {
          employeeName,
          employeeEmail,
          leaveType: existing.leave_type,
          startDate: existing.start_date,
          endDate: existing.end_date,
          totalDays: existing.total_days,
          reviewedAt: existing.reviewed_at || existing.updated_at,
        },
      });
    }

    const now = new Date().toISOString();
    const comment = `Quick Action: ${action === 'approved' ? 'Approved' : 'Rejected'} directly via Admin Email.`;

    // 3. Update Leave Request
    const { error: updErr } = await supabase
      .from('leave_requests')
      .update({
        status: action,
        reviewer_comment: comment,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', id);

    if (updErr) throw updErr;

    // 4. If Approved: Deduct days from leave_balances
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
          .update({ used: newUsed, remaining: newRemaining })
          .eq('id', balance.id);
      }
    }

    // 5. Send Decision Email to Employee
    if (employeeEmail) {
      await sendLeaveDecisionToEmployee({
        employeeName,
        employeeEmail,
        leaveType: existing.leave_type,
        startDate: existing.start_date,
        endDate: existing.end_date,
        totalDays: Number(existing.total_days) || 1,
        status: action as 'approved' | 'rejected',
        reviewerName: 'Admin (Email Action)',
        reviewerComment: comment,
      });
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      status: action,
      message: action === 'approved' ? 'Leave approved successfully!' : 'Leave rejected successfully.',
      details: {
        employeeName,
        employeeEmail,
        leaveType: existing.leave_type,
        startDate: existing.start_date,
        endDate: existing.end_date,
        totalDays: existing.total_days,
      },
    });
  } catch (err: any) {
    console.error('Leave action error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process leave action' },
      { status: 500 }
    );
  }
}
