'use client';

import React, { useState } from 'react';
import { AttendanceRecord, UserProfile } from '@/types';
import { formatTime } from '@/lib/utils/attendance';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  ShieldCheck, 
  Users, 
  Smartphone, 
  Laptop, 
  Trash2, 
  Activity,
  ArrowRight,
  LogIn,
  LogOut,
  Timer
} from 'lucide-react';

interface TodayAttendanceTableProps {
  records?: AttendanceRecord[] | null;
  todayRecord?: AttendanceRecord | null;
  currentUser: UserProfile;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

function formatDisplayDevice(deviceStr?: string | null): { name: string; isMobile: boolean } {
  if (!deviceStr) return { name: 'Web Client', isMobile: false };
  const tokens = deviceStr.split('|').filter(t => !t.startsWith('hw_') && !t.startsWith('dev_'));
  const isMobile = deviceStr.toLowerCase().includes('iphone') || deviceStr.toLowerCase().includes('android') || deviceStr.toLowerCase().includes('mobile');
  
  if (tokens.length > 0) {
    const cleaned = tokens[0].trim();
    return { name: cleaned, isMobile };
  }
  return { name: isMobile ? 'Mobile Device' : 'Computer', isMobile };
}

export const TodayAttendanceTable: React.FC<TodayAttendanceTableProps> = ({
  records,
  todayRecord,
  currentUser,
  title = "Today's Attendance Log",
  subtitle,
  onRefresh,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const [isClearing, setIsClearing] = useState(false);

  const displayRecords: (AttendanceRecord & { user?: any })[] = records
    ? records
    : todayRecord
    ? [{ ...todayRecord, user: currentUser }]
    : [];

  const defaultSubtitle = isAdmin
    ? `Live check-ins for today (${displayRecords.length} logged)`
    : 'Current session tracking for today';

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAllToday = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/attendance?all=true', { method: 'DELETE' });
      if (res.ok) {
        setShowClearConfirm(false);
        if (onRefresh) onRefresh();
        else window.location.reload();
      }
    } catch (e) {
      console.error('Failed to clear today records:', e);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              {displayRecords.length} Logged Today
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle || defaultSubtitle}
          </p>
        </div>

        {/* Dev Reset Action Button */}
        {isAdmin && (
          <div>
            <button
              onClick={handleClearAllToday}
              disabled={isClearing}
              title="Clear all records for today (Dev)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-800/60 transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
              <span>Clear All Today (Dev)</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {displayRecords.length === 0 ? (
        <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAdmin ? 'No check-ins recorded for today yet.' : 'No check-in recorded for today yet.'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isAdmin
                ? 'Employee entries appear here in real-time as they check in.'
                : 'Tap Check In above to start your shift.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Native App Card List */}
          <div className="md:hidden space-y-3.5">
            {displayRecords.map((record) => {
              const emp = record.user || currentUser;
              const deptName = emp.department?.name || emp.department_name || emp.position || 'Staff';
              const dev = formatDisplayDevice(record.device_info);
              const isInProgress = !record.check_out_time;

              return (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 space-y-3.5 shadow-xs"
                >
                  {/* Top Employee Profile Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {emp.avatar_url ? (
                        <img
                          src={emp.avatar_url}
                          alt={emp.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                          {emp.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {emp.name}
                        </p>
                        <p className="text-xs font-medium text-slate-400 truncate">
                          {deptName}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={record.status} />
                  </div>

                  {/* Clean 2-Column Timing Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        CHECK IN
                      </span>
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatTime(record.check_in_time)}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        CHECK OUT
                      </span>
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {record.check_out_time ? (
                          formatTime(record.check_out_time)
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            In Progress
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Clean Bottom Metadata Footer */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="font-bold text-xs">
                      {isInProgress ? (
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold">Session Running</span>
                      ) : record.status === 'absent' || (Number(record.total_hours || 0) < 2.0) ? (
                        <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                          Incomplete ({Number(record.total_hours || 0).toFixed(2)}h)
                        </span>
                      ) : record.status === 'half_day' || (Number(record.total_hours || 0) < 6.0) ? (
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                          Half Day ({Number(record.total_hours || 0).toFixed(2)}h)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          {Number(record.total_hours || 0).toFixed(2)}h completed
                        </span>
                      )}
                    </div>


                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        {dev.isMobile ? (
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{dev.name}</span>
                      </span>

                      <span>·</span>

                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{record.location_verified ? 'GPS' : 'Standard'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-left border-collapse text-xs">

              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800/80">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Device / Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {displayRecords.map((record) => {
                  const emp = record.user || currentUser;
                  const deptName = emp.department?.name || emp.department_name || emp.position || 'Staff';
                  const dev = formatDisplayDevice(record.device_info);

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3">
                          {emp.avatar_url ? (
                            <img
                              src={emp.avatar_url}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                              {emp.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {emp.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {deptName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {formatTime(record.check_in_time)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                        {record.check_out_time ? (
                          <span className="font-semibold">{formatTime(record.check_out_time)}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-xs">
                            In Progress
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {record.total_hours ? (
                          <span className="font-semibold">{record.total_hours.toFixed(2)} hrs</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-xs">Running</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={record.status} />
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-slate-400">
                            {dev.isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                            <span>{dev.name}</span>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{record.location_verified ? 'GPS' : 'Standard'}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dev Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClearAll}
        title="Reset Today's Attendance"
        description="Are you sure you want to clear all employee check-in and check-out records for today? This action is irreversible."
        confirmText="Clear Today's Records"
        cancelText="Cancel"
        variant="danger"
        isLoading={isClearing}
      />
    </div>
  );
};
