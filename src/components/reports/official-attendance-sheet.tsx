'use client';

import React from 'react';
import { AttendanceRecord } from '@/types';
import { formatDateDisplay, formatTime } from '@/lib/utils/attendance';
import { Check, Building2, MapPin, Phone, Mail, Globe, Clock, ShieldCheck } from 'lucide-react';

interface OfficialAttendanceSheetProps {
  records: AttendanceRecord[];
  title?: string;
  employeeName?: string;
  departmentName?: string;
  position?: string;
  companyName?: string;
  pageNumber?: number;
  totalPages?: number;
  contactAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWeb?: string;
}

export const OfficialAttendanceSheet: React.FC<OfficialAttendanceSheetProps> = ({
  records,
  title = 'Official Employee Attendance Report',
  employeeName,
  departmentName = 'Information Tech',
  position,
  companyName = 'Mero Company Pvt. Ltd.',
  pageNumber = 1,
  totalPages = 1,
  contactAddress = 'Bhagwati Marg, Naxal, Kathmandu, Nepal',
  contactPhone = '+977 01 5970120',
  contactEmail = 'contact@merocompany.com.np',
  contactWeb = 'merocompany.com.np',
}) => {
  // Compute accurate company attendance analytics
  const totalDays = records.length;
  const totalPresentOnly = records.filter((r) => r.status === 'on_time').length;
  const totalLate = records.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalAbsent = records.filter((r) => r.status === 'absent').length;
  const totalLeaves = records.filter((r) => r.status === 'on_leave').length;
  const totalHolidays = records.filter((r) => r.status === 'holiday').length;
  const totalHours = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);

  const totalAttended = totalPresentOnly + totalLate;
  const workingDays = totalDays - totalHolidays;
  const attendancePercentage = workingDays > 0 ? Math.round((totalAttended / workingDays) * 100) : 0;

  // Format date as DD-MM-YYYY
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

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-slate-900 border-2 border-slate-900 shadow-2xl rounded-none p-6 sm:p-10 font-sans print:shadow-none print:border-slate-900 print:p-6 print:max-w-none">
      {/* Top Header with Company Brand */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-2xl tracking-tighter shadow-sm">
            M
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {companyName}
            </h1>
            <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
              Official Verified Attendance Log
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-[11px] font-mono font-bold text-slate-800 rounded">
            PAGE {pageNumber} / {totalPages}
          </span>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Employee Details Banner */}
      <div className="border-2 border-slate-900 bg-slate-50 p-2.5 text-center font-bold text-xs sm:text-sm tracking-wide text-slate-900 mb-0 border-b-0">
        <span className="font-extrabold uppercase">
          {employeeName ? `EMPLOYEE: ${employeeName}` : `DEPARTMENT: ${departmentName}`}
        </span>
        {departmentName && (
          <span className="text-slate-600 font-medium ml-2">
            ({departmentName}) {position ? `• ${position}` : ''} [Page {pageNumber}/{totalPages}]
          </span>
        )}
      </div>

      {/* Main Grid Table (Crisp Enterprise Boxed Format) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-slate-900 text-xs font-sans">
          <thead>
            <tr className="border-b-2 border-slate-900 bg-white text-slate-900 font-bold text-center">
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-28 uppercase tracking-wider text-[11px]">
                Date
              </th>
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-28 uppercase tracking-wider text-[11px]">
                Work Shift
              </th>
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-28 uppercase tracking-wider text-[11px]">
                Punch-In Time
              </th>
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-28 uppercase tracking-wider text-[11px]">
                Punch-Out Time
              </th>
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-20 uppercase tracking-wider text-[11px]">
                Hours
              </th>
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-20 uppercase tracking-wider text-[11px] text-emerald-700">
                Present
              </th>
              <th className="border-r-2 border-slate-900 py-2.5 px-3 w-20 uppercase tracking-wider text-[11px] text-amber-600">
                Late
              </th>
              <th className="py-2.5 px-3 w-20 uppercase tracking-wider text-[11px] text-rose-600">
                Absent
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-900 text-center font-mono text-xs">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-slate-400 font-sans italic text-sm">
                  No attendance records found for this employee period.
                </td>
              </tr>
            ) : (
              records.map((r, index) => {
                const isHoliday = r.status === 'holiday';
                const isLeave = r.status === 'on_leave';
                const isPresent = r.status === 'on_time';
                const isLate = r.status === 'late' || r.status === 'very_late';
                const isAbsent = r.status === 'absent';
                const isCancelled = r.status === 'half_day' && r.total_hours === 0;

                const shiftLabel = r.shift_name || 'General Shift';

                return (
                  <tr key={r.id || index} className="hover:bg-slate-50/60 transition-colors">
                    {/* Date */}
                    <td className="border-r-2 border-slate-900 py-2 px-3 font-semibold text-slate-900">
                      {formatSheetDate(r.date)}
                    </td>

                    {/* Work Shift */}
                    <td className="border-r-2 border-slate-900 py-2 px-3 font-sans text-slate-700 font-medium">
                      {shiftLabel}
                    </td>

                    {/* Punch-In Time */}
                    <td className="border-r-2 border-slate-900 py-2 px-3 font-bold text-slate-900">
                      {isHoliday || isLeave
                        ? '--'
                        : r.check_in_time
                        ? formatTime(r.check_in_time)
                        : '00:00:00'}
                    </td>

                    {/* Punch-Out Time */}
                    <td className="border-r-2 border-slate-900 py-2 px-3 font-bold text-slate-900">
                      {isHoliday || isLeave
                        ? '--'
                        : r.check_out_time
                        ? formatTime(r.check_out_time)
                        : '--:--'}
                    </td>

                    {/* Worked Hours */}
                    <td className="border-r-2 border-slate-900 py-2 px-3 font-bold text-slate-900 font-mono">
                      {isHoliday || isLeave ? '--' : r.total_hours > 0 ? `${r.total_hours.toFixed(1)}h` : '--'}
                    </td>

                    {/* Present / Late / Absent Columns */}
                    {isHoliday ? (
                      <td
                        colSpan={3}
                        className="py-2 px-3 font-sans font-bold text-slate-700 bg-slate-50/70 uppercase tracking-wide text-xs"
                      >
                        Official Holiday
                      </td>
                    ) : isLeave ? (
                      <td
                        colSpan={3}
                        className="py-2 px-3 font-sans font-bold text-blue-600 bg-blue-50/40 uppercase tracking-wide text-xs"
                      >
                        Approved Leave
                      </td>
                    ) : isCancelled ? (
                      <>
                        <td className="border-r-2 border-slate-900 py-2 px-3"></td>
                        <td
                          colSpan={2}
                          className="py-2 px-3 font-sans font-bold text-slate-700 bg-slate-50/70 uppercase tracking-wide text-xs"
                        >
                          Shift Cancelled
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Present Column */}
                        <td className="border-r-2 border-slate-900 py-2 px-3">
                          {isPresent && (
                            <div className="flex justify-center items-center">
                              <Check className="w-5 h-5 text-emerald-600 stroke-[3.5]" />
                            </div>
                          )}
                        </td>

                        {/* Late Column */}
                        <td className="border-r-2 border-slate-900 py-2 px-3">
                          {isLate && (
                            <div className="flex justify-center items-center">
                              <Check className="w-5 h-5 text-amber-500 stroke-[3.5]" />
                            </div>
                          )}
                        </td>

                        {/* Absent Column */}
                        <td className="py-2 px-3">
                          {isAbsent && (
                            <div className="flex justify-center items-center">
                              <Check className="w-5 h-5 text-rose-500 stroke-[3.5]" />
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}

            {/* Corporate Summary Statistics Footer Row */}
            <tr className="border-t-2 border-slate-900 bg-slate-100 font-sans font-extrabold text-slate-900 text-xs">
              <td className="border-r-2 border-slate-900 py-3 px-3 text-center">
                Total Days: {totalDays}
              </td>
              <td className="border-r-2 border-slate-900 py-3 px-3 text-center text-emerald-800">
                Attendance: {attendancePercentage}%
              </td>
              <td className="border-r-2 border-slate-900 py-3 px-3 text-center">
                Total Present: {totalPresentOnly}
              </td>
              <td className="border-r-2 border-slate-900 py-3 px-3 text-center text-amber-700">
                Total Late: {totalLate}
              </td>
              <td className="border-r-2 border-slate-900 py-3 px-3 text-center text-blue-700">
                Hours: {totalHours.toFixed(1)}h
              </td>
              <td colSpan={3} className="py-3 px-3 text-center text-rose-700">
                Total Absent: {totalAbsent}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Company Stamp & Signature Footer */}
      <div className="mt-10 pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        <div className="space-y-1 text-[11px] text-slate-600 font-sans">
          <p className="font-extrabold text-slate-900 text-xs uppercase">{companyName}</p>
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {contactAddress}
          </p>
          <p className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {contactPhone}
          </p>
          <p className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {contactEmail}
          </p>
          <p className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {contactWeb}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              AUTHORIZED SIGNATURE
            </p>
            <div className="h-9 border-b border-slate-500 w-44 flex items-end justify-center pb-1">
              <span className="font-serif italic text-xs text-slate-700 font-bold">HR & Operations Dept</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">HUMAN RESOURCES MANAGER</p>
          </div>
        </div>
      </div>
    </div>
  );
};
