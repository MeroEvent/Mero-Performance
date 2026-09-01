'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CompanyRulesForm } from '@/components/admin/company-rules-form';

export default function AdminSettingsPage() {
  return (
    <DashboardShell>
      <div className="py-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Company Settings & Rules
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure anti-proxy security, WiFi restrictions, GPS geofencing, leave quotas, and tardiness policies
        </p>
      </div>

      <CompanyRulesForm />
    </DashboardShell>
  );
}
