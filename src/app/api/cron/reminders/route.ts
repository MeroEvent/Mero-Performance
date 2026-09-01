import { NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/services/attendance-store';
import { sendNotificationEmail, buildCheckInReminderHTML, buildCheckOutReminderHTML } from '@/lib/services/email';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'check_in'; // 'check_in' or 'check_out'

  try {
    const users = AttendanceService.getUsers().filter(u => u.is_active && u.role === 'staff');
    const rules = AttendanceService.getCompanyRules();
    const results = [];

    for (const user of users) {
      const todayRecord = AttendanceService.getTodayRecord(user.id);

      if (type === 'check_in') {
        // Send email if user has not checked in today
        if (!todayRecord || !todayRecord.check_in_time) {
          const html = buildCheckInReminderHTML(user.name, rules.standard_start_time);
          const emailRes = await sendNotificationEmail({
            to: user.email,
            subject: '⏰ Reminder: Please Check In for Today',
            html,
          });
          results.push({ email: user.email, status: emailRes.success ? 'sent' : 'failed' });
        }
      } else if (type === 'check_out') {
        // Send email if user checked in but forgot to check out
        if (todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time) {
          const html = buildCheckOutReminderHTML(user.name);
          const emailRes = await sendNotificationEmail({
            to: user.email,
            subject: '🔔 Reminder: Don\'t Forget to Check Out',
            html,
          });
          results.push({ email: user.email, status: emailRes.success ? 'sent' : 'failed' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      type,
      processed: results.length,
      details: results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
