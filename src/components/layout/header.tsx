'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserProfile } from '@/types';
import { useTheme } from '@/lib/context/theme-context';
import { useAuth } from '@/lib/context/auth-context';
import { 
  Menu, 
  Calendar as CalendarIcon, 
  User, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Smartphone
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface HeaderProps {
  currentUser: UserProfile;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenMobileMenu }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Gracefully handle browsers blocking fullscreen
    }
  };

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const profileHref = currentUser.role === 'admin' ? '/admin/settings' : '/employee/profile';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 transition-colors duration-200">
      {/* Left: Mobile Hamburger + Date/Clock */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Menu Button */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Date Display (Hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
          <span>{dateStr}</span>
        </div>

        {/* Live Clock (Hours & Minutes only) */}
        <div className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 tracking-wider">
          {timeStr}
        </div>
      </div>

      {/* Right Controls: Fullscreen + Notification Bell + Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Fullscreen Native App Mode Toggle (Mobile / Tablet helper) */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen App Mode'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-blue-500" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Notification Bell */}
        <NotificationBell userId={currentUser.id} />

        {/* Profile Icon with Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            title={`Account (${currentUser.name})`}
            className={`relative rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none flex items-center justify-center ${
              isProfileOpen
                ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                : ''
            }`}
          >
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover aspect-square border-2 border-slate-900 dark:border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-xs border-2 border-slate-900 dark:border-slate-200 shadow-sm">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2.5 w-64 sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
              {/* User Summary Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-full object-cover aspect-square border-2 border-slate-900 dark:border-slate-200 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-sm border-2 border-slate-900 dark:border-slate-200 shadow-sm shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2 space-y-1">
                {/* My Profile Link */}
                <Link
                  href={profileHref}
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                {/* Appearance / Theme Toggle */}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                    <span>Appearance</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </button>

                {/* Fullscreen Mode */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    toggleFullscreen();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    <span>Fullscreen App View</span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    {isFullscreen ? 'Exit' : 'Enter'}
                  </span>
                </button>
              </div>

              {/* Sign Out Section */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
