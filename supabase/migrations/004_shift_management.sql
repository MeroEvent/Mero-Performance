-- ============================================================
-- Mero Attendance Management System
-- Migration 004: Shift Management System
-- ============================================================

-- 1. Create Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  start_time TIME,
  end_time TIME,
  is_flexible BOOLEAN NOT NULL DEFAULT false,
  color TEXT NOT NULL DEFAULT 'blue',
  standard_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  minimum_hours NUMERIC(4,2) NOT NULL DEFAULT 7.0,
  overtime_after_hours NUMERIC(4,2) NOT NULL DEFAULT 10.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add shift_id to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_shift ON user_profiles(shift_id);

-- 4. Add trigger for updated_at
CREATE TRIGGER trg_shifts_updated_at 
  BEFORE UPDATE ON shifts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

-- 5. Seed Default Shifts for Mero Company
INSERT INTO shifts (
  company_id,
  name,
  display_name,
  description,
  start_time,
  end_time,
  is_flexible,
  color,
  standard_hours,
  minimum_hours,
  overtime_after_hours,
  display_order
) VALUES
  -- Morning Shift
  (
    'c0000000-0000-0000-0000-000000000001',
    'morning',
    'Morning Shift',
    'Early morning shift for operations team',
    '06:00:00',
    '14:00:00',
    false,
    'amber',
    8.0,
    7.0,
    10.0,
    1
  ),
  -- Standard Shift (Default)
  (
    'c0000000-0000-0000-0000-000000000001',
    'standard',
    'Standard Shift',
    'Regular office hours for most employees',
    '09:00:00',
    '18:00:00',
    false,
    'blue',
    8.0,
    7.0,
    10.0,
    2
  ),
  -- Evening Shift
  (
    'c0000000-0000-0000-0000-000000000001',
    'evening',
    'Evening Shift',
    'Afternoon and evening shift',
    '14:00:00',
    '22:00:00',
    false,
    'indigo',
    8.0,
    7.0,
    10.0,
    3
  ),
  -- Night Shift
  (
    'c0000000-0000-0000-0000-000000000001',
    'night',
    'Night Shift',
    'Overnight shift with night allowance',
    '22:00:00',
    '06:00:00',
    false,
    'purple',
    8.0,
    7.0,
    10.0,
    4
  ),
  -- Field/Flexible Shift
  (
    'c0000000-0000-0000-0000-000000000001',
    'field',
    'Field Shift',
    'Flexible hours for field staff and visitors',
    NULL,
    NULL,
    true,
    'emerald',
    7.0,
    7.0,
    10.0,
    5
  );

-- 6. Add comments for documentation
COMMENT ON TABLE shifts IS 'Work shift definitions for companies';
COMMENT ON COLUMN shifts.is_flexible IS 'If true, no fixed start/end time (for field staff)';
COMMENT ON COLUMN shifts.overtime_after_hours IS 'Hours worked beyond this count as overtime';
COMMENT ON COLUMN shifts.display_order IS 'Order to display shifts in UI';

-- 7. RLS Policies for Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Users can view shifts in their company
CREATE POLICY "Users can view company shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.company_id = shifts.company_id
    )
  );

-- Only admins can manage shifts
CREATE POLICY "Admins can manage shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.company_id = shifts.company_id
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================
-- Migration Complete
-- ============================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify shifts table is created
-- 3. Check that default 5 shifts are inserted
-- 4. Users can now be assigned to different shifts
-- ============================================================
