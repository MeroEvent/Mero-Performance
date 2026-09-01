'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AttendanceService } from '@/lib/services/attendance-store';
import { LeaveService } from '@/lib/services/leave-store';
import { UserProfile, LeaveRequest, LeaveBalance, LeaveTypeConfig } from '@/types';
import { LeaveBalanceCards } from '@/components/leave/leave-balance-cards';
import { LeaveTable } from '@/components/leave/leave-table';
import { LeaveRequestModal } from '@/components/leave/leave-request-modal';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function EmployeeLeavePage() {
  const [currentUser] = useState<UserProfile>(() => AttendanceService.getCurrentUser());
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    setBalances(LeaveService.getLeaveBalances(currentUser.id));
    setLeaveTypes(LeaveService.getLeaveTypes());
    setRequests(LeaveService.getLeaveRequests(currentUser.id));
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleCancelRequest = (id: string) => {
    if (confirm('Are you sure you want to cancel this leave request?')) {
      LeaveService.cancelLeaveRequest(id);
      loadData();
    }
  };

  return (
    <DashboardShell>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">My Leave Portal</h1>
          <p className="text-xs text-slate-300 mt-1">Manage annual leave quotas, apply for leave, and view request statuses</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </Button>
      </div>

      {/* Leave Balances Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Annual Leave Quota & Remaining Balance
        </h3>
        <LeaveBalanceCards balances={balances} leaveTypes={leaveTypes} />
      </div>

      {/* Leave History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            My Leave Request History
          </h3>
          <span className="text-xs text-slate-400 font-medium">Total: {requests.length} requests</span>
        </div>

        <LeaveTable requests={requests} onCancel={handleCancelRequest} />
      </div>

      {/* Request Modal */}
      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={currentUser.id}
        userName={currentUser.name}
        departmentName={currentUser.department_name}
        leaveTypes={leaveTypes}
        onRequestSubmitted={loadData}
      />
    </DashboardShell>
  );
}
