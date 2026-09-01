'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuditService } from '@/lib/services/audit-store';
import { AuditLogEntry } from '@/types';
import { formatDateDisplay } from '@/lib/utils/attendance';
import { ShieldCheck, Filter, User, Edit3, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>('all');

  useEffect(() => {
    setLogs(AuditService.getLogs());
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterEntity === 'all') return true;
    return log.entity_type === filterEntity;
  });

  return (
    <DashboardShell>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> System Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">Immutable log of attendance record adjustments, status overrides, and system changes</p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Entity Types</option>
            <option value="attendance">Attendance Adjustments</option>
            <option value="leave">Leave Reviews</option>
            <option value="rules">Company Rules Updates</option>
            <option value="user">User Profile Changes</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Changed By</th>
                <th className="px-5 py-3.5">Entity Type</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Mandatory Reason</th>
                <th className="px-5 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                    No audit log records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono font-medium text-slate-500">
                      {formatDateDisplay(log.created_at)} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100 text-xs">
                      {log.changed_by_name || log.changed_by}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        log.action === 'override' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-mono text-slate-400">
                      <details className="cursor-pointer">
                        <summary className="hover:text-blue-500 font-sans text-xs">View Diff</summary>
                        <div className="mt-2 p-2 bg-slate-900 text-slate-300 rounded-lg text-[10px] space-y-1">
                          <p><span className="text-rose-400">- OLD:</span> {log.old_value}</p>
                          <p><span className="text-emerald-400">+ NEW:</span> {log.new_value}</p>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
