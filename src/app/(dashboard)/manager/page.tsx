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
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Team Overview Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status monitoring for {currentUser.department_name || 'Engineering'} Team
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-2xl text-xs font-semibold text-blue-300">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Team Attendance Rate: <strong className="text-white font-mono text-sm">{stats.teamAttendanceRate}%</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team Members</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">{stats.totalTeamMembers}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Checked In Today</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">{stats.checkedInToday}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Late Today</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">{stats.lateToday}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent Today</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">{stats.absentToday}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Team Attendance Table */}
      <AttendanceTable records={teamRecords} title="Team Attendance Records" showEmployeeDetails={true} />
    </DashboardShell>
  );
}
