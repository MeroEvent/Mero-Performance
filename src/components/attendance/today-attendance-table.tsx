'use client';

import React, { useState } from 'react';
import { AttendanceRecord, UserProfile } from '@/types';
import { formatTime } from '@/lib/utils/attendance';
import { StatusBadge } from '@/components/ui/badge';
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

  const handleClearAllToday = async () => {
    if (!confirm('Dev Mode: Clear ALL employee attendance records for today?')) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/attendance?all=true', { method: 'DELETE' });
      if (res.ok) {
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              {displayRecords.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {displayRecords.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {subtitle || defaultSubtitle}
            </p>
          </div>
        </div>

        {/* Dev Reset Action Button */}
        {isAdmin && displayRecords.length > 0 && (
          <button
            onClick={handleClearAllToday}
            disabled={isClearing}
            title="Clear all records for today (Dev)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {displayRecords.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
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
          <div className="md:hidden space-y-3">
            {displayRecords.map((record) => {
              const emp = record.user || currentUser;
              const deptName = emp.department?.name || emp.department_name || emp.position || 'Staff';
              const dev = formatDisplayDevice(record.device_info);

              return (
                <div
                  key={record.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 space-y-3 shadow-xs"
                >
                  {/* Top Employee Profile Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {emp.avatar_url ? (
                        <img
                          src={emp.avatar_url}
                          alt={emp.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                          {emp.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {emp.name}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 truncate">
                          {deptName}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={record.status} />
                  </div>

                  {/* Clean 2-Column Timing Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <LogIn className="w-3 h-3 text-emerald-500" /> Check In
                      </span>
                      <p className="font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                        {formatTime(record.check_in_time)}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <LogOut className="w-3 h-3 text-rose-500" /> Check Out
                      </span>
                      <p className="font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                        {record.check_out_time ? formatTime(record.check_out_time) : (
                          <span className="text-amber-500 font-bold text-xs">
                            In Progress
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Clean Bottom Metadata Footer */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <Timer className="w-3 h-3" />
                      <span>{record.total_hours ? `${record.total_hours.toFixed(2)} hrs worked` : 'Active Session'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="flex items-center gap-1">
                        {dev.isMobile ? (
                          <Smartphone className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Laptop className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{dev.name}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <MapPin className={`w-3 h-3 ${record.location_verified ? 'text-emerald-500' : 'text-slate-400'}`} />
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
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
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

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatTime(record.check_in_time)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {record.check_out_time ? (
                          formatTime(record.check_out_time)
                        ) : (
                          <span className="text-amber-500 font-bold">
                            In Progress
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {record.total_hours ? `${record.total_hours.toFixed(2)} hrs` : 'Running'}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={record.status} />
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            {dev.isMobile ? <Smartphone className="w-3.5 h-3.5 text-slate-400" /> : <Laptop className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{dev.name}</span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className={`w-3.5 h-3.5 ${record.location_verified ? 'text-emerald-500' : 'text-slate-400'}`} />
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
    </div>
  );
};
