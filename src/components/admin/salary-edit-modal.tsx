'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface SalaryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode?: 'base_salary' | 'override' | 'unified';
  item: any | null;
  month: number;
  year: number;
}

export const SalaryEditModal: React.FC<SalaryEditModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  mode = 'unified',
  item,
  month,
  year,
}) => {
  const [hasCustomOverride, setHasCustomOverride] = useState<boolean>(false);
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'paid'>('pending');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      const isOverridden = item.admin_override !== null && item.admin_override !== undefined;
      setHasCustomOverride(isOverridden || mode === 'override');
      setOverrideAmount(isOverridden ? String(item.admin_override) : '');
      setOverrideReason(item.override_reason || '');
      setPaymentStatus((item.payment_status || 'pending').toLowerCase() as any);
    } else {
      setHasCustomOverride(false);
      setOverrideAmount('');
      setOverrideReason('');
      setPaymentStatus('pending');
    }
    setError('');
  }, [item, isOpen, mode]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError('');

      let finalOverrideVal: number | null = null;
      if (hasCustomOverride && overrideAmount.trim() !== '') {
        finalOverrideVal = parseFloat(overrideAmount);
        if (isNaN(finalOverrideVal) || finalOverrideVal < 0) {
          setError('Please enter a valid custom net salary amount.');
          return;
        }
        if (!overrideReason.trim()) {
          setError('Please provide a short reason for the manual salary adjustment.');
          return;
        }
      }

      const res = await fetch('/api/admin/salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_employee_payroll',
          user_id: item.user_id,
          month,
          year,
          admin_override: finalOverrideVal,
          override_reason: hasCustomOverride && finalOverrideVal !== null ? overrideReason.trim() : null,
          payment_status: paymentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update payroll records');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoNetCalculated = Math.round(Number(item.net_salary || 0));
  const deductionsAmount = Math.round(Number(item.deduction_amount || 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Adjustment & Disbursement"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-0.5">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Employee Identity Header */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={
                item.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.employee_name || 'Staff')}`
              }
              alt={item.employee_name || 'Staff'}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
            />
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {item.employee_name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {item.position} • {item.department_name}
              </p>
            </div>
          </div>
          <span className="text-[11px] tabular-nums font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200">
            {month}/{year}
          </span>
        </div>

        {/* Attendance & Salary Calculation Snapshot (Base Salary Read-Only) */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Calculation Snapshot</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {item.working_days || 0} Work Days · {item.days_present || 0} Present · {item.unauthorized_absences || 0} Absent
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Base Salary</span>
              <span className="tabular-nums font-bold text-slate-800 dark:text-slate-200 text-sm">
                Rs. {Number(item.base_salary || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">From Staff Profile</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Deductions</span>
              <span className="tabular-nums font-bold text-rose-600 dark:text-rose-400 text-sm">
                {deductionsAmount > 0 ? `-Rs. ${deductionsAmount.toLocaleString()}` : 'Rs. 0'}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">{item.unauthorized_absences || 0}d Absent</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Calculated Net</span>
              <span className="tabular-nums font-black text-slate-900 dark:text-white text-sm">
                Rs. {autoNetCalculated.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Formula Output</span>
            </div>
          </div>
        </div>

        {/* Section 3: Manual Net Salary Override */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasCustomOverride}
                onChange={(e) => {
                  setHasCustomOverride(e.target.checked);
                  if (!e.target.checked) {
                    setOverrideAmount('');
                    setOverrideReason('');
                  } else if (!overrideAmount) {
                    setOverrideAmount(String(autoNetCalculated));
                  }
                }}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:bg-slate-800 focus:ring-slate-900 cursor-pointer"
              />
              <span>Custom Net Salary Override</span>
            </label>
            {hasCustomOverride && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                Override Active
              </span>
            )}
          </div>

          {hasCustomOverride && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Custom Net Amount (in Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required={hasCustomOverride}
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(e.target.value)}
                    placeholder="Enter custom net salary amount"
                    className="w-full pl-10 pr-4 py-2.5 text-sm tabular-nums font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Adjustment Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={hasCustomOverride}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Performance bonus, emergency advance deduction, medical waiver"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Payment Status Selector */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
          <label className="text-xs font-bold text-slate-900 dark:text-white block">
            Payment Disbursement Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['pending', 'processing', 'paid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setPaymentStatus(st)}
                className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer ${
                  paymentStatus === st
                    ? st === 'paid'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : st === 'processing'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
