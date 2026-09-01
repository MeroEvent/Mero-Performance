/**
 * Mero Attendance — Admin User Seed Script
 *
 * Usage:
 *   node supabase/scripts/seed-admin.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually
try {
  const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  });
} catch (e) {
  console.log('Reading from process.env');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Config ──────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@mero.com';
const ADMIN_PASSWORD = 'MeroSan@123';
const ADMIN_NAME = 'System Administrator';
const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';
const DEPARTMENT_ID = 'af97b5c5-ea06-4477-acb8-bc9da3bd254d'; // Information Tech
// ────────────────────────────────────────────────────────


async function seedAdmin() {
  console.log('🔧 Connecting to Supabase project...');
  console.log(`URL: ${SUPABASE_URL}`);

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
      console.log('⚠️  Admin user already exists in Auth. Updating password & profile...');
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find((u) => u.email === ADMIN_EMAIL);
      if (existing) {
        // Update password to ensure it matches MeroSan@123
        await supabase.auth.admin.updateUserById(existing.id, {
          password: ADMIN_PASSWORD,
        });
        console.log(`   Found auth user: ${existing.id}`);
        await upsertProfile(existing.id);
        return;
      }
    }
    console.error('❌ Auth error:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created: ${userId}`);

  // 2. Insert user_profiles row
  await upsertProfile(userId);
}

async function upsertProfile(userId) {
  console.log('🔧 Upserting admin profile in user_profiles...');

  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      company_id: COMPANY_ID,
      department_id: DEPARTMENT_ID,
      position: 'System Administrator',
      is_active: true,
      join_date: '2026-01-01',
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.log('ℹ️ Note: If tables are not created in Supabase yet, please run migration 001_schema.sql in Supabase SQL editor.');
    console.log('Profile insert message:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅ Admin user configured in Supabase!');
  console.log('═══════════════════════════════════════════');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Role:     admin`);
  console.log(`  User ID:  ${userId}`);
  console.log('═══════════════════════════════════════════');
}

seedAdmin();
