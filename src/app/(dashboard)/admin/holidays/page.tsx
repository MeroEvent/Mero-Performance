'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { HolidayModal } from '@/components/admin/holiday-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { HolidayYearStats } from '@/components/holidays/holiday-year-stats';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  Repeat, 
  DollarSign, 
  Ban, 
  Download,
  CalendarCheck,
  ListFilter,
  BarChart3
} from 'lucide-react';

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'stats' | 'calendar' | 'table'>('stats');

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    holiday: any | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    holiday: null,
    isDeleting: false,
  });

  const loadHolidays = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/holidays');
      const data = await res.json();
      if (data.holidays) {
        setHolidays(data.holidays);
      }
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = holidays.find((h) => h.date === dateStr);
    if (existing) {
      setHolidayToEdit(existing);
    } else {
      setHolidayToEdit(null);
      setSelectedDateForNew(dateStr);
    }
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setHolidayToEdit(null);
    setSelectedDateForNew(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleEdit = (holiday: any) => {
    setHolidayToEdit(holiday);
    setIsModalOpen(true);
  };

  const triggerDelete = (holiday: any) => {
    setDeleteModal({
      isOpen: true,
      holiday,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.holiday) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/admin/holidays?id=${deleteModal.holiday.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteModal({ isOpen: false, holiday: null, isDeleting: false });
        loadHolidays();
      } else {
        alert(data.error || 'Failed to delete holiday');
        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
      }
    } catch (err: any) {
      alert('Error deleting holiday: ' + err.message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Holiday Name', 'Date', 'Type', 'Annual Recurring', 'Description'];
    const rows = holidays.map((h) => [
      `"${h.name.replace(/"/g, '""')}"`,
      h.date,
      h.is_paid ? 'Paid Holiday' : 'Unpaid Holiday',
      h.is_recurring ? 'Yes' : 'No',
      `"${(h.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Company_Holidays_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Holiday Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure official public holidays, paid off-days, and analyze working days for every year
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'stats'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Yearly Stats
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 inline mr-1.5" /> Calendar
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 inline mr-1.5" /> List Table
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 shadow-sm transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddNew}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Mark Holiday
          </button>
        </div>
      </div>

      {/* VIEW 1: YEARLY STATS & ANALYTICS (BAISHAKH - CHAITRA) */}
      {viewMode === 'stats' && (
        <HolidayYearStats
          holidays={holidays}
          onSelectDate={(dateStr) => {
            setSelectedDateForNew(dateStr);
            setHolidayToEdit(null);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* VIEW 2: MONTHLY CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
          {/* Calendar Month Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {monthName} {year}
              </h2>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* Legend & Month Nav */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Saturday (Weekend Off)
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid Holiday
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Unpaid Holiday
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Header Columns */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-rose-500 font-extrabold">Sat (Off)</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells before month start */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border border-transparent" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayOfWeek = new Date(year, month, dayNum).getDay();
              const isSaturday = dayOfWeek === 6;
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === dayNum;

              // Find if this day has a marked holiday
              const holiday = holidays.find((h) => h.date === dateStr);

              return (
                <div
                  key={dayNum}
                  onClick={() => handleDayClick(dayNum)}
                  className={`group relative min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isToday
                      ? 'border-blue-500/80 bg-blue-500/5 ring-2 ring-blue-500/20'
                      : isSaturday
                      ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40 hover:border-rose-400'
                      : holiday
                      ? holiday.is_paid
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
                        : 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 hover:border-amber-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : isSaturday
                          ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {isSaturday && (
                      <span className="text-[10px] font-extrabold uppercase text-rose-500 dark:text-rose-400">
                        Sat Off
                      </span>
                    )}
                  </div>

                  {/* Holiday Badge Display */}
                  {holiday ? (
                    <div className="mt-1">
                      <div
                        className={`p-1.5 rounded-xl border text-[11px] font-bold truncate leading-tight shadow-xs ${
                          holiday.is_paid
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                        title={`${holiday.name} (${holiday.is_paid ? 'Paid Holiday' : 'Unpaid Holiday'})`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {holiday.is_paid ? (
                            <DollarSign className="w-3 h-3 shrink-0 text-emerald-600" />
                          ) : (
                            <Ban className="w-3 h-3 shrink-0 text-amber-600" />
                          )}
                          <span className="truncate">{holiday.name}</span>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 block mt-0.5">
                          {holiday.is_paid ? 'Paid Holiday' : 'Unpaid Off'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700 group-hover:text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      + Click to mark
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: LIST TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Holiday Name</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Type / Compensation</th>
                  <th className="py-3.5 px-4">Recurring</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                      <p className="font-semibold text-xs">Loading holidays from database...</p>
                    </td>
                  </tr>
                ) : holidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <CalendarCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-sm">No Holidays Configured</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "Mark Holiday" to configure official non-working days.</p>
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl border shrink-0 ${
                              h.is_paid
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {h.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {h.date}
                      </td>

                      {/* Paid vs Unpaid Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                            h.is_paid
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {h.is_paid ? <DollarSign className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {h.is_paid ? 'Paid Holiday' : 'Unpaid Off'}
                        </span>
                      </td>

                      {/* Recurring */}
                      <td className="py-4 px-4">
                        {h.is_recurring ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            <Repeat className="w-3.5 h-3.5" /> Annual
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">One-Time</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {h.description || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(h)}
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title="Edit Holiday"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(h)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Holiday"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      <HolidayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadHolidays}
        holidayToEdit={holidayToEdit}
        initialDate={selectedDateForNew}
      />

      {/* Custom SaaS Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, holiday: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Holiday"
        description={`Are you sure you want to delete the holiday "${deleteModal.holiday?.name}" (${deleteModal.holiday?.date})?`}
        confirmText="Yes, Delete Holiday"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteModal.isDeleting}
      />
    </DashboardShell>
  );
}
