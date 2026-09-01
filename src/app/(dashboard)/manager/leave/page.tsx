'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AttendanceService } from '@/lib/services/attendance-store';
import { LeaveService } from '@/lib/services/leave-store';
import { UserProfile, LeaveRequest } from '@/types';
import { LeaveTable } from '@/components/leave/leave-table';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';

export default function ManagerLeavePage() {
  const [currentUser] = useState<UserProfile>(() => AttendanceService.getCurrentUser());
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);

  const loadData = () => {
    const pending = LeaveService.getPendingRequests(currentUser.id);
    const all = LeaveService.getLeaveRequests().filter(
      (r) => r.reviewer_id === currentUser.id || r.status !== 'pending'
    );
    setPendingRequests(pending);
    setAllRequests(all);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleApprove = (id: string) => {
    LeaveService.reviewLeaveRequest(id, currentUser.id, 'approved', 'Approved by manager');
    loadData();
  };

  const handleReject = (id: string) => {
    const comment = prompt('Reason for rejection (optional):') || 'Rejected by manager';
    LeaveService.reviewLeaveRequest(id, currentUser.id, 'rejected', comment);
    loadData();
  };

  return (
    <DashboardShell>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Team Leave Approvals</h1>
          <p className="text-xs text-slate-400 mt-1">Review, approve, or reject team leave requests and manage availability</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{pendingRequests.length}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Requests</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                {allRequests.filter((r) => r.status === 'approved').length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected Requests</p>
              <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                {allRequests.filter((r) => r.status === 'rejected').length}
              </h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Pending Team Leave Requests ({pendingRequests.length})
        </h3>

        <LeaveTable
          requests={pendingRequests}
          isManagerView={true}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>

      {/* Processed Requests Section */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Recent Review History
        </h3>

        <LeaveTable
          requests={allRequests.filter((r) => r.status !== 'pending')}
          isManagerView={true}
        />
      </div>
    </DashboardShell>
  );
}
