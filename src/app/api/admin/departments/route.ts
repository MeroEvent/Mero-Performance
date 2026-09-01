import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// 1. GET ALL DEPARTMENTS (with employee count)
export async function GET() {
  try {
    const supabase = getAdminSupabase();

    // Fetch departments
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (deptError) {
      return NextResponse.json({ error: deptError.message }, { status: 500 });
    }

    // Fetch employee counts per department
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('department_id');

    const counts: Record<string, number> = {};
    if (userProfiles) {
      userProfiles.forEach((u: any) => {
        if (u.department_id) {
          counts[u.department_id] = (counts[u.department_id] || 0) + 1;
        }
      });
    }

    const result = (departments || []).map((d: any) => ({
      ...d,
      employee_count: counts[d.id] || 0,
    }));

    return NextResponse.json({ departments: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch departments' }, { status: 500 });
  }
}

// 2. CREATE NEW DEPARTMENT
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { name, description, company_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        company_id: company_id || 'c0000000-0000-0000-0000-000000000001',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, department: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create department' }, { status: 500 });
  }
}

// 3. UPDATE DEPARTMENT
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { id, name, description } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Department ID and name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('departments')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, department: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update department' }, { status: 500 });
  }
}

// 4. DELETE DEPARTMENT
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Unassign users from this department first (SET NULL)
    await supabase.from('user_profiles').update({ department_id: null }).eq('department_id', id);

    // Delete department
    const { error } = await supabase.from('departments').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete department' }, { status: 500 });
  }
}
