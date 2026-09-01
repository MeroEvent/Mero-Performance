-- ============================================================
-- Mero Attendance Management System
-- Migration 008: Shift-Level Location & Geofence Rules
-- ============================================================

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS allow_remote_checkin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS require_wifi BOOLEAN NOT NULL DEFAULT false;

-- Update Field/Flexible shifts to allow remote checkin by default
UPDATE shifts 
SET allow_remote_checkin = true 
WHERE is_flexible = true OR name = 'field';
