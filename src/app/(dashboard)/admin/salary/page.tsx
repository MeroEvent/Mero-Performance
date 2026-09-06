'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SalaryEditModal } from '@/components/admin/salary-edit-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { exportPayrollToCSV, exportPayslipToPDF } from '@/lib/utils/export';
import { MonthPickerPopover } from '@/components/ui/month-picker-popover';
import { Button } from '@/components/ui/button';
import {
  Banknote,
  Calendar,
  Download,
  Search,
  Lock,
  Unlock,
  Edit3,
  FileText,
  DollarSign,
  TrendingDown,
  Users,
  Loader2,
  Building2,
  FileSpreadsheet,
  Layers,
  User,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function AdminSalaryPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateMode, setDateMode] = useState<'month' | 'custom'>('month');
  const [activePreset, setActivePreset] = useState<'this_month' | 'last_month' | 'custom'>('this_month');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'paid' | 'processing' | 'pending'>('all');

  // Month and Date computation
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1; // 1-12
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total_employees: 0,
    total_base_salary: 0,
    total_deductions: 0,
    total_net_salary: 0,
  });
  const [workingDaysCount, setWorkingDaysCount] = useState<number>(26);
  const [isFinalized, setIsFinalized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'base_salary' | 'override';
    item: any | null;
  }>({
    isOpen: false,
    mode: 'base_salary',
    item: null,
  });

  // Finalize Confirmation Modal State
  const [finalizeModalOpen, setFinalizeModalOpen] = useState<boolean>(false);
  const [isFinalizingAction, setIsFinalizingAction] = useState<boolean>(false);

  // Load Departments and Employees for filtering
  useEffect(() => {
    fetch('/api/admin/departments')
      .then((res) => res.json())
      .then((data) => {
        if (data.departments) setDepartments(data.departments);
      })
      .catch(() => {});

    fetch('/api/admin/employees')
      .then((res) => res.json())
      .then((data) => {
        if (data.employees) setEmployees(data.employees);
      })
      .catch(() => {});
  }, []);

  // Load Payroll Data
  const loadPayroll = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/salary?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (data.success) {
        setPayrollData(data.payroll || []);
        setSummary(data.summary || {});
        setWorkingDaysCount(data.working_days || 26);
        setIsFinalized(Boolean(data.is_finalized));
      } else {
        console.error('Payroll fetch error:', data.error);
      }
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, selectedYear]);

  // Handle Month Change from Popover
  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
    setDateMode('month');
    const now = new Date();
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      setActivePreset('this_month');
    } else if (
      (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() - 1) ||
      (now.getMonth() === 0 && date.getMonth() === 11 && date.getFullYear() === now.getFullYear() - 1)
    ) {
      setActivePreset('last_month');
    } else {
      setActivePreset('custom');
    }
  };

  // Quick Preset Handlers (matching Attendance & Logs exactly)
  const handleSetPreset = (preset: 'this_month' | 'last_month') => {
    const now = new Date();
    setActivePreset(preset);
    setDateMode('month');
    if (preset === 'this_month') {
      setSelectedDate(now);
    } else if (preset === 'last_month') {
      setSelectedDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    }
  };

  // Department and Personnel change
  const availableEmployees = useMemo(() => {
    if (selectedDept === 'all') return employees;
    return employees.filter((e) => {
      const deptName = e.department?.name || e.department_name;
      return deptName === selectedDept || e.department_id === selectedDept;
    });
  }, [employees, selectedDept]);

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDept(deptId);
    if (deptId !== 'all') {
      const isCurrentInDept = employees.some((e) => {
        const dName = e.department?.name || e.department_name;
        return e.id === selectedUserId && (dName === deptId || e.department_id === deptId);
      });
      if (!isCurrentInDept) {
        setSelectedUserId('all');
      }
    }
  };

  // Toggle Finalize Month
  const handleToggleFinalize = async () => {
    try {
      setIsFinalizingAction(true);
      const action = isFinalized ? 'unfinalize' : 'finalize';
      const res = await fetch('/api/admin/salary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFinalizeModalOpen(false);
        loadPayroll();
      } else {
        alert(data.error || 'Failed to update finalization status');
      }
    } catch (err: any) {
      alert('Error updating finalization status: ' + err.message);
    } finally {
      setIsFinalizingAction(false);
    }
  };

  // Payment Status Tab Counts
  const tabCounts = useMemo(() => {
    return {
      all: payrollData.length,
      paid: payrollData.filter((r) => (r.payment_status || '').toLowerCase() === 'paid').length,
      processing: payrollData.filter((r) => (r.payment_status || '').toLowerCase() === 'processing').length,
      pending: payrollData.filter((r) => !r.payment_status || (r.payment_status || '').toLowerCase() === 'pending').length,
    };
  }, [payrollData]);

  // Payment Status Handlers
  const handleStatusChange = async (userId: string, newStatus: 'paid' | 'processing' | 'pending') => {
    // Optimistic UI update
    setPayrollData((prev) =>
      prev.map((r) => (r.user_id === userId ? { ...r, payment_status: newStatus } : r))
    );

    try {
      const res = await fetch('/api/admin/salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_payment_status',
          user_id: userId,
          month: selectedMonth,
          year: selectedYear,
          payment_status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update payment status');
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      loadPayroll();
    }
  };

  const handleBulkStatusChange = async (newStatus: 'paid' | 'processing' | 'pending') => {
    const userIds = filteredRows.map((r) => r.user_id);
    if (userIds.length === 0) return;

    // Optimistic update
    setPayrollData((prev) =>
      prev.map((r) => (userIds.includes(r.user_id) ? { ...r, payment_status: newStatus } : r))
    );

    try {
      const res = await fetch('/api/admin/salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_all_payment_status',
          user_ids: userIds,
          month: selectedMonth,
          year: selectedYear,
          payment_status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to bulk update status');
      }
    } catch (err: any) {
      console.error('Failed to bulk update status:', err);
      loadPayroll();
    }
  };

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return payrollData.filter((row) => {
      // Search
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        (row.employee_name || '').toLowerCase().includes(searchLower) ||
        (row.employee_email || '').toLowerCase().includes(searchLower) ||
        (row.position || '').toLowerCase().includes(searchLower) ||
        (row.department_name || '').toLowerCase().includes(searchLower);

      // Department
      const matchesDept =
        selectedDept === 'all' ||
        (row.department_name && row.department_name.toLowerCase() === selectedDept.toLowerCase());

      // Personnel
      const matchesPersonnel =
        selectedUserId === 'all' || row.user_id === selectedUserId;

      // Payment Status Tab Filter (all, paid, processing, pending)
      let matchesTab = true;
      const pStatus = (row.payment_status || 'pending').toLowerCase();
      if (statusTab === 'paid') {
        matchesTab = pStatus === 'paid';
      } else if (statusTab === 'processing') {
        matchesTab = pStatus === 'processing';
      } else if (statusTab === 'pending') {
        matchesTab = pStatus === 'pending';
      }

      return matchesSearch && matchesDept && matchesPersonnel && matchesTab;
    });
  }, [payrollData, searchQuery, selectedDept, selectedUserId, statusTab]);

  const grossPay = Number(summary.total_base_salary || 0);
  const deductions = Number(summary.total_deductions || 0);
  const netPay = Number(summary.total_net_salary || 0);

  // Export handlers
  const handleExportCSV = () => {
    exportPayrollToCSV(payrollData, selectedMonth, selectedYear);
  };

  const handleDownloadPayslip = (row: any) => {
    exportPayslipToPDF(row, { institutionName: 'Mero Company Pvt. Ltd.' });
  };

  return (
    <DashboardShell>
      {/* Header — 100% unified with Attendance & Logs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Salary & Payroll
            </h1>
            {isFinalized ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-slate-900 dark:border-white shadow-xs">
                <Lock className="w-3 h-3" /> Finalized
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <Edit3 className="w-3 h-3" /> Open Draft
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compute company-wide payroll rosters, calculate attendance deductions, and manage individual base salaries
          </p>
        </div>

        {/* Consolidated Export & Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 text-xs font-bold px-4 py-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </Button>

          <button
            onClick={() => setFinalizeModalOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {isFinalized ? (
              <>
                <Unlock className="w-4 h-4" /> Unlock Month
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Finalize Month
              </>
            )}
          </button>
        </div>
      </div>

      {/* Salary & Payroll Overview Card — Exactly matching Attendance Overview Card */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-6 transition-colors">
        <h2 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide">
          Payroll Overview — {monthName}
        </h2>

        {/* 4 KPI Columns with Dividers (Executive Baseline-Aligned Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/80 gap-4 md:gap-0 pt-1">
          {/* Gross Base Payroll */}
          <div className="md:px-6 first:pl-0 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gross Base Payroll</p>
            <div className="mt-1.5 flex items-baseline whitespace-nowrap min-w-0">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 my-1" />
              ) : (
                <>
                  <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">
                    Rs.
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {Math.round(grossPay).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Attendance Deductions */}
          <div className="md:px-6 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Attendance Deductions</p>
            <div className="mt-1.5 flex items-baseline whitespace-nowrap min-w-0">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 my-1" />
              ) : deductions > 0 ? (
                <>
                  <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">
                    -Rs.
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {Math.round(deductions).toLocaleString()}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">
                    Rs.
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                    0
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Net Payable Total */}
          <div className="md:px-6 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Payable Total</p>
            <div className="mt-1.5 flex items-baseline whitespace-nowrap min-w-0">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 my-1" />
              ) : (
                <>
                  <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">
                    Rs.
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {Math.round(netPay).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Active Headcount */}
          <div className="md:px-6 last:pr-0 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Headcount Processed</p>
            <div className="mt-1.5 flex items-baseline whitespace-nowrap min-w-0">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 my-1" />
              ) : (
                <>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {payrollData.length}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 ml-1.5 select-none">
                    Staff
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls Row: MonthPickerPopover on Left, Quick Presets on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Left: Date Selector with Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <MonthPickerPopover
              dateMode={dateMode}
              selectedDate={selectedDate}
              onMonthChange={handleMonthChange}
            />

            {/* Department & Employee Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedDept}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="pl-8 pr-8 py-2 bg-slate-50 dark:bg-[#060c1d] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    All Departments
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {d.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              <div className="relative flex items-center">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="pl-8 pr-8 py-2 bg-slate-50 dark:bg-[#060c1d] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    All Personnel
                  </option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {emp.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>
            </div>
          </div>

          {/* Right: Presets with Active State Tracking */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetPreset('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'this_month'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('last_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activePreset === 'last_month'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={loadPayroll}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-700' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabular Content Box — Exactly matching AttendanceTable Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Header inside Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Master Payroll Roster — {monthName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {filteredRows.length} of {payrollData.length} employees for {monthName} ({workingDaysCount} working days)
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar — Identical structure to AttendanceTable */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, designation, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Clickable Pill Filters: all, paid, processing, pending */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                  statusTab === 'all'
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900 font-semibold'
                    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                {tabCounts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('paid')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusTab === 'paid'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Paid</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                  statusTab === 'paid'
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900 font-semibold'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold'
                }`}
              >
                {tabCounts.paid}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('processing')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusTab === 'processing'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Processing</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                  statusTab === 'processing'
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900 font-semibold'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-semibold'
                }`}
              >
                {tabCounts.processing}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusTab === 'pending'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Pending</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                  statusTab === 'pending'
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900 font-semibold'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold'
                }`}
              >
                {tabCounts.pending}
              </span>
            </button>
          </div>
        </div>

        {/* Main Table — 100% unified with AttendanceTable SaaS Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[960px]">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <th className="py-3.5 px-5">Employee</th>
                  <th className="py-3.5 px-4">Base Salary</th>
                  <th className="py-3.5 px-4 text-center">Work Days</th>
                  <th className="py-3.5 px-4 text-center">Present</th>
                  <th className="py-3.5 px-4 text-center">Paid Leaves</th>
                  <th className="py-3.5 px-4 text-center">Unauth Absent</th>
                  <th className="py-3.5 px-4 text-right">Deductions</th>
                  <th className="py-3.5 px-4 text-right">Net Payable</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">Loading {monthName} payroll records...</p>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <User className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No Employee Records Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const hasBaseSalary = Number(row.base_salary || 0) > 0;
                    const hasOverride = row.admin_override !== null && row.admin_override !== undefined;

                    return (
                      <tr key={row.user_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Employee Identity Column (Name + Avatar + Department) */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                row.avatar_url ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.employee_name || 'Staff')}`
                              }
                              alt={row.employee_name || 'Staff'}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs">
                                {row.employee_name || 'Staff Member'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {row.department_name || 'General'} • {row.position || 'Team Member'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Base Salary */}
                        <td className="py-3.5 px-4 tabular-nums text-slate-800 dark:text-slate-200">
                          {hasBaseSalary ? (
                            <span className="font-bold text-xs">
                              <span className="text-[11px] font-semibold text-slate-400 mr-0.5">Rs.</span>
                              {Number(row.base_salary).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-sans font-medium italic">
                              Not Set
                            </span>
                          )}
                        </td>

                        {/* Working Days */}
                        <td className="py-3.5 px-4 text-center tabular-nums text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-xs">{row.working_days}d</span>
                        </td>

                        {/* Days Present */}
                        <td className="py-3.5 px-4 text-center tabular-nums text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-xs">{row.days_present}d</span>
                        </td>

                        {/* Approved Paid Leaves */}
                        <td className="py-3.5 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                          <span className="text-xs">{row.approved_leave_days}d</span>
                        </td>

                        {/* Unauthorized Absences */}
                        <td className="py-3.5 px-4 text-center tabular-nums text-slate-800 dark:text-slate-200">
                          {row.unauthorized_absences > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {row.unauthorized_absences}d
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Deductions */}
                        <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {row.deduction_amount > 0 ? (
                            <span>
                              <span className="text-[11px] font-bold text-rose-500 mr-0.5">-Rs.</span>
                              <span className="text-slate-800 dark:text-slate-200">
                                {Number(row.deduction_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">Rs. 0</span>
                          )}
                        </td>

                        {/* Net Payable */}
                        <td className="py-3.5 px-4 text-right tabular-nums font-extrabold text-slate-900 dark:text-white text-xs">
                          <div className="flex flex-col items-end">
                            <span>
                              <span className="text-[11px] text-slate-400 font-bold mr-0.5">Rs.</span>
                              {Number(row.effective_net_salary ?? row.net_salary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                            {hasOverride && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                                Overridden
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Payment Status (paid, processing, pending) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center relative">
                            <select
                              value={(row.payment_status || 'pending').toLowerCase()}
                              onChange={(e) =>
                                handleStatusChange(row.user_id, e.target.value as 'paid' | 'processing' | 'pending')
                              }
                              className={`pl-2.5 pr-6 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer appearance-none transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                                (row.payment_status || 'pending').toLowerCase() === 'paid'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 focus:ring-emerald-500'
                                  : (row.payment_status || 'pending').toLowerCase() === 'processing'
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-950/60 focus:ring-blue-500'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/60 focus:ring-amber-500'
                              }`}
                              title="Click to update payment status"
                            >
                              <option value="pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                                Pending
                              </option>
                              <option value="processing" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                                Processing
                              </option>
                              <option value="paid" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                                Paid
                              </option>
                            </select>
                            <span className="absolute right-2 pointer-events-none text-[8px] text-slate-400 dark:text-slate-500 font-bold">
                              ▼
                            </span>
                          </div>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isFinalized && (
                              <button
                                onClick={() =>
                                  setModalState({
                                    isOpen: true,
                                    mode: 'override',
                                    item: row,
                                  })
                                }
                                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Adjust Salary / Manual Note"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadPayslip(row)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Download Payslip PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Audit Notice */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Attendance deductions are synchronized automatically with approved leave requests and official company holidays.
            </span>
          </div>
          <span className="tabular-nums font-semibold text-[11px] text-slate-400">{workingDaysCount} Working Days</span>
        </div>
      </div>

      {/* Salary Edit Modal (Base Salary or Override) */}
      <SalaryEditModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: 'base_salary', item: null })}
        onSaved={loadPayroll}
        mode={modalState.mode}
        item={modalState.item}
        month={selectedMonth}
        year={selectedYear}
      />

      {/* Finalize Confirmation Modal */}
      <ConfirmModal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        onConfirm={handleToggleFinalize}
        title={isFinalized ? 'Unlock Monthly Payroll' : 'Finalize Monthly Payroll'}
        description={
          isFinalized
            ? `Are you sure you want to unlock ${monthName} payroll? This will allow manual edits and recalculations again.`
            : `Are you sure you want to finalize ${monthName} payroll? Once finalized, salaries are locked and cannot be edited until unlocked.`
        }
        confirmText={isFinalized ? 'Yes, Unlock' : 'Yes, Finalize Payroll'}
        cancelText="Cancel"
        variant={isFinalized ? 'warning' : 'primary'}
        isLoading={isFinalizingAction}
      />
    </DashboardShell>
  );
}
