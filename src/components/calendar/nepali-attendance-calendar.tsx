'use client';

import React, { useState, useMemo } from 'react';
import { AttendanceRecord } from '@/types';
import { toBS, today as getTodayBS, getMonthDays, toAD } from 'nepali-calendar-engine';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { formatDateDisplay, formatTime } from '@/lib/utils/attendance';

interface NepaliAttendanceCalendarProps {
  records: AttendanceRecord[];
  userId: string;
}

const NEPALI_MONTH_NAMES = [
  { en: 'Baisakh', ne: 'वैशाख' },
  { en: 'Jestha', ne: 'जेठ' },
  { en: 'Ashadh', ne: 'असार' },
  { en: 'Shrawan', ne: 'साउन' },
  { en: 'Bhadra', ne: 'भदौ' },
  { en: 'Ashwin', ne: 'असोज' },
  { en: 'Kartik', ne: 'कात्तिक' },
  { en: 'Mangsir', ne: 'मंसिर' },
  { en: 'Poush', ne: 'पुस' },
  { en: 'Magh', ne: 'माघ' },
  { en: 'Falgun', ne: 'फागुन' },
  { en: 'Chaitra', ne: 'चैत' },
];

const WEEKDAYS = [
  { en: 'Sun', ne: 'आइत' },
  { en: 'Mon', ne: 'सोम' },
  { en: 'Tue', ne: 'मंगल' },
  { en: 'Wed', ne: 'बुध' },
  { en: 'Thu', ne: 'बिही' },
  { en: 'Fri', ne: 'शुक्र' },
  { en: 'Sat', ne: 'शनि' },
];

export const NepaliAttendanceCalendar: React.FC<NepaliAttendanceCalendarProps> = ({
  records,
  userId,
}) => {
  const todayInfo = useMemo(() => getTodayBS(), []);
  const [currentYear, setCurrentYear] = useState<number>(todayInfo.bs.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayInfo.bs.month); // 1-12
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<{ ad: string; bs: string } | null>(null);

  // Month days count in BS
  const totalDaysInMonth = useMemo(() => {
    try {
      return getMonthDays(currentYear, currentMonth);
    } catch {
      return 30;
    }
  }, [currentYear, currentMonth]);

  // First day of month to determine offset
  const firstDayWeekday = useMemo(() => {
    try {
      const adDate = toAD({ year: currentYear, month: currentMonth, day: 1 });
      return adDate.getDay(); // 0 = Sun
    } catch {
      return 0;
    }
  }, [currentYear, currentMonth]);

  // Map attendance records by date YYYY-MM-DD
  const userRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records
      .filter((r) => r.user_id === userId)
      .forEach((r) => {
        map.set(r.date, r);
      });
    return map;
  }, [records, userId]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const cells = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push({ isPadding: true, dayBS: 0, dateADStr: '', isToday: false });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      let adDateStr = '';
      try {
        const ad = toAD({ year: currentYear, month: currentMonth, day });
        adDateStr = ad.toISOString().split('T')[0];
      } catch (e) {
        adDateStr = '';
      }

      const isToday =
        currentYear === todayInfo.bs.year &&
        currentMonth === todayInfo.bs.month &&
        day === todayInfo.bs.day;

      cells.push({
        isPadding: false,
        dayBS: day,
        dateADStr: adDateStr,
        isToday,
      });
    }

    return cells;
  }, [currentYear, currentMonth, firstDayWeekday, totalDaysInMonth, todayInfo]);

  const monthName = NEPALI_MONTH_NAMES[currentMonth - 1] || { en: 'Bhadra', ne: 'भदौ' };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-500 shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Attendance Calendar (BS / AD)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dual-calendar view for tracking past attendance history
            </p>
          </div>

          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center px-2">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {monthName.ne} ({monthName.en}) {currentYear}
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
          {WEEKDAYS.map((w, i) => (
            <div key={w.en} className={`py-1.5 rounded-xl ${i === 6 ? 'text-rose-500' : ''}`}>
              <span>{w.ne}</span>
              <span className="hidden sm:inline text-[9px] font-normal text-slate-400 ml-0.5">({w.en})</span>
            </div>
          ))}
        </div>

        {/* Days Grid - Optimized for Mobile & Desktop */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell, idx) => {
            if (cell.isPadding) {
              return <div key={`pad-${idx}`} className="min-h-[52px] sm:h-20 rounded-xl sm:rounded-2xl bg-slate-50/30 dark:bg-slate-950/20" />;
            }

            const record = cell.dateADStr ? userRecordsMap.get(cell.dateADStr) : undefined;
            const isWeekend = (idx % 7) === 6; // Saturday in Nepal

            let statusBadgeClass = '';
            let statusDot = null;
            if (record) {
              if (record.status === 'on_time') {
                statusBadgeClass = 'border-emerald-500/40 bg-emerald-500/10';
                statusDot = <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />;
              } else if (record.status === 'late' || record.status === 'very_late') {
                statusBadgeClass = 'border-amber-500/40 bg-amber-500/10';
                statusDot = <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0" />;
              } else if (record.status === 'absent') {
                statusBadgeClass = 'border-rose-500/40 bg-rose-500/10';
                statusDot = <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shrink-0" />;
              } else if (record.status === 'on_leave') {
                statusBadgeClass = 'border-blue-500/40 bg-blue-500/10';
                statusDot = <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 shrink-0" />;
              }
            }

            return (
              <div
                key={`day-${cell.dayBS}`}
                onClick={() => {
                  if (record) {
                    setSelectedRecord(record);
                    setSelectedDateInfo({
                      ad: cell.dateADStr,
                      bs: `${monthName.ne} ${cell.dayBS}, ${currentYear}`,
                    });
                  }
                }}
                className={`min-h-[52px] sm:h-20 p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-95 ${
                  cell.isToday
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/30'
                    : record
                    ? statusBadgeClass
                    : isWeekend
                    ? 'border-rose-200/50 dark:border-rose-950/50 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top: BS Day + AD Day */}
                <div className="flex items-center justify-between leading-none">
                  <span
                    className={`font-mono text-xs sm:text-sm font-extrabold ${
                      isWeekend ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {cell.dayBS}
                  </span>

                  {cell.dateADStr && (
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-mono">
                      {new Date(cell.dateADStr).getDate()}
                    </span>
                  )}
                </div>

                {/* Bottom: Status Indicator */}
                <div className="flex items-center justify-between mt-1">
                  {statusDot ? (
                    <div className="flex items-center gap-1">
                      {statusDot}
                      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300 truncate">
                        {record?.status === 'on_time'
                          ? 'Present'
                          : record?.status === 'late'
                          ? 'Late'
                          : record?.status}
                      </span>
                    </div>
                  ) : isWeekend ? (
                    <span className="text-[8px] sm:text-[10px] text-rose-400 font-medium">Sat</span>
                  ) : (
                    <span className="text-[9px] text-slate-300 dark:text-slate-600 hidden sm:inline">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-300" />
            <span>Saturday Off</span>
          </div>
        </div>
      </Card>

      {/* Selected Day Details Modal / Bottom Drawer for Mobile */}
      {selectedRecord && selectedDateInfo && (
        <Card className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase">Attendance Record Details</p>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
              {selectedDateInfo.bs} ({formatDateDisplay(selectedDateInfo.ad)})
            </h4>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                In: <strong>{formatTime(selectedRecord.check_in_time)}</strong>
              </span>
              <span>
                Out: <strong>{formatTime(selectedRecord.check_out_time)}</strong>
              </span>
              <span>
                Worked: <strong>{selectedRecord.total_hours.toFixed(2)} hrs</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-500/20">
            <StatusBadge status={selectedRecord.status} />
            <button
              onClick={() => setSelectedRecord(null)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              Close
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};
