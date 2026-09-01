-- ============================================================
-- CREATE DEFAULT ADMIN USER
-- ============================================================
-- This script creates the default admin user in your Supabase database
-- Email: admin@mero.com
-- Password: MeroSan@123
-- 
-- RUN THIS IN SUPABASE SQL EDITOR AFTER RUNNING ALL MIGRATIONS
-- ============================================================

-- Step 1: Create user in Supabase Auth
-- Note: This uses Supabase's admin API. Run this in SQL Editor:

-- First, we need to use Supabase Dashboard > Authentication > Users > Invite User
-- OR use the Supabase CLI or API to create the auth user.

-- For SQL Editor, we'll insert the user profile directly with a known UUID
-- You'll need to create the auth user manually first via Dashboard.

-- ============================================================
-- OPTION 1: Manual Steps (RECOMMENDED)
-- ============================================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Invite User" or "Add User"
-- 3. Enter:
--    - Email: admin@mero.com
--    - Password: MeroSan@123
--    - Confirm email: YES (check the box)
-- 4. Copy the generated User ID (UUID)
-- 5. Replace 'YOUR-USER-UUID-HERE' below with that ID
-- 6. Run the INSERT statement below

-- ============================================================
-- OPTION 2: Using SQL (if you have the auth user ID)
-- ============================================================
-- After creating the auth user via Dashboard, insert the profile:

-- IMPORTANT: Replace 'YOUR-USER-UUID-HERE' with the actual UUID from Step 4 above
INSERT INTO user_profiles (
  id,
  email,
  name,
  role,
  company_id,
  department_id,
  shift_id,
  position,
  phone,
  join_date,
  is_active
) VALUES (
  'YOUR-USER-UUID-HERE'::uuid,  -- ← REPLACE THIS with actual UUID from auth.users
  'admin@mero.com',
  'System Administrator',
  'admin',
  'c0000000-0000-0000-0000-000000000001',  -- Mero Company (from seed data)
  'd0000000-0000-0000-0000-000000000002',  -- Human Resources department
  (SELECT id FROM shifts WHERE company_id = 'c0000000-0000-0000-0000-000000000001' AND name = 'standard' LIMIT 1),  -- Standard Shift (9AM-6PM)
  'Chief Administrator',
  '+977-9800000000',
  CURRENT_DATE,
  true
);

-- ============================================================
-- OPTION 3: Complete Automated Script (Run in terminal)
-- ============================================================
-- Create a file called 'create-admin.sh' and run it:
/*
#!/bin/bash

# Set your Supabase credentials
SUPABASE_PROJECT_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Create admin user
curl -X POST "${SUPABASE_PROJECT_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mero.com",
    "password": "MeroSan@123",
    "email_confirm": true,
    "user_metadata": {
      "name": "System Administrator"
    }
  }'
*/

-- ============================================================
-- VERIFY THE USER WAS CREATED
-- ============================================================
-- Run this query to check if the admin user exists:

SELECT 
  up.id,
  up.email,
  up.name,
  up.role,
  up.phone,
  up.position,
  d.name as department,
  s.display_name as shift,
  c.name as company
FROM user_profiles up
LEFT JOIN departments d ON d.id = up.department_id
LEFT JOIN shifts s ON s.id = up.shift_id
LEFT JOIN companies c ON c.id = up.company_id
WHERE up.email = 'admin@mero.com';

-- ============================================================
-- NOTES
-- ============================================================
-- 1. The password 'MeroSan@123' is NOT stored in this file or code
-- 2. It's only used when creating the auth user via Supabase
-- 3. Supabase handles password hashing and security
-- 4. After first login, admin should change the password
-- 5. This is a one-time setup script, not part of the codebase
