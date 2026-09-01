'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { AttendanceRecord } from '@/types';
import { AttendanceCalendar } from '@/components/attendance/attendance-calendar';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { Calendar as CalendarIcon, List, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAttendanceToPDF } from '@/lib/utils/export';

export default function EmployeeHistoryPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'table'>('calendar');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!profile?.id) return;
    setIsLoading(true);

    fetch(`/api/attendance/history?userId=${profile.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setRecords(data.records);
        }
      })
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setIsLoading(false));
  }, [profile?.id]);

  const handleExportAll = () => {
    exportAttendanceToPDF(records, 'My Attendance History', undefined, {
      employeeName: profile?.name,
      departmentName: profile?.department_name || 'Information Tech',
    });
  };


  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            My Attendance History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View full log of present, late, and absent days in calendar or table format from live records
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar View
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table View
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5 font-bold text-xs">
            <Download className="w-3.5 h-3.5 text-blue-500" /> Download PDF Report
          </Button>
        </div>
      </div>


      {/* Main View Render */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-sm font-semibold text-slate-500">Loading attendance history...</span>
        </div>
      ) : activeTab === 'calendar' ? (
        <AttendanceCalendar records={records} />
      ) : (
        <AttendanceTable records={records} title="Complete Attendance Log" />
      )}
    </DashboardShell>
  );
}
