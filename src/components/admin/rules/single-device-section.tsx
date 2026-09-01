'use client';

import React from 'react';
import { Smartphone, ShieldAlert, Laptop } from 'lucide-react';

interface SingleDeviceSectionProps {
  companyRules: any;
  onChangeRules: (updated: any) => void;
}

export const SingleDeviceSection: React.FC<SingleDeviceSectionProps> = ({
  companyRules,
  onChangeRules,
}) => {
  const isStrictActive = companyRules.single_device_policy_enabled !== false;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Single Device Policy & Anti-Proxy Check-In
              </h3>
              <p className="text-xs text-slate-400">
                Control whether multiple employee accounts can check in from the same physical machine or browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isStrictActive}
                onChange={(e) =>
                  onChangeRules({
                    ...companyRules,
                    single_device_policy_enabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
            </label>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isStrictActive ? 'Active 🟢' : 'Allowed ⚪'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div
            onClick={() => onChangeRules({ ...companyRules, single_device_policy_enabled: true })}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              isStrictActive
                ? 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500/20'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                🛑 Strict 1 Device Per Employee (ON)
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Staff CANNOT check in or out for multiple accounts from the same physical laptop, browser, or phone. Completely blocks buddy punching for absent colleagues.
            </p>
          </div>

          <div
            onClick={() => onChangeRules({ ...companyRules, single_device_policy_enabled: false })}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              !isStrictActive
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                ✅ Allow Shared Device Mode (OFF)
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Permits multiple staff to check in from the same shared computer or browser. Useful during development testing or for a reception desk kiosk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
