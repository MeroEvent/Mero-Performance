'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { AttendanceRecord } from '@/types';
import { exportAttendanceToPDF } from '@/lib/utils/export';
import { MonthPickerPopover } from '@/components/ui/month-picker-popover';
import { 
  ArrowLeft, 
  Download, 
  Building2, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const [employee, setEmployee] = useState<any | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dateMode, setDateMode] = useState<'month' | 'custom'>('month');
  const [activePreset, setActivePreset] = useState<'this_month' | 'last_month' | 'last_7_days' | 'last_30_days' | 'custom'>('this_month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [customStartDate, setCustomStartDate] = useState<string>(firstDayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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

  const handleSetPreset = (preset: 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days') => {
    const now = new Date();
    setActivePreset(preset);
    if (preset === 'this_month') {
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
    } else if (preset === 'last_30_days') {
      setDateMode('custom');
      const past30 = new Date();
      past30.setDate(past30.getDate() - 29);
      setCustomStartDate(past30.toISOString().split('T')[0]);
      setCustomEndDate(now.toISOString().split('T')[0]);
    }
  };

  const loadEmployeeData = async () => {
    try {
      setIsLoading(true);
      let startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      let endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      if (dateMode === 'custom') {
        startDate = customStartDate || startDate;
        endDate = customEndDate || endDate;
      }

      const [empRes, repRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch(`/api/admin/reports?userId=${employeeId}&startDate=${startDate}&endDate=${endDate}`),
      ]);

      const empData = await empRes.json();
      const repData = await repRes.json();

      if (empData.employees) {
        const found = empData.employees.find((e: any) => e.id === employeeId);
        if (found) setEmployee(found);
      }

      if (repData.records) {
        setRecords(repData.records);
      }
    } catch (err) {
      console.error('Failed to load employee attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId, selectedDate, dateMode, customStartDate, customEndDate]);

  const handleDownloadPDF = () => {
    exportAttendanceToPDF(
      records,
      `Attendance Report — ${employee?.name || 'Employee'}`,
      undefined,
      {
        employeeName: employee?.name || 'Staff Member',
        departmentName: employee?.department_name || 'Information Tech',
        institutionName: 'Mero Company Pvt. Ltd.',
      }
    );
  };

  const totalPresent = records.filter((r) => ['on_time', 'late', 'very_late', 'present'].includes(r.status)).length;
  const totalLate = records.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalAbsent = records.filter((r) => r.status === 'absent').length;
  const totalHours = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
  const attendanceRate = records.length > 0 ? Math.round((totalPresent / records.length) * 100) : 0;

  if (isLoading && !employee) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <span className="text-sm font-semibold text-slate-500">Loading employee attendance profile...</span>
        </div>
      </DashboardShell>
    );
  }

  if (!employee) {
    return (
      <DashboardShell>
        <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <p className="text-lg font-bold text-slate-900 dark:text-white">Employee Not Found</p>
          <p className="text-xs text-slate-400">The requested employee could not be found in the directory.</p>
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
        </Link>

        <div className="flex items-center gap-2">
          {/* Prominent Download Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-2 shadow-lg shadow-blue-500/25 text-xs font-bold px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl cursor-pointer active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Download Attendance Report (PDF)
          </Button>
        </div>
      </div>

      {/* Employee Profile Identity Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={
                employee.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employee.name)}`
              }
              alt={employee.name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {employee.name}
                </h1>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                    employee.role === 'admin'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  }`}
                >
                  {employee.role === 'admin' ? 'Admin' : 'Staff'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    employee.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}
                >
                  {employee.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {employee.is_active ? 'Active Employee' : 'Inactive'}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {employee.position || 'Team Member'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {employee.department_name || 'General Department'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <p className="text-[10px] font-bold uppercase text-slate-400">Attendance</p>
              <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {attendanceRate}%
              </p>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Hours</p>
              <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {totalHours.toFixed(1)}h
              </p>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Logs</p>
              <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {records.length}
              </p>
            </div>
          </div>
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
          {/* Left: Date Selector with MonthPickerPopover */}
          <div className="flex items-center gap-2">
            <MonthPickerPopover
              dateMode={dateMode}
              selectedDate={selectedDate}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onMonthChange={handleMonthChange}
              onCustomRangeChange={handleCustomRangeChange}
            />
          </div>

          {/* Right: Presets with Active State Tracking */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetPreset('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'this_month'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                  : 'bg-slate-50 dark:bg-[#060c1d]/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('last_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'last_month'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                  : 'bg-slate-50 dark:bg-[#060c1d]/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('last_7_days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'last_7_days'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                  : 'bg-slate-50 dark:bg-[#060c1d]/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('last_30_days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'last_30_days'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                  : 'bg-slate-50 dark:bg-[#060c1d]/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Main Attendance Table */}
      <AttendanceTable
        records={records}
        title={`${employee.name}'s Attendance Records`}
        showEmployeeDetails={false}
        onRefresh={loadEmployeeData}
      />
    </DashboardShell>
  );
}
