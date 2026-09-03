'use client';

import React from 'react';
import { 
  Sliders, 
  Sun, 
  Sunset, 
  Moon, 
  Compass, 
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShiftSelectorStepProps {
  shifts: any[];
  selectedShiftId: string | null;
  onSelectShift: (shiftId: string) => void;
  onNext: () => void;
}

export const ShiftSelectorStep: React.FC<ShiftSelectorStepProps> = ({
  shifts,
  selectedShiftId,
  onSelectShift,
  onNext,
}) => {
  const getShiftIcon = (name: string = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('morning')) return Sun;
    if (lower.includes('evening')) return Sunset;
    if (lower.includes('night')) return Moon;
    if (lower.includes('field') || lower.includes('remote')) return Compass;
    return Briefcase;
  };

  const selectedShift = shifts.find((s) => s.id === selectedShiftId) || null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 animate-fade-in">
      {/* Shift Selector Widget (Matching Screenshot) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>SELECT SHIFT TO CONFIGURE RULES</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {shifts.length} active shifts configured
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {shifts.map((shift) => {
            const Icon = getShiftIcon(shift.name || shift.display_name);
            const isSelected = selectedShiftId === shift.id;

            return (
              <button
                key={shift.id}
                type="button"
                onClick={() => onSelectShift(shift.id)}
                className={`px-5 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:scale-[1.02]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{shift.display_name || shift.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Shift Details Preview & Next Action */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {selectedShift ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Selected: <strong className="text-slate-900 dark:text-white font-bold">{selectedShift.display_name || selectedShift.name}</strong> ({selectedShift.start_time?.slice(0, 5)} - {selectedShift.end_time?.slice(0, 5)})
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Please select a shift above to proceed with rules configuration.
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onNext}
            disabled={!selectedShiftId}
            className="gap-2 px-8 shadow-md font-bold cursor-pointer w-full sm:w-auto"
          >
            <span>Next: Configure Rules</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
