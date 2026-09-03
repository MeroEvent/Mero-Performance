'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { AttendanceRecord } from '@/types';
import { AttendanceCalendar } from '@/components/attendance/attendance-calendar';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { MonthPickerPopover } from '@/components/ui/month-picker-popover';
import { 
  Calendar as CalendarIcon, 
  List, 
  Download, 
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAttendanceToPDF } from '@/lib/utils/export';

export default function EmployeeHistoryPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'table'>('calendar');
  const [dateMode, setDateMode] = useState<'month' | 'custom'>('month');
  const [activePreset, setActivePreset] = useState<'today' | 'this_month' | 'last_month' | 'last_7_days' | 'custom'>('this_month');
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

  const loadHistory = () => {
    if (!profile?.id) return;
    setIsLoading(true);

    let startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    let endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    if (dateMode === 'custom') {
      startDate = customStartDate || startDate;
      endDate = customEndDate || endDate;
    }

    fetch(`/api/attendance/history?userId=${profile.id}&startDate=${startDate}&endDate=${endDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setRecords(data.records);
        }
      })
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, [profile?.id, selectedDate, dateMode, customStartDate, customEndDate]);

  const handleExportAll = () => {
    exportAttendanceToPDF(records, 'My Attendance History', undefined, {
      employeeName: profile?.name,
      departmentName: profile?.department_name || 'Information Tech',
    });
  };

  const totalPresent = records.filter((r) => ['on_time', 'late', 'very_late', 'present'].includes(r.status)).length;
  const totalLate = records.filter((r) => r.status === 'late' || r.status === 'very_late').length;
  const totalAbsent = records.filter((r) => r.status === 'absent').length;
  const totalHours = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            My Attendance History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View full log of present, late, and absent days across any month or custom date range
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar View
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table View
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5 font-bold text-xs cursor-pointer">
            <Download className="w-3.5 h-3.5 text-slate-400" /> Download PDF Report
          </Button>
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
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : totalPresent}
            </p>
          </div>

          {/* Days Late */}
          <div className="md:px-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days Late</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : totalLate}
            </p>
          </div>

          {/* Days Absent */}
          <div className="md:px-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days Absent</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : totalAbsent}
            </p>
          </div>

          {/* Total Hours */}
          <div className="md:px-6 last:pr-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Hours</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1.5">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : `${totalHours.toFixed(1)}h`}
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

      {/* Content Tabs */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-sm font-semibold text-slate-500">Loading attendance data...</span>
        </div>
      ) : activeTab === 'calendar' ? (
        <AttendanceCalendar records={records} />
      ) : (
        <AttendanceTable
          records={records}
          title="My Attendance Logs"
          subtitle={`Detailed day-by-day records`}
          showEmployeeDetails={false}
          onRefresh={loadHistory}
        />
      )}
    </DashboardShell>
  );
}
