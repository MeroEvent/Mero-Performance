'use client';

import React from 'react';
import { Calendar, DollarSign } from 'lucide-react';

interface LeavePayrollSectionProps {
  companyRules: any;
  onChangeRules: (updated: any) => void;
}

export const LeavePayrollSection: React.FC<LeavePayrollSectionProps> = ({
  companyRules,
  onChangeRules,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Leave Quotas */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Calendar className="w-5 h-5 text-rose-500" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Annual Company Leave Quotas</h3>
            <p className="text-xs text-slate-400">Standard annual leave balances allocated to each full-time employee</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Casual Leave (CL)</span>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="60"
                value={companyRules.casual_leave_quota ?? 10}
                onChange={(e) => onChangeRules({ ...companyRules, casual_leave_quota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Days/Yr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Sick Leave (SL)</span>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="60"
                value={companyRules.sick_leave_quota ?? 12}
                onChange={(e) => onChangeRules({ ...companyRules, sick_leave_quota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Days/Yr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Annual Vacation Leave</span>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="60"
                value={companyRules.annual_leave_quota ?? 15}
                onChange={(e) => onChangeRules({ ...companyRules, annual_leave_quota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Days/Yr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">Maternity Leave</span>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="180"
                value={companyRules.maternity_leave_quota ?? 60}
                onChange={(e) => onChangeRules({ ...companyRules, maternity_leave_quota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Days/Yr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-1">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">Compensatory Off (Comp-Off)</span>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="30"
                value={companyRules.comp_off_quota ?? 5}
                onChange={(e) => onChangeRules({ ...companyRules, comp_off_quota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Days/Yr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-500/5 border border-slate-500/20 space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Max Carry-Over to Next Year</span>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="30"
                value={companyRules.max_carry_over_days ?? 5}
                onChange={(e) => onChangeRules({ ...companyRules, max_carry_over_days: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-500">Max Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll & Overtime */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Payroll & Overtime Policies</h3>
            <p className="text-xs text-slate-400">Benchmark working days, overtime pay multipliers, and deduction rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Monthly Standard Working Days
            </label>
            <input
              type="number"
              min="20"
              max="31"
              value={companyRules.standard_working_days_per_month ?? 26}
              onChange={(e) => onChangeRules({ ...companyRules, standard_working_days_per_month: parseInt(e.target.value) || 26 })}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Benchmark days for daily wage calculation</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Overtime Pay Multiplier
            </label>
            <input
              type="number"
              step="0.25"
              min="1.0"
              max="3.0"
              value={companyRules.overtime_multiplier ?? 1.5}
              onChange={(e) => onChangeRules({ ...companyRules, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Hourly rate multiplied by this rate</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Unexcused Absence Wage Deduction
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="2.0"
              value={companyRules.unexcused_absence_deduction_rate ?? 1.0}
              onChange={(e) => onChangeRules({ ...companyRules, unexcused_absence_deduction_rate: parseFloat(e.target.value) || 1.0 })}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Day wage deduction per unexcused absence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
