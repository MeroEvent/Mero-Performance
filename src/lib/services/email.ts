import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface SendLeaveRequestParams {
  leaveRequestId?: string;
  employeeName: string;
  employeeEmail: string;
  departmentName?: string;
  position?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  remainingQuota?: number;
  totalQuota?: number;
  adminEmails: string[];
}

interface SendLeaveDecisionParams {
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'approved' | 'rejected';
  reviewerName?: string;
  reviewerComment?: string;
}

export function generateLeaveActionToken(leaveId: string, action: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mero-leave-secure-secret';
  return crypto.createHmac('sha256', secret).update(`${leaveId}:${action}`).digest('hex');
}

const LEAVE_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  sick: { label: 'Sick Leave', color: '#be123c', bg: '#ffe4e6' },
  casual: { label: 'Casual Leave', color: '#b45309', bg: '#fef3c7' },
  vacation: { label: 'Vacation', color: '#1d4ed8', bg: '#dbeafe' },
  unpaid: { label: 'Unpaid Leave', color: '#334155', bg: '#f1f5f9' },
  wfh: { label: 'Work From Home', color: '#4338ca', bg: '#e0e7ff' },
  comp_off: { label: 'Compensatory Off', color: '#0f766e', bg: '#ccfbf1' },
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();

  if (!user || !rawPass) {
    return null;
  }

  const cleanPass = rawPass.replace(/\s+/g, '');

  if (host && host !== 'smtp.gmail.com') {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: cleanPass },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: cleanPass,
    },
  });
}

function formatDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Send email notification to Admins & Managers when an employee submits a leave request
 */
export async function sendLeaveRequestToAdmins(params: SendLeaveRequestParams): Promise<{ success: boolean; message?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      'ℹ️ [Email Service] SMTP credentials (SMTP_USER / SMTP_PASS) not configured in .env.local — skipping admin notification email.'
    );
    return { success: false, message: 'SMTP not configured' };
  }

  if (!params.adminEmails || params.adminEmails.length === 0) {
    console.warn('ℹ️ [Email Service] No admin email recipients found.');
    return { success: false, message: 'No recipients' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reviewUrl = `${appUrl}/admin/leave`;
  
  const approveUrl = params.leaveRequestId
    ? `${appUrl}/leave-action?id=${params.leaveRequestId}&action=approved&token=${generateLeaveActionToken(params.leaveRequestId, 'approved')}`
    : reviewUrl;

  const rejectUrl = params.leaveRequestId
    ? `${appUrl}/leave-action?id=${params.leaveRequestId}&action=rejected&token=${generateLeaveActionToken(params.leaveRequestId, 'rejected')}`
    : reviewUrl;

  const leaveMeta = LEAVE_TYPE_META[params.leaveType] || { label: params.leaveType.toUpperCase(), color: '#1d4ed8', bg: '#dbeafe' };
  const formattedStart = formatDateDisplay(params.startDate);
  const formattedEnd = formatDateDisplay(params.endDate);
  const rangeDisplay = params.startDate === params.endDate ? formattedStart : `${formattedStart} to ${formattedEnd}`;
  const senderEmail = process.env.SMTP_FROM || `"Mero Attendance" <${process.env.SMTP_USER}>`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Leave Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 28px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">MERO ATTENDANCE</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">New Leave Request Application</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
          Hello Admin,<br><br>
          An employee has submitted a new leave application and is waiting for your review.
        </p>

        <!-- Employee Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 16px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                <tr>
                  <td width="35%" style="color: #64748b; font-weight: 600;">Applicant:</td>
                  <td style="color: #0f172a; font-weight: 700;">${params.employeeName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Email:</td>
                  <td style="color: #0f172a;"><a href="mailto:${params.employeeEmail}" style="color: #2563eb; text-decoration: none;">${params.employeeEmail}</a></td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Department:</td>
                  <td style="color: #0f172a;">${params.departmentName || 'General'}</td>
                </tr>
                ${params.position ? `
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Position:</td>
                  <td style="color: #0f172a;">${params.position}</td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        <!-- Leave Details Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 18px;">
              <div style="display: inline-block; padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${leaveMeta.bg}; color: ${leaveMeta.color}; margin-bottom: 12px;">
                ${leaveMeta.label}
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                <tr>
                  <td width="35%" style="color: #64748b; font-weight: 600;">Requested Period:</td>
                  <td style="color: #0f172a; font-weight: 700;">${rangeDisplay}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Total Duration:</td>
                  <td style="color: #0f172a; font-weight: 700;">${params.totalDays} working day${params.totalDays === 1 ? '' : 's'}</td>
                </tr>
                ${params.remainingQuota !== undefined ? `
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Remaining Balance:</td>
                  <td style="color: #0f172a;">${params.remainingQuota} / ${params.totalQuota || 12} days left</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #64748b; font-weight: 600; vertical-align: top;">Reason:</td>
                  <td style="color: #1e293b; background-color: #f1f5f9; padding: 10px; border-radius: 8px; font-style: italic;">
                    "${params.reason}"
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- 1-Click Action Buttons -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
          <tr>
            <td align="center">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="${approveUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 12px 26px; border-radius: 12px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                      ✓ Approve Leave
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="${rejectUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 12px 26px; border-radius: 12px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);">
                      ✕ Reject Leave
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 16px 0 0 0;">
          <a href="${reviewUrl}" style="font-size: 12px; color: #64748b; text-decoration: underline;">
            Or open full review portal in browser →
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8;">
        Mero Company Attendance & Performance System • Automated Notification
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: senderEmail,
      to: params.adminEmails.join(', '),
      replyTo: params.employeeEmail,
      subject: `[Leave Request] ${params.employeeName} — ${leaveMeta.label} (${params.totalDays} Day${params.totalDays === 1 ? '' : 's'})`,
      html: htmlContent,
    });

    console.log(`✅ [Email Service] Leave request notification sent to admins: ${info.messageId}`);
    return { success: true, message: info.messageId };
  } catch (err: any) {
    console.error('❌ [Email Service] Failed to send admin leave email:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Send email notification to Employee when their leave request is Approved or Rejected
 */
export async function sendLeaveDecisionToEmployee(params: SendLeaveDecisionParams): Promise<{ success: boolean; message?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      'ℹ️ [Email Service] SMTP credentials not configured in .env.local — skipping employee decision notification email.'
    );
    return { success: false, message: 'SMTP not configured' };
  }

  if (!params.employeeEmail) {
    console.warn('ℹ️ [Email Service] No employee email recipient provided.');
    return { success: false, message: 'No recipient email' };
  }

  const isApproved = params.status === 'approved';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const portalUrl = `${appUrl}/employee/leave`;
  const leaveMeta = LEAVE_TYPE_META[params.leaveType] || { label: params.leaveType.toUpperCase(), color: '#1d4ed8', bg: '#dbeafe' };
  const formattedStart = formatDateDisplay(params.startDate);
  const formattedEnd = formatDateDisplay(params.endDate);
  const rangeDisplay = params.startDate === params.endDate ? formattedStart : `${formattedStart} to ${formattedEnd}`;
  const senderEmail = process.env.SMTP_FROM || `"Mero Attendance" <${process.env.SMTP_USER}>`;

  const statusColor = isApproved ? '#059669' : '#dc2626';
  const statusBg = isApproved ? '#ecfdf5' : '#fef2f2';
  const statusBadgeText = isApproved ? 'APPROVED' : 'REJECTED';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request ${statusBadgeText}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: ${isApproved ? 'linear-gradient(135deg, #065f46, #10b981)' : 'linear-gradient(135deg, #991b1b, #ef4444)'}; padding: 28px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">MERO ATTENDANCE</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Leave Request Status Update</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
          Hello <strong>${params.employeeName}</strong>,<br><br>
          Your leave request has been reviewed by the administration.
        </p>

        <!-- Status Banner Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${statusBg}; border: 1px solid ${statusColor}40; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <span style="display: inline-block; padding: 6px 16px; border-radius: 10px; font-size: 14px; font-weight: 900; letter-spacing: 0.05em; background-color: ${statusColor}; color: #ffffff; margin-bottom: 8px;">
                ${isApproved ? '✓' : '✕'} ${statusBadgeText}
              </span>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: ${statusColor}; font-weight: 600;">
                ${isApproved ? 'Your leave request has been approved and logged on the roster.' : 'Your leave request could not be approved at this time.'}
              </p>
            </td>
          </tr>
        </table>

        <!-- Leave Summary Details -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 18px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                <tr>
                  <td width="35%" style="color: #64748b; font-weight: 600;">Leave Type:</td>
                  <td style="color: #0f172a; font-weight: 700;">${leaveMeta.label}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Dates:</td>
                  <td style="color: #0f172a; font-weight: 700;">${rangeDisplay}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Duration:</td>
                  <td style="color: #0f172a;">${params.totalDays} Day${params.totalDays === 1 ? '' : 's'}</td>
                </tr>
                ${params.reviewerName ? `
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Reviewed By:</td>
                  <td style="color: #0f172a;">${params.reviewerName}</td>
                </tr>` : ''}
                ${params.reviewerComment ? `
                <tr>
                  <td style="color: #64748b; font-weight: 600; vertical-align: top;">Remarks:</td>
                  <td style="color: #1e293b; background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-style: italic;">
                    "${params.reviewerComment}"
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        <!-- Action Button -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin: 24px 0 16px 0;">
          <tr>
            <td align="center">
              <a href="${portalUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 12px;">
                View My Leave Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8;">
        Mero Company Attendance & Performance System • Automated Notification
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: senderEmail,
      to: params.employeeEmail,
      subject: `${isApproved ? '🎉 [Approved]' : '❌ [Status Update]'} Your ${leaveMeta.label} Request (${rangeDisplay})`,
      html: htmlContent,
    });

    console.log(`✅ [Email Service] Leave decision notification sent to employee: ${info.messageId}`);
    return { success: true, message: info.messageId };
  } catch (err: any) {
    console.error('❌ [Email Service] Failed to send employee leave decision email:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Generic email notification sender for cron/alerts
 */
export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; message?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    return { success: false, message: 'SMTP not configured' };
  }

  const senderEmail = params.from || process.env.SMTP_FROM || `"Mero Attendance" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: senderEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { success: true, message: info.messageId };
  } catch (err: any) {
    console.error('Failed to send notification email:', err);
    return { success: false, message: err.message };
  }
}

export function buildCheckInReminderHTML(name: string, shiftStart: string = '09:00'): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h2 style="color: #1e3a8a; margin-top: 0;">⏰ Check-In Reminder</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>This is a quick reminder to check in for your workday. Your standard shift starts at <strong>${shiftStart}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${appUrl}/employee/dashboard" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          👉 Check In Now
        </a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Mero Attendance System</p>
    </div>
  `;
}

export function buildCheckOutReminderHTML(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h2 style="color: #be123c; margin-top: 0;">🔔 Check-Out Reminder</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your shift has concluded. Please remember to check out to record your total working hours accurately.</p>
      <p style="margin: 24px 0;">
        <a href="${appUrl}/employee/dashboard" style="background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          👉 Check Out Now
        </a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Mero Attendance System</p>
    </div>
  `;
}
