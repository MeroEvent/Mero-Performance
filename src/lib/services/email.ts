/**
 * Email service helper using Resend / SMTP API format
 */

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendNotificationEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log(`[DEV MODE EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { success: true, id: `mock-email-${Date.now()}` };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Mero Performance <noreply@meroperformance.com>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message };
  }
}

export function buildCheckInReminderHTML(userName: string, standardTime: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Mero Performance - Check-In Reminder</h2>
      <p style="color: #475569; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #475569; font-size: 15px;">It looks like you haven't checked in yet today. Your standard office start time is <strong>${standardTime}</strong>.</p>
      <div style="margin: 24px 0;">
        <a href="https://meroperformance.com/employee" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Check In Now</a>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">If you are on approved leave or working remotely, please ignore this email or update your status in the app.</p>
    </div>
  `;
}

export function buildCheckOutReminderHTML(userName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Mero Performance - Check-Out Reminder</h2>
      <p style="color: #475569; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #475569; font-size: 15px;">You are currently checked in! Don't forget to tap "Check Out" before leaving for the day to ensure accurate hours tracking.</p>
      <div style="margin: 24px 0;">
        <a href="https://meroperformance.com/employee" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Check Out Now</a>
      </div>
    </div>
  `;
}
