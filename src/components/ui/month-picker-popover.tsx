'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, Check } from 'lucide-react';

interface DateFilterSelectorProps {
  dateMode: 'month' | 'custom';
  selectedDate: Date;
  customStartDate?: string;
  customEndDate?: string;
  onMonthChange: (date: Date) => void;
  onCustomRangeChange?: (startDate: string, endDate: string) => void;
  className?: string;
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const MonthPickerPopover: React.FC<DateFilterSelectorProps> = ({
  dateMode,
  selectedDate,
  customStartDate,
  customEndDate,
  onMonthChange,
  onCustomRangeChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'month' | 'range'>(dateMode === 'custom' ? 'range' : 'month');
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const popoverRef = useRef<HTMLDivElement>(null);

  const [tempStart, setTempStart] = useState(customStartDate || '');
  const [tempEnd, setTempEnd] = useState(customEndDate || '');

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();

  const formattedMonthLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const rangeLabel = customStartDate && customEndDate
    ? `${formatDateDisplay(customStartDate)} – ${formatDateDisplay(customEndDate)}`
    : 'Custom Date Range';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Sync state when props change
  useEffect(() => {
    setActiveTab(dateMode === 'custom' ? 'range' : 'month');
    if (customStartDate) setTempStart(customStartDate);
    if (customEndDate) setTempEnd(customEndDate);
  }, [dateMode, customStartDate, customEndDate]);


  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectMonth = (monthIndex: number) => {
    onMonthChange(new Date(viewYear, monthIndex, 1));
    setIsOpen(false);
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear((prev) => prev - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear((prev) => prev + 1);
  };

  const handleJumpToCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMonthChange(new Date());
    setIsOpen(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempStart && tempEnd && onCustomRangeChange) {
      onCustomRangeChange(tempStart, tempEnd);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) setViewYear(selectedDate.getFullYear());
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center gap-2.5 bg-slate-50 dark:bg-[#060c1d] border rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-600 dark:text-blue-400'
            : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="font-bold text-xs">
          {dateMode === 'month' ? formattedMonthLabel : rangeLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Mode Switcher Tabs */}
          {onCustomRangeChange && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('month')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'month'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                By Month
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('range')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'range'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Custom Range
              </button>
            </div>
          )}

          {activeTab === 'month' ? (
            <>
              {/* Year Selector */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  title="Previous Year"
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-sm font-black font-mono text-slate-900 dark:text-white tracking-wide">
                  {viewYear}
                </span>

                <button
                  type="button"
                  onClick={handleNextYear}
                  title="Next Year"
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 3x4 Month Grid */}
              <div className="grid grid-cols-3 gap-2 py-1">
                {MONTH_SHORT.map((mShort, index) => {
                  const isSelected = dateMode === 'month' && selectedYear === viewYear && selectedMonth === index;
                  const isCurrent = currentYear === viewYear && currentMonth === index;

                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => handleSelectMonth(index)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center relative ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-black scale-105'
                          : isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold hover:bg-blue-100/60 dark:hover:bg-blue-900/40'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {mShort}
                      {isCurrent && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer Shortcut */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleJumpToCurrent}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Current Month ({MONTH_SHORT[currentMonth]} {currentYear})
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            /* Custom Range Form */
            <form onSubmit={handleApplyCustomRange} className="space-y-3 py-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Apply Range
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
