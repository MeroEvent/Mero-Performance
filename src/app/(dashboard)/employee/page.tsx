'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CheckInWidget } from '@/components/check-in/check-in-widget';
import { DEFAULT_USERS } from '@/lib/services/attendance-store';
import { useAuth } from '@/lib/context/auth-context';
import { UserProfile, AttendanceRecord } from '@/types';
import { TodayAttendanceTable } from '@/components/attendance/today-attendance-table';
import { UpcomingHolidaysWidget } from '@/components/dashboard/upcoming-holidays-widget';
import { today as getTodayBS } from 'nepali-calendar-engine';

export default function EmployeeDashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const currentUser: UserProfile | null = profile;
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [liveDate, setLiveDate] = useState<string>('');

  const nepaliToday = useMemo(() => {
    try {
      const bs = getTodayBS();
      return `${bs.monthName.ne} ${bs.bs.day}, ${bs.bs.year}`;
    } catch {
      return '';
    }
  }, []);

  const loadTodayRecord = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/attendance?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.record) {
        setTodayRecord(data.record);
      } else {
        setTodayRecord(null);
      }
    } catch (e) {
      console.error('Failed to load today record:', e);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadTodayRecord();
    }
  }, [currentUser?.id]);

  // Live clock
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      setLiveDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !currentUser) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-24">
          <div className="w-8 h-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Clean Minimalist Header */}
      <div className="space-y-1 py-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Welcome back, {currentUser.name ? currentUser.name.trim().split(' ')[0] : 'User'}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          {liveDate} {nepaliToday ? `· वि.सं. ${nepaliToday}` : ''}
        </p>
      </div>

      {/* Hero Check-In / Check-Out Action Widget */}
      <div className="my-2">
        <CheckInWidget user={currentUser} onStatusChange={loadTodayRecord} />
      </div>

      {/* Content Grid: Today's Log + Upcoming Public Holidays */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <div className="xl:col-span-2">
          <TodayAttendanceTable
            todayRecord={todayRecord}
            currentUser={currentUser}
            onRefresh={loadTodayRecord}
          />
        </div>
        <div className="xl:col-span-1">
          <UpcomingHolidaysWidget />
        </div>
      </div>
    </DashboardShell>
  );
}
