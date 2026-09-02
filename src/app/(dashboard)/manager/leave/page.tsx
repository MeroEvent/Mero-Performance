'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { LeaveRequest } from '@/types';
import { LeaveTable } from '@/components/leave/leave-table';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ManagerLeavePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/leave');
      const data = await res.json();
      if (res.ok && data.requests) {
        setRequests(data.requests);
      } else {
        setErrorMsg(data.error || 'Failed to fetch team leave requests');
      }
    } catch (err: any) {
      console.error('Failed to load admin leaves:', err);
      setErrorMsg(err.message || 'Error connecting to leave service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    if (!profile?.id) return;
    try {
      const res = await fetch('/api/admin/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          action: 'approved',
          reviewerId: profile.id,
          reviewerComment: `Approved by ${profile.name || 'Manager'}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      } else {
        alert(data.error || 'Failed to approve leave');
      }
    } catch (err: any) {
      alert(err.message || 'Approval error');
    }
  };

  const handleReject = async (id: string) => {
    if (!profile?.id) return;
    const comment = prompt('Reason for rejection (optional):') || 'Rejected by manager';
    try {
      const res = await fetch('/api/admin/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          action: 'rejected',
          reviewerId: profile.id,
          reviewerComment: comment,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      } else {
        alert(data.error || 'Failed to reject leave');
      }
    } catch (err: any) {
      alert(err.message || 'Rejection error');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');

  return (
    <DashboardShell>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Team Leave Approvals</h1>
          <p className="text-xs text-slate-400 mt-1">Review, approve, or reject employee leave applications with automatic quota balance deductions</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">{pendingRequests.length}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Requests</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {approvedRequests.length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected Requests</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                {rejectedRequests.length}
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

        {isLoading ? (
          <div className="p-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-xs font-semibold text-slate-500">Loading pending requests...</span>
          </div>
        ) : (
          <LeaveTable
            requests={pendingRequests}
            isManagerView={true}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>

      {/* Processed Requests Section */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Recent Review History
        </h3>

        <LeaveTable
          requests={requests.filter((r) => r.status !== 'pending')}
          isManagerView={true}
        />
      </div>
    </DashboardShell>
  );
}
