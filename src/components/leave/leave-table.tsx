'use client';

import React from 'react';
import { LeaveRequest } from '@/types';
import { formatDateDisplay } from '@/lib/utils/attendance';
import { Check, X, Ban, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaveTableProps {
  requests: LeaveRequest[];
  isManagerView?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export const LeaveTable: React.FC<LeaveTableProps> = ({
  requests,
  isManagerView = false,
  onApprove,
  onReject,
  onCancel,
}) => {
  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Check className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <X className="w-3 h-3" /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <Ban className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isManagerView && <th className="px-5 py-3.5">Employee</th>}
              <th className="px-5 py-3.5">Leave Type</th>
              <th className="px-5 py-3.5">Dates</th>
              <th className="px-5 py-3.5">Days</th>
              <th className="px-5 py-3.5">Reason</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={isManagerView ? 7 : 6} className="px-5 py-8 text-center text-xs text-slate-400">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {isManagerView && (
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{r.user_name || 'Staff Member'}</p>
                      <p className="text-xs text-slate-400">{r.department_name}</p>
                    </td>
                  )}
                  <td className="px-5 py-4 font-semibold uppercase text-xs text-blue-600 dark:text-blue-400">
                    {r.leave_type.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatDateDisplay(r.start_date)} — {formatDateDisplay(r.end_date)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {r.total_days}d
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={r.reason}>
                    {r.reason}
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(r.status)}</td>
                  <td className="px-5 py-4 text-right">
                    {isManagerView && r.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          className="px-2.5 py-1 text-xs"
                          onClick={() => onApprove?.(r.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="px-2.5 py-1 text-xs"
                          onClick={() => onReject?.(r.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {!isManagerView && r.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                        onClick={() => onCancel?.(r.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    {r.status !== 'pending' && (
                      <div className="text-[11px] text-slate-400">
                        {r.reviewer_name ? `By ${r.reviewer_name}` : '—'}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
