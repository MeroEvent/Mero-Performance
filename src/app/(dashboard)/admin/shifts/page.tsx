'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/lib/context/auth-context';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  Sun, 
  Moon, 
  Sunset, 
  Compass, 
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Building2,
  Globe
} from 'lucide-react';
import { ShiftModal } from '@/components/admin/shift-modal';

export default function ShiftManagementPage() {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    shift: any | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    shift: null,
    isDeleting: false,
  });

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/shifts');
      const data = await res.json();
      if (data.shifts) {
        setShifts(data.shifts);
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleAdd = () => {
    setSelectedShift(null);
    setIsModalOpen(true);
  };

  const handleEdit = (shift: any) => {
    setSelectedShift(shift);
    setIsModalOpen(true);
  };

  const triggerDelete = (shift: any) => {
    setDeleteModal({
      isOpen: true,
      shift,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.shift) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/admin/shifts?id=${deleteModal.shift.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteModal({ isOpen: false, shift: null, isDeleting: false });
        loadShifts();
      } else {
        alert(data.error || 'Failed to delete shift');
        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
      }
    } catch (e: any) {
      alert('Error deleting shift: ' + e.message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleToggleActive = async (shift: any) => {
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shift.id, is_active: !shift.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        loadShifts();
      }
    } catch (e) {
      console.error('Error toggling shift:', e);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'Flexible';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getShiftIcon = (name: string, color: string) => {
    const key = (name || color || '').toLowerCase();
    if (key.includes('morning') || key.includes('amber')) return Sun;
    if (key.includes('evening') || key.includes('sunset') || key.includes('indigo')) return Sunset;
    if (key.includes('night') || key.includes('purple')) return Moon;
    if (key.includes('field') || key.includes('emerald') || key.includes('green')) return Compass;
    return Briefcase;
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">Loading work shifts...</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Shift Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure work schedules, working hour quotas, and shift-level workplace location policies
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all w-fit cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Shift
        </button>
      </div>

      {/* Modern Sleek Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Shift Name</th>
                <th className="py-3.5 px-5">Working Schedule</th>
                <th className="py-3.5 px-4">Location Policy</th>
                <th className="py-3.5 px-5">Shift Duration</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {shifts.map((shift) => {
                const Icon = getShiftIcon(shift.name, shift.color);

                return (
                  <tr
                    key={shift.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      !shift.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Shift Name & Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {shift.display_name || shift.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {shift.description || 'Standard work shift'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Schedule / Hours */}
                    <td className="py-4 px-5">
                      {shift.is_flexible ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-200 dark:border-slate-700">
                          Flexible Timing
                        </span>
                      ) : (
                        <div className="font-mono text-slate-900 dark:text-white font-semibold">
                          <span>{formatTime(shift.start_time)}</span>
                          <span className="text-slate-400 mx-1.5">—</span>
                          <span>{formatTime(shift.end_time)}</span>
                        </div>
                      )}
                    </td>

                    {/* Location Policy (Office vs Remote/Field) */}
                    <td className="py-4 px-4">
                      {shift.allow_remote_checkin || shift.is_flexible ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                          <Globe className="w-3 h-3 text-slate-400" /> Field / Anywhere
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                          <Building2 className="w-3 h-3 text-slate-400" /> Office Required
                        </span>
                      )}
                    </td>

                    {/* Auto-Calculated Shift Duration (Full vs Half Day) */}
                    <td className="py-4 px-5 font-mono text-xs text-slate-900 dark:text-white">
                      {(() => {
                        if (shift.is_flexible) {
                          return (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">8.0 hrs Full</span>
                              <span className="text-[10px] text-slate-400 block font-normal">Half: 4.0 hrs</span>
                            </div>
                          );
                        }
                        const [sh, sm] = (shift.start_time || '09:00').split(':').map(Number);
                        const [eh, em] = (shift.end_time || '17:00').split(':').map(Number);
                        let diffMinutes = ((eh || 17) * 60 + (em || 0)) - ((sh || 9) * 60 + (sm || 0));
                        if (diffMinutes < 0) diffMinutes += 1440;
                        const full = Number((diffMinutes / 60).toFixed(2));
                        const half = Number((full / 2).toFixed(2));
                        return (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{full} hrs Full</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Half Day: {half} hrs</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status Pill Toggle */}
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggleActive(shift)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                          shift.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${shift.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{shift.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Shift"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(shift)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Shift"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {shifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-semibold text-sm">No Shifts Configured</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add New Shift" to create your first work schedule.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Shift Modal */}
      <ShiftModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadShifts}
        shift={selectedShift}
        companyId={profile?.company_id || 'c0000000-0000-0000-0000-000000000001'}
      />

      {/* Custom SaaS Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, shift: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Work Shift"
        description={`Are you sure you want to delete the shift "${deleteModal.shift?.display_name}"?`}
        confirmText="Yes, Delete Shift"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteModal.isDeleting}
      />
    </DashboardShell>
  );
}
