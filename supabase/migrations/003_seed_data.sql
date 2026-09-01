-- ============================================================
-- Mero Attendance Management System
-- Migration 003: Seed Data (Company, Departments, Rules, Holidays)
-- ============================================================
-- NOTE: The admin user is created via Supabase Auth API (see setup script).
--       This file seeds everything EXCEPT the admin user_profiles row,
--       which is inserted after the auth user is created.
-- ============================================================

-- 1. Seed Company
INSERT INTO companies (id, name) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Mero Company Pvt. Ltd.');

-- 2. Seed Departments
INSERT INTO departments (id, company_id, name, description) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Engineering', 'Software development and infrastructure'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Human Resources', 'Recruitment, policies, and employee relations'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Marketing', 'Brand, campaigns, and growth'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Sales & Support', 'Sales operations and customer support');

-- 3. Seed Company Rules
INSERT INTO company_rules (company_id, standard_start_time, standard_end_time, standard_daily_hours, grace_period_minutes, late_threshold_minutes, very_late_threshold_minutes, minimum_hours_full_day, minimum_hours_half_day, work_days, very_late_to_absent_count, tardiness_reset_cycle, gps_enabled, gps_radius_meters, gps_enforcement, ip_restriction_enabled, allowed_ips, ip_enforcement) VALUES
  ('c0000000-0000-0000-0000-000000000001', '09:00:00', '18:00:00', 8.0, 10, 20, 60, 7.0, 4.0, '{1,2,3,4,5}', 4, 'monthly', false, 200, 'warn', false, '{}', 'warn');

-- 4. Seed Office Location
INSERT INTO office_locations (company_id, name, latitude, longitude) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Main Office — Kathmandu', 27.7172453, 85.3239605);

-- 5. Seed Leave Types
INSERT INTO leave_types (company_id, type, label, description, annual_quota, color) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'sick', 'Sick Leave', 'For illness or medical appointments', 12, 'rose'),
  ('c0000000-0000-0000-0000-000000000001', 'casual', 'Casual Leave', 'For personal or unexpected needs', 10, 'amber'),
  ('c0000000-0000-0000-0000-000000000001', 'vacation', 'Vacation Leave', 'Annual vacation / holiday leave', 15, 'blue'),
  ('c0000000-0000-0000-0000-000000000001', 'unpaid', 'Unpaid Leave', 'Leave without pay', 99, 'slate'),
  ('c0000000-0000-0000-0000-000000000001', 'wfh', 'Work From Home', 'Remote working days', 24, 'indigo'),
  ('c0000000-0000-0000-0000-000000000001', 'comp_off', 'Compensatory Off', 'Off for extra days worked', 5, 'teal');

-- 6. Seed Holidays (Nepal 2026 Calendar)
INSERT INTO holidays (company_id, name, date, description, is_recurring) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'New Year', '2026-01-01', 'New Year celebration', true),
  ('c0000000-0000-0000-0000-000000000001', 'Makar Sankranti', '2026-01-15', 'Harvest festival', true),
  ('c0000000-0000-0000-0000-000000000001', 'Maha Shivaratri', '2026-02-26', 'Auspicious Hindu festival', true),
  ('c0000000-0000-0000-0000-000000000001', 'Fagu Purnima (Holi)', '2026-03-17', 'Festival of colors', true),
  ('c0000000-0000-0000-0000-000000000001', 'Republic Day', '2026-05-29', 'National Republic Day of Nepal', true),
  ('c0000000-0000-0000-0000-000000000001', 'Buddha Jayanti', '2026-05-12', 'Birth anniversary of Lord Buddha', true),
  ('c0000000-0000-0000-0000-000000000001', 'Dashain (Vijaya Dashami)', '2026-10-12', 'Biggest Nepali festival — 5-day holiday', true),
  ('c0000000-0000-0000-0000-000000000001', 'Tihar (Laxmi Puja)', '2026-10-30', 'Festival of lights', true),
  ('c0000000-0000-0000-0000-000000000001', 'Chhath Parva', '2026-11-08', 'Sun worship festival', true),
  ('c0000000-0000-0000-0000-000000000001', 'Christmas Day', '2026-12-25', 'Christmas celebration', true);
