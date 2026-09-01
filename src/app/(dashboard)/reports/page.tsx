'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { AttendanceRecord } from '@/types';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { OfficialAttendanceSheet } from '@/components/reports/official-attendance-sheet';
import { FileText, Download, Printer, Filter, Calendar, BarChart3, Loader2, FileSpreadsheet, Layers, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { exportAttendanceToCSV, exportAttendanceToPDF } from '@/lib/utils/export';

export default function ReportsPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'official_sheet' | 'table_view'>('official_sheet');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch departments & employees
  useEffect(() => {
    fetch('/api/admin/departments')
      .then((res) => res.json())
      .then((data) => {
        if (data.departments) setDepartments(data.departments);
      })
      .catch((err) => console.error('Failed to load departments:', err));

    fetch('/api/admin/employees')
      .then((res) => res.json())
      .then((data) => {
        if (data.employees) setEmployees(data.employees);
      })
      .catch((err) => console.error('Failed to load employees:', err));
  }, []);

  // Fetch live attendance records
  const loadReports = () => {
    if (!profile) return;
    setIsLoading(true);

    const params = new URLSearchParams();
    if (profile.role === 'staff') {
      params.append('userId', profile.id);
    } else if (selectedUserId !== 'all') {
      params.append('userId', selectedUserId);
    }

    if (selectedDept !== 'all') {
      params.append('departmentId', selectedDept);
    }

    fetch(`/api/admin/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setRecords(data.records);
        }
      })
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [profile, selectedDept, selectedUserId]);

  const selectedEmployeeObj = useMemo(() => {
    if (selectedUserId !== 'all') {
      return employees.find((e) => e.id === selectedUserId);
    }
    return null;
  }, [selectedUserId, employees]);

  const selectedDeptObj = useMemo(() => {
    if (selectedDept !== 'all') {
      return departments.find((d) => d.id === selectedDept);
    }
    return null;
  }, [selectedDept, departments]);

  const handleExportCSV = () => {
    exportAttendanceToCSV(records, `Mero_Attendance_Report_${Date.now()}.csv`);
  };

  const handleExportPDF = () => {
    exportAttendanceToPDF(
      records,
      'Official Attendance Report',
      undefined,
      {
        employeeName: selectedEmployeeObj?.name || (profile?.role === 'staff' ? profile.name : undefined),
        departmentName: selectedDeptObj?.name || selectedEmployeeObj?.department_name || 'Information Tech',
        institutionName: 'Mero Company Pvt. Ltd.',
      }
    );
  };


  const totalPresent = records.filter((r) => ['on_time', 'late', 'very_late', 'present'].includes(r.status)).length;
  const totalLate = records.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalOnLeave = records.filter((r) => r.status === 'on_leave').length;
  const totalHours = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);

  return (
    <DashboardShell>
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official academic & enterprise attendance transcripts, real-time logs, and printable PDF documents
          </p>
        </div>

        {/* View Mode Toggle & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('official_sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'official_sheet'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Official Sheet
            </button>
            <button
              onClick={() => setViewMode('table_view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'table_view'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Data Table
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={handleExportPDF} className="gap-2 shadow-md shadow-blue-500/20 text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4" /> Download Report (PDF)
          </Button>
        </div>
      </div>


      {/* Filter Toolbar (For Admin / Manager) */}
      {profile?.role !== 'staff' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">
            <Filter className="w-4 h-4 text-blue-500" /> Filters:
          </div>

          {/* Department Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500">Department:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500">Employee / Student:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Personnel</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department_name || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs font-mono font-bold text-slate-500">
            Showing {records.length} records
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-sm font-semibold text-slate-500">Loading verified attendance report...</span>
        </div>
      ) : viewMode === 'official_sheet' ? (
        /* Official College / Enterprise Document Sheet Layout */
        <div className="space-y-4">
          <OfficialAttendanceSheet
            records={records}
            employeeName={selectedEmployeeObj?.name || (profile?.role === 'staff' ? profile.name : undefined)}
            departmentName={selectedDeptObj?.name || selectedEmployeeObj?.department_name || 'Information Tech'}
            companyName="Mero Company Pvt. Ltd."
          />
        </div>

      ) : (
        /* Standard Data Table & Summary Breakdown */
        <div className="space-y-6">
          {/* Visual Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-emerald-500">
              <p className="text-xs font-semibold text-slate-400 uppercase">Days Present</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalPresent}</h3>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <p className="text-xs font-semibold text-slate-400 uppercase">Tardiness / Late</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalLate}</h3>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <p className="text-xs font-semibold text-slate-400 uppercase">On Leave</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalOnLeave}</h3>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Hours</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalHours.toFixed(1)}h</h3>
            </Card>
          </div>

          <AttendanceTable
            records={records}
            title="Comprehensive Attendance Log"
            showEmployeeDetails={profile?.role !== 'staff'}
            onRefresh={loadReports}
          />
        </div>
      )}
    </DashboardShell>
  );
}

