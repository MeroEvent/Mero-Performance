import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, companyName } = body;

    // Validation
    if (!email || !password || !name || !companyName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    // 1. Create company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    // 2. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        company_name: companyName,
      },
    });

    if (authError) {
      // Cleanup company if user creation failed
      await supabase.from('companies').delete().eq('id', companyData.id);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 3. Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        name,
        role: 'admin',
        company_id: companyData.id,
        position: 'Company Administrator',
        is_active: true,
        join_date: new Date().toISOString().split('T')[0],
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Cleanup
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('companies').delete().eq('id', companyData.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // 4. Create default company rules
    await supabase.from('company_rules').insert({
      company_id: companyData.id,
      standard_start_time: '09:00:00',
      standard_end_time: '18:00:00',
      standard_daily_hours: 8.0,
      grace_period_minutes: 10,
      late_threshold_minutes: 20,
      very_late_threshold_minutes: 60,
      minimum_hours_full_day: 7.0,
      minimum_hours_half_day: 4.0,
      work_days: [1, 2, 3, 4, 5],
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please sign in.',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
