-- Migration 012: Add Auto-Checkout & Missed Check-Out Penalty to company_rules table

ALTER TABLE company_rules 
ADD COLUMN IF NOT EXISTS auto_checkout_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_checkout_buffer_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_checkout_penalty_status TEXT DEFAULT 'absent';

-- Comment on columns
COMMENT ON COLUMN company_rules.auto_checkout_enabled IS 'Toggle whether open sessions are automatically closed after shift ends';
COMMENT ON COLUMN company_rules.auto_checkout_buffer_minutes IS 'Buffer in minutes after shift end time before auto-checkout triggers';
COMMENT ON COLUMN company_rules.auto_checkout_penalty_status IS 'Attendance status assigned when auto-checkout triggers (e.g. absent, half_day)';
