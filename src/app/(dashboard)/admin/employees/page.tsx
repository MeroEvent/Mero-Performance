'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { EmployeeModal } from '@/components/admin/employee-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Clock, 
  Building2,
  Shield,
  UserCheck,
  Briefcase,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminEmployeesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any | null>(null);

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: any | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    user: null,
    isDeleting: false,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [empRes, deptRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/departments'),
      ]);

      const empData = await empRes.json();
      const deptData = await deptRes.json();

      if (empData.employees) setUsers(empData.employees);
      if (deptData.departments) setDepartments(deptData.departments);
    } catch (err) {
      console.error('Failed to load employee data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user: any) => {
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const triggerDelete = (user: any) => {
    setDeleteModal({
      isOpen: true,
      user,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/admin/employees?id=${deleteModal.user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteModal({ isOpen: false, user: null, isDeleting: false });
        loadData();
      } else {
        alert(data.error || 'Failed to delete employee');
        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
      }
    } catch (err: any) {
      alert('Error deleting employee: ' + err.message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleEdit = (user: any) => {
    setEmployeeToEdit(user);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.position || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDepartment === 'all' || u.department_name === selectedDepartment;

    return matchesSearch && matchesDept;
  });

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage company employees, credentials, roles, departments, and work shifts
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all w-fit cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Employee / User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Position</th>
                <th className="py-3.5 px-4">Work Shift</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p className="font-semibold text-xs">Loading employees from Supabase...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-semibold text-sm">No Employees Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add New User" to create an employee account.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      !user.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    {/* User Avatar + Name + Email */}
                    <td className="py-3.5 px-5">
                      <Link
                        href={`/admin/employees/${user.id}`}
                        className="flex items-center gap-3 group cursor-pointer"
                        title="Click to view employee attendance & download report"
                      >
                        <img
                          src={
                            user.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
                          }
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0 group-hover:ring-blue-500 transition-all"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {user.email}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                          user.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Staff'}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {user.department_name || (
                        <span className="text-slate-400 font-normal">Unassigned</span>
                      )}
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {user.position || 'Team Member'}
                    </td>

                    {/* Work Shift */}
                    <td className="py-3.5 px-4">
                      {user.shift_name ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-blue-500" />
                          {user.shift_name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Unassigned</span>
                      )}
                    </td>

                    {/* Status Toggle Button */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          user.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title={user.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/employees/${user.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors font-bold text-xs"
                          title="View Attendance & Download PDF Report"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Report</span>
                        </Link>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                          title="Edit user"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => triggerDelete(user)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
        employeeToEdit={employeeToEdit}
      />

      {/* Custom SaaS Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, user: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Employee Account"
        description={`Are you sure you want to permanently delete "${deleteModal.user?.name}" (${deleteModal.user?.email})? This will delete their authentication credentials and attendance records.`}
        confirmText="Yes, Delete User"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteModal.isDeleting}
      />
    </DashboardShell>
  );
}
