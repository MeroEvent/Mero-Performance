'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { AttendanceRecord } from '@/types';
import { exportAttendanceToPDF } from '@/lib/utils/export';
import { 
  ArrowLeft, 
  Download, 
  Building2, 
  Mail, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const [employee, setEmployee] = useState<any | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadEmployeeData = async () => {
    try {
      setIsLoading(true);
      const [empRes, repRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch(`/api/admin/reports?userId=${employeeId}`),
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
  }, [employeeId]);

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

  if (isLoading) {
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

      {/* Main Attendance Section */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days Present</p>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalPresent}</h3>
          </Card>
          <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late</p>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalLate}</h3>
          </Card>
          <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absent</p>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalAbsent}</h3>
          </Card>
          <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hours</p>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalHours.toFixed(1)}h</h3>
          </Card>
        </div>

        <AttendanceTable
          records={records}
          title={`${employee.name}'s Attendance Records`}
          showEmployeeDetails={false}
          onRefresh={loadEmployeeData}
        />
      </div>
    </DashboardShell>
  );
}
