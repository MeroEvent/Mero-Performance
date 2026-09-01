-- ============================================================
-- Mero Attendance Management System
-- Migration 007: Add is_paid and end_date to Holidays Table
-- ============================================================

ALTER TABLE holidays 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE holidays 
ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN holidays.is_paid IS 'Whether this holiday is a paid public/company holiday or unpaid off-day';
COMMENT ON COLUMN holidays.end_date IS 'Optional end date for multi-day festival holidays';
