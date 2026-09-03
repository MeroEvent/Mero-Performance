'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string | null;
  is_paid?: boolean;
}

export const UpcomingHolidaysWidget: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchHolidays = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/holidays?upcoming=true&limit=4');
      const data = await res.json();
      if (data.holidays) {
        setHolidays(data.holidays);
      }
    } catch (err) {
      console.error('Failed to load upcoming holidays:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const getRelativeCountdown = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: 'Today', isToday: true };
    }
    if (diffDays === 1) {
      return { label: 'Tomorrow', isToday: false };
    }
    if (diffDays <= 7) {
      return { label: `In ${diffDays} days`, isToday: false };
    }
    if (diffDays <= 30) {
      return { label: `In ${diffDays} days`, isToday: false };
    }
    return { label: `In ${Math.ceil(diffDays / 30)} mo`, isToday: false };
  };

  const formatHolidayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = String(d).padStart(2, '0');
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    return { month, day, weekday };
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayHoliday = holidays.find((h) => h.date === todayStr);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Classic Minimalist Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Upcoming Holidays
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Official paid days off
              </p>
            </div>
          </div>

          <button
            onClick={fetchHolidays}
            title="Refresh"
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-slate-600' : ''}`} />
          </button>
        </div>

        {/* Today is a holiday notice */}
        {todayHoliday && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Today: {todayHoliday.name}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
              Office Closed
            </span>
          </div>
        )}

        {/* Holiday Items */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-2.5 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-medium">No upcoming holidays scheduled</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {holidays.map((holiday) => {
              const { month, day, weekday } = formatHolidayDate(holiday.date);
              const countdown = getRelativeCountdown(holiday.date);

              return (
                <div
                  key={holiday.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group transition-colors"
                >
                  {/* Date Badge & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Clean Minimal Date Box */}
                    <div className="w-10 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center justify-center shrink-0 text-center">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none">
                        {month}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight mt-0.5">
                        {day}
                      </span>
                    </div>

                    {/* Holiday Title & Subtitle */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {holiday.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {weekday} {holiday.description ? `· ${holiday.description}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Single Clean Countdown Badge */}
                  <div className="shrink-0 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      countdown.isToday
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/60'
                    }`}>
                      {countdown.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subtle Minimal Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Company Calendar</span>
        <span className="font-mono text-[10px] text-slate-400/80">Automated</span>
      </div>
    </div>
  );
};
