'use client';

import React from 'react';
import { Clock, Timer, Building2, LogOut, Sparkles } from 'lucide-react';

interface TimeManagementSectionProps {
  companyRules: any;
  selectedShift: any;
  onChangeRules: (updated: any) => void;
  onChangeShift?: (updatedShift: any) => void;
}

export const TimeManagementSection: React.FC<TimeManagementSectionProps> = ({
  companyRules,
  selectedShift,
  onChangeRules,
  onChangeShift,
}) => {
  const workDayOptions = [
    { day: 0, label: 'Sun', full: 'Sunday' },
    { day: 1, label: 'Mon', full: 'Monday' },
    { day: 2, label: 'Tue', full: 'Tuesday' },
    { day: 3, label: 'Wed', full: 'Wednesday' },
    { day: 4, label: 'Thu', full: 'Thursday' },
    { day: 5, label: 'Fri', full: 'Friday' },
    { day: 6, label: 'Sat', full: 'Saturday' },
  ];

  const toggleWorkDay = (dayNum: number) => {
    const current = companyRules.work_days || [1, 2, 3, 4, 5];
    const exists = current.includes(dayNum);
    const updated = exists ? current.filter((d: number) => d !== dayNum) : [...current, dayNum].sort();
    onChangeRules({ ...companyRules, work_days: updated });
  };

  const currentStartTime = selectedShift?.start_time?.slice(0, 5) || companyRules.standard_start_time?.slice(0, 5) || '10:00';
  const currentEndTime = selectedShift?.end_time?.slice(0, 5) || companyRules.standard_end_time?.slice(0, 5) || '17:00';
  const currentGrace = selectedShift?.grace_period_minutes ?? companyRules.grace_period_minutes ?? 15;
  const currentLateThreshold = selectedShift?.late_threshold_minutes ?? companyRules.late_threshold_minutes ?? 30;
  const currentEarlyWindow = companyRules.early_checkin_window_minutes ?? 15;
  const autoCheckoutBuffer = companyRules.auto_checkout_buffer_minutes ?? 30;
  const autoCheckoutPenaltyStatus = companyRules.auto_checkout_penalty_status || 'absent';

  // Calculate Shift Full Day & Half Day automatically from Start and End Times
  const calculatedDuration = (() => {
    const [sh, sm] = currentStartTime.split(':').map(Number);
    const [eh, em] = currentEndTime.split(':').map(Number);
    let diffMinutes = ((eh || 17) * 60 + (em || 0)) - ((sh || 10) * 60 + (sm || 0));
    if (diffMinutes < 0) diffMinutes += 1440;
    const fullHours = Number((diffMinutes / 60).toFixed(2));
    const halfHours = Number((fullHours / 2).toFixed(2));
    return { fullHours, halfHours, diffMinutes };
  })();

  const handleStartTimeChange = (val: string) => {
    const formatted = val.length === 5 ? `${val}:00` : val;
    if (selectedShift && onChangeShift) {
      onChangeShift({ ...selectedShift, start_time: formatted });
    }
    onChangeRules({ ...companyRules, standard_start_time: formatted });
  };

  const handleEndTimeChange = (val: string) => {
    const formatted = val.length === 5 ? `${val}:00` : val;
    if (selectedShift && onChangeShift) {
      onChangeShift({ ...selectedShift, end_time: formatted });
    }
    onChangeRules({ ...companyRules, standard_end_time: formatted });
  };

  const handleGraceChange = (mins: number) => {
    if (selectedShift && onChangeShift) {
      onChangeShift({ ...selectedShift, grace_period_minutes: mins });
    }
    onChangeRules({ ...companyRules, grace_period_minutes: mins });
  };

  const handleLateThresholdChange = (mins: number) => {
    if (selectedShift && onChangeShift) {
      onChangeShift({ ...selectedShift, late_threshold_minutes: mins });
    }
    onChangeRules({ ...companyRules, late_threshold_minutes: mins });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info & Dynamic Duration */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Shift Timings & Schedule</h3>
            <p className="text-xs text-slate-400">
              Configuring timings for: <strong className="text-slate-800 dark:text-slate-200">{selectedShift?.display_name || selectedShift?.name || 'Selected Shift'}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Start Time (Shift Begin)
            </label>
            <input
              type="time"
              value={currentStartTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              End Time (Shift Conclusion)
            </label>
            <input
              type="time"
              value={currentEndTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Auto-Calculated Shift Durations (Full Day vs Half Day) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Auto-Calculated Shift Requirements:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-black text-xs">
              Full Day: {calculatedDuration.fullHours} hrs
            </span>
            <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xs">
              Half Day: {calculatedDuration.halfHours} hrs
            </span>
          </div>
        </div>
      </div>

      {/* Punctuality & Check-In Window Tolerances */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Timer className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Check-In Window & Punctuality Tolerances</h3>
            <p className="text-xs text-slate-400">Configure how early staff can check in, plus on-time grace periods and late thresholds</p>
          </div>
        </div>

        {/* Early Check-In Window */}
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
              ⏱️ Allowed Early Check-In Window (Minutes before Shift Start)
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {currentEarlyWindow} mins before
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Employees can <strong>ONLY</strong> check in within this window before shift start. Any earlier attempt is blocked.
          </p>
          <div className="flex items-center gap-4 pt-1">
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={currentEarlyWindow}
              onChange={(e) => onChangeRules({ ...companyRules, early_checkin_window_minutes: parseInt(e.target.value) || 0 })}
              className="flex-1 accent-blue-600 cursor-pointer"
            />
            <input
              type="number"
              min="0"
              max="120"
              value={currentEarlyWindow}
              onChange={(e) => onChangeRules({ ...companyRules, early_checkin_window_minutes: parseInt(e.target.value) || 0 })}
              className="w-20 px-2 py-1 text-xs font-mono font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/40 p-2 rounded-xl">
            💡 <strong>Rule Example:</strong> If shift starts at <strong>{currentStartTime}</strong> with a <strong>{currentEarlyWindow} min</strong> window, staff can check in from <strong>{(() => {
              const [h, m] = currentStartTime.split(':').map(Number);
              const totalM = (h || 10) * 60 + (m || 0) - currentEarlyWindow;
              const eh = Math.floor((totalM + 1440) % 1440 / 60);
              const em = (totalM + 1440) % 60;
              return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
            })()}</strong> onwards. Checking in any earlier will be blocked.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Grace Period (On Time)</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                +{currentGrace} mins
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Check-in within this buffer window is counted as On Time.</p>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={currentGrace}
              onChange={(e) => handleGraceChange(parseInt(e.target.value) || 0)}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Late Threshold (Severe Late)</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                +{currentLateThreshold} mins
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Arrivals beyond this threshold are flagged as "Very Late".</p>
            <input
              type="range"
              min="5"
              max="120"
              step="1"
              value={currentLateThreshold}
              onChange={(e) => handleLateThresholdChange(parseInt(e.target.value) || 0)}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Auto-Checkout & Missed Check-Out Penalty */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <LogOut className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Auto-Checkout & Missed Check-Out Penalty</h3>
              <p className="text-xs text-slate-400">Automatically close unclosed sessions and assign penalty if staff forget to check out</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={companyRules.auto_checkout_enabled !== false}
              onChange={(e) => onChangeRules({ ...companyRules, auto_checkout_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-rose-600"></div>
          </label>
        </div>

        {companyRules.auto_checkout_enabled !== false && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  ⏳ Auto-Checkout Tolerance Buffer (Minutes after Shift End)
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  +{autoCheckoutBuffer} mins after end
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                If an employee does not check out within this buffer window after their shift ends, their session is automatically closed and marked with the penalty status below.
              </p>
              <div className="flex items-center gap-4 pt-1">
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={autoCheckoutBuffer}
                  onChange={(e) => onChangeRules({ ...companyRules, auto_checkout_buffer_minutes: parseInt(e.target.value) || 30 })}
                  className="flex-1 accent-rose-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={autoCheckoutBuffer}
                  onChange={(e) => onChangeRules({ ...companyRules, auto_checkout_buffer_minutes: parseInt(e.target.value) || 30 })}
                  className="w-20 px-2 py-1 text-xs font-mono font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enforced Penalty Status for Missed Check-Out
                </label>
                <select
                  value={autoCheckoutPenaltyStatus}
                  onChange={(e) => onChangeRules({ ...companyRules, auto_checkout_penalty_status: e.target.value })}
                  className="w-full sm:w-64 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="absent">🚨 Mark as Absent (Penalty)</option>
                  <option value="half_day">⚠️ Mark as Half Day Credit</option>
                  <option value="standard">Standard (No Penalty)</option>
                </select>
              </div>

              <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/40 p-2.5 rounded-xl">
                💡 <strong>Policy Example:</strong> If shift ends at <strong>{currentEndTime}</strong> with a <strong>{autoCheckoutBuffer} min</strong> buffer, employees must check out before <strong>{(() => {
                  const [h, m] = currentEndTime.split(':').map(Number);
                  const totalM = (h || 17) * 60 + (m || 0) + autoCheckoutBuffer;
                  const eh = Math.floor((totalM + 1440) % 1440 / 60);
                  const em = (totalM + 1440) % 60;
                  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
                })()}</strong>. If they forget, the session is auto-closed and attendance is assigned <strong>{autoCheckoutPenaltyStatus.toUpperCase()}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Official Working Days */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Official Working Days</h3>
            <p className="text-xs text-slate-400">Select which days of the week are company operating days</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {workDayOptions.map(({ day, label, full }) => {
            const isSelected = (companyRules.work_days || []).includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleWorkDay(day)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer flex flex-col items-center min-w-[70px] ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-105'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="text-sm">{label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{full}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
