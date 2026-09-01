-- ============================================================
-- Mero Attendance Management System
-- Migration 010: Add Location, GPS & Shift Tracking to Attendance Records
-- ============================================================

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10, 7);

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS location_lng NUMERIC(10, 7);

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS location_address TEXT;

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS is_verified_location BOOLEAN DEFAULT true;

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS ip_address TEXT;
