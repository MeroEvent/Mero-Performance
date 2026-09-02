'use client';

import React, { useState } from 'react';
import { LeaveType, LeaveTypeConfig } from '@/types';
import { LeaveService } from '@/lib/services/leave-store';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { calculateWorkingDays } from '@/lib/utils/attendance';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  departmentName?: string;
  leaveTypes: LeaveTypeConfig[];
  onRequestSubmitted: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  departmentName,
  leaveTypes,
  onRequestSubmitted,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [leaveType, setLeaveType] = useState<LeaveType>('sick');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const days = calculateWorkingDays(startDate, endDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for your leave request.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          leaveType,
          startDate,
          endDate,
          totalDays: days || 1,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setLoading(false);
      onRequestSubmitted();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to submit leave request');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* Leave Type Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Leave Type
          </label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          >
            {leaveTypes.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label} ({t.description})
              </option>
            ))}
          </select>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Total Working Days Summary */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
          <span>Calculated Duration:</span>
          <span className="font-mono font-bold text-sm">{days} working day(s)</span>
        </div>

        {/* Reason Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Reason / Justification
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please detail why you are requesting leave..."
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={loading}>
            Submit Leave Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
