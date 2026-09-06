'use client';

import React from 'react';
import { LeaveBalance, LeaveTypeConfig } from '@/types';
import { Card } from '@/components/ui/card';
import { HeartPulse, Calendar, Palmtree, AlertCircle, Home, Clock, Flame } from 'lucide-react';

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveTypeConfig[];
}

export const LeaveBalanceCards: React.FC<LeaveBalanceCardsProps> = ({ balances, leaveTypes }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'sick':
        return <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'mourning':
        return <Flame className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'casual':
        return <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'vacation':
        return <Palmtree className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'unpaid':
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
      case 'wfh':
        return <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'comp_off':
      default:
        return <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {leaveTypes.map((config) => {
        const bal = balances.find((b) => b.leave_type === config.type) || {
          total_quota: config.annual_quota,
          used: 0,
          remaining: config.annual_quota,
        };

        const pct = Math.min(100, Math.round((bal.used / (bal.total_quota || 1)) * 100));

        return (
          <Card key={config.type} className="p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                {getIcon(config.type)}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {config.label}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {config.type === 'unpaid' ? '∞' : bal.remaining}
                </span>
                {config.type !== 'unpaid' && (
                  <span className="text-xs text-slate-400 font-medium">
                    of {bal.total_quota} days
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {config.type !== 'unpaid' && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {config.description && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 truncate" title={config.description}>
                  {config.description}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
