'use client';

import React, { useState } from 'react';
import { Holiday } from '@/types';
import { HolidayService } from '@/lib/services/holiday-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDateDisplay } from '@/lib/utils/attendance';
import { Calendar as CalendarIcon, Plus, Trash2, Repeat } from 'lucide-react';

interface HolidayCalendarProps {
  holidays: Holiday[];
  onHolidaysChanged: () => void;
  isAdmin?: boolean;
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({
  holidays,
  onHolidaysChanged,
  isAdmin = true,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;

    HolidayService.addHoliday({
      name,
      date,
      description,
      is_recurring: isRecurring,
    });

    setName('');
    setDate('');
    setDescription('');
    setIsRecurring(false);
    setIsAddModalOpen(false);
    onHolidaysChanged();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      HolidayService.deleteHoliday(id);
      onHolidaysChanged();
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Holiday
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.map((h) => (
          <Card key={h.id} className="relative p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{h.name}</h4>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {formatDateDisplay(h.date)}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {h.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                  {h.description}
                </p>
              )}
            </div>

            {h.is_recurring && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Repeat className="w-3 h-3 text-emerald-500" />
                <span>Annual Recurring Holiday</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Add Holiday Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Company Holiday">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Holiday Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dashain, Holi, New Year"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="recurring" className="text-xs text-slate-700 dark:text-slate-300">
              Recurring Holiday (Repeats every year)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
