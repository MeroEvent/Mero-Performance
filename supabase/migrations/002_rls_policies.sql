-- ============================================================
-- Mero Attendance Management System
-- Migration 002: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tardiness_records ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: Get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Companies: Admin can manage, others can read their own
-- ============================================================
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "companies_admin_all" ON companies
  FOR ALL USING (
    id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- Departments: Same company can read, admin can manage
-- ============================================================
CREATE POLICY "departments_select" ON departments
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "departments_admin_all" ON departments
  FOR ALL USING (
    company_id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- Company Rules: Same company can read, admin can manage
-- ============================================================
CREATE POLICY "rules_select" ON company_rules
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "rules_admin_all" ON company_rules
  FOR ALL USING (
    company_id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- Office Locations: Same company can read, admin can manage
-- ============================================================
CREATE POLICY "locations_select" ON office_locations
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "locations_admin_all" ON office_locations
  FOR ALL USING (
    company_id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- User Profiles
-- Staff: read own profile + read profiles in same company (for team views)
-- Manager: read team members
-- Admin: full CRUD
-- ============================================================
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON user_profiles
  FOR ALL USING (
    company_id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- Attendance Records
-- Staff: read/write own records
-- Manager: read team, edit team (with audit)
-- Admin: read/write all in company
-- ============================================================
CREATE POLICY "attendance_select_own" ON attendance_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "attendance_insert_own" ON attendance_records
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "attendance_update_own" ON attendance_records
  FOR UPDATE USING (user_id = auth.uid());

-- Manager: read team attendance
CREATE POLICY "attendance_manager_select" ON attendance_records
  FOR SELECT USING (
    get_user_role() IN ('manager', 'admin')
    AND company_id = get_user_company_id()
  );

-- Manager/Admin: edit team attendance (for corrections)
CREATE POLICY "attendance_manager_update" ON attendance_records
  FOR UPDATE USING (
    get_user_role() IN ('manager', 'admin')
    AND company_id = get_user_company_id()
  );

-- Admin: full access
CREATE POLICY "attendance_admin_all" ON attendance_records
  FOR ALL USING (
    get_user_role() = 'admin' AND company_id = get_user_company_id()
  );

-- ============================================================
-- Leave Types: company can read, admin can manage
-- ============================================================
CREATE POLICY "leave_types_select" ON leave_types
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "leave_types_admin_all" ON leave_types
  FOR ALL USING (
    company_id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- Leave Requests
-- Staff: own requests
-- Manager: team requests (for approval)
-- Admin: all
-- ============================================================
CREATE POLICY "leave_select_own" ON leave_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "leave_insert_own" ON leave_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "leave_update_own_pending" ON leave_requests
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

-- Manager can read and update (approve/reject) team leave requests
CREATE POLICY "leave_manager_select" ON leave_requests
  FOR SELECT USING (
    get_user_role() IN ('manager', 'admin')
  );

CREATE POLICY "leave_manager_update" ON leave_requests
  FOR UPDATE USING (
    get_user_role() IN ('manager', 'admin') AND status = 'pending'
  );

-- Admin: full access
CREATE POLICY "leave_admin_all" ON leave_requests
  FOR ALL USING (get_user_role() = 'admin');

-- ============================================================
-- Leave Balances: own balance readable, admin can manage
-- ============================================================
CREATE POLICY "balances_select_own" ON leave_balances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "balances_admin_all" ON leave_balances
  FOR ALL USING (get_user_role() = 'admin');

-- ============================================================
-- Holidays: company can read, admin can manage
-- ============================================================
CREATE POLICY "holidays_select" ON holidays
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "holidays_admin_all" ON holidays
  FOR ALL USING (
    company_id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ============================================================
-- Notifications: own only
-- ============================================================
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Audit Logs: admin and managers can read, system can insert
-- ============================================================
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Tardiness Records: own readable, admin/manager can manage
-- ============================================================
CREATE POLICY "tardiness_select_own" ON tardiness_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tardiness_manager_select" ON tardiness_records
  FOR SELECT USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "tardiness_admin_all" ON tardiness_records
  FOR ALL USING (get_user_role() = 'admin');
