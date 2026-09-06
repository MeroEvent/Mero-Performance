import { AttendanceRecord } from '@/types';
import { formatDateDisplay, formatTime } from '@/lib/utils/attendance';

/** Exports attendance records to a CSV file and triggers download. */
export function exportAttendanceToCSV(
  records: AttendanceRecord[],
  filename: string = 'attendance_report.csv'
) {
  if (!records || records.length === 0) {
    alert('No attendance records available to export.');
    return;
  }

  const headers = [
    'Date',
    'Employee Name',
    'Email',
    'Department',
    'Check-in Time',
    'Check-out Time',
    'Hours Worked',
    'Status',
    'Location Verified',
    'IP Verified',
    'Device Info',
  ];

  const rows = records.map((r) => [
    formatDateDisplay(r.date),
    `"${(r.user_name || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.user_email || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.department_name || 'N/A').replace(/"/g, '""')}"`,
    r.check_in_time ? formatTime(r.check_in_time) : '--:--',
    r.check_out_time ? formatTime(r.check_out_time) : '--:--',
    r.total_hours.toFixed(2),
    r.status.toUpperCase().replace('_', ' '),
    r.location_verified ? 'Yes' : r.location_lat ? 'No' : 'N/A',
    r.ip_verified ? 'Yes' : r.ip_address ? 'No' : 'N/A',
    `"${(r.device_info || 'Browser').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

/** Generates a printable HTML report matching the enterprise boxed grid attendance format. */
export function exportAttendanceToPDF(
  records: AttendanceRecord[],
  title: string = 'Attendance Report',
  dateRange?: { start: string; end: string },
  options?: {
    employeeName?: string;
    departmentName?: string;
    institutionName?: string;
  }
) {
  if (!records || records.length === 0) {
    alert('No attendance records available to export.');
    return;
  }

  const companyName = options?.institutionName || 'Mero Company Pvt. Ltd.';
  const employeeName = options?.employeeName || (records[0]?.user_name ? records[0].user_name : '');
  const departmentName = options?.departmentName || (records[0]?.department_name ? records[0].department_name : 'Information Tech');

  const totalDays = records.length;
  const totalPresentOnly = records.filter((r) => r.status === 'on_time').length;
  const totalLate = records.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalAbsent = records.filter((r) => r.status === 'absent').length;
  const totalAttended = totalPresentOnly + totalLate;
  const totalHolidays = records.filter((r) => r.status === 'holiday').length;
  const totalHours = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
  const activeDays = totalDays - totalHolidays;
  const attendancePercentage = activeDays > 0 ? Math.round((totalAttended / activeDays) * 100) : 0;

  const formatSheetDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) return `${d}-${m}-${y}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const rows = records
    .map((r) => {
      const isHoliday = r.status === 'holiday';
      const isLeave = r.status === 'on_leave';
      const isPresent = r.status === 'on_time';
      const isLate = r.status === 'late' || r.status === 'very_late';
      const isAbsent = r.status === 'absent';
      const isCancelled = r.status === 'half_day' && r.total_hours === 0;

      const shiftLabel = r.shift_name || 'General Shift';
      const punchIn = isHoliday || isLeave ? '--' : r.check_in_time ? formatTime(r.check_in_time) : '00:00:00';
      const punchOut = isHoliday || isLeave ? '--' : r.check_out_time ? formatTime(r.check_out_time) : '--:--';
      const hoursStr = isHoliday || isLeave ? '--' : r.total_hours > 0 ? `${r.total_hours.toFixed(1)}h` : '--';

      if (isHoliday) {
        return `
        <tr>
          <td>${formatSheetDate(r.date)}</td>
          <td>${shiftLabel}</td>
          <td>${punchIn}</td>
          <td>${punchOut}</td>
          <td>${hoursStr}</td>
          <td colspan="3" class="special-cell">Official Holiday</td>
        </tr>`;
      }

      if (isLeave) {
        return `
        <tr>
          <td>${formatSheetDate(r.date)}</td>
          <td>${shiftLabel}</td>
          <td>${punchIn}</td>
          <td>${punchOut}</td>
          <td>${hoursStr}</td>
          <td colspan="3" class="special-cell" style="color: #2563eb;">Approved Leave</td>
        </tr>`;
      }

      if (isCancelled) {
        return `
        <tr>
          <td>${formatSheetDate(r.date)}</td>
          <td>${shiftLabel}</td>
          <td>${punchIn}</td>
          <td>${punchOut}</td>
          <td>${hoursStr}</td>
          <td></td>
          <td colspan="2" class="special-cell">Shift Cancelled</td>
        </tr>`;
      }

      return `
      <tr>
        <td>${formatSheetDate(r.date)}</td>
        <td>${shiftLabel}</td>
        <td>${punchIn}</td>
        <td>${punchOut}</td>
        <td>${hoursStr}</td>
        <td>${isPresent ? '<span class="tick tick-green">✓</span>' : ''}</td>
        <td>${isLate ? '<span class="tick tick-amber">✓</span>' : ''}</td>
        <td>${isAbsent ? '<span class="tick tick-red">✓</span>' : ''}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title} - ${employeeName || companyName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    background: #fff;
    padding: 24px;
  }
  .page-container {
    max-width: 850px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 2px solid #111827;
    margin-bottom: 16px;
  }
  .logo-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-box {
    width: 44px;
    height: 44px;
    background: #111827;
    color: #fff;
    font-size: 24px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  .inst-name {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.5px;
    text-transform: uppercase;
    color: #111827;
  }
  .inst-sub {
    font-size: 10px;
    font-weight: 700;
    color: #059669;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .meta-box {
    text-align: right;
  }
  .badge-page {
    display: inline-block;
    padding: 3px 8px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    font-size: 10px;
    font-weight: 700;
    font-family: monospace;
    border-radius: 4px;
  }
  .banner-box {
    border: 2px solid #111827;
    border-bottom: none;
    background: #f9fafb;
    padding: 8px 12px;
    text-align: center;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #111827;
    font-size: 11px;
  }
  th, td {
    border: 1.5px solid #111827;
    padding: 6px 8px;
    text-align: center;
  }
  th {
    background: #ffffff;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  th.th-green { color: #047857; }
  th.th-amber { color: #d97706; }
  th.th-red { color: #dc2626; }
  td {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
  }
  .special-cell {
    font-family: sans-serif;
    font-weight: 700;
    background: #f9fafb;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tick {
    font-family: sans-serif;
    font-size: 16px;
    font-weight: 900;
    line-height: 1;
  }
  .tick-green { color: #059669; }
  .tick-amber { color: #f59e0b; }
  .tick-red { color: #ef4444; }
  .summary-row td {
    background: #f3f4f6;
    font-family: sans-serif;
    font-weight: 800;
    font-size: 11px;
    padding: 8px;
  }
  .footer {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 2px solid #111827;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 10px;
    color: #4b5563;
  }
  .footer p { margin-bottom: 2px; }
  .auth-box {
    text-align: right;
  }
  .auth-line {
    width: 150px;
    border-bottom: 1px solid #6b7280;
    padding-bottom: 4px;
    font-style: italic;
    font-size: 11px;
    font-weight: 700;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 1.2cm; size: A4 portrait; }
  }
</style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div class="logo-title">
        <div class="logo-box">M</div>
        <div>
          <div class="inst-name">${companyName}</div>
          <div class="inst-sub">Official Verified Employee Attendance Report</div>
        </div>
      </div>
      <div class="meta-box">
        <span class="badge-page">PAGE 1 / 1</span>
        <div style="font-size: 9px; color: #6b7280; margin-top: 4px;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="banner-box">
      ${employeeName ? `EMPLOYEE: ${employeeName}` : `DEPARTMENT: ${departmentName}`}
      <span style="font-weight: 500; color: #6b7280; margin-left: 8px;">(${departmentName}) [Page 1/1]</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 16%;">Date</th>
          <th style="width: 16%;">Work Shift</th>
          <th style="width: 15%;">Punch-In</th>
          <th style="width: 15%;">Punch-Out</th>
          <th style="width: 10%;">Hours</th>
          <th class="th-green" style="width: 9%;">Present</th>
          <th class="th-amber" style="width: 9%;">Late</th>
          <th class="th-red" style="width: 10%;">Absent</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="summary-row">
          <td>Total Days: ${totalDays}</td>
          <td style="color: #047857;">Attendance: ${attendancePercentage}%</td>
          <td>Present: ${totalPresentOnly}</td>
          <td style="color: #b45309;">Late: ${totalLate}</td>
          <td style="color: #2563eb;">Hours: ${totalHours.toFixed(1)}h</td>
          <td colspan="3" style="color: #b91c1c;">Absent: ${totalAbsent}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>
        <p style="font-weight: 800; color: #111827; text-transform: uppercase;">${companyName}</p>
        <p>Bhagwati Marg, Naxal, Kathmandu, Nepal</p>
        <p>+977 01 5970120 | contact@merocompany.com.np</p>
      </div>
      <div class="auth-box">
        <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b7280;">AUTHORIZED SIGNATURE</p>
        <div class="auth-line">HR & Operations Dept</div>
        <p style="font-size: 9px; color: #6b7280; font-family: monospace; margin-top: 2px;">HUMAN RESOURCES MANAGER</p>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/** Exports monthly payroll records to a CSV file. */
export function exportPayrollToCSV(
  records: any[],
  month: number,
  year: number,
  filename?: string
) {
  if (!records || records.length === 0) {
    alert('No payroll records available to export.');
    return;
  }

  const fname = filename || `Payroll_Sheet_${month}_${year}.csv`;
  const headers = [
    'Employee Name',
    'Email',
    'Department',
    'Position',
    'Base Salary (NPR)',
    'Working Days',
    'Days Present',
    'Approved Leaves',
    'Unpaid Leaves',
    'Unauthorized Absences',
    'Total Hours',
    'Daily Rate (NPR)',
    'Deductions (NPR)',
    'Auto Net (NPR)',
    'Admin Override (NPR)',
    'Final Payable (NPR)',
    'Override Reason',
    'Status',
  ];

  const rows = records.map((r) => [
    `"${(r.employee_name || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.employee_email || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.department_name || 'General').replace(/"/g, '""')}"`,
    `"${(r.position || 'Team Member').replace(/"/g, '""')}"`,
    r.base_salary || 0,
    r.working_days || 0,
    r.days_present || 0,
    r.approved_leave_days || 0,
    r.unpaid_leave_days || 0,
    r.unauthorized_absences || 0,
    r.total_hours || 0,
    r.daily_rate || 0,
    r.deduction_amount || 0,
    r.net_salary || 0,
    r.admin_override !== null && r.admin_override !== undefined ? r.admin_override : 'N/A',
    r.effective_net_salary || r.net_salary || 0,
    `"${(r.override_reason || '').replace(/"/g, '""')}"`,
    r.is_finalized ? 'Finalized' : 'Draft',
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  downloadBlob(csvContent, fname, 'text/csv;charset=utf-8;');
}

/** Generates a printable Salary Payslip PDF for an individual employee. */
export function exportPayslipToPDF(
  payroll: any,
  options?: {
    institutionName?: string;
  }
) {
  if (!payroll) {
    alert('No payroll data available for this employee.');
    return;
  }

  const companyName = options?.institutionName || 'Mero Company Pvt. Ltd.';
  const employeeName = payroll.employee_name || 'Employee';
  const departmentName = payroll.department_name || 'General Department';
  const position = payroll.position || 'Team Member';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthStr = monthNames[(payroll.month || 1) - 1] || `Month ${payroll.month}`;
  const year = payroll.year || new Date().getFullYear();

  const baseSalary = Number(payroll.base_salary || 0);
  const deduction = Number(payroll.deduction_amount || 0);
  const finalPay = Number(payroll.effective_net_salary ?? payroll.net_salary ?? 0);
  const hasOverride = payroll.admin_override !== null && payroll.admin_override !== undefined;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${employeeName} - ${monthStr} ${year}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 24px; font-size: 13px; }
    .slip-container { max-width: 780px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
    .header { padding: 20px 24px; background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .slip-title { font-size: 16px; font-weight: 800; color: #0f172a; text-align: right; letter-spacing: -0.3px; }
    .slip-sub { font-size: 11px; font-weight: 600; color: #475569; text-align: right; margin-top: 2px; }
    .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; padding: 18px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .emp-field { display: flex; justify-content: space-between; padding-bottom: 4px; border-bottom: 1px dashed #f1f5f9; }
    .emp-label { color: #64748b; font-weight: 600; }
    .emp-val { font-weight: 700; color: #0f172a; }
    .attendance-strip { display: grid; grid-template-columns: repeat(4, 1fr); background: #f1f5f9; border-bottom: 1px solid #cbd5e1; text-align: center; }
    .att-box { padding: 10px 8px; border-right: 1px solid #e2e8f0; }
    .att-box:last-child { border-right: none; }
    .att-num { font-size: 16px; font-weight: 800; font-family: monospace; color: #0f172a; }
    .att-txt { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px; }
    .tables-split { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1.5px solid #cbd5e1; }
    .pay-col { padding: 16px 20px; }
    .pay-col:first-child { border-right: 1px solid #e2e8f0; }
    .col-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px; }
    .line-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
    .line-row.bold { font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
    .net-banner { padding: 18px 24px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; }
    .net-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .net-amount { font-size: 24px; font-weight: 900; font-family: monospace; }
    .note-box { padding: 12px 24px; background: #f8fafc; font-size: 11px; color: #475569; border-bottom: 1px solid #e2e8f0; }
    .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 36px 30px 24px; background: #fff; }
    .sign-line { border-top: 1.5px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    @media print {
      body { padding: 0; }
      .slip-container { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <div>
        <h1 class="company-title">${companyName}</h1>
        <p class="company-sub">Bhagwati Marg, Naxal, Kathmandu, Nepal</p>
        <p class="company-sub">HR & Corporate Operations</p>
      </div>
      <div>
        <div class="slip-title">SALARY PAYSLIP</div>
        <div class="slip-sub">Period: ${monthStr} ${year}</div>
      </div>
    </div>

    <div class="emp-grid">
      <div class="emp-field"><span class="emp-label">Employee Name:</span><span class="emp-val">${employeeName}</span></div>
      <div class="emp-field"><span class="emp-label">Department:</span><span class="emp-val">${departmentName}</span></div>
      <div class="emp-field"><span class="emp-label">Designation:</span><span class="emp-val">${position}</span></div>
      <div class="emp-field"><span class="emp-label">Payment Mode:</span><span class="emp-val">Direct Bank Transfer</span></div>
    </div>

    <div class="attendance-strip">
      <div class="att-box">
        <div class="att-num">${payroll.working_days || 0}</div>
        <div class="att-txt">Company Working Days</div>
      </div>
      <div class="att-box">
        <div class="att-num" style="color: #059669;">${payroll.days_present || 0}</div>
        <div class="att-txt">Days Present</div>
      </div>
      <div class="att-box">
        <div class="att-num" style="color: #2563eb;">${payroll.approved_leave_days || 0}</div>
        <div class="att-txt">Approved Paid Leaves</div>
      </div>
      <div class="att-box">
        <div class="att-num" style="color: #dc2626;">${payroll.unauthorized_absences || 0}</div>
        <div class="att-txt">Unauthorized Absences</div>
      </div>
    </div>

    <div class="tables-split">
      <!-- Earnings -->
      <div class="pay-col">
        <div class="col-title">Earnings & Compensation</div>
        <div class="line-row">
          <span>Monthly Base Salary</span>
          <span style="font-family: monospace; font-weight: 600;">Rs. ${baseSalary.toLocaleString()}</span>
        </div>
        <div class="line-row">
          <span>Standard Daily Wage Rate</span>
          <span style="font-family: monospace; font-size: 11px; color: #64748b;">Rs. ${Number(payroll.daily_rate || 0).toLocaleString()} / day</span>
        </div>
        <div class="line-row bold">
          <span>Total Gross Earnings</span>
          <span style="font-family: monospace;">Rs. ${baseSalary.toLocaleString()}</span>
        </div>
      </div>

      <!-- Deductions -->
      <div class="pay-col">
        <div class="col-title">Attendance Deductions</div>
        <div class="line-row">
          <span>Unauthorized Absence Deduction (${payroll.unauthorized_absences || 0}d)</span>
          <span style="font-family: monospace; color: #dc2626;">-Rs. ${deduction.toLocaleString()}</span>
        </div>
        ${payroll.unpaid_leave_days > 0 ? `
        <div class="line-row">
          <span>Unpaid Leaves (${payroll.unpaid_leave_days}d)</span>
          <span style="font-family: monospace; color: #dc2626;">Deducted</span>
        </div>` : ''}
        <div class="line-row bold">
          <span>Total Deductions</span>
          <span style="font-family: monospace; color: #dc2626;">-Rs. ${deduction.toLocaleString()}</span>
        </div>
      </div>
    </div>

    ${hasOverride ? `
    <div class="note-box">
      <strong>⚠️ Admin Adjustment Note:</strong> ${payroll.override_reason || 'Manual override applied by management.'} (Auto-calculated Net was Rs. ${Number(payroll.net_salary || 0).toLocaleString()})
    </div>` : ''}

    <div class="net-banner">
      <div>
        <div class="net-label">Net Payable Amount</div>
        <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">After all attendance adjustments</div>
      </div>
      <div class="net-amount">NPR ${finalPay.toLocaleString()}</div>
    </div>

    <div class="sign-row">
      <div class="sign-line">Employee Signature & Date</div>
      <div class="sign-line">Authorized Signatory (HR / Accounts)</div>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/** Helper to download a blob as a file. */
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


