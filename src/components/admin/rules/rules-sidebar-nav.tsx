'use client';

import React from 'react';
import { 
  Wifi, 
  MapPin, 
  Smartphone, 
  ShieldAlert, 
  Calendar, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export type RuleSectionKey = 'device' | 'wifi' | 'gps' | 'tardiness' | 'leave_payroll';

interface RulesSidebarNavProps {
  activeSection: RuleSectionKey;
  onSelectSection: (section: RuleSectionKey) => void;
  wifiActive?: boolean;
  gpsActive?: boolean;
  deviceActive?: boolean;
}

export const RulesSidebarNav: React.FC<RulesSidebarNavProps> = ({
  activeSection,
  onSelectSection,
  wifiActive,
  gpsActive,
  deviceActive,
}) => {
  const sections: { id: RuleSectionKey; label: string; icon: any; statusBadge?: string }[] = [
    { 
      id: 'device', 
      label: 'Single Device & Anti-Proxy', 
      icon: Smartphone,
      statusBadge: deviceActive ? '🟢 1-Device' : undefined
    },
    { 
      id: 'wifi', 
      label: 'WiFi & Network IP Security', 
      icon: Wifi,
      statusBadge: wifiActive ? '🟢 Active' : undefined
    },
    { 
      id: 'gps', 
      label: 'Office Location & GPS Geofencing', 
      icon: MapPin,
      statusBadge: gpsActive ? '🟢 Active' : undefined
    },
    { 
      id: 'tardiness', 
      label: 'Repeated Tardiness Automation', 
      icon: ShieldAlert 
    },
    { 
      id: 'leave_payroll', 
      label: 'Leave Quotas & Payroll Rates', 
      icon: Calendar 
    },
  ];

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-4">
      {/* Rules Navigation Menu */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Company Policies
          </p>
        </div>

        <nav className="space-y-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectSection(sec.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                  <span className="truncate">{sec.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {sec.statusBadge && !isActive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {sec.statusBadge}
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
