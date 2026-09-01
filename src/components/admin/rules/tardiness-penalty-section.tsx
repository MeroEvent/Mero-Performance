'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface TardinessPenaltySectionProps {
  companyRules: any;
  onChangeRules: (updated: any) => void;
}

export const TardinessPenaltySection: React.FC<TardinessPenaltySectionProps> = ({
  companyRules,
  onChangeRules,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Repeated Tardiness Penalty Conversion
            </h3>
            <p className="text-xs text-slate-400">
              Automatic disciplinary conversion of accumulated severe late check-ins into leave deductions
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Rule: Every <span className="font-black text-rose-600 dark:text-rose-400">{companyRules.very_late_to_absent_count || 4} "Very Late"</span> arrivals in a month = <span className="font-black text-rose-600 dark:text-rose-400">1 Day Absent Deduction</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Deducted automatically from leave balance at month-end. Resets clean on the 1st of each calendar month.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conversion Count:</span>
            <input
              type="number"
              min="1"
              max="10"
              value={companyRules.very_late_to_absent_count || 4}
              onChange={(e) => onChangeRules({ ...companyRules, very_late_to_absent_count: parseInt(e.target.value) || 4 })}
              className="w-16 px-2.5 py-1.5 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
