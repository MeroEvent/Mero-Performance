const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtmevozeoenxddwjkkou.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWV2b3plb2VueGRkd2pra291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAyMTc3MSwiZXhwIjoyMTAyNTk3NzcxfQ.apyEbppIPBQqPjvAYZhbigcOKhdYOiQ42TkqriNkUmk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsers() {
  console.log('🔍 Checking existing users in database...\n');

  try {
    // Check user_profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, name, role, is_active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No users found in user_profiles table!');
      console.log('\n📝 You need to create an admin user.');
      console.log('\n✅ Run this in Supabase SQL Editor:');
      console.log('\n-- Step 1: Create auth user (via Dashboard > Authentication > Users)');
      console.log('-- Email: admin@mero.com');
      console.log('-- Password: MeroSan@123');
      console.log('-- Auto Confirm: YES');
      console.log('\n-- Step 2: Then run this SQL (replace USER_UUID with actual UUID):');
      console.log(`
INSERT INTO user_profiles (
  id, email, name, role, company_id, department_id, position, phone, join_date, is_active
) VALUES (
  'YOUR-USER-UUID'::uuid,
  'admin@mero.com',
  'System Administrator',
  'admin',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'Chief Administrator',
  '+977-9800000000',
  CURRENT_DATE,
  true
);
      `);
      return;
    }

    console.log('✅ Found', profiles.length, 'user(s):\n');
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name || 'No Name'}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Active: ${profile.is_active ? '✅' : '❌'}`);
      console.log(`   ID: ${profile.id}`);
      console.log('');
    });

    const adminExists = profiles.find(p => p.email === 'admin@mero.com');
    if (adminExists) {
      console.log('✅ Admin user exists in profiles!');
      console.log('   But authentication is failing...');
      console.log('\n🔧 This means the auth user might not exist or password is wrong.');
      console.log('\n✅ Go to Supabase Dashboard > Authentication > Users');
      console.log('   Check if admin@mero.com exists there.');
      console.log('   If not, create it manually with password: MeroSan@123');
    } else {
      console.log('❌ admin@mero.com not found in profiles!');
      console.log('   You need to create this user.');
    }

  } catch (err) {
    console.error('💥 Error:', err.message);
  }
}

checkUsers();
