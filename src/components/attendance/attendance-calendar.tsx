'use client';

import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus } from '@/types';
import { formatDateDisplay, formatTime, getStatusBadge } from '@/lib/utils/attendance';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ records }) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthName = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const getRecordForDay = (dayNum: number): AttendanceRecord | undefined => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return records.find((r) => r.date === dateStr);
  };

  const getDayStatusStyle = (dayNum: number, record?: AttendanceRecord) => {
    const dateObj = new Date(year, month, dayNum);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    if (!record) {
      if (isWeekend) return 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 border-dashed border-slate-200 dark:border-slate-800';
      // Future or unrecorded weekday
      if (dateObj > new Date()) return 'bg-transparent text-slate-500 border border-slate-100 dark:border-slate-800/60';
      return 'bg-rose-500/10 text-rose-600 border border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400';
    }

    switch (record.status) {
      case 'on_time':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25';
      case 'late':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25';
      case 'very_late':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 hover:bg-orange-500/25';
      case 'half_day':
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25';
      case 'absent':
      default:
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25';
    }
  };

  const daysHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
              Attendance Calendar
            </CardTitle>
            <CardDescription>Color-coded view of daily check-ins and attendance records</CardDescription>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 px-3 font-mono">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> On Time
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> Late
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500" /> Very Late
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" /> Absent
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400" /> Weekend / Holiday
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {daysHeader.map((d) => (
            <div key={d} className="text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Blank offset boxes */}
          {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
            <div key={`blank-${idx}`} className="h-20 rounded-xl bg-slate-50/40 dark:bg-slate-950/20" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const record = getRecordForDay(dayNum);
            const styleClasses = getDayStatusStyle(dayNum, record);
            const isToday =
              dayNum === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => record && setSelectedRecord(record)}
                className={`h-20 rounded-xl p-2 cursor-pointer transition-all duration-150 flex flex-col justify-between relative group ${styleClasses} ${
                  isToday ? 'ring-2 ring-blue-500 shadow-md font-bold' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono">{dayNum}</span>
                  {isToday && (
                    <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase">
                      Today
                    </span>
                  )}
                </div>

                {record ? (
                  <div className="text-[10px] space-y-0.5">
                    <p className="font-semibold truncate">{formatTime(record.check_in_time)}</p>
                    <p className="opacity-80 font-mono text-[9.5px]">
                      {record.total_hours ? `${record.total_hours.toFixed(1)} hrs` : 'In Shift'}
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 opacity-60">--</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Record Detail Popup */}
        {selectedRecord && (
          <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Date Details: {formatDateDisplay(selectedRecord.date)}</p>
              <div className="flex items-center gap-4 text-xs mt-1 text-slate-300">
                <span>Check-in: <strong>{formatTime(selectedRecord.check_in_time)}</strong></span>
                <span>Check-out: <strong>{formatTime(selectedRecord.check_out_time)}</strong></span>
                <span>Total Worked: <strong>{selectedRecord.total_hours.toFixed(2)} hrs</strong></span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
