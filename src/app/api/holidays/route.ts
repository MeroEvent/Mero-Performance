import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getNepalDateString } from '@/lib/utils/attendance';

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
    const isUpcoming = searchParams.get('upcoming') === 'true';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    const todayStr = getNepalDateString();

    let query = supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });

    if (isUpcoming) {
      query = query.gte('date', todayStr).limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const holidays = (data || []).map((h: any) => ({
      ...h,
      is_paid: h.is_paid !== undefined ? h.is_paid : true,
    }));

    return NextResponse.json({ holidays, today: todayStr });
  } catch (err: any) {
    console.error('Failed to fetch holidays:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch holidays' }, { status: 500 });
  }
}
