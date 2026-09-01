'use client';

import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus, UserProfile } from '@/types';
import { formatDateDisplay, formatTime } from '@/lib/utils/attendance';
import { StatusBadge } from '@/components/ui/badge';
import { exportAttendanceToPDF } from '@/lib/utils/export';
import { Button } from '@/components/ui/button';
import { AttendanceEditModal } from '@/components/attendance/attendance-edit-modal';
import { useAuth } from '@/lib/context/auth-context';


interface AttendanceTableProps {
  records: AttendanceRecord[];
  title?: string;
  showEmployeeDetails?: boolean;
  onRefresh?: () => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  title = 'Attendance History',
  showEmployeeDetails = false,
  onRefresh,
}) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const isAdmin = profile?.role === 'admin';


  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      (rec.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.date || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    exportAttendanceToPDF(filteredRecords, title, undefined, {
      employeeName: profile?.name,
      departmentName: profile?.department_name || 'Information Tech',
    });
  };


  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Records: {filteredRecords.length}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search date, employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 appearance-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="on_time">On Time</option>
              <option value="late">Late</option>
              <option value="very_late">Very Late</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="on_leave">On Leave</option>
              <option value="holiday">Holiday</option>
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* PDF Report Export Button */}
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 font-bold text-xs">
            <Download className="w-3.5 h-3.5 text-blue-500" /> Download PDF Report
          </Button>
        </div>
      </div>


      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800/80">
              <th className="py-3.5 px-4">Date</th>
              {showEmployeeDetails && <th className="py-3.5 px-4">Employee</th>}
              <th className="py-3.5 px-4">Check-In</th>
              <th className="py-3.5 px-4">Check-Out</th>
              <th className="py-3.5 px-4">Hours</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Verification</th>
              {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={showEmployeeDetails ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6)} className="py-8 text-center text-slate-400">
                  No attendance records found matching criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold font-mono text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      {formatDateDisplay(r.date)}
                    </div>
                  </td>

                  {showEmployeeDetails && (
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{r.user_name || 'Staff'}</p>
                        <p className="text-[11px] text-slate-400">{r.department_name || r.user_email}</p>
                      </div>
                    </td>
                  )}

                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatTime(r.check_in_time)}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {r.check_out_time ? formatTime(r.check_out_time) : <span className="text-amber-500 font-semibold">Active Session</span>}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {r.total_hours ? `${r.total_hours.toFixed(2)} hrs` : '0.00 hrs'}
                  </td>

                  <td className="py-3.5 px-4">
                    <StatusBadge status={r.status} />
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span title="GPS Status" className={`flex items-center gap-1 ${r.location_verified ? 'text-emerald-500' : 'text-slate-400'}`}>
                        <MapPin className="w-3 h-3" /> {r.location_verified ? 'GPS Verified' : 'Standard'}
                      </span>
                      {r.edited_by && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-semibold" title={`Edited by admin: ${r.edit_reason}`}>
                          Edited
                        </span>
                      )}
                    </div>
                  </td>

                  {isAdmin && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setEditingRecord(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                        title="Edit Attendance & Log Audit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

