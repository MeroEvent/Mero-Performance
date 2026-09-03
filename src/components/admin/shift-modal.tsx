'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Clock, Compass, Building2, Globe, Sparkles, Timer, LogOut, ShieldAlert } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  shift: any | null;
  companyId: string;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  shift,
  companyId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    start_time: '09:00',
    end_time: '17:00',
    is_flexible: false,
    color: 'blue',
    allow_remote_checkin: false,
    require_wifi: false,
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    early_checkin_window_minutes: 5,
    auto_checkout_enabled: true,
    auto_checkout_buffer_minutes: 30,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically compute Full Day & Half Day hours from Start and End times
  const calculatedHours = (() => {
    if (formData.is_flexible) {
      return { full: 8.0, half: 4.0 };
    }
    const [sh, sm] = (formData.start_time || '09:00').split(':').map(Number);
    const [eh, em] = (formData.end_time || '17:00').split(':').map(Number);
    let diffMinutes = ((eh || 17) * 60 + (em || 0)) - ((sh || 9) * 60 + (sm || 0));
    if (diffMinutes < 0) diffMinutes += 1440;
    const full = Number((diffMinutes / 60).toFixed(2));
    const half = Number((full / 2).toFixed(2));
    return { full, half };
  })();

  useEffect(() => {
    if (shift) {
      setFormData({
        name: shift.name || '',
        display_name: shift.display_name || '',
        description: shift.description || '',
        start_time: shift.start_time ? shift.start_time.slice(0, 5) : '09:00',
        end_time: shift.end_time ? shift.end_time.slice(0, 5) : '17:00',
        is_flexible: Boolean(shift.is_flexible),
        color: shift.color || 'blue',
        allow_remote_checkin: shift.allow_remote_checkin !== undefined ? Boolean(shift.allow_remote_checkin) : Boolean(shift.is_flexible),
        require_wifi: Boolean(shift.require_wifi),
        grace_period_minutes: shift.grace_period_minutes ?? 15,
        late_threshold_minutes: shift.late_threshold_minutes ?? 30,
        early_checkin_window_minutes: shift.early_checkin_window_minutes ?? 5,
        auto_checkout_enabled: shift.auto_checkout_enabled !== false,
        auto_checkout_buffer_minutes: shift.auto_checkout_buffer_minutes ?? 30,
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        start_time: '09:00',
        end_time: '17:00',
        is_flexible: false,
        color: 'blue',
        allow_remote_checkin: false,
        require_wifi: false,
        grace_period_minutes: 15,
        late_threshold_minutes: 30,
        early_checkin_window_minutes: 5,
        auto_checkout_enabled: true,
        auto_checkout_buffer_minutes: 30,
      });
    }
    setError('');
  }, [shift, isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.display_name.trim()) {
      setError('Please provide a shift name');
      return;
    }

    setIsLoading(true);
    setError('');

    const shiftData = {
      ...formData,
      name: formData.name || formData.display_name.toLowerCase().replace(/\s+/g, '_'),
      start_time: formData.is_flexible ? null : `${formData.start_time}:00`,
      end_time: formData.is_flexible ? null : `${formData.end_time}:00`,
      standard_hours: calculatedHours.full,
      minimum_hours: calculatedHours.half,
      company_id: companyId || 'c0000000-0000-0000-0000-000000000001',
    };

    try {
      let res;
      if (shift) {
        res = await fetch('/api/admin/shifts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: shift.id, ...shiftData }),
        });
      } else {
        res = await fetch('/api/admin/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shiftData),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save shift');
      }

      // Also sync company_rules early window and auto-checkout buffer
      try {
        await fetch('/api/admin/company-rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            early_checkin_window_minutes: formData.early_checkin_window_minutes,
            auto_checkout_enabled: formData.auto_checkout_enabled,
            auto_checkout_buffer_minutes: formData.auto_checkout_buffer_minutes,
            auto_checkout_penalty_status: 'absent',
            standard_start_time: `${formData.start_time}:00`,
            standard_end_time: `${formData.end_time}:00`,
            grace_period_minutes: formData.grace_period_minutes,
            late_threshold_minutes: formData.late_threshold_minutes,
          }),
        });
      } catch (syncErr) {
        console.warn('Company rules sync warning:', syncErr);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save shift');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={shift ? `Edit Shift: ${shift.display_name || shift.name}` : 'Create New Work Shift'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-2xl font-semibold">
            {error}
          </div>
        )}

        {/* 1. Basic Shift Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Shift Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Standard Shift, Morning Shift"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Identifier Code
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
              placeholder="e.g. standard_shift"
            />
          </div>
        </div>

        {/* 2. Schedule Timing Type */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Work Schedule Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_flexible: false })}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                !formData.is_flexible
                  ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-extrabold text-xs">Fixed Shift Hours</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Scheduled arrival with defined start & end times
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_flexible: true, allow_remote_checkin: true })}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                formData.is_flexible
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-xs">Flexible / Field Staff</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Anytime check-in with 8.0 hrs daily target
              </p>
            </button>
          </div>
        </div>

        {/* 3. Timings & Auto-Calculated Duration */}
        {!formData.is_flexible && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Start Time (Shift Begin)
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  End Time (Shift Conclusion)
                </label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>
            </div>

            {/* Auto Calculation Preview */}
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-bold text-blue-900 dark:text-blue-200 text-xs">
                  Duration:
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-extrabold text-xs">
                <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  Full Day: {calculatedHours.full} hrs
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  Half Day: {calculatedHours.half} hrs
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              💡 Leaving before completing <strong>{calculatedHours.half} hrs</strong> marks attendance as <strong>Absent</strong>.
            </p>
          </div>
        )}

        {/* 4. Early Check-In Window & Punctuality Tolerances */}
        {!formData.is_flexible && (
          <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-blue-600" /> Early Check-In Window & Grace
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {formData.early_checkin_window_minutes}m before start
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Allowed Early Check-In
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.early_checkin_window_minutes}
                    onChange={(e) => setFormData({ ...formData, early_checkin_window_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold"
                  />
                  <span className="text-[10px] text-slate-400">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  On-Time Grace
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.grace_period_minutes}
                    onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold"
                  />
                  <span className="text-[10px] text-slate-400">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Late Threshold
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={formData.late_threshold_minutes}
                    onChange={(e) => setFormData({ ...formData, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold"
                  />
                  <span className="text-[10px] text-slate-400">mins</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/40 p-2 rounded-xl">
              💡 If shift starts at <strong>{formData.start_time}</strong> with <strong>{formData.early_checkin_window_minutes}m</strong> window, staff can check in from <strong>{(() => {
                const [h, m] = (formData.start_time || '09:00').split(':').map(Number);
                const totalM = (h || 9) * 60 + (m || 0) - formData.early_checkin_window_minutes;
                const eh = Math.floor((totalM + 1440) % 1440 / 60);
                const em = (totalM + 1440) % 60;
                return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
              })()}</strong> onwards. Any earlier is blocked.
            </p>
          </div>
        )}

        {/* 5. Auto-Checkout & Absent Penalty Policy */}
        {!formData.is_flexible && (
          <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <LogOut className="w-4 h-4 text-rose-600" /> Auto-Checkout & Absent Penalty
              </span>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_checkout_enabled}
                  onChange={(e) => setFormData({ ...formData, auto_checkout_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {formData.auto_checkout_enabled && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Auto-Checkout Buffer after Shift End:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={formData.auto_checkout_buffer_minutes}
                      onChange={(e) => setFormData({ ...formData, auto_checkout_buffer_minutes: parseInt(e.target.value) || 30 })}
                      className="w-16 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">mins after end</span>
                  </div>
                </div>

                <p className="text-[10px] text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/40 p-2 rounded-xl">
                  💡 If shift ends at <strong>{formData.end_time}</strong>, staff must check out before <strong>{(() => {
                    const [h, m] = (formData.end_time || '17:00').split(':').map(Number);
                    const totalM = (h || 17) * 60 + (m || 0) + formData.auto_checkout_buffer_minutes;
                    const eh = Math.floor((totalM + 1440) % 1440 / 60);
                    const em = (totalM + 1440) % 60;
                    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
                  })()}</strong>. If they forget, session auto-closes and status is marked <strong>ABSENT</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 6. Workplace Location Policy */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Workplace Location Policy
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, allow_remote_checkin: false })}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                !formData.allow_remote_checkin
                  ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Office Only</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, allow_remote_checkin: true })}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                formData.allow_remote_checkin
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Field / Anywhere</span>
              </div>
            </button>
          </div>
        </div>

        {/* 7. Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} className="font-bold text-xs shadow-xs px-5 cursor-pointer">
            {shift ? 'Save Shift' : 'Create Shift'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
