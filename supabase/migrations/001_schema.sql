-- ============================================================
-- Mero Attendance Management System
-- Migration 001: Core Schema
-- ============================================================

-- 1. Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Company Rules (one per company)
CREATE TABLE IF NOT EXISTS company_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  standard_start_time TIME NOT NULL DEFAULT '09:00:00',
  standard_end_time TIME NOT NULL DEFAULT '18:00:00',
  standard_daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  grace_period_minutes INT NOT NULL DEFAULT 10,
  late_threshold_minutes INT NOT NULL DEFAULT 20,
  very_late_threshold_minutes INT NOT NULL DEFAULT 60,
  minimum_hours_full_day NUMERIC(4,2) NOT NULL DEFAULT 7.0,
  minimum_hours_half_day NUMERIC(4,2) NOT NULL DEFAULT 4.0,
  work_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  -- Tardiness automation
  very_late_to_absent_count INT NOT NULL DEFAULT 4,
  tardiness_reset_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (tardiness_reset_cycle IN ('monthly', 'quarterly')),
  -- GPS config
  gps_enabled BOOLEAN NOT NULL DEFAULT false,
  gps_radius_meters INT NOT NULL DEFAULT 200,
  gps_enforcement TEXT NOT NULL DEFAULT 'warn' CHECK (gps_enforcement IN ('block', 'warn')),
  -- IP restriction
  ip_restriction_enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_ips TEXT[] NOT NULL DEFAULT '{}',
  ip_enforcement TEXT NOT NULL DEFAULT 'warn' CHECK (ip_enforcement IN ('block', 'warn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Office Locations (for GPS geofencing)
CREATE TABLE IF NOT EXISTS office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. User Profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  position TEXT,
  phone TEXT,
  avatar_url TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  total_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('on_time', 'late', 'very_late', 'absent', 'half_day', 'on_leave', 'holiday')),
  device_info TEXT,
  ip_address TEXT,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  location_verified BOOLEAN DEFAULT false,
  ip_verified BOOLEAN DEFAULT false,
  notes TEXT,
  edited_by UUID REFERENCES user_profiles(id),
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One record per user per day
  UNIQUE(user_id, date)
);

-- 7. Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  annual_quota INT NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_id UUID REFERENCES user_profiles(id),
  reviewer_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_quota INT NOT NULL,
  used INT NOT NULL DEFAULT 0,
  remaining INT NOT NULL,
  year INT NOT NULL,
  UNIQUE(user_id, leave_type, year)
);

-- 10. Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'alert', 'leave', 'attendance', 'system')),
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  related_entity_id TEXT,
  related_entity_type TEXT CHECK (related_entity_type IN ('leave', 'attendance', 'holiday')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('attendance', 'leave', 'user', 'holiday', 'rules')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'override')),
  changed_by UUID NOT NULL REFERENCES user_profiles(id),
  old_value JSONB,
  new_value JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Tardiness Records
CREATE TABLE IF NOT EXISTS tardiness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  very_late_count INT NOT NULL DEFAULT 0,
  auto_absents_applied INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_attendance_company_date ON attendance_records(company_id, date DESC);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_leave_requests_user ON leave_requests(user_id, status);
CREATE INDEX idx_leave_requests_reviewer ON leave_requests(reviewer_id, status);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_holidays_company_date ON holidays(company_id, date);
CREATE INDEX idx_tardiness_user_period ON tardiness_records(user_id, year, month);
CREATE INDEX idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX idx_user_profiles_manager ON user_profiles(manager_id);

-- ============================================================
-- Updated_at Auto-Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_rules_updated_at BEFORE UPDATE ON company_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
