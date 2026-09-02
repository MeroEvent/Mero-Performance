'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { LeaveRequest, LeaveBalance, LeaveTypeConfig } from '@/types';
import { LeaveBalanceCards } from '@/components/leave/leave-balance-cards';
import { LeaveTable } from '@/components/leave/leave-table';
import { LeaveRequestModal } from '@/components/leave/leave-request-modal';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

export default function EmployeeLeavePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    if (!profile?.id) return;
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await fetch(`/api/leave?userId=${profile.id}`);
      const data = await res.json();
      if (res.ok && data) {
        setBalances(data.balances || []);
        setLeaveTypes(data.leaveTypes || []);
        setRequests(data.requests || []);
      } else {
        setErrorMsg(data.error || 'Failed to load leave records');
      }
    } catch (err: any) {
      console.error('Failed to load leave data:', err);
      setErrorMsg(err.message || 'Error connecting to leave service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const handleCancelRequest = async (id: string) => {
    if (!profile?.id) return;
    if (confirm('Are you sure you want to cancel this leave request?')) {
      try {
        const res = await fetch(`/api/leave?id=${id}&userId=${profile.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok && data.success) {
          loadData();
        } else {
          alert(data.error || 'Failed to cancel leave request');
        }
      } catch (err: any) {
        alert(err.message || 'Failed to cancel request');
      }
    }
  };

  if (authLoading || (!profile && isLoading)) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-2" />
          <span className="text-sm font-semibold text-slate-500">Loading leave portal...</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">My Leave Portal</h1>
          <p className="text-xs text-slate-300 mt-1">Manage annual leave quotas, apply for leave, and view request statuses</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

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

        {isLoading ? (
          <div className="p-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-xs font-semibold text-slate-500">Loading leave requests...</span>
          </div>
        ) : (
          <LeaveTable requests={requests} onCancel={handleCancelRequest} />
        )}
      </div>

      {/* Request Modal */}
      {profile && (
        <LeaveRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={profile.id}
          userName={profile.name}
          departmentName={profile.department_name}
          leaveTypes={leaveTypes}
          onRequestSubmitted={loadData}
        />
      )}
    </DashboardShell>
  );
}
