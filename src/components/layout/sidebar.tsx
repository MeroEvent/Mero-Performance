'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { UserRole } from '@/types';
import { 
  Clock, 
  Users, 
  Calendar, 
  Settings, 
  FileText, 
  User, 
  Building2,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  Smartphone,
  Wifi,
  MapPin,
  ShieldAlert,
  Banknote
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  role: UserRole;
  userName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ role, isOpenMobile = false, onCloseMobile }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'device';

  // Collapsible sections state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workforce: true,
    settings: true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Admin Expandable Group Definitions
  const adminGroups: NavGroup[] = [
    {
      id: 'workforce',
      title: 'Workforce & HR',
      icon: Users,
      items: [
        { href: '/admin/employees', label: 'Employees & Staff', icon: Users },
        { href: '/admin/departments', label: 'Departments', icon: Layers },
        { href: '/admin/shifts', label: 'Shifts & Rosters', icon: Clock },
        { href: '/admin/holidays', label: 'Holiday Calendar', icon: Calendar },
        { href: '/reports', label: 'Attendance & Logs', icon: FileText },
        { href: '/manager/leave', label: 'Leave Management', icon: Calendar },
        { href: '/admin/salary', label: 'Salary & Payroll', icon: Banknote },
      ],
    },
    {
      id: 'settings',
      title: 'Settings & Security',
      icon: Settings,
      items: [
        { href: '/admin/settings?tab=device', label: 'Single Device Policy', icon: Smartphone },
        { href: '/admin/settings?tab=wifi', label: 'WiFi & IP Security', icon: Wifi },
        { href: '/admin/settings?tab=gps', label: 'Office GPS Geofencing', icon: MapPin },
        { href: '/admin/settings?tab=tardiness', label: 'Tardiness Automation', icon: ShieldAlert },
        { href: '/admin/settings?tab=leave_payroll', label: 'Leave & Payroll Quotas', icon: Calendar },
      ],
    },
  ];


  // Auto-expand the active group based on current URL path
  useEffect(() => {
    adminGroups.forEach((group) => {
      const isSubRouteActive = group.items.some((item) => {
        if (pathname === '/admin/settings') {
          return item.href === `/admin/settings?tab=${currentTab}`;
        }
        return pathname === item.href || pathname.startsWith(`${item.href}/`);
      });

      if (isSubRouteActive && !expandedGroups[group.id]) {
        setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname, currentTab]);

  // Employee Staff Navigation
  const staffLinks: NavItem[] = [
    { href: '/employee', label: 'My Dashboard', icon: Clock },
    { href: '/employee/leave', label: 'Leave Requests', icon: Calendar },
    { href: '/employee/history', label: 'Attendance History', icon: FileText },
    { href: '/employee/profile', label: 'My Profile', icon: User },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Mero Performance Logo"
            className="w-8 h-8 object-contain shrink-0"
          />
          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight leading-snug">
              Mero Performance
            </h1>
            <p className="text-[10px] font-semibold text-slate-400">Enterprise ERP</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Area */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        {role === 'admin' ? (
          <>
            {/* Top Single Links (Dashboard Overview) */}
            <div className="space-y-1">
              <Link
                href="/admin"
                onClick={onCloseMobile}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                  pathname === '/admin'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
              >
                <Building2 className={clsx('w-4 h-4 shrink-0', pathname === '/admin' ? 'text-white dark:text-slate-900' : 'text-slate-400')} />
                <span>Admin Overview</span>
              </Link>
            </div>

            {/* Expandable Module Hubs */}
            <div className="space-y-2 pt-1">
              {adminGroups.map((group) => {
                const isExpanded = expandedGroups[group.id] ?? false;
                const isAnyItemActive = group.items.some((i) => {
                  if (pathname === '/admin/settings') {
                    return i.href === `/admin/settings?tab=${currentTab}`;
                  }
                  return pathname === i.href;
                });
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="rounded-2xl transition-colors">
                    {/* Group Accordion Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={clsx(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none text-left',
                        isAnyItemActive
                          ? 'text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800/60'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <GroupIcon className={clsx('w-4 h-4', isAnyItemActive ? 'text-slate-900 dark:text-white' : 'text-slate-400')} />
                        <span>{group.title}</span>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {/* Sub-items (Tree View) */}
                    {isExpanded && (
                      <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5 animate-fadeIn">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = pathname === '/admin/settings'
                            ? item.href === `/admin/settings?tab=${currentTab}`
                            : pathname === item.href;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onCloseMobile}
                              className={clsx(
                                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium',
                                isActive
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              )}
                            >
                              <ItemIcon className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-white dark:text-slate-900' : 'text-slate-400')} />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Regular Staff Links */
          <div className="space-y-1">
            {staffLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onCloseMobile}
                  className={clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  )}
                >
                  <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-white dark:text-slate-900' : 'text-slate-400')} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Clean Minimalist Footer */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 text-center shrink-0">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Mero Performance</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">ERP & HR Suite</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 flex-col h-full shrink-0 transition-colors duration-200">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide Over Hamburger Menu) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs h-full z-10 shadow-2xl animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
