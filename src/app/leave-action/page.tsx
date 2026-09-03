'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight, Building2, Calendar, User, Clock } from 'lucide-react';

function LeaveActionContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const action = searchParams.get('action');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    alreadyProcessed?: boolean;
    status?: string;
    message?: string;
    error?: string;
    details?: {
      employeeName?: string;
      employeeEmail?: string;
      leaveType?: string;
      startDate?: string;
      endDate?: string;
      totalDays?: number;
      reviewedAt?: string;
    };
  } | null>(null);

  useEffect(() => {
    if (!id || !action || !token) {
      setResult({
        success: false,
        error: 'Missing required parameters in link.',
      });
      setLoading(false);
      return;
    }

    const processAction = async () => {
      try {
        const res = await fetch(`/api/leave/action?id=${id}&action=${action}&token=${token}`);
        const data = await res.json();
        setResult(data);
      } catch (err: any) {
        setResult({
          success: false,
          error: err.message || 'Failed to connect to server.',
        });
      } finally {
        setLoading(false);
      }
    };

    processAction();
  }, [id, action, token]);

  const isApproved = (result?.status || action) === 'approved';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Company Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-black text-sm shadow-xs">
            M
          </div>
          <span className="text-base font-extrabold tracking-tight text-white">Mero Attendance</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
            <div>
              <h2 className="text-lg font-bold text-white">Processing Leave Decision...</h2>
              <p className="text-xs text-slate-400 mt-1">Verifying cryptographic token & updating roster</p>
            </div>
          </div>
        ) : result?.success ? (
          <div className="space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                  isApproved
                    ? 'bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-500/15 border-2 border-rose-500/40 text-rose-400'
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="w-10 h-10" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
              </div>
            </div>

            {/* Title & Message */}
            <div>
              <h1 className="text-2xl font-black text-white">
                {result.alreadyProcessed
                  ? `Leave Already ${result.status?.toUpperCase()}`
                  : isApproved
                  ? 'Leave Request Approved!'
                  : 'Leave Request Rejected'}
              </h1>
              <p className="text-sm text-slate-400 mt-1.5">
                {result.alreadyProcessed
                  ? `This application was previously ${result.status}. No further action is required.`
                  : isApproved
                  ? `The leave has been approved and a confirmation email has been dispatched to the employee.`
                  : `The leave has been rejected and the employee has been notified via email.`}
              </p>
            </div>

            {/* Details Box */}
            {result.details && (
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                {result.details.employeeName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Employee:
                    </span>
                    <span className="font-bold text-white">{result.details.employeeName}</span>
                  </div>
                )}
                {result.details.leaveType && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Leave Type:
                    </span>
                    <span className="font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {result.details.leaveType}
                    </span>
                  </div>
                )}
                {result.details.startDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Duration:
                    </span>
                    <span className="font-bold text-slate-200">
                      {result.details.totalDays} Day{result.details.totalDays === 1 ? '' : 's'} ({result.details.startDate} to {result.details.endDate})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/admin/leave"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-xs transition-all active:scale-[0.98]"
              >
                <span>Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-10 h-10" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black text-white">Action Failed</h1>
              <p className="text-sm text-slate-400 mt-1.5">
                {result?.error || 'Invalid or expired action link.'}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/admin/leave"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-xs transition-all"
              >
                <span>Open Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaveActionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LeaveActionContent />
    </Suspense>
  );
}
