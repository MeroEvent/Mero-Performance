import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        user:user_profiles!attendance_records_user_id_fkey (
          id,
          name,
          email,
          department_id,
          position,
          department:departments (id, name)
        )
      `)

      .order('date', { ascending: false })
      .order('check_in_time', { ascending: false });

    if (userId && userId !== 'all') {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let records = (data || []).map((r: any) => ({
      ...r,
      user_name: r.user?.name || 'Unknown',
      user_email: r.user?.email || '',
      department_name: r.user?.department?.name || 'General',
    }));

    if (departmentId && departmentId !== 'all') {
      records = records.filter((r: any) => r.user?.department_id === departmentId || r.department_name === departmentId);
    }

    return NextResponse.json({ records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch report records' }, { status: 500 });
  }
}
