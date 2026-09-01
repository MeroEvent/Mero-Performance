'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Calendar, Repeat, CheckCircle2, DollarSign, Ban, AlignLeft } from 'lucide-react';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  holidayToEdit?: any | null;
  initialDate?: string;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  holidayToEdit,
  initialDate,
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (holidayToEdit) {
      setName(holidayToEdit.name || '');
      setDate(holidayToEdit.date || '');
      setIsPaid(holidayToEdit.is_paid !== undefined ? holidayToEdit.is_paid : true);
      setIsRecurring(Boolean(holidayToEdit.is_recurring));
      setDescription(holidayToEdit.description || '');
    } else {
      setName('');
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setIsPaid(true);
      setIsRecurring(false);
      setDescription('');
    }
    setError('');
  }, [holidayToEdit, initialDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      setError('Please provide a holiday name and date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        name: name.trim(),
        date,
        is_paid: isPaid,
        is_recurring: isRecurring,
        description: description.trim(),
      };

      if (holidayToEdit) {
        // Edit (PUT)
        const res = await fetch('/api/admin/holidays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: holidayToEdit.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to update holiday');
      } else {
        // Create (POST)
        const res = await fetch('/api/admin/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to create holiday');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={holidayToEdit ? `Edit Holiday: ${holidayToEdit.name}` : 'Mark Official Holiday'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Holiday Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Holiday Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Dashain Festival, Holi, Company Off-Day"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Holiday Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Paid vs Unpaid Holiday Option */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Compensation Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isPaid
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-lg ${isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs">Paid Holiday</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Staff receive regular daily salary
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                !isPaid
                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm ring-1 ring-amber-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-lg ${!isPaid ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Ban className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs">Unpaid Holiday</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Company closed without holiday pay
              </p>
            </button>
          </div>
        </div>

        {/* Recurring Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <Repeat className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Annual Recurring</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Repeats every year automatically on this date</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Additional notes regarding this holiday..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            {holidayToEdit ? 'Save Changes' : 'Mark Holiday'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
