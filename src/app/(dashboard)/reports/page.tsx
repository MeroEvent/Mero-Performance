'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { AttendanceRecord } from '@/types';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { 
  Download, 
  Calendar as CalendarIcon, 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { exportAttendanceToCSV, exportAttendanceToPDF } from '@/lib/utils/export';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Month and Date computation
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = 
    new Date().getMonth() === month && 
    new Date().getFullYear() === year;

  // Month navigation handlers
  const handlePrevMonth = () => {
    setSelectedDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedDate(new Date());
  };

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

  // Filtered employees list based on selected department (Cascading filter)
  const availableEmployees = useMemo(() => {
    if (selectedDept === 'all') return employees;
    return employees.filter(
      (e) => e.department_id === selectedDept || e.department_name === selectedDept
    );
  }, [selectedDept, employees]);

  // Handle department change with cascading employee reset
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDept(deptId);
    if (deptId !== 'all') {
      const isCurrentEmpInDept = employees.find(
        (e) => e.id === selectedUserId && (e.department_id === deptId || e.department_name === deptId)
      );
      if (!isCurrentEmpInDept) {
        setSelectedUserId('all');
      }
    }
  };

  // Fetch live attendance records scoped to the selected month
  const loadReports = () => {
    if (!profile) return;
    setIsLoading(true);

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);

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
  }, [profile, selectedDept, selectedUserId, selectedDate]);

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

  // Only display actual recorded punches for the selected month (no fake future placeholder rows)
  const displayRecords = useMemo(() => {
    return records.map((r) => ({
      ...r,
      user_name: selectedEmployeeObj?.name || r.user_name,
      department_name: selectedEmployeeObj?.department_name || r.department_name,
      shift_name: r.shift_name || selectedEmployeeObj?.shift_name || 'Standard Shift',
    }));
  }, [records, selectedEmployeeObj]);

  const handleExportCSV = () => {
    exportAttendanceToCSV(displayRecords, `Mero_Attendance_${monthName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  };

  const handleExportPDF = () => {
    exportAttendanceToPDF(
      displayRecords,
      `Official Attendance Report — ${monthName}`,
      undefined,
      {
        employeeName: selectedEmployeeObj?.name || (profile?.role === 'staff' ? profile.name : undefined),
        departmentName: selectedDeptObj?.name || selectedEmployeeObj?.department_name || 'Information Tech',
        institutionName: 'Mero Company Pvt. Ltd.',
      }
    );
  };

  // Monthly KPI Calculations from actual recorded punches
  const totalPresent = displayRecords.filter((r) => ['on_time', 'late', 'very_late', 'present'].includes(r.status)).length;
  const totalLate = displayRecords.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalAbsent = displayRecords.filter((r) => r.status === 'absent').length;
  const totalHours = displayRecords.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);

  return (
    <DashboardShell>
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Monthly Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Month-by-month verified timesheets, employee punch logs, and printable transcripts
          </p>
        </div>

        {/* Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleExportPDF} 
            className="gap-2 shadow-md shadow-blue-500/20 text-xs font-bold px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Main Filter Toolbar with Month Navigator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Interactive Month Navigator Pill */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2.5">
              <CalendarIcon className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                {monthName}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              onClick={handleCurrentMonth}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Current Month
            </button>
          )}

          {/* Department Selector (For Admin / Manager) */}
          {profile?.role !== 'staff' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Department:</label>
              <select
                value={selectedDept}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Selector (For Admin / Manager) */}
          {profile?.role !== 'staff' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employee / Student:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Personnel</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Selected Single Employee Spotlight Card */}
      {selectedEmployeeObj && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedEmployeeObj.name)}`}
              alt={selectedEmployeeObj.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20 bg-slate-800"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold tracking-tight">{selectedEmployeeObj.name}</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {monthName} Log
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {selectedEmployeeObj.department_name || 'General'} • {selectedEmployeeObj.position || 'Staff'} • {selectedEmployeeObj.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedUserId('all')}
            className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800/80 self-start sm:self-auto"
          >
            Clear Selected Employee
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-sm font-semibold text-slate-500">Loading {monthName} attendance records...</span>
        </div>
      ) : (
        /* Modern SaaS Tabular Format */
        <div className="space-y-6">
          {/* Visual KPI Breakdown Cards for the Month */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days Present</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalPresent}</h3>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalLate}</h3>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absences</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalAbsent}</h3>
            </Card>
            <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Worked</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalHours.toFixed(1)}h</h3>
            </Card>
          </div>

          {/* Upgraded Modern Tabular Component */}
          <AttendanceTable
            records={displayRecords}
            title={selectedEmployeeObj ? `${selectedEmployeeObj.name}'s Attendance Log — ${monthName}` : `Master Attendance Log — ${monthName}`}
            subtitle={
              selectedEmployeeObj
                ? `Showing ${displayRecords.length} recorded punch${displayRecords.length === 1 ? '' : 'es'} in ${monthName}`
                : `Showing verified punches for ${monthName} across ${selectedDept === 'all' ? 'all departments' : selectedDeptObj?.name || 'department'}`
            }
            showEmployeeDetails={selectedUserId === 'all'}
            employeeName={selectedEmployeeObj?.name}
            departmentName={selectedDeptObj?.name || selectedEmployeeObj?.department_name}
            onRefresh={loadReports}
          />
        </div>
      )}
    </DashboardShell>
  );
}

