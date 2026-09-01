export type UserRole = 'admin' | 'manager' | 'staff';

export type AttendanceStatus = 'on_time' | 'late' | 'very_late' | 'absent' | 'half_day' | 'on_leave' | 'holiday';

export type LeaveType = 'sick' | 'casual' | 'vacation' | 'unpaid' | 'wfh' | 'comp_off';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type NotificationType = 'info' | 'warning' | 'success' | 'alert' | 'leave' | 'attendance' | 'system';

// ─── Shift Management ──────────────────────────────────

export interface Shift {
  id: string;
  company_id: string;
  name: string;
  display_name: string;
  description?: string | null;
  start_time: string | null;
  end_time: string | null;
  is_flexible: boolean;
  color: string;
  standard_hours: number;
  minimum_hours: number;
  overtime_after_hours: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Core Models ──────────────────────────────────

export interface Company {
  id: string;
  name: string;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface CompanyRules {
  id: string;
  company_id: string;
  standard_start_time: string;
  standard_end_time: string;
  standard_daily_hours: number;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  very_late_threshold_minutes: number;
  minimum_hours_full_day: number;
  minimum_hours_half_day: number;
  work_days: number[];
  // Phase 2: Tardiness automation
  very_late_to_absent_count: number; // e.g. 4 very lates = 1 absent
  tardiness_reset_cycle: 'monthly' | 'quarterly';
  // Phase 2: GPS config
  gps_enabled: boolean;
  office_locations: OfficeLocation[];
  gps_radius_meters: number;
  gps_enforcement: 'block' | 'warn';
  // Phase 2: IP restriction
  ip_restriction_enabled: boolean;
  allowed_ips: string[];
  ip_enforcement: 'block' | 'warn';
  // Anti-Proxy Device Policy
  single_device_policy_enabled?: boolean;
  // Early Check-In Window (Minutes before shift start)
  early_checkin_window_minutes?: number;
  // Auto-Checkout & Absent Penalty Policy
  auto_checkout_enabled?: boolean;
  auto_checkout_buffer_minutes?: number;
  auto_checkout_penalty_status?: 'absent' | 'half_day' | 'standard';
  // Leave Quotas (Annual days per employee)
  casual_leave_quota?: number;
  sick_leave_quota?: number;
  annual_leave_quota?: number;
  maternity_leave_quota?: number;
  comp_off_quota?: number;
  max_carry_over_days?: number;
  // Payroll & Overtime Rules
  standard_working_days_per_month?: number;
  overtime_multiplier?: number;
  unexcused_absence_deduction_rate?: number;
  late_deduction_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id?: string | null;
  department_id?: string | null;
  manager_id?: string | null;
  shift_id?: string | null;
  position?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  join_date: string;
  is_active: boolean;
  department_name?: string;
  shift_name?: string;
  created_at: string;
  updated_at: string;
}

// ─── Attendance ───────────────────────────────────

export interface AttendanceRecord {
  id: string;
  company_id?: string | null;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  status: AttendanceStatus;
  device_info?: string | null;
  ip_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_verified?: boolean;
  ip_verified?: boolean;
  notes?: string | null;
  edited_by?: string | null;
  edit_reason?: string | null;
  user_name?: string;
  user_email?: string;
  department_name?: string;
  created_at: string;
  updated_at: string;
}

// ─── Leave Management ─────────────────────────────

export interface LeaveTypeConfig {
  id: string;
  type: LeaveType;
  label: string;
  description: string;
  annual_quota: number;
  is_active: boolean;
  color: string; // Tailwind color key for UI
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  department_name?: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  total_days: number;
  reason: string;
  status: LeaveStatus;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  reviewer_comment?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  user_id: string;
  leave_type: LeaveType;
  total_quota: number;
  used: number;
  remaining: number;
  year: number;
}

// ─── Holidays ─────────────────────────────────────

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  is_recurring: boolean;
  created_at: string;
}

// ─── Notifications ────────────────────────────────

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  action_url?: string | null;
  related_entity_id?: string | null;
  related_entity_type?: 'leave' | 'attendance' | 'holiday' | null;
  created_at: string;
}

// ─── Audit Trail ──────────────────────────────────

export interface AuditLogEntry {
  id: string;
  entity_type: 'attendance' | 'leave' | 'user' | 'holiday' | 'rules';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'override';
  changed_by: string;
  changed_by_name?: string;
  old_value: string; // JSON string
  new_value: string; // JSON string
  reason: string;
  created_at: string;
}

// ─── Tardiness Tracking ──────────────────────────

export interface TardinessRecord {
  user_id: string;
  user_name?: string;
  month: number; // 1-12
  year: number;
  very_late_count: number;
  auto_absents_applied: number;
  last_updated: string;
}

// ─── Stats ────────────────────────────────────────

export interface AttendanceSummaryStats {
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysOnLeave: number;
  daysHoliday: number;
  totalHoursWorked: number;
  attendancePercentage: number;
  veryLateCount: number;
  autoAbsentsApplied: number;
}

export interface TeamOverviewStats {
  totalTeamMembers: number;
  checkedInToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  teamAttendanceRate: number;
}

export interface AdminOverviewStats {
  totalEmployees: number;
  currentlyCheckedIn: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceRate: number;
  pendingLeaveRequests: number;
}
