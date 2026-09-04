const { createClient } = require('@supabase/supabase-js');

// Load from .env.local manually
const supabaseUrl = 'https://qtmevozeoenxddwjkkou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWV2b3plb2VueGRkd2pra291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjE3NzEsImV4cCI6MjEwMjU5Nzc3MX0.ln3Q5QW7SsOXqqUBbxGglfhBBrqRq9A6lSvVH-YExEw';

console.log('🔍 Testing Supabase Login...\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseKey ? '✅ Set' : '❌ Missing');
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('📧 Attempting login with: nagarkotiaashan1@gmail.com');
  console.log('🔑 Password: MeroSan@123\n');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nagarkotiaashan1@gmail.com',
      password: 'MeroSan@123',
    });

    if (error) {
      console.error('❌ Login Error:', error.message);
      console.error('Error Details:', error);
      return;
    }

    if (data.user) {
      console.log('✅ Login Successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Email Confirmed:', data.user.email_confirmed_at ? '✅ Yes' : '❌ No');
      console.log('');

      // Check if user profile exists
      console.log('🔍 Checking user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile Error:', profileError.message);
        console.log('\n⚠️  User exists in auth but no profile record!');
        console.log('   You need to create a user profile for this user.');
        return;
      }

      if (profile) {
        console.log('✅ User Profile Found!');
        console.log('Name:', profile.name);
        console.log('Role:', profile.role);
        console.log('Email:', profile.email);
        console.log('Active:', profile.is_active);
        console.log('');
      }
    }

    console.log('🎉 All checks passed! Login should work.');
  } catch (err) {
    console.error('💥 Unexpected Error:', err.message);
  }
}

testLogin();
