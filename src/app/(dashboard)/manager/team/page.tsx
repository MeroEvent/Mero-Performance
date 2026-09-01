'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AttendanceService } from '@/lib/services/attendance-store';
import { UserProfile, AttendanceRecord } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Search, Calendar, Clock, CheckCircle, Mail, Phone } from 'lucide-react';
import { AttendanceTable } from '@/components/attendance/attendance-table';

export default function ManagerTeamPage() {
  const [currentUser] = useState<UserProfile>(() => AttendanceService.getCurrentUser());
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [memberRecords, setMemberRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const users = AttendanceService.getUsers().filter(
      (u) => u.manager_id === currentUser.id || u.department_name === currentUser.department_name
    );
    setTeamMembers(users);
    if (users.length > 0) {
      setSelectedMember(users[0]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedMember) {
      const records = AttendanceService.getRecords().filter((r) => r.user_id === selectedMember.id);
      setMemberRecords(records);
    }
  }, [selectedMember]);

  return (
    <DashboardShell>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Team Members & Individual Logs
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Select a team member to view their individual attendance history and punctuality logs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Members List */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 px-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Direct Reports ({teamMembers.length})
          </h3>

          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex items-center gap-3 ${
                  selectedMember?.id === member.id
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <img
                  src={member.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">{member.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{member.position || 'Staff'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Selected Member Detail */}
        <div className="md:col-span-2 space-y-6">
          {selectedMember ? (
            <>
              <Card>
                <div className="flex items-center gap-4">
                  <img
                    src={selectedMember.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={selectedMember.name}
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-500/20"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedMember.name}</h2>
                    <p className="text-xs text-slate-500">{selectedMember.position || 'Software Engineer'}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedMember.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedMember.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <AttendanceTable
                records={memberRecords}
                title={`${selectedMember.name}'s Attendance Log`}
                showEmployeeDetails={false}
              />
            </>
          ) : (
            <Card className="text-center py-12 text-slate-400">
              Select a team member from the left menu to view their attendance history.
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
