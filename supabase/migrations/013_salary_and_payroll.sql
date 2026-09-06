-- Migration 013: Add base_salary to user_profiles and create monthly_payroll table

-- 1. Add base_salary to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2) DEFAULT 0;

COMMENT ON COLUMN user_profiles.base_salary IS 'Monthly base salary in NPR/Rs.';

-- 2. Create monthly_payroll table
CREATE TABLE IF NOT EXISTS monthly_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,

  -- Auto-calculated attendance metrics
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  working_days INTEGER NOT NULL DEFAULT 0,
  days_present NUMERIC(5, 1) NOT NULL DEFAULT 0,
  approved_leave_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  unpaid_leave_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  unauthorized_absences NUMERIC(5, 1) NOT NULL DEFAULT 0,
  total_hours NUMERIC(6, 1) NOT NULL DEFAULT 0,

  -- Salary computation
  daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  deduction_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Admin manual override
  admin_override NUMERIC(12, 2) DEFAULT NULL,
  override_reason TEXT DEFAULT NULL,
  overridden_by UUID REFERENCES user_profiles(id) DEFAULT NULL,

  -- Payment lifecycle state (pending, processing, paid)
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid')),

  -- Finalization state
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  finalized_at TIMESTAMPTZ DEFAULT NULL,
  finalized_by UUID REFERENCES user_profiles(id) DEFAULT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one payroll record per employee per month
  UNIQUE(user_id, month, year)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON monthly_payroll(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_user ON monthly_payroll(user_id);

-- Enable RLS
ALTER TABLE monthly_payroll ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins full access to monthly_payroll"
  ON monthly_payroll FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Employees can view their own payroll records
CREATE POLICY "Employees can view own payroll"
  ON monthly_payroll FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
