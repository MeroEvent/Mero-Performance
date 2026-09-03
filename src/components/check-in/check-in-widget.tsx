'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { formatDuration, formatTime } from '@/lib/utils/attendance';
import { fetchBrowserPublicIp } from '@/lib/utils/network';
import { getDeviceFingerprint } from '@/lib/utils/device';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  ShieldAlert, 
  RotateCcw, 
  Palmtree, 
  Coffee, 
  Umbrella,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface CheckInWidgetProps {
  user: UserProfile;
  onStatusChange?: () => void;
}

export const CheckInWidget: React.FC<CheckInWidgetProps> = ({ user, onStatusChange }) => {
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [todayHoliday, setTodayHoliday] = useState<any | null>(null);
  const [isWeekend, setIsWeekend] = useState<boolean>(false);
  const [approvedLeave, setApprovedLeave] = useState<any | null>(null);

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
      setTodayHoliday(data.holiday || null);
      setIsWeekend(Boolean(data.isWeekend));
      setApprovedLeave(data.approvedLeave || null);

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
        const [location, publicNetwork] = await Promise.all([
          getPosition(),
          getFreshNetwork(),
        ]);

        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            lat: location.lat,
            lng: location.lng,
            deviceInfo: `${device.deviceName} | ${device.hardwareId} | ${device.deviceId}`,
            deviceId: device.deviceId,
            hardwareId: device.hardwareId,
            networkIp: publicNetwork?.ip,
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

  const isCheckedIn = !!(todayRecord?.check_in_time && !todayRecord?.check_out_time);
  const isCompletedToday = !!(todayRecord?.check_in_time && todayRecord?.check_out_time);

  // Admin Quick Authorize Network IP
  const [isAuthorizingIp, setIsAuthorizingIp] = useState(false);
  const handleAuthorizeCurrentIp = async () => {
    if (!networkBlockModal.currentIp) return;
    setIsAuthorizingIp(true);
    try {
      const res = await fetch('/api/admin/settings/allow-ip', {
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all duration-300">
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

      {/* Holiday / Weekend / Leave Banner Notification (If not checked in) */}
      {!isCheckedIn && !isCompletedToday && todayHoliday && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Official Public Holiday
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {todayHoliday.is_paid !== false ? 'Paid Holiday' : 'Holiday'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {todayHoliday.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Office is closed today. Attendance punch is not required.
            </p>
          </div>
        </div>
      )}

      {!isCheckedIn && !isCompletedToday && !todayHoliday && isWeekend && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Saturday • Weekly Off
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              Enjoy your weekend! Office is closed today.
            </p>
          </div>
        </div>
      )}

      {!isCheckedIn && !isCompletedToday && !todayHoliday && !isWeekend && approvedLeave && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Umbrella className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Approved Leave ({approvedLeave.leave_type.toUpperCase()})
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              You are officially on leave today: {approvedLeave.reason || 'Excused from office'}
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        {/* Left Info Column */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isCheckedIn
                ? 'Session Active'
                : isCompletedToday
                ? 'Shift Completed'
                : todayHoliday
                ? 'Official Holiday'
                : isWeekend
                ? 'Weekly Off'
                : approvedLeave
                ? 'On Approved Leave'
                : 'Daily Attendance'}
            </h2>
            {todayRecord && (
              <button
                onClick={handleResetToday}
                disabled={isLoading}
                title="Dev Mode: Reset today's attendance to test again"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
              : todayHoliday
              ? `Happy ${todayHoliday.name}! Office is closed and punch-in is not required.`
              : isWeekend
              ? 'Today is Saturday (Weekly Off). No punch required.'
              : approvedLeave
              ? 'You are on approved leave today.'
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
              className="group relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-lg transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer border-4 border-slate-100 dark:border-slate-800"
            >
              <div className="flex flex-col items-center justify-center">
                <LogOut className="w-10 h-10 sm:w-11 sm:h-11 text-white mb-2 group-hover:scale-105 transition-transform duration-200" />
                <span className="text-base sm:text-lg font-black text-white tracking-wider">CHECK OUT</span>
              </div>
            </button>
          ) : isCompletedToday ? (
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-slate-900 dark:bg-slate-800 p-4 shadow-sm flex flex-col items-center justify-center text-center border-4 border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 sm:w-11 sm:h-11 text-emerald-400 mb-1.5" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Completed</span>
              <span className="text-[11px] text-slate-300 font-medium mt-0.5 font-mono">
                {Number(todayRecord?.total_hours || 0).toFixed(2)} hrs logged
              </span>
            </div>
          ) : todayHoliday ? (
            /* Holiday Lock Badge */
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-slate-900 dark:bg-slate-800 p-4 shadow-sm flex flex-col items-center justify-center text-center border-4 border-slate-100 dark:border-slate-800">
              <Palmtree className="w-10 h-10 sm:w-11 sm:h-11 text-slate-300 mb-1.5" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Holiday</span>
              <span className="text-[11px] text-slate-300 font-medium mt-0.5 line-clamp-1 max-w-[120px]">
                {todayHoliday.name}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase mt-1">
                Office Closed
              </span>
            </div>
          ) : isWeekend ? (
            /* Weekend / Saturday Lock Badge */
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-slate-900 dark:bg-slate-800 p-4 shadow-sm flex flex-col items-center justify-center text-center border-4 border-slate-100 dark:border-slate-800">
              <Coffee className="w-10 h-10 sm:w-11 sm:h-11 text-slate-300 mb-1.5" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Weekly Off</span>
              <span className="text-[11px] text-slate-300 font-medium mt-0.5">
                Saturday
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase mt-1">
                Office Closed
              </span>
            </div>
          ) : approvedLeave ? (
            /* Approved Leave Lock Badge */
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-slate-900 dark:bg-slate-800 p-4 shadow-sm flex flex-col items-center justify-center text-center border-4 border-slate-100 dark:border-slate-800">
              <Umbrella className="w-10 h-10 sm:w-11 sm:h-11 text-slate-300 mb-1.5" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">On Leave</span>
              <span className="text-[11px] text-slate-300 font-medium mt-0.5">
                {approvedLeave.leave_type.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase mt-1">
                Excused
              </span>
            </div>
          ) : (
            <button
              onClick={triggerCheckInConfirmation}
              disabled={isLoading}
              className="group relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 active:scale-95 shadow-lg transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer border-4 border-slate-100 dark:border-slate-800"
            >
              <div className="flex flex-col items-center justify-center">
                <LogIn className="w-10 h-10 sm:w-11 sm:h-11 text-white dark:text-slate-900 mb-2 group-hover:scale-105 transition-transform duration-200" />
                <span className="text-base sm:text-lg font-black tracking-wider">CHECK IN</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal before Check-In / Check-Out */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.type === 'check_in' ? 'Confirm Check-In' : 'Confirm Check-Out'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            {confirmModal.type === 'check_in' ? (
              <LogIn className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            ) : (
              <LogOut className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {confirmModal.type === 'check_in'
                  ? 'Ready to start your work shift?'
                  : 'Ready to finish and submit your work hours?'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {confirmModal.type === 'check_in'
                  ? 'Your exact arrival timestamp, location, and device verification will be recorded.'
                  : 'This will end your shift session for today and calculate your final logged hours.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal.type === 'check_in' ? 'primary' : 'danger'}
              size="sm"
              onClick={handleConfirmAction}
              className="gap-1.5"
            >
              {confirmModal.type === 'check_in' ? 'Yes, Check In' : 'Yes, Check Out'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* High-Tech Processing / Verifying Loader Modal */}
      <Modal
        isOpen={processingModal.isOpen}
        onClose={() => {}}
        title=""
        className="max-w-xs text-center py-6"
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              {processingModal.type === 'check_in' ? (
                <LogIn className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <LogOut className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {processingModal.type === 'check_in' ? 'Verifying & Checking In...' : 'Closing Session & Checking Out...'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Synchronizing with server security policies
            </p>
          </div>
        </div>
      </Modal>

      {/* Early Check-In Window Block Modal */}
      <Modal
        isOpen={earlyCheckInModal.isOpen}
        onClose={() => setEarlyCheckInModal({ ...earlyCheckInModal, isOpen: false })}
        title="Check-In Window Not Open"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Early Check-In Policy Active
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {earlyCheckInModal.message}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setEarlyCheckInModal({ ...earlyCheckInModal, isOpen: false })}
            >
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* Proxy / Shared Device Hardware Guard Modal */}
      <Modal
        isOpen={proxyBlockModal.isOpen}
        onClose={() => setProxyBlockModal({ ...proxyBlockModal, isOpen: false })}
        title="Hardware Security Policy"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                Single Device Rule Violation
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {proxyBlockModal.message}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setProxyBlockModal({ ...proxyBlockModal, isOpen: false })}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Network / WiFi Block Modal */}
      <Modal
        isOpen={networkBlockModal.isOpen}
        onClose={() => setNetworkBlockModal({ ...networkBlockModal, isOpen: false })}
        title="Unauthorized Network"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <Globe className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Office WiFi Network Required
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {networkBlockModal.message}
              </p>
              {networkBlockModal.currentIp && (
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2">
                  Detected Network IP: <span className="font-bold text-slate-700 dark:text-slate-200">{networkBlockModal.currentIp}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {user.role === 'admin' && networkBlockModal.currentIp && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAuthorizeCurrentIp}
                disabled={isAuthorizingIp}
                className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400"
              >
                {isAuthorizingIp ? 'Authorizing...' : 'Admin: Whitelist This IP'}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setNetworkBlockModal({ ...networkBlockModal, isOpen: false })}
            >
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
