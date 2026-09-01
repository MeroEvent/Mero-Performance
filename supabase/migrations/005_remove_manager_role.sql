-- ============================================================
-- Mero Attendance Management System
-- Migration 005: Remove Manager Role & Update to Admin/User Only
-- ============================================================

-- 1. Update role check constraint to only allow 'admin' and 'staff'
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'staff'));

-- 2. Convert all existing managers to staff
UPDATE user_profiles 
SET role = 'staff' 
WHERE role = 'manager';

-- 3. Remove manager_id column (no longer needed)
ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS manager_id;

-- 4. Drop manager-related index
DROP INDEX IF EXISTS idx_user_profiles_manager;

-- 5. Update RLS policies - remove manager references

-- Attendance policies
DROP POLICY IF EXISTS "attendance_manager_select" ON attendance_records;
DROP POLICY IF EXISTS "attendance_manager_update" ON attendance_records;

-- Admin can now manage all attendance in company
CREATE POLICY "attendance_admin_select" ON attendance_records
  FOR SELECT USING (
    get_user_role() = 'admin'
    AND company_id = get_user_company_id()
  );

CREATE POLICY "attendance_admin_update" ON attendance_records
  FOR UPDATE USING (
    get_user_role() = 'admin'
    AND company_id = get_user_company_id()
  );

-- Leave request policies
DROP POLICY IF EXISTS "leave_manager_select" ON leave_requests;
DROP POLICY IF EXISTS "leave_manager_update" ON leave_requests;

-- Admin can now manage all leave requests in company
CREATE POLICY "leave_admin_select_all" ON leave_requests
  FOR SELECT USING (
    get_user_role() = 'admin'
  );

CREATE POLICY "leave_admin_update_all" ON leave_requests
  FOR UPDATE USING (
    get_user_role() = 'admin' AND status = 'pending'
  );

-- Audit logs - remove manager reference
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (get_user_role() = 'admin');

-- Tardiness records - remove manager reference  
DROP POLICY IF EXISTS "tardiness_manager_select" ON tardiness_records;
CREATE POLICY "tardiness_admin_select_all" ON tardiness_records
  FOR SELECT USING (get_user_role() = 'admin');

-- 6. Add comment explaining role system
COMMENT ON COLUMN user_profiles.role IS 'User role: admin (full control) or staff (regular employee)';

-- ============================================================
-- Migration Complete
-- ============================================================
-- Changes:
-- - Removed 'manager' role from system
-- - Only 'admin' and 'staff' roles now exist
-- - Converted all managers to staff
-- - Removed manager_id foreign key relationship
-- - Updated all RLS policies for admin-only management
-- ============================================================
