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

    // Fetch fallback salaries from company_rules if column is missing
    const { data: rulesData } = await supabase
      .from('company_rules')
      .select('allowed_ips')
      .limit(1)
      .maybeSingle();

    const rawIps: string[] = Array.isArray(rulesData?.allowed_ips) ? rulesData.allowed_ips : [];
    const fallbackSalaries = new Map<string, number>();
    rawIps.forEach((entry: string) => {
      if (entry.startsWith('__POLICY__:base_salary_')) {
        const [k, v] = entry.replace('__POLICY__:base_salary_', '').split('=');
        if (k && v && !isNaN(Number(v))) fallbackSalaries.set(k, Number(v));
      }
    });

    const employees = (data || []).map((u: any) => ({
      ...u,
      base_salary: Number(u.base_salary || fallbackSalaries.get(u.id) || 0),
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
    const { email, password, name, role, department_id, position, phone, shift_id, avatar_url, base_salary } = body;

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
    const salaryVal = base_salary !== undefined && base_salary !== '' ? Number(base_salary) : 0;

    // 2. Insert into user_profiles table (try with base_salary first)
    const profilePayload: any = {
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
      base_salary: salaryVal,
      is_active: true,
      join_date: new Date().toISOString().split('T')[0],
    };

    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profilePayload)
      .select(`
        *,
        department:departments(id, name),
        shift:shifts(id, display_name)
      `)
      .single();

    if (profileError) {
      // If error is due to base_salary column missing, retry without it
      delete profilePayload.base_salary;
      const retryRes = await supabase
        .from('user_profiles')
        .upsert(profilePayload)
        .select(`
          *,
          department:departments(id, name),
          shift:shifts(id, display_name)
        `)
        .single();

      if (retryRes.error) {
        await supabase.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: retryRes.error.message }, { status: 500 });
      }

      profileData = retryRes.data;

      // Save salary to company_rules fallback
      if (salaryVal > 0) {
        try {
          const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
          if (ruleRow) {
            const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
            const prefix = `__POLICY__:base_salary_${userId}=`;
            const filtered = rawIps.filter((item: string) => !item.startsWith(prefix));
            filtered.push(`${prefix}${salaryVal}`);
            await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
          }
        } catch {}
      }
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
    const { id, password, base_salary, ...updates } = body;

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

    const salaryVal = base_salary !== undefined && base_salary !== '' ? Number(base_salary) : null;

    // Update user profile
    const updatePayload: any = {
      name: updates.name,
      role: updates.role || 'staff',
      department_id: updates.department_id || null,
      shift_id: updates.shift_id || null,
      position: updates.position || null,
      phone: updates.phone || null,
      avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : null,
      is_active: updates.is_active !== undefined ? updates.is_active : true,
      updated_at: new Date().toISOString(),
    };

    if (salaryVal !== null) {
      updatePayload.base_salary = salaryVal;
    }

    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        department:departments(id, name),
        shift:shifts(id, display_name)
      `)
      .single();

    if (profileError && salaryVal !== null) {
      // Column might be missing, try updating without base_salary
      delete updatePayload.base_salary;
      const retryRes = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          *,
          department:departments(id, name),
          shift:shifts(id, display_name)
        `)
        .single();

      if (retryRes.error) {
        return NextResponse.json({ error: retryRes.error.message }, { status: 500 });
      }

      profileData = retryRes.data;

      // Save salary to company_rules fallback
      try {
        const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
        if (ruleRow) {
          const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
          const prefix = `__POLICY__:base_salary_${id}=`;
          const filtered = rawIps.filter((item: string) => !item.startsWith(prefix));
          filtered.push(`${prefix}${salaryVal}`);
          await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
        }
      } catch {}
    } else if (profileError) {
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
