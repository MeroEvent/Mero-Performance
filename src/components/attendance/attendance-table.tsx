'use client';

import React, { useState, useMemo } from 'react';
import { AttendanceRecord } from '@/types';
import { formatDateDisplay, formatTime } from '@/lib/utils/attendance';
import { StatusBadge } from '@/components/ui/badge';
import { exportAttendanceToPDF, exportAttendanceToCSV } from '@/lib/utils/export';
import { Button } from '@/components/ui/button';
import { AttendanceEditModal } from '@/components/attendance/attendance-edit-modal';
import { useAuth } from '@/lib/context/auth-context';
import { 
  Search, 
  Calendar, 
  Edit3, 
  Download, 
  MapPin, 
  User, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Clock
} from 'lucide-react';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  title?: string;
  subtitle?: string;
  showEmployeeDetails?: boolean;
  onRefresh?: () => void;
  employeeName?: string;
  departmentName?: string;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  title = 'Attendance Log',
  subtitle,
  showEmployeeDetails = true,
  onRefresh,
  employeeName,
  departmentName,
}) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const isAdmin = profile?.role === 'admin';

  // Compute status counts for clickable pill filters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: records.length,
      present: 0,
      late: 0,
      absent: 0,
      on_leave: 0,
      holiday: 0,
    };
    records.forEach((r) => {
      if (['on_time', 'present'].includes(r.status)) {
        counts.present++;
      } else if (['late', 'very_late'].includes(r.status)) {
        counts.late++;
      } else if (r.status === 'absent') {
        counts.absent++;
      } else if (['on_leave', 'leave'].includes(r.status)) {
        counts.on_leave++;
      } else if (r.status === 'holiday') {
        counts.holiday++;
      }
    });
    return counts;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (rec.user_name || '').toLowerCase().includes(searchLower) ||
        (rec.user_email || '').toLowerCase().includes(searchLower) ||
        (rec.department_name || '').toLowerCase().includes(searchLower) ||
        (rec.date || '').includes(searchLower) ||
        (rec.notes || '').toLowerCase().includes(searchLower);

      let matchesStatus = true;
      if (statusFilter === 'present') {
        matchesStatus = ['on_time', 'present'].includes(rec.status);
      } else if (statusFilter === 'late') {
        matchesStatus = ['late', 'very_late'].includes(rec.status);
      } else if (statusFilter === 'absent') {
        matchesStatus = rec.status === 'absent';
      } else if (statusFilter === 'on_leave') {
        matchesStatus = ['on_leave', 'leave'].includes(rec.status);
      } else if (statusFilter === 'holiday') {
        matchesStatus = rec.status === 'holiday';
      }

      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleExportPDF = () => {
    exportAttendanceToPDF(filteredRecords, title, undefined, {
      employeeName: employeeName || (profile?.role === 'staff' ? profile.name : undefined),
      departmentName: departmentName || 'Information Tech',
      institutionName: 'Mero Company Pvt. Ltd.',
    });
  };

  const handleExportCSV = () => {
    exportAttendanceToCSV(filteredRecords, `${title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle || `Showing ${filteredRecords.length} of ${records.length} records`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, email, department, or date..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
          />
        </div>

        {/* Status Pill Tabs with Count Badges */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            <span>All</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('present'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'present'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            <span>Present</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              statusFilter === 'present' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {statusCounts.present}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('late'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'late'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            <span>Late</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              statusFilter === 'late' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {statusCounts.late}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('absent'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'absent'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            <span>Absent</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              statusFilter === 'absent' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {statusCounts.absent}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('on_leave'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'on_leave'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            <span>Leave</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              statusFilter === 'on_leave' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {statusCounts.on_leave}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('holiday'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'holiday'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            <span>Holiday</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              statusFilter === 'holiday' ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {statusCounts.holiday}
            </span>
          </button>
        </div>
      </div>

      {/* Main SaaS Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[11px]">
                {showEmployeeDetails && <th className="py-3.5 px-5">Employee</th>}
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Work Shift</th>
                <th className="py-3.5 px-4">Punch In</th>
                <th className="py-3.5 px-4">Punch Out</th>
                <th className="py-3.5 px-4">Hours</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Verification</th>
                {isAdmin && <th className="py-3.5 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={showEmployeeDetails ? (isAdmin ? 9 : 8) : (isAdmin ? 8 : 7)} className="py-12 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No Attendance Records Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Employee Identity Column (Name + Avatar + Department) */}
                    {showEmployeeDetails && (
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.user_name || 'Staff')}`
                            }
                            alt={r.user_name || 'Staff'}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">
                              {r.user_name || 'Staff Member'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {r.department_name || r.user_email || 'General'}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Date */}
                    <td className="py-3.5 px-4 font-semibold font-mono text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{formatDateDisplay(r.date)}</span>
                      </div>
                    </td>

                    {/* Work Shift */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{r.shift_name || 'Standard'}</span>
                      </span>
                    </td>

                    {/* Punch-In Time */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {r.check_in_time ? formatTime(r.check_in_time) : <span className="text-slate-400">--:--</span>}
                    </td>

                    {/* Punch-Out Time */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {r.check_out_time ? (
                        formatTime(r.check_out_time)
                      ) : r.check_in_time ? (
                        <span className="text-amber-500 font-bold">Active</span>
                      ) : (
                        <span className="text-slate-400">--:--</span>
                      )}
                    </td>

                    {/* Worked Hours */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.total_hours > 0 ? `${Number(r.total_hours).toFixed(2)}h` : '--'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} />
                    </td>

                    {/* Verification Metadata (GPS / Network / Anti-Proxy) */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[10px] border ${
                            r.location_verified
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}
                          title="GPS verification"
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{r.location_verified ? 'GPS' : 'Standard'}</span>
                        </span>

                        {r.edited_by && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            title={`Manually adjusted by admin: ${r.edit_reason || 'No reason provided'}`}
                          >
                            Edited
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Admin Action (Adjust / Override) */}
                    {isAdmin && (
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setEditingRecord(r)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                          title="Adjust punch & log audit entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {filteredRecords.length > 0 && (
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
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRecords.length)} to{' '}
              {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}
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

      {/* Edit Modal */}
      <AttendanceEditModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        editorId={profile?.id || ''}
        editorName={profile?.name || ''}
        onRecordUpdated={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};

