'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord } from '@/types';
import { formatDuration, formatTime } from '@/lib/utils/attendance';
import { fetchBrowserPublicIp } from '@/lib/utils/network';
import { getDeviceFingerprint } from '@/lib/utils/device';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Laptop, Globe, Building2, MapPin, ShieldAlert, Smartphone, RotateCcw, Trash2, Timer } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface CheckInWidgetProps {
  user: UserProfile;
  onStatusChange?: () => void;
}

export const CheckInWidget: React.FC<CheckInWidgetProps> = ({ user, onStatusChange }) => {
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [networkBlockModal, setNetworkBlockModal] = useState<{
    isOpen: boolean;
    message: string;
    currentIp?: string;
    action: 'check_in' | 'check_out';
  }>({
    isOpen: false,
    message: '',
    action: 'check_out',
  });

  const [proxyBlockModal, setProxyBlockModal] = useState<{
    isOpen: boolean;
    message: string;
    proxyUser?: string;
  }>({
    isOpen: false,
    message: '',
  });

  // Early Check-In Window Block Modal State
  const [earlyCheckInModal, setEarlyCheckInModal] = useState<{
    isOpen: boolean;
    message: string;
    shiftStartTime?: string;
    allowedFromTime?: string;
    earlyWindowMinutes?: number;
  }>({
    isOpen: false,
    message: '',
  });
  
  // Processing Modal State for High-Tech Loader ("Checking In..." / "Checking Out...")
  const [processingModal, setProcessingModal] = useState<{
    isOpen: boolean;
    type: 'check_in' | 'check_out';
  }>({
    isOpen: false,
    type: 'check_in',
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'check_in' | 'check_out';
  }>({
    isOpen: false,
    type: 'check_in',
  });

  // Sync today's record from backend
  const refreshRecord = async () => {
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}`);
      const data = await res.json();
      if (data.record) {
        setTodayRecord(data.record);
        if (data.record.check_in_time && !data.record.check_out_time) {
          const checkInMs = new Date(data.record.check_in_time).getTime();
          const nowMs = new Date().getTime();
          setElapsedSeconds(Math.max(0, Math.floor((nowMs - checkInMs) / 1000)));
        } else {
          setElapsedSeconds(0);
        }
      } else {
        setTodayRecord(null);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('Failed to sync today record:', err);
    }
  };

  useEffect(() => {
    if (user?.id) refreshRecord();
  }, [user.id]);

  // Live timer tick when checked in
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time) {
      interval = setInterval(() => {
        const checkInMs = new Date(todayRecord.check_in_time!).getTime();
        const nowMs = new Date().getTime();
        setElapsedSeconds(Math.max(0, Math.floor((nowMs - checkInMs) / 1000)));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [todayRecord]);

  // Pre-fetch IP in background on mount for instantaneous check-in
  const [cachedPublicIp, setCachedPublicIp] = useState<string | null>(null);

  useEffect(() => {
    fetchBrowserPublicIp({ attempts: 1 }).then((res) => {
      if (res?.ip) setCachedPublicIp(res.ip);
    });
  }, []);

  const getPosition = (): Promise<{ lat?: number; lng?: number }> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        let hasResolved = false;
        const fallbackTimer = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            resolve({});
          }
        }, 1200);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(fallbackTimer);
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
          },
          () => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(fallbackTimer);
              resolve({});
            }
          },
          { timeout: 1200, maximumAge: 300000, enableHighAccuracy: false }
        );
      } else {
        resolve({});
      }
    });
  };

  const getFreshNetwork = async () => {
    if (cachedPublicIp) {
      return { ip: cachedPublicIp, source: 'browser_public' as const };
    }
    return fetchBrowserPublicIp({ attempts: 1, retryDelayMs: 0 });
  };

  const triggerCheckInConfirmation = () => {
    setConfirmModal({ isOpen: true, type: 'check_in' });
  };

  const triggerCheckOutConfirmation = () => {
    setConfirmModal({ isOpen: true, type: 'check_out' });
  };

  const handleConfirmAction = async () => {
    const actionType = confirmModal.type;
    setConfirmModal({ ...confirmModal, isOpen: false });
    setIsLoading(true);
    setProcessingModal({ isOpen: true, type: actionType });
    setFeedbackMessage(null);

    if (actionType === 'check_in') {
      try {
        const device = getDeviceFingerprint();
        const [coords, publicNetwork] = await Promise.all([
          getPosition(),
          getFreshNetwork(),
        ]);
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            lat: coords.lat,
            lng: coords.lng,
            networkIp: publicNetwork?.ip,
            deviceId: device.deviceId,
            hardwareId: device.hardwareId,
            deviceInfo: device.formattedDeviceInfo,
          }),
        });

        const data = await res.json();
        setProcessingModal({ isOpen: false, type: 'check_in' });

        if (!res.ok || data.error) {
          if (data.isDeviceProxyError) {
            setProxyBlockModal({
              isOpen: true,
              message: data.error || 'This device was already used to check in for another employee today.',
              proxyUser: data.proxyUser,
            });
          } else if (data.isTooEarly) {
            setEarlyCheckInModal({
              isOpen: true,
              message: data.error || 'Early check-in is not permitted before the shift window opens.',
              shiftStartTime: data.shiftStartTime,
              allowedFromTime: data.allowedFromTime,
              earlyWindowMinutes: data.earlyWindowMinutes,
            });
          } else if (data.isIpError) {
            setNetworkBlockModal({
              isOpen: true,
              message: data.error || 'Connect to an allowed office WiFi network and try again.',
              currentIp: data.clientIp || publicNetwork?.ip,
              action: 'check_in',
            });
          }
          throw new Error(data.error || 'Failed to check in');
        }

        setTodayRecord(data.record);
        setFeedbackMessage({
          text: `Checked in successfully at ${formatTime(data.record.check_in_time)}!`,
          type: 'success',
        });
        if (onStatusChange) onStatusChange();
      } catch (err: any) {
        setProcessingModal({ isOpen: false, type: 'check_in' });
        setFeedbackMessage({ text: err.message || 'Failed to check in', type: 'error' });
      } finally {
        setIsLoading(false);
        setProcessingModal({ isOpen: false, type: 'check_in' });
      }
    } else {
      try {
        const publicNetwork = await getFreshNetwork();
        const res = await fetch('/api/attendance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            networkIp: publicNetwork?.ip,
          }),
        });

        const data = await res.json();
        setProcessingModal({ isOpen: false, type: 'check_out' });

        if (!res.ok || data.error) {
          if (data.isIpError) {
            setNetworkBlockModal({
              isOpen: true,
              message: data.error || 'Connect to an allowed office WiFi network before checking out.',
              currentIp: data.clientIp || publicNetwork?.ip,
              action: 'check_out',
            });
          }
          throw new Error(data.error || 'Failed to check out');
        }

        setTodayRecord(data.record);
        setFeedbackMessage({
          text: `Checked out successfully! Total worked: ${Number(data.totalHours || 0).toFixed(2)} hrs.`,
          type: 'success',
        });
        if (onStatusChange) onStatusChange();
      } catch (err: any) {
        setProcessingModal({ isOpen: false, type: 'check_out' });
        setFeedbackMessage({ text: err.message || 'Failed to check out', type: 'error' });
      } finally {
        setIsLoading(false);
        setProcessingModal({ isOpen: false, type: 'check_out' });
      }
    }
  };

  const handleResetToday = async () => {
    if (!confirm('Dev Mode: Clear today\'s attendance record so you can test check-in and check-out again?')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset attendance');

      setTodayRecord(null);
      setElapsedSeconds(0);
      setFeedbackMessage({
        text: 'Attendance reset! You can now check in again.',
        type: 'success',
      });
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to reset', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const isCheckedIn = Boolean(todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time);
  const isCompletedToday = Boolean(todayRecord && todayRecord.check_in_time && todayRecord.check_out_time);

  const [isAuthorizingIp, setIsAuthorizingIp] = useState(false);

  const handleQuickAuthorizeNetwork = async () => {
    if (!networkBlockModal.currentIp) return;
    setIsAuthorizingIp(true);
    try {
      const res = await fetch('/api/admin/company-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addIp: networkBlockModal.currentIp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authorize network');

      setNetworkBlockModal({ isOpen: false, message: '', action: 'check_out' });
      setFeedbackMessage({
        text: `Office WiFi network (${networkBlockModal.currentIp}) authorized! You can now check in.`,
        type: 'success',
      });
    } catch (e: any) {
      alert(e.message || 'Failed to authorize network');
    } finally {
      setIsAuthorizingIp(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-8 shadow-lg dark:shadow-2xl relative overflow-hidden transition-all duration-300">
      {feedbackMessage && (
        <div
          className={`mb-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        {/* Left Info Column */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isCheckedIn ? 'Session Active' : isCompletedToday ? 'Shift Completed' : 'Daily Attendance'}
            </h2>
            {todayRecord && (
              <button
                onClick={handleResetToday}
                disabled={isLoading}
                title="Dev Mode: Reset today's attendance to test again"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reset Today (Dev)</span>
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
            {isCheckedIn
              ? 'Your check-in timer is currently active.'
              : isCompletedToday
              ? `Checked out at ${formatTime(todayRecord?.check_out_time)}.`
              : 'Tap Check In to record your attendance.'}
          </p>

          {/* Session Details / Timestamps */}
          {todayRecord && (
            <div className="grid grid-cols-2 gap-3 max-w-md pt-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-3 rounded-2xl shadow-sm">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Check In</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formatTime(todayRecord.check_in_time)}</span>
                {todayRecord.status && (
                  <div className="mt-1">
                    <StatusBadge status={todayRecord.status} />
                  </div>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-3 rounded-2xl shadow-sm">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Check Out</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {todayRecord.check_out_time ? formatTime(todayRecord.check_out_time) : '--:--'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                  {todayRecord.check_out_time ? `${Number(todayRecord.total_hours || 0).toFixed(2)} hrs` : 'In Progress'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Action Button Column */}
        <div className="flex flex-col items-center justify-center space-y-3 shrink-0">
          {isCheckedIn && (
            <div className="flex flex-col items-center justify-center mb-1">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Session Duration
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-white tracking-widest bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-6 py-2 rounded-2xl shadow-inner">
                {formatDuration(elapsedSeconds)}
              </div>
            </div>
          )}

          {/* Action Button States */}
          {isCheckedIn ? (
            <button
              onClick={triggerCheckOutConfirmation}
              disabled={isLoading}
              className="group relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-orange-500 p-1 shadow-xl hover:shadow-rose-500/40 active:scale-95 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer border-4 border-slate-100 dark:border-slate-900"
            >
              <div className="w-full h-full rounded-full bg-slate-900/10 dark:bg-slate-900/20 group-hover:bg-transparent flex flex-col items-center justify-center transition-colors">
                <LogOut className="w-10 h-10 sm:w-12 sm:h-12 text-white mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-lg sm:text-xl font-extrabold text-white tracking-wide">CHECK OUT</span>
              </div>
            </button>
          ) : isCompletedToday ? (
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-1 shadow-xl flex flex-col items-center justify-center text-center border-4 border-slate-100 dark:border-slate-900">
              <div className="w-full h-full rounded-full bg-slate-900/10 flex flex-col items-center justify-center p-4">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-white mb-1.5" />
                <span className="text-sm font-extrabold text-white uppercase tracking-wider">Completed</span>
                <span className="text-[11px] text-emerald-100 font-medium mt-0.5">
                  {Number(todayRecord?.total_hours || 0).toFixed(2)} hrs logged
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={triggerCheckInConfirmation}
              disabled={isLoading}
              className="group relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 p-1 shadow-xl hover:shadow-blue-500/40 active:scale-95 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer border-4 border-slate-100 dark:border-slate-900"
            >
              <div className="w-full h-full rounded-full bg-slate-900/10 dark:bg-slate-900/20 group-hover:bg-transparent flex flex-col items-center justify-center transition-colors">
                <LogIn className="w-10 h-10 sm:w-12 sm:h-12 text-white mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-lg sm:text-xl font-extrabold text-white tracking-wide">CHECK IN</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.type === 'check_in' ? 'Confirm Check In' : 'Confirm Check Out'}
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {confirmModal.type === 'check_in'
              ? 'Are you ready to check in for today? Your start time and location will be recorded.'
              : 'Are you sure you want to check out? Your session timer will stop and total work duration will be calculated.'}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmModal.type === 'check_in' ? 'primary' : 'danger'}
              size="sm"
              onClick={handleConfirmAction}
              isLoading={isLoading}
            >
              {confirmModal.type === 'check_in' ? 'Yes, Check In' : 'Yes, Check Out'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={networkBlockModal.isOpen}
        onClose={() => setNetworkBlockModal({ isOpen: false, message: '', action: 'check_out' })}
        title="Connect to Allowed Network"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Attendance action blocked from this network.</p>
              <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">
                {networkBlockModal.message}
              </p>
            </div>
          </div>

          {networkBlockModal.currentIp && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Current Network IP
              </span>
              <p className="mt-1 break-all font-mono text-sm font-black text-slate-900 dark:text-white">
                {networkBlockModal.currentIp}
              </p>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Please connect to the authorized office WiFi network, then press {networkBlockModal.action === 'check_in' ? 'Check In' : 'Check Out'} again.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {user.role === 'admin' && networkBlockModal.currentIp ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isAuthorizingIp}
                onClick={handleQuickAuthorizeNetwork}
                className="text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold"
              >
                <Globe className="w-3.5 h-3.5 mr-1 text-blue-500" />
                Authorize This Office Network
              </Button>
            ) : <div />}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setNetworkBlockModal({ isOpen: false, message: '', action: 'check_out' })}
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>

      {/* Proxy / Buddy Punching Device Block Modal */}
      <Modal
        isOpen={proxyBlockModal.isOpen}
        onClose={() => setProxyBlockModal({ isOpen: false, message: '' })}
        title="Proxy Check-In Blocked"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Multi-Account Check-in Blocked on This Device</p>
              <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">
                {proxyBlockModal.message}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span>Anti-Proxy Security Policy:</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              To prevent attendance fraud, each employee must check in using their own personal smartphone or workstation. One device cannot be used to check in for multiple colleagues.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setProxyBlockModal({ isOpen: false, message: '' })}
            >
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* Early Check-In Window Block Modal */}
      <Modal
        isOpen={earlyCheckInModal.isOpen}
        onClose={() => setEarlyCheckInModal({ isOpen: false, message: '' })}
        title="Check-In Window Not Open Yet"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <Timer className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Shift Has Not Started Yet</p>
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                {earlyCheckInModal.message}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Company Punctuality Policy:</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Check-in is permitted starting {earlyCheckInModal.earlyWindowMinutes || 15} minutes prior to your official shift start time ({earlyCheckInModal.shiftStartTime || '10:00 AM'}). Please check in after {earlyCheckInModal.allowedFromTime || '09:55 AM'}.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setEarlyCheckInModal({ isOpen: false, message: '' })}
            >
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* High-Tech Animated Processing Loader ("Checking In..." / "Checking Out...") */}
      {processingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-600/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              {processingModal.type === 'check_in' ? (
                <LogIn className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
              ) : (
                <LogOut className="w-8 h-8 text-rose-600 dark:text-rose-400 animate-pulse" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {processingModal.type === 'check_in' ? 'Checking In...' : 'Checking Out...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {processingModal.type === 'check_in'
                  ? 'Verifying device fingerprint, network security, and recording attendance...'
                  : 'Calculating worked hours and finalizing session in database...'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Device Fingerprint Verified</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                <span>Recording in Supabase Database...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
