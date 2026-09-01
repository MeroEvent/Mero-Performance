'use client';

import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus } from '@/types';
import { AttendanceService } from '@/lib/services/attendance-store';
import { AuditService } from '@/lib/services/audit-store';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { calculateHoursWorked } from '@/lib/utils/attendance';

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  editorId: string;
  editorName: string;
  onRecordUpdated: () => void;
}

export const AttendanceEditModal: React.FC<AttendanceEditModalProps> = ({
  isOpen,
  onClose,
  record,
  editorId,
  editorName,
  onRecordUpdated,
}) => {
  if (!record) return null;

  const [status, setStatus] = useState<AttendanceStatus>(record.status);
  const [checkInTime, setCheckInTime] = useState<string>(
    record.check_in_time ? new Date(record.check_in_time).toTimeString().slice(0, 5) : '09:00'
  );
  const [checkOutTime, setCheckOutTime] = useState<string>(
    record.check_out_time ? new Date(record.check_out_time).toTimeString().slice(0, 5) : '18:00'
  );
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required for attendance adjustments.');
      return;
    }

    try {
      const recordDate = record.date;
      const newCheckIn = new Date(`${recordDate}T${checkInTime}:00`);
      const newCheckOut = checkOutTime ? new Date(`${recordDate}T${checkOutTime}:00`) : null;
      const hours = newCheckOut ? calculateHoursWorked(newCheckIn, newCheckOut) : 0;

      const updatedRecords = AttendanceService.getRecords().map((r) => {
        if (r.id === record.id) {
          return {
            ...r,
            status,
            check_in_time: newCheckIn.toISOString(),
            check_out_time: newCheckOut ? newCheckOut.toISOString() : null,
            total_hours: hours,
            edited_by: editorId,
            edit_reason: reason.trim(),
            updated_at: new Date().toISOString(),
          };
        }
        return r;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('mero_attendance_records_v1', JSON.stringify(updatedRecords));
      }

      // Log Audit Entry
      AuditService.addLog({
        entity_type: 'attendance',
        entity_id: record.id,
        action: 'override',
        changed_by: editorId,
        changed_by_name: editorName,
        old_value: JSON.stringify({ status: record.status, hours: record.total_hours }),
        new_value: JSON.stringify({ status, hours, reason: reason.trim() }),
        reason: reason.trim(),
      });

      onRecordUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance record');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Attendance — ${record.user_name || 'Staff'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Date: <span className="font-mono">{record.date}</span></p>
          <p className="text-slate-500">Original Status: <span className="uppercase font-bold">{record.status}</span></p>
        </div>

        {/* Status Override */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Status Override
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          >
            <option value="on_time">On Time</option>
            <option value="late">Late</option>
            <option value="very_late">Very Late</option>
            <option value="half_day">Half Day</option>
            <option value="absent">Absent</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* Check In / Out Time Adjustments */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Check-In Time
            </label>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Check-Out Time
            </label>
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Change (Audit Requirement)
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Employee forgot to check in due to client meeting..."
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
