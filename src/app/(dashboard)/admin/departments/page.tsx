'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DepartmentModal } from '@/components/admin/department-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  Layers
} from 'lucide-react';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<any | null>(null);

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    department: any | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    department: null,
    isDeleting: false,
  });

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/departments');
      const data = await res.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleAdd = () => {
    setDepartmentToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (dept: any) => {
    setDepartmentToEdit(dept);
    setIsModalOpen(true);
  };

  const triggerDelete = (dept: any) => {
    setDeleteModal({
      isOpen: true,
      department: dept,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.department) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/admin/departments?id=${deleteModal.department.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeleteModal({ isOpen: false, department: null, isDeleting: false });
        loadDepartments();
      } else {
        alert(data.error || 'Failed to delete department');
        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
      }
    } catch (err: any) {
      alert('Error deleting department: ' + err.message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const filteredDepartments = departments.filter((d) =>
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Department Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create, organize, and manage organizational departments and divisions
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all w-fit cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Department
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
          {filteredDepartments.length} {filteredDepartments.length === 1 ? 'department' : 'departments'}
        </span>
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Department Name</th>
                <th className="py-3.5 px-5">Description</th>
                <th className="py-3.5 px-5">Team Members</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p className="font-semibold text-xs">Loading departments from database...</p>
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-semibold text-sm">No Departments Configured</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add New Department" to create your first department.</p>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Department Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {dept.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-5 text-slate-600 dark:text-slate-300 max-w-md">
                      {dept.description ? (
                        <span>{dept.description}</span>
                      ) : (
                        <span className="text-slate-400 italic">No description</span>
                      )}
                    </td>

                    {/* Employee Count */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dept.employee_count || 0} {dept.employee_count === 1 ? 'employee' : 'employees'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDelete(dept)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Department Modal */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadDepartments}
        departmentToEdit={departmentToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, department: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Department"
        description={`Are you sure you want to delete the department "${deleteModal.department?.name}"? Any employees assigned to this department will become unassigned.`}
        confirmText="Yes, Delete Department"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteModal.isDeleting}
      />
    </DashboardShell>
  );
}
