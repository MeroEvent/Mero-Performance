import { 
  AttendanceRecord, 
  UserProfile, 
  CompanyRules, 
  Department, 
  UserRole, 
  AttendanceStatus,
  AttendanceSummaryStats,
  TeamOverviewStats,
  AdminOverviewStats,
  OfficeLocation
} from '@/types';
import { calculateCheckInStatus, calculateHoursWorked } from '@/lib/utils/attendance';

// Default Demo Company Rules
export const DEFAULT_RULES: CompanyRules = {
  id: 'rule-001',
  company_id: 'c0000000-0000-0000-0000-000000000001',
  standard_start_time: '09:00:00',
  standard_end_time: '18:00:00',
  standard_daily_hours: 8.0,
  grace_period_minutes: 10,
  late_threshold_minutes: 20,
  very_late_threshold_minutes: 60,
  minimum_hours_full_day: 7.0,
  minimum_hours_half_day: 4.0,
  work_days: [1, 2, 3, 4, 5],
  // Phase 2: Tardiness automation
  very_late_to_absent_count: 4,
  tardiness_reset_cycle: 'monthly',
  // Phase 2: GPS config
  gps_enabled: false,
  office_locations: [
    { id: 'loc-1', name: 'Main Office', latitude: 27.7172, longitude: 85.3240 },
  ],
  gps_radius_meters: 200,
  gps_enforcement: 'warn',
  // Phase 2: IP restriction
  ip_restriction_enabled: false,
  allowed_ips: ['192.168.1.0/24'],
  ip_enforcement: 'warn',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Default Demo Departments
export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'd-1', company_id: 'c1', name: 'Engineering', description: 'Software Development & IT Infrastructure', created_at: '2026-01-01T00:00:00Z' },
  { id: 'd-2', company_id: 'c1', name: 'Human Resources', description: 'People Operations & Talent Acquisition', created_at: '2026-01-01T00:00:00Z' },
  { id: 'd-3', company_id: 'c1', name: 'Marketing', description: 'Product Marketing & Growth', created_at: '2026-01-01T00:00:00Z' },
  { id: 'd-4', company_id: 'c1', name: 'Sales & Support', description: 'Client Success & Sales Operations', created_at: '2026-01-01T00:00:00Z' },
];

// Default Demo Users
export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'u-admin-1',
    email: 'admin@mero.com',
    name: 'Sarah Connor (Admin)',
    role: 'admin',
    company_id: 'c1',
    department_id: 'd-2',
    department_name: 'Human Resources',
    position: 'HR Director / Chief Administrator',
    phone: '+1 (555) 019-2831',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    join_date: '2025-01-15',
    is_active: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'u-staff-1',
    email: 'staff@mero.com',
    name: 'Rohan Sharma (Staff)',
    role: 'staff',
    company_id: 'c1',
    department_id: 'd-1',
    department_name: 'Engineering',
    position: 'Senior Frontend Engineer',
    phone: '+1 (555) 012-3456',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    join_date: '2025-06-10',
    is_active: true,
    created_at: '2025-06-10T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'u-staff-2',
    email: 'priya.k@mero.com',
    name: 'Priya Kapoor',
    role: 'staff',
    company_id: 'c1',
    department_id: 'd-1',
    department_name: 'Engineering',
    position: 'Backend Specialist',
    phone: '+1 (555) 018-4422',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    join_date: '2025-08-01',
    is_active: true,
    created_at: '2025-08-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'u-staff-3',
    email: 'david.chen@mero.com',
    name: 'David Chen',
    role: 'staff',
    company_id: 'c1',
    department_id: 'd-3',
    department_name: 'Marketing',
    position: 'Growth Lead',
    phone: '+1 (555) 011-8833',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    join_date: '2025-09-15',
    is_active: true,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  }
];

// Initial empty records — populated when users check in
function generateInitialRecords(): AttendanceRecord[] {
  return [];
}

const STORAGE_KEY_RECORDS = 'mero_attendance_records_v2';
const STORAGE_KEY_USERS = 'mero_users_v1';
const STORAGE_KEY_RULES = 'mero_rules_v1';
const STORAGE_KEY_CURRENT_USER = 'mero_current_user_v1';

export class AttendanceService {
  private static isBrowser = typeof window !== 'undefined';

  public static getUsers(): UserProfile[] {
    if (!this.isBrowser) return DEFAULT_USERS;
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_USERS;
    }
  }

  public static getCurrentUser(): UserProfile {
    if (!this.isBrowser) return DEFAULT_USERS[2]; // Default to staff
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!stored) {
      return DEFAULT_USERS[2]; // Staff user default
    }
    try {
      const user = JSON.parse(stored);
      return user;
    } catch {
      return DEFAULT_USERS[2];
    }
  }

  public static setCurrentUser(user: UserProfile) {
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    }
  }

  public static getRecords(): AttendanceRecord[] {
    if (!this.isBrowser) return generateInitialRecords();
    const stored = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!stored) {
      const initial = generateInitialRecords();
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return generateInitialRecords();
    }
  }

  public static getCompanyRules(): CompanyRules {
    if (!this.isBrowser) return DEFAULT_RULES;
    const stored = localStorage.getItem(STORAGE_KEY_RULES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(DEFAULT_RULES));
      return DEFAULT_RULES;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_RULES;
    }
  }

  public static updateCompanyRules(rules: Partial<CompanyRules>): CompanyRules {
    const current = this.getCompanyRules();
    const updated = { ...current, ...rules, updated_at: new Date().toISOString() };
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(updated));
    }
    return updated;
  }

  public static getTodayRecord(userId: string): AttendanceRecord | null {
    const records = this.getRecords();
    const todayStr = new Date().toISOString().split('T')[0];
    return records.find(r => r.user_id === userId && r.date === todayStr) || null;
  }

  public static checkIn(userId: string, deviceInfo: string = 'Browser Device'): AttendanceRecord {
    const records = this.getRecords();
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const rules = this.getCompanyRules();
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);

    const existingToday = records.find(r => r.user_id === userId && r.date === todayStr);

    if (existingToday && existingToday.check_in_time && !existingToday.check_out_time) {
      throw new Error('Already checked in. Please check out first before checking in again.');
    }

    const status = calculateCheckInStatus(
      now,
      rules.standard_start_time,
      rules.grace_period_minutes,
      rules.late_threshold_minutes
    );

    const newRecord: AttendanceRecord = {
      id: existingToday ? existingToday.id : `att-${userId}-${todayStr}-${Date.now()}`,
      company_id: user?.company_id || 'c1',
      user_id: userId,
      user_name: user?.name,
      user_email: user?.email,
      department_name: user?.department_name,
      date: todayStr,
      check_in_time: now.toISOString(),
      check_out_time: null,
      total_hours: 0,
      status,
      device_info: deviceInfo,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    let updatedRecords: AttendanceRecord[];
    if (existingToday) {
      updatedRecords = records.map(r => r.id === existingToday.id ? newRecord : r);
    } else {
      updatedRecords = [newRecord, ...records];
    }

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updatedRecords));
    }

    return newRecord;
  }

  public static checkOut(userId: string): AttendanceRecord {
    const records = this.getRecords();
    const todayStr = new Date().toISOString().split('T')[0];
    const record = records.find(r => r.user_id === userId && r.date === todayStr && r.check_in_time && !r.check_out_time);

    if (!record || !record.check_in_time) {
      throw new Error('No active check-in session found for today.');
    }

    const now = new Date();
    const totalHours = calculateHoursWorked(record.check_in_time, now);

    const updatedRecord: AttendanceRecord = {
      ...record,
      check_out_time: now.toISOString(),
      total_hours: totalHours,
      updated_at: now.toISOString(),
    };

    const updatedRecords = records.map(r => r.id === record.id ? updatedRecord : r);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updatedRecords));
    }

    return updatedRecord;
  }

  public static getEmployeeStats(userId: string): AttendanceSummaryStats {
    const records = this.getRecords().filter(r => r.user_id === userId);
    
    const present = records.filter(r => r.status === 'on_time' || r.status === 'late' || r.status === 'very_late').length;
    const late = records.filter(r => r.status === 'late' || r.status === 'very_late').length;
    const veryLate = records.filter(r => r.status === 'very_late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const onLeave = records.filter(r => r.status === 'on_leave').length;
    const holiday = records.filter(r => r.status === 'holiday').length;
    const totalHours = records.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
    const totalDays = records.length || 1;
    const attendancePercentage = Math.round((present / totalDays) * 100);

    return {
      daysPresent: present,
      daysAbsent: absent,
      daysLate: late,
      daysOnLeave: onLeave,
      daysHoliday: holiday,
      totalHoursWorked: Math.round(totalHours * 10) / 10,
      attendancePercentage,
      veryLateCount: veryLate,
      autoAbsentsApplied: 0,
    };
  }

  public static getTeamStats(companyId: string): TeamOverviewStats {
    const users = this.getUsers().filter(u => u.company_id === companyId);
    const userIds = users.map(u => u.id);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = this.getRecords().filter(r => r.date === todayStr && userIds.includes(r.user_id));

    const checkedIn = todayRecords.filter(r => r.check_in_time !== null).length;
    const late = todayRecords.filter(r => r.status === 'late' || r.status === 'very_late').length;
    const onLeave = todayRecords.filter(r => r.status === 'on_leave').length;
    const absent = users.length - checkedIn - onLeave;

    return {
      totalTeamMembers: users.length,
      checkedInToday: checkedIn,
      absentToday: absent < 0 ? 0 : absent,
      lateToday: late,
      onLeaveToday: onLeave,
      teamAttendanceRate: users.length ? Math.round((checkedIn / users.length) * 100) : 0,
    };
  }

  public static getAdminStats(): AdminOverviewStats {
    const users = this.getUsers();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = this.getRecords().filter(r => r.date === todayStr);

    const currentlyCheckedIn = todayRecords.filter(r => r.check_in_time && !r.check_out_time).length;
    const checkedInTotal = todayRecords.filter(r => r.check_in_time).length;
    const late = todayRecords.filter(r => r.status === 'late' || r.status === 'very_late').length;
    const onLeave = todayRecords.filter(r => r.status === 'on_leave').length;
    const totalEmployees = users.length;
    const absent = totalEmployees - checkedInTotal - onLeave;

    return {
      totalEmployees,
      currentlyCheckedIn,
      absentToday: absent < 0 ? 0 : absent,
      lateToday: late,
      onLeaveToday: onLeave,
      attendanceRate: totalEmployees ? Math.round((checkedInTotal / totalEmployees) * 100) : 0,
      pendingLeaveRequests: 0, // Will be populated from LeaveService at the page level
    };
  }

  public static addUser(user: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): UserProfile {
    const users = this.getUsers();
    const newUser: UserProfile = {
      ...user,
      id: `u-gen-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
    }
    return newUser;
  }

  public static updateUser(id: string, updates: Partial<UserProfile>): UserProfile {
    const users = this.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, ...updates, updated_at: new Date().toISOString() };
    const updatedUsers = users.map(u => u.id === id ? updatedUser : u);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
    }

    return updatedUser;
  }

  public static toggleUserActive(id: string): UserProfile {
    const users = this.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('User not found');

    return this.updateUser(id, { is_active: !user.is_active });
  }
}
