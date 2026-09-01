'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuditService } from '@/lib/services/audit-store';
import { AuditLogEntry } from '@/types';
import { formatDateDisplay } from '@/lib/utils/attendance';
import { 
  ShieldCheck, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  User,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (data.logs && data.logs.length > 0) {
        setLogs(data.logs);
      } else {
        // Fallback to local store
        setLogs(AuditService.getLogs());
      }
    } catch (e) {
      setLogs(AuditService.getLogs());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (log.changed_by_name || '').toLowerCase().includes(searchLower) ||
        (log.reason || '').toLowerCase().includes(searchLower) ||
        (log.entity_id || '').toLowerCase().includes(searchLower) ||
        (log.entity_type || '').toLowerCase().includes(searchLower);

      const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
      const matchesAction = filterAction === 'all' || log.action === filterAction;

      return matchesSearch && matchesEntity && matchesAction;
    });
  }, [logs, searchTerm, filterEntity, filterAction]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <DashboardShell>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> System Audit Trail
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Immutable log of attendance record adjustments, status overrides, and system changes
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAuditLogs}
          className="text-xs font-bold gap-1.5 border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Logs
        </Button>
      </div>

      {/* Main Tabular Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Filter Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by admin name, reason, or entity ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Entity Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Entity:</label>
              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Entities</option>
                <option value="attendance">Attendance Adjustments</option>
                <option value="leave">Leave Reviews</option>
                <option value="rules">Company Rules</option>
                <option value="user">User Profiles</option>
              </select>
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Action:</label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Actions</option>
                <option value="override">Override</option>
                <option value="update">Update</option>
                <option value="create">Create</option>
                <option value="delete">Delete</option>
              </select>
            </div>

            <div className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl">
              {filteredLogs.length} entries
            </div>
          </div>
        </div>

        {/* Tabular Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-4">Changed By</th>
                  <th className="py-3.5 px-4">Entity Type</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-5">Mandatory Justification</th>
                  <th className="py-3.5 px-5 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No Audit Records Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Adjust your filters to inspect other activity.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{formatDateDisplay(log.created_at)}</span>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Changed By */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.changed_by_name || log.changed_by}</span>
                        </div>
                      </td>

                      {/* Entity Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {log.entity_type}
                        </span>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                            log.action === 'override'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : log.action === 'delete'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Mandatory Reason */}
                      <td className="py-3.5 px-5 text-xs text-slate-700 dark:text-slate-300 max-w-sm">
                        <p className="truncate font-medium" title={log.reason}>
                          {log.reason}
                        </p>
                      </td>

                      {/* Diff Details */}
                      <td className="py-3.5 px-5 text-right font-mono text-xs">
                        <details className="cursor-pointer inline-block text-left">
                          <summary className="text-blue-600 dark:text-blue-400 hover:underline font-sans font-bold text-xs select-none">
                            Inspect Diff
                          </summary>
                          <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono space-y-1.5 shadow-lg border border-slate-800 max-w-xs text-left">
                            <p className="text-rose-400 break-all">
                              <span className="font-bold">- OLD:</span> {log.old_value || 'None'}
                            </p>
                            <p className="text-emerald-400 break-all">
                              <span className="font-bold">+ NEW:</span> {log.new_value || 'None'}
                            </p>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredLogs.length)} to{' '}
                {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
