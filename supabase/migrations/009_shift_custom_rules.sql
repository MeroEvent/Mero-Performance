-- ============================================================
-- Mero Attendance Management System
-- Migration 009: Shift-Specific Rules & Punctuality Thresholds
-- ============================================================

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS grace_period_minutes INT NOT NULL DEFAULT 15;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS late_threshold_minutes INT NOT NULL DEFAULT 30;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS minimum_hours_half_day NUMERIC(4,2) NOT NULL DEFAULT 4.00;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS allow_remote_checkin BOOLEAN NOT NULL DEFAULT false;

-- Ensure Field Shift has remote checkin allowed
UPDATE shifts 
SET allow_remote_checkin = true, standard_hours = 8.0, minimum_hours = 7.0, minimum_hours_half_day = 4.0
WHERE is_flexible = true OR name = 'field';
