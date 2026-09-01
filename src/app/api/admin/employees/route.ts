import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// 1. GET ALL EMPLOYEES
export async function GET() {
  try {
    const supabase = getAdminSupabase();

    // Fetch user profiles with department and shift joins
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        department:departments(id, name),
        shift:shifts(id, display_name, start_time, end_time, is_flexible)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employees = (data || []).map((u: any) => ({
      ...u,
      department_name: u.department?.name || null,
      shift_name: u.shift?.display_name || null,
    }));

    return NextResponse.json({ employees });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch employees' }, { status: 500 });
  }
}

// 2. CREATE NEW EMPLOYEE
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { email, password, name, role, department_id, position, phone, shift_id, avatar_url } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: role || 'staff' },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into user_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        name,
        role: role || 'staff',
        company_id: 'c0000000-0000-0000-0000-000000000001',
        department_id: department_id || null,
        shift_id: shift_id || null,
        position: position || 'Team Member',
        phone: phone || null,
        avatar_url: avatar_url || null,
        is_active: true,
        join_date: new Date().toISOString().split('T')[0],
      })
      .select(`
        *,
        department:departments(id, name),
        shift:shifts(id, display_name)
      `)
      .single();

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: profileData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 3. UPDATE EMPLOYEE
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { id, password, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // If password update requested
    if (password && password.trim().length >= 6) {
      const { error: passError } = await supabase.auth.admin.updateUserById(id, {
        password: password.trim(),
      });
      if (passError) {
        return NextResponse.json({ error: passError.message }, { status: 400 });
      }
    }

    // Update user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .update({
        name: updates.name,
        role: updates.role || 'staff',
        department_id: updates.department_id || null,
        shift_id: updates.shift_id || null,
        position: updates.position || null,
        phone: updates.phone || null,
        avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : null,
        is_active: updates.is_active !== undefined ? updates.is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        department:departments(id, name),
        shift:shifts(id, display_name)
      `)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: profileData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 4. DELETE EMPLOYEE
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete auth user (cascades to user_profiles)
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      // Fallback: delete profile directly
      await supabase.from('user_profiles').delete().eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
