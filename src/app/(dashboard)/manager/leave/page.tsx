'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { LeaveRequest } from '@/types';
import { LeaveTable } from '@/components/leave/leave-table';
import { Card } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ManagerLeavePage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Confirmation Modals State
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest | null;
    isProcessing: boolean;
  }>({
    isOpen: false,
    request: null,
    isProcessing: false,
  });

  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest | null;
    reason: string;
    isProcessing: boolean;
    error: string;
  }>({
    isOpen: false,
    request: null,
    reason: '',
    isProcessing: false,
    error: '',
  });

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

  // Trigger Approval Modal
  const handleApproveClick = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setApprovalModal({
      isOpen: true,
      request: req,
      isProcessing: false,
    });
  };

  // Confirm Approval Execution
  const handleConfirmApproval = async () => {
    if (!approvalModal.request || !profile?.id) return;
    try {
      setApprovalModal((prev) => ({ ...prev, isProcessing: true }));
      const res = await fetch('/api/admin/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: approvalModal.request.id,
          action: 'approved',
          reviewerId: profile.id,
          reviewerComment: `Approved by ${profile.name || 'Manager'}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalModal({ isOpen: false, request: null, isProcessing: false });
        loadData();
      } else {
        alert(data.error || 'Failed to approve leave');
        setApprovalModal((prev) => ({ ...prev, isProcessing: false }));
      }
    } catch (err: any) {
      alert(err.message || 'Approval error');
      setApprovalModal((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Trigger Rejection Modal
  const handleRejectClick = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRejectionModal({
      isOpen: true,
      request: req,
      reason: '',
      isProcessing: false,
      error: '',
    });
  };

  // Confirm Rejection Execution
  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModal.request || !profile?.id) return;

    if (!rejectionModal.reason.trim()) {
      setRejectionModal((prev) => ({
        ...prev,
        error: 'Please provide a brief reason for rejecting this leave request.',
      }));
      return;
    }

    try {
      setRejectionModal((prev) => ({ ...prev, isProcessing: true, error: '' }));
      const res = await fetch('/api/admin/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: rejectionModal.request.id,
          action: 'rejected',
          reviewerId: profile.id,
          reviewerComment: rejectionModal.reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRejectionModal({ isOpen: false, request: null, reason: '', isProcessing: false, error: '' });
        loadData();
      } else {
        setRejectionModal((prev) => ({
          ...prev,
          isProcessing: false,
          error: data.error || 'Failed to reject leave',
        }));
      }
    } catch (err: any) {
      setRejectionModal((prev) => ({
        ...prev,
        isProcessing: false,
        error: err.message || 'Rejection error',
      }));
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Team Leave Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review, approve, or reject employee leave applications with automatic quota balance deductions
          </p>
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
        <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {pendingRequests.length}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Requests</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {approvedRequests.length}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected Requests</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {rejectedRequests.length}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Pending Team Leave Requests ({pendingRequests.length})
        </h3>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500 mr-2" />
            <span className="text-xs font-semibold text-slate-500">Loading pending requests...</span>
          </div>
        ) : (
          <LeaveTable
            requests={pendingRequests}
            isManagerView={true}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
          />
        )}
      </div>

      {/* Processed Requests Section */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Recent Review History
        </h3>

        <LeaveTable
          requests={requests.filter((r) => r.status !== 'pending')}
          isManagerView={true}
        />
      </div>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, request: null, isProcessing: false })}
        onConfirm={handleConfirmApproval}
        title="Approve Leave Request"
        description={
          approvalModal.request
            ? `Are you sure you want to approve ${approvalModal.request.user_name || 'this employee'}'s request for ${approvalModal.request.total_days} day(s) (${approvalModal.request.start_date} to ${approvalModal.request.end_date})? This will deduct ${approvalModal.request.total_days} day(s) from their balance.`
            : ''
        }
        confirmText="Confirm & Approve"
        cancelText="Cancel"
        variant="primary"
        isLoading={approvalModal.isProcessing}
      />

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, request: null, reason: '', isProcessing: false, error: '' })}
        title="Reject Leave Request"
      >
        <form onSubmit={handleConfirmRejection} className="space-y-4">
          {rejectionModal.error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
              {rejectionModal.error}
            </div>
          )}

          {rejectionModal.request && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1 border border-slate-200/60 dark:border-slate-700/60">
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {rejectionModal.request.user_name || 'Employee'} · {rejectionModal.request.total_days} Day(s)
              </p>
              <p className="text-slate-500">
                Period: <span className="font-mono">{rejectionModal.request.start_date}</span> to <span className="font-mono">{rejectionModal.request.end_date}</span>
              </p>
              <p className="text-slate-500">
                Employee Reason: <span className="italic">{rejectionModal.request.reason}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for Rejection <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
              placeholder="e.g. Critical project deadline on these dates, please reschedule..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-slate-400 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectionModal({ isOpen: false, request: null, reason: '', isProcessing: false, error: '' })}
              disabled={rejectionModal.isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={rejectionModal.isProcessing}
              isLoading={rejectionModal.isProcessing}
            >
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
