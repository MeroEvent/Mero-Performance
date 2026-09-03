'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { AttendanceRecord } from '@/types';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { MonthPickerPopover } from '@/components/ui/month-picker-popover';
import { 
  Download, 
  Loader2, 
  Building2, 
  Users, 
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAttendanceToCSV, exportAttendanceToPDF } from '@/lib/utils/export';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [dateMode, setDateMode] = useState<'month' | 'custom'>('month');
  const [activePreset, setActivePreset] = useState<'today' | 'this_month' | 'last_month' | 'last_7_days' | 'custom'>('this_month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [customStartDate, setCustomStartDate] = useState<string>(firstDayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Month and Date computation
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
    setDateMode('month');
    const now = new Date();
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      setActivePreset('this_month');
    } else if (
      (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() - 1) ||
      (now.getMonth() === 0 && date.getMonth() === 11 && date.getFullYear() === now.getFullYear() - 1)
    ) {
      setActivePreset('last_month');
    } else {
      setActivePreset('custom');
    }
  };

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateMode('custom');
    setActivePreset('custom');
  };

  // Quick Range Presets
  const handleSetPreset = (preset: 'today' | 'this_month' | 'last_month' | 'last_7_days') => {
    const now = new Date();
    setActivePreset(preset);
    if (preset === 'today') {
      setDateMode('custom');
      const todayStr = now.toISOString().split('T')[0];
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    } else if (preset === 'this_month') {
      setDateMode('month');
      setSelectedDate(now);
    } else if (preset === 'last_month') {
      setDateMode('month');
      setSelectedDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    } else if (preset === 'last_7_days') {
      setDateMode('custom');
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      setCustomStartDate(past7.toISOString().split('T')[0]);
      setCustomEndDate(now.toISOString().split('T')[0]);
    }
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
        if (data.employees) {
          setEmployees(data.employees);
        }
      })
      .catch((err) => console.error('Failed to load employees:', err));
  }, []);

  // Filter employees based on selected department
  const availableEmployees = useMemo(() => {
    if (selectedDept === 'all') return employees;
    return employees.filter((e) => e.department_id === selectedDept);
  }, [employees, selectedDept]);

  // When selected department changes, reset employee selection if not in new dept
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDept(deptId);
    if (deptId !== 'all') {
      const isCurrentEmployeeInDept = employees.some(
        (e) => e.id === selectedUserId && e.department_id === deptId
      );
      if (!isCurrentEmployeeInDept) {
        setSelectedUserId('all');
      }
    }
  };

  // Load Reports from Server
  const loadReports = () => {
    setIsLoading(true);

    let startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    let endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    if (dateMode === 'custom') {
      startDate = customStartDate || startDate;
      endDate = customEndDate || endDate;
    }

    let url = `/api/admin/reports?startDate=${startDate}&endDate=${endDate}`;
    if (selectedDept !== 'all') url += `&departmentId=${selectedDept}`;
    if (selectedUserId !== 'all') url += `&userId=${selectedUserId}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) setRecords(data.records);
      })
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [selectedDate, selectedDept, selectedUserId, dateMode, customStartDate, customEndDate]);

  // Client-side display filtering
  const displayRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedUserId !== 'all' && r.user_id !== selectedUserId) return false;
      if (selectedDept !== 'all' && ((r as any).department_id !== selectedDept && (r as any).user?.department_id !== selectedDept)) return false;
      return true;
    });
  }, [records, selectedUserId, selectedDept]);

  // Selected Employee Info
  const selectedEmployeeObj = useMemo(() => {
    if (selectedUserId === 'all') return null;
    return employees.find((e) => e.id === selectedUserId) || null;
  }, [employees, selectedUserId]);

  const selectedDeptObj = useMemo(() => {
    if (selectedDept === 'all') return null;
    return departments.find((d) => d.id === selectedDept) || null;
  }, [departments, selectedDept]);

  // Summary Metrics
  const totalPresent = displayRecords.filter((r) => ['on_time', 'late', 'very_late', 'present'].includes(r.status)).length;
  const totalLate = displayRecords.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalAbsent = displayRecords.filter((r) => r.status === 'absent').length;
  const totalHours = displayRecords.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);

  const handleExportPDF = () => {
    exportAttendanceToPDF(
      displayRecords,
      `Attendance Report — ${monthName}`,
      undefined,
      {
        employeeName: selectedEmployeeObj?.name,
        departmentName: selectedDeptObj?.name || selectedEmployeeObj?.department_name,
        institutionName: 'Mero Company Pvt. Ltd.',
      }
    );
  };

  const handleExportCSV = () => {
    const filename = selectedEmployeeObj
      ? `Attendance_${selectedEmployeeObj.name.replace(/\s+/g, '_')}_${monthString}.csv`
      : `Master_Attendance_${monthString}.csv`;

    exportAttendanceToCSV(displayRecords, filename);
  };

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analyze company-wide attendance rosters, drill down into department records, and export reports
          </p>
        </div>

        {/* Consolidated Export Buttons in Header */}
        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV} 
            className="gap-2 text-xs font-bold px-4 py-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </Button>
          <button 
            onClick={handleExportPDF} 
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Attendance Overview Card - Light & Dark Mode Compatible */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-6 transition-colors">
        <h2 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide">
          Attendance Overview
        </h2>

        {/* 4 KPI Columns with Dividers */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/80 gap-4 md:gap-0 pt-1">
          {/* Days Present */}
          <div className="md:px-6 first:pl-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days Present</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : totalPresent}
            </p>
          </div>

          {/* Days Late */}
          <div className="md:px-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days Late</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : totalLate}
            </p>
          </div>

          {/* Days Absent */}
          <div className="md:px-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days Absent</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-rose-500" /> : totalAbsent}
            </p>
          </div>

          {/* Total Hours */}
          <div className="md:px-6 last:pr-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Hours</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : `${totalHours.toFixed(1)}h`}
            </p>
          </div>
        </div>

        {/* Controls Row: Clean Filter Pill with Month/Range Popover on Left, Quick Presets on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Left: Date Selector with Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <MonthPickerPopover
              dateMode={dateMode}
              selectedDate={selectedDate}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onMonthChange={handleMonthChange}
              onCustomRangeChange={handleCustomRangeChange}
            />

            {/* Department & Employee Selectors for Admin/Manager */}
            {profile?.role !== 'staff' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="pl-8 pr-8 py-2 bg-slate-50 dark:bg-[#060c1d] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                <div className="relative flex items-center">
                  <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="pl-8 pr-8 py-2 bg-slate-50 dark:bg-[#060c1d] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Personnel</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Presets with Active State Tracking */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetPreset('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'today'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'this_month'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('last_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'last_month'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('last_7_days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'last_7_days'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Selected Single Employee Spotlight Card */}
      {selectedEmployeeObj && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedEmployeeObj.name)}`}
              alt={selectedEmployeeObj.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 bg-slate-100 dark:bg-slate-800"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{selectedEmployeeObj.name}</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {monthName} Log
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedEmployeeObj.department_name || 'General'} • {selectedEmployeeObj.position || 'Staff'} • {selectedEmployeeObj.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedUserId('all')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Clear Selected Employee
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-sm font-semibold text-slate-500">Loading {monthName} attendance records...</span>
        </div>
      ) : (
        /* Modern Tabular Component */
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
      )}
    </DashboardShell>
  );
}
