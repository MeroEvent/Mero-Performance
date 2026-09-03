'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AttendanceService } from '@/lib/services/attendance-store';
import { TeamOverviewStats, AttendanceRecord, UserProfile } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Clock, AlertTriangle, UserCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import { AttendanceTable } from '@/components/attendance/attendance-table';

export default function ManagerDashboardPage() {
  const [currentUser] = useState<UserProfile>(() => AttendanceService.getCurrentUser());
  const [stats, setStats] = useState<TeamOverviewStats>(() => AttendanceService.getTeamStats(currentUser.id));
  const [teamRecords, setTeamRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    setStats(AttendanceService.getTeamStats(currentUser.id));
    
    // Get team members assigned to manager or company staff
    const users = AttendanceService.getUsers().filter(
      (u) => u.manager_id === currentUser.id || u.department_name === currentUser.department_name
    );
    const teamUserIds = users.map((u) => u.id);
    const records = AttendanceService.getRecords().filter((r) => teamUserIds.includes(r.user_id));
    setTeamRecords(records);
  }, [currentUser]);

  return (
    <DashboardShell>
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Team Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status monitoring for {currentUser.department_name || 'Engineering'} Team
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs self-start sm:self-auto">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <span>Team Attendance Rate:</span>
          <strong className="text-slate-900 dark:text-white font-mono text-sm">{stats.teamAttendanceRate}%</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team Members</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.totalTeamMembers}</h3>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Checked In Today</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.checkedInToday}</h3>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Late Today</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.lateToday}</h3>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent Today</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">{stats.absentToday}</h3>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Team Attendance Table */}
      <AttendanceTable records={teamRecords} title="Team Attendance Records" showEmployeeDetails={true} />
    </DashboardShell>
  );
}
