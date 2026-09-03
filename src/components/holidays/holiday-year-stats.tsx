'use client';

import React, { useState, useMemo } from 'react';
import { toAD, getMonthDays, today as getTodayBS } from 'nepali-calendar-engine';
import { 
  Briefcase, 
  Calendar, 
  Sparkles, 
  Clock, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

interface HolidayYearStatsProps {
  holidays: any[];
  onSelectDate?: (dateStr: string) => void;
}

const NEPALI_MONTHS = [
  { index: 1, nameNe: 'बैशाख', nameEn: 'Baishakh' },
  { index: 2, nameNe: 'जेठ', nameEn: 'Jestha' },
  { index: 3, nameNe: 'असार', nameEn: 'Ashadh' },
  { index: 4, nameNe: 'श्रावण', nameEn: 'Shrawan' },
  { index: 5, nameNe: 'भदौ', nameEn: 'Bhadra' },
  { index: 6, nameNe: 'असोज', nameEn: 'Ashwin' },
  { index: 7, nameNe: 'कात्तिक', nameEn: 'Kartik' },
  { index: 8, nameNe: 'मंसिर', nameEn: 'Mangsir' },
  { index: 9, nameNe: 'पौष', nameEn: 'Poush' },
  { index: 10, nameNe: 'माघ', nameEn: 'Magh' },
  { index: 11, nameNe: 'फाल्गुन', nameEn: 'Falgun' },
  { index: 12, nameNe: 'चैत्र', nameEn: 'Chaitra' },
];

export const HolidayYearStats: React.FC<HolidayYearStatsProps> = ({
  holidays,
}) => {
  const currentBs = useMemo(() => {
    try {
      return getTodayBS().bs;
    } catch {
      return { year: 2083, month: 5, day: 3 };
    }
  }, []);

  const [selectedBsYear, setSelectedBsYear] = useState<number>(currentBs.year);

  // Calculate monthly stats for the selected BS year
  const monthlyStats = useMemo(() => {
    return NEPALI_MONTHS.map((m) => {
      let totalDays = 30;
      try {
        totalDays = getMonthDays(selectedBsYear, m.index);
      } catch {
        totalDays = 30;
      }

      let saturdays = 0;
      const matchedHolidays: any[] = [];
      let paidHolidays = 0;
      let unpaidHolidays = 0;

      let firstAdDate: Date | null = null;
      let lastAdDate: Date | null = null;

      for (let day = 1; day <= totalDays; day++) {
        try {
          const adDate = toAD({ year: selectedBsYear, month: m.index, day });
          if (day === 1) firstAdDate = adDate;
          if (day === totalDays) lastAdDate = adDate;

          const isSat = adDate.getDay() === 6;
          if (isSat) {
            saturdays++;
          }

          // Check if this date has a registered holiday
          const adDateStr = adDate.toISOString().split('T')[0];
          const holidayMatch = holidays.find((h) => h.date === adDateStr);

          if (holidayMatch) {
            matchedHolidays.push({
              ...holidayMatch,
              day,
              isSaturday: isSat,
            });

            if (!isSat) {
              if (holidayMatch.is_paid !== false) {
                paidHolidays++;
              } else {
                unpaidHolidays++;
              }
            }
          }
        } catch {
          // Fallback
        }
      }

      const totalHolidaysExcludingSaturday = paidHolidays + unpaidHolidays;
      const workingDays = Math.max(0, totalDays - saturdays - totalHolidaysExcludingSaturday);
      const workingPercentage = Math.round((workingDays / totalDays) * 100);

      const dateRangeStr =
        firstAdDate && lastAdDate
          ? `${firstAdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastAdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : '';

      return {
        ...m,
        totalDays,
        saturdays,
        matchedHolidays,
        paidHolidays,
        unpaidHolidays,
        totalHolidaysExcludingSaturday,
        workingDays,
        workingPercentage,
        dateRangeStr,
        isCurrentMonth: selectedBsYear === currentBs.year && m.index === currentBs.month,
      };
    });
  }, [selectedBsYear, holidays, currentBs]);

  // Annual Totals
  const annualTotals = useMemo(() => {
    const totalDays = monthlyStats.reduce((acc, m) => acc + m.totalDays, 0);
    const totalSaturdays = monthlyStats.reduce((acc, m) => acc + m.saturdays, 0);
    const totalPaidHolidays = monthlyStats.reduce((acc, m) => acc + m.paidHolidays, 0);
    const totalUnpaidHolidays = monthlyStats.reduce((acc, m) => acc + m.unpaidHolidays, 0);
    const totalWorkingDays = monthlyStats.reduce((acc, m) => acc + m.workingDays, 0);
    const workingRate = Math.round((totalWorkingDays / totalDays) * 100);

    return {
      totalDays,
      totalSaturdays,
      totalPaidHolidays,
      totalUnpaidHolidays,
      totalNonWeekendHolidays: totalPaidHolidays + totalUnpaidHolidays,
      totalWorkingDays,
      workingRate,
    };
  }, [monthlyStats]);

  return (
    <div className="space-y-5">
      {/* Clean Header with Year Navigator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            वि.सं. {selectedBsYear} Annual Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Working days and holiday distribution across Baishakh – Chaitra
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSelectedBsYear((y) => y - 1)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-colors"
            title="Previous Year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold px-2 text-slate-800 dark:text-slate-200">
            {selectedBsYear} B.S.
          </span>
          <button
            onClick={() => setSelectedBsYear((y) => y + 1)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-colors"
            title="Next Year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Minimal Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Working Days */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Working Days</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {annualTotals.totalWorkingDays}
            </span>
            <span className="text-[11px] font-medium text-slate-400">days</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {annualTotals.workingRate}% of the year
          </p>
        </div>

        {/* Holidays */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Official Holidays</span>
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {annualTotals.totalNonWeekendHolidays}
            </span>
            <span className="text-[11px] font-medium text-slate-400">days</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {annualTotals.totalPaidHolidays} Paid · {annualTotals.totalUnpaidHolidays} Unpaid
          </p>
        </div>

        {/* Saturdays */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Saturdays Off</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {annualTotals.totalSaturdays}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Saturdays</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Default weekend</p>
        </div>

        {/* Calendar Days */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Days</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {annualTotals.totalDays}
            </span>
            <span className="text-[11px] font-medium text-slate-400">days</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">12 B.S. months</p>
        </div>
      </div>

      {/* Clean Monthly Table (Baishakh to Chaitra) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Date Range</th>
                <th className="py-3 px-4 text-center">Days</th>
                <th className="py-3 px-4 text-center">Saturdays</th>
                <th className="py-3 px-4 text-center">Holidays</th>
                <th className="py-3 px-4 text-center">Working Days</th>
                <th className="py-3 px-4">Working Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {monthlyStats.map((m) => (
                <tr
                  key={m.index}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    m.isCurrentMonth
                      ? 'bg-blue-50/30 dark:bg-blue-950/20 font-semibold'
                      : ''
                  }`}
                >
                  {/* Month Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {m.nameNe}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({m.nameEn})
                      </span>
                      {m.isCurrentMonth && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-600 text-white">
                          Current
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date Range */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {m.dateRangeStr}
                  </td>

                  {/* Total Days */}
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {m.totalDays}
                  </td>

                  {/* Saturdays */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
                      {m.saturdays} Sat
                    </span>
                  </td>

                  {/* Official Holidays */}
                  <td className="py-3.5 px-4 text-center">
                    {m.matchedHolidays.length > 0 ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                          {m.totalHolidaysExcludingSaturday} Holidays
                        </span>
                        <div className="flex flex-wrap gap-1 justify-center max-w-xs">
                          {m.matchedHolidays.map((h, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate"
                              title={`${h.name} (${h.date})`}
                            >
                              {h.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-mono">0</span>
                    )}
                  </td>

                  {/* Total Working Days */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40">
                      {m.workingDays} Days
                    </span>
                  </td>

                  {/* Progress Bar */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 min-w-[100px]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <span>{m.workingPercentage}%</span>
                        <span>{m.workingDays}/{m.totalDays}d</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${m.workingPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
