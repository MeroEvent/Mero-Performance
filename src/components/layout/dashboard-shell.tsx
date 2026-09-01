'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PwaInstallPrompt } from '@/components/layout/pwa-install-prompt';
import { useAuth } from '@/lib/context/auth-context';
import { UserProfile } from '@/types';
import { 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  LayoutDashboard, 
  Users, 
  Sliders, 
  Settings,
  ShieldAlert
} from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardShellProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children, hideSidebar = false }) => {
  const { user, profile, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold">Authenticating with Supabase...</span>
        </div>
      </div>
    );
  }

  // If no profile is available after loading, show error
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold">Unable to load user profile</p>
          <p className="text-xs text-slate-400">Please try refreshing or logging in again</p>
        </div>
      </div>
    );
  }

  const currentUser: UserProfile = profile;

  // Mobile Bottom Navigation Links for Staff / Employee
  const staffNavItems = [
    { href: '/employee', label: 'Check-In', icon: Clock },
    { href: '/employee/leave', label: 'Leave', icon: Calendar },
    { href: '/employee/history', label: 'History', icon: FileText },
    { href: '/employee/profile', label: 'Profile', icon: User },
  ];

  // Mobile Bottom Navigation Links for Admins
  const adminNavItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/employees', label: 'Staff', icon: Users },
    { href: '/admin/shifts', label: 'Shifts', icon: Sliders },
    { href: '/admin/settings', label: 'Rules', icon: Settings },
  ];

  const activeNavItems = currentUser.role === 'admin' ? adminNavItems : staffNavItems;

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased select-none">
      {/* Sidebar with Mobile Slide-Over Support */}
      {!hideSidebar && (
        <Sidebar
          role={currentUser.role}
          userName={currentUser.name}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        <Header
          currentUser={currentUser}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {children}
        </main>
      </div>

      {/* PWA 1-Tap Mobile Install Banner */}
      <PwaInstallPrompt />

      {/* Ultra-Smooth Fixed Bottom Navigation Bar for Mobile Phones */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 px-3 pt-2 pb-safe flex items-center justify-around shadow-2xl">
        {activeNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-[11px] font-bold transition-all active:scale-90',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <div
                className={clsx(
                  'p-1.5 rounded-2xl transition-all',
                  isActive && 'bg-blue-600/10 dark:bg-blue-500/20 shadow-xs'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
