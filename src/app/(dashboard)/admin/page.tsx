'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CheckInWidget } from '@/components/check-in/check-in-widget';
import { DEFAULT_USERS } from '@/lib/services/attendance-store';
import { useAuth } from '@/lib/context/auth-context';
import { UserProfile, AttendanceRecord } from '@/types';
import { TodayAttendanceTable } from '@/components/attendance/today-attendance-table';
import { today as getTodayBS } from 'nepali-calendar-engine';

export default function AdminDashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const currentUser: UserProfile | null = profile;
  const [myTodayRecord, setMyTodayRecord] = useState<AttendanceRecord | null>(null);
  const [allTodayRecords, setAllTodayRecords] = useState<AttendanceRecord[]>([]);
  const [liveDate, setLiveDate] = useState<string>('');

  const nepaliToday = useMemo(() => {
    try {
      const bs = getTodayBS();
      return `${bs.monthName.ne} ${bs.bs.day}, ${bs.bs.year}`;
    } catch {
      return '';
    }
  }, []);

  const loadTodayData = async () => {
    if (!currentUser?.id) return;
    try {
      const [myRes, allRes] = await Promise.all([
        fetch(`/api/attendance?userId=${currentUser.id}`),
        fetch(`/api/attendance?all=true`),
      ]);

      const myData = await myRes.json();
      const allData = await allRes.json();

      setMyTodayRecord(myData.record || null);
      setAllTodayRecords(allData.records || []);
    } catch (e) {
      console.error('Failed to load today data:', e);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadTodayData();
    }
  }, [currentUser?.id]);

  // Date updates
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
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Clean Minimalist Header */}
      <div className="space-y-1 py-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Welcome back, {currentUser.name ? currentUser.name.trim().split(' ')[0] : 'Admin'}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          {liveDate} {nepaliToday ? `· वि.सं. ${nepaliToday}` : ''}
        </p>
      </div>

      {/* Hero Check-In / Check-Out Widget */}
      <div className="my-2">
        <CheckInWidget user={currentUser} onStatusChange={loadTodayData} />
      </div>

      {/* Today Attendance Log Table (Company-Wide for Admin) */}
      <div className="mt-6">
        <TodayAttendanceTable
          records={allTodayRecords}
          todayRecord={myTodayRecord}
          currentUser={currentUser}
          title="Company Today's Attendance Log"
          onRefresh={loadTodayData}
        />
      </div>
    </DashboardShell>
  );
}
