/**
 * Modular Database Service Layer
 * Replaces localStorage with Supabase queries
 */

import { createClient } from '@/lib/supabase/client';
import type {
  UserProfile,
  AttendanceRecord,
  CompanyRules,
  AttendanceStatus,
  AttendanceSummaryStats,
  TeamOverviewStats,
  AdminOverviewStats,
} from '@/types';

const supabase = createClient();

// ─────────────────────────────────────────
// USER OPERATIONS
// ─────────────────────────────────────────

export const userService = {
  /**
   * Get all users in the company
   */
  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        department:departments(name),
        manager:user_profiles!manager_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data.map((user: any) => ({
      ...user,
      department_name: user.department?.name || null,
      manager_name: user.manager?.name || null,
    }));
  },

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        department:departments(name),
        manager:user_profiles!manager_id(name)
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user:', error);
      return null;
    }

    return {
      ...data,
      department_name: data.department?.name || null,
      manager_name: data.manager?.name || null,
    };
  },

  /**
   * Update user profile
   */
  async update(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data;
  },

  /**
   * Toggle user active status
   */
  async toggleActive(userId: string): Promise<boolean> {
    const user = await this.getById(userId);
    if (!user) return false;

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active })
      .eq('id', userId);

    return !error;
  },
};

// ─────────────────────────────────────────
// ATTENDANCE OPERATIONS
// ─────────────────────────────────────────

export const attendanceService = {
  /**
   * Get all attendance records with filters
   */
  async getRecords(filters?: {
    userId?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        user:user_profiles(name, email, department:departments(name))
      `)
      .order('date', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance records:', error);
      return [];
    }

    return data.map((record: any) => ({
      ...record,
      user_name: record.user?.name || null,
      user_email: record.user?.email || null,
      department_name: record.user?.department?.name || null,
    }));
  },

  /**
   * Get today's attendance record for a user
   */
  async getTodayRecord(userId: string): Promise<AttendanceRecord | null> {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .maybeSingle();

    if (error) {
      console.error('Error fetching today record:', error);
      return null;
    }

    return data;
  },

  /**
   * Check in a user
   */
  async checkIn(
    userId: string,
    companyId: string,
    deviceInfo?: string,
    ipAddress?: string,
    location?: { lat: number; lng: number }
  ): Promise<AttendanceRecord | null> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check if already checked in today
    const existing = await this.getTodayRecord(userId);
    if (existing && existing.check_in_time && !existing.check_out_time) {
      throw new Error('Already checked in. Please check out first.');
    }

    // Get company rules to calculate status
    const rules = await companyRulesService.get(companyId);
    const status = calculateCheckInStatus(now, rules);

    const recordData = {
      user_id: userId,
      company_id: companyId,
      date: todayStr,
      check_in_time: now.toISOString(),
      check_out_time: null,
      total_hours: 0,
      status,
      device_info: deviceInfo || null,
      ip_address: ipAddress || null,
      location_lat: location?.lat || null,
      location_lng: location?.lng || null,
    };

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('attendance_records')
        .update(recordData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating check-in:', error);
        throw new Error('Failed to check in');
      }

      return data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert(recordData)
        .select()
        .single();

      if (error) {
        console.error('Error creating check-in:', error);
        throw new Error('Failed to check in');
      }

      return data;
    }
  },

  /**
   * Check out a user
   */
  async checkOut(userId: string): Promise<AttendanceRecord | null> {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    const { data: record, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .maybeSingle();

    if (fetchError || !record) {
      throw new Error('No active check-in session found');
    }

    if (!record.check_in_time) {
      throw new Error('You must check in first');
    }

    if (record.check_out_time) {
      throw new Error('Already checked out');
    }

    const checkInTime = new Date(record.check_in_time);
    const totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: now.toISOString(),
        total_hours: Math.round(totalHours * 100) / 100,
        updated_at: now.toISOString(),
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) {
      console.error('Error checking out:', error);
      throw new Error('Failed to check out');
    }

    return data;
  },

  /**
   * Get employee attendance stats
   */
  async getEmployeeStats(userId: string): Promise<AttendanceSummaryStats> {
    const records = await this.getRecords({ userId });

    const present = records.filter(
      (r) => r.status === 'on_time' || r.status === 'late' || r.status === 'very_late'
    ).length;
    const late = records.filter((r) => r.status === 'late' || r.status === 'very_late').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const onLeave = records.filter((r) => r.status === 'on_leave').length;
    const holiday = records.filter((r) => r.status === 'holiday').length;
    const veryLate = records.filter((r) => r.status === 'very_late').length;
    const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
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
  },

  /**
   * Get admin overview stats
   */
  async getAdminStats(companyId: string): Promise<AdminOverviewStats> {
    const todayStr = new Date().toISOString().split('T')[0];

    // Get total employees
    const { count: totalEmployees } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true);

    // Get today's records
    const todayRecords = await this.getRecords({
      companyId,
      startDate: todayStr,
      endDate: todayStr,
    });

    const currentlyCheckedIn = todayRecords.filter(
      (r) => r.check_in_time && !r.check_out_time
    ).length;
    const checkedInTotal = todayRecords.filter((r) => r.check_in_time).length;
    const late = todayRecords.filter((r) => r.status === 'late' || r.status === 'very_late').length;
    const onLeaveToday = todayRecords.filter((r) => r.status === 'on_leave').length;
    const absent = (totalEmployees || 0) - checkedInTotal - onLeaveToday;

    return {
      totalEmployees: totalEmployees || 0,
      currentlyCheckedIn,
      absentToday: absent < 0 ? 0 : absent,
      lateToday: late,
      onLeaveToday,
      attendanceRate: totalEmployees ? Math.round((checkedInTotal / totalEmployees) * 100) : 0,
      pendingLeaveRequests: 0,
    };
  },
};

// ─────────────────────────────────────────
// COMPANY RULES OPERATIONS
// ─────────────────────────────────────────

export const companyRulesService = {
  /**
   * Get company rules
   */
  async get(companyId: string): Promise<CompanyRules | null> {
    const { data, error } = await supabase
      .from('company_rules')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching company rules:', error);
      return null;
    }

    return data;
  },

  /**
   * Update company rules
   */
  async update(companyId: string, updates: Partial<CompanyRules>): Promise<CompanyRules | null> {
    const { data, error } = await supabase
      .from('company_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating company rules:', error);
      return null;
    }

    return data;
  },
};

// ─────────────────────────────────────────
// SHIFT MANAGEMENT OPERATIONS
// ─────────────────────────────────────────

export const shiftService = {
  /**
   * Get all shifts for a company
   */
  async getAll(companyId?: string): Promise<any[]> {
    const cid = companyId || 'c0000000-0000-0000-0000-000000000001';
    try {
      let { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('company_id', cid)
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback to fetch all active/seeded shifts
        const res = await supabase.from('shifts').select('*').order('display_order', { ascending: true });
        return res.data || [];
      }

      return data;
    } catch (err) {
      console.error('Error fetching shifts:', err);
      return [];
    }
  },

  /**
   * Get active shifts only
   */
  async getActive(companyId?: string): Promise<any[]> {
    const cid = companyId || 'c0000000-0000-0000-0000-000000000001';
    try {
      let { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('company_id', cid)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        const res = await supabase
          .from('shifts')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        return res.data || [];
      }

      return data;
    } catch (err) {
      console.error('Error fetching active shifts:', err);
      return [];
    }
  },

  /**
   * Get shift by ID
   */
  async getById(shiftId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shift:', error);
      return null;
    }

    return data;
  },

  /**
   * Create new shift
   */
  async create(companyId: string, shiftData: any): Promise<any | null> {
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        company_id: companyId,
        ...shiftData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      return null;
    }

    return data;
  },

  /**
   * Update shift
   */
  async update(shiftId: string, updates: any): Promise<any | null> {
    const { data, error } = await supabase
      .from('shifts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) {
      console.error('Error updating shift:', error);
      return null;
    }

    return data;
  },

  /**
   * Delete shift (soft delete by marking inactive)
   */
  async delete(shiftId: string): Promise<boolean> {
    // Check if any users are assigned to this shift
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('shift_id', shiftId);

    if (count && count > 0) {
      // Don't delete, just deactivate
      const { error } = await supabase
        .from('shifts')
        .update({ is_active: false })
        .eq('id', shiftId);

      return !error;
    }

    // No users assigned, can actually delete
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId);

    return !error;
  },

  /**
   * Toggle shift active status
   */
  async toggleActive(shiftId: string): Promise<boolean> {
    const shift = await this.getById(shiftId);
    if (!shift) return false;

    const { error } = await supabase
      .from('shifts')
      .update({ is_active: !shift.is_active })
      .eq('id', shiftId);

    return !error;
  },
};

// ─────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────

/**
 * Calculate check-in status based on time and company rules
 */
function calculateCheckInStatus(checkInDate: Date, rules: CompanyRules | null): AttendanceStatus {
  if (!rules) return 'on_time';

  const [hours, minutes] = rules.standard_start_time.split(':').map(Number);
  const expectedTime = new Date(checkInDate);
  expectedTime.setHours(hours, minutes, 0, 0);

  const diffMs = checkInDate.getTime() - expectedTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= rules.grace_period_minutes) {
    return 'on_time';
  } else if (diffMinutes <= rules.late_threshold_minutes) {
    return 'late';
  } else {
    return 'very_late';
  }
}
