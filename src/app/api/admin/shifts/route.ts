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
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shifts = (data || []).map((s: any) => ({
      ...s,
      grace_period_minutes: s.grace_period_minutes !== undefined ? s.grace_period_minutes : 15,
      late_threshold_minutes: s.late_threshold_minutes !== undefined ? s.late_threshold_minutes : 30,
      minimum_hours_half_day: s.minimum_hours_half_day !== undefined ? s.minimum_hours_half_day : 4.0,
      allow_remote_checkin: s.allow_remote_checkin !== undefined ? s.allow_remote_checkin : s.is_flexible,
    }));

    return NextResponse.json({ shifts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();

    const payload: any = {
      company_id: body.company_id || 'c0000000-0000-0000-0000-000000000001',
      name: body.name || body.display_name.toLowerCase().replace(/\s+/g, '_'),
      display_name: body.display_name,
      description: body.description || null,
      start_time: body.is_flexible ? null : body.start_time,
      end_time: body.is_flexible ? null : body.end_time,
      is_flexible: Boolean(body.is_flexible),
      color: body.color || 'blue',
      standard_hours: Number(body.standard_hours) || 8.0,
      minimum_hours: Number(body.minimum_hours) || 7.0,
      minimum_hours_half_day: Number(body.minimum_hours_half_day) || 4.0,
      grace_period_minutes: Number(body.grace_period_minutes) || 15,
      late_threshold_minutes: Number(body.late_threshold_minutes) || 30,
      overtime_after_hours: Number(body.overtime_after_hours) || 10.0,
      allow_remote_checkin: Boolean(body.allow_remote_checkin),
      is_active: body.is_active !== undefined ? body.is_active : true,
    };

    let { data, error } = await supabase
      .from('shifts')
      .insert(payload)
      .select()
      .single();

    // Fallback if some new columns not yet migrated
    if (error) {
      delete payload.grace_period_minutes;
      delete payload.late_threshold_minutes;
      delete payload.minimum_hours_half_day;
      delete payload.allow_remote_checkin;
      const res = await supabase.from('shifts').insert(payload).select().single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, shift: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create shift' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    const payload: any = {};
    if (body.display_name !== undefined) payload.display_name = body.display_name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.start_time !== undefined) payload.start_time = body.is_flexible ? null : body.start_time;
    if (body.end_time !== undefined) payload.end_time = body.is_flexible ? null : body.end_time;
    if (body.is_flexible !== undefined) payload.is_flexible = Boolean(body.is_flexible);
    if (body.color !== undefined) payload.color = body.color;
    if (body.standard_hours !== undefined) payload.standard_hours = Number(body.standard_hours);
    if (body.minimum_hours !== undefined) payload.minimum_hours = Number(body.minimum_hours);
    if (body.minimum_hours_half_day !== undefined) payload.minimum_hours_half_day = Number(body.minimum_hours_half_day);
    if (body.grace_period_minutes !== undefined) payload.grace_period_minutes = Number(body.grace_period_minutes);
    if (body.late_threshold_minutes !== undefined) payload.late_threshold_minutes = Number(body.late_threshold_minutes);
    if (body.overtime_after_hours !== undefined) payload.overtime_after_hours = Number(body.overtime_after_hours);
    if (body.allow_remote_checkin !== undefined) payload.allow_remote_checkin = Boolean(body.allow_remote_checkin);
    if (body.is_active !== undefined) payload.is_active = Boolean(body.is_active);

    let { data, error } = await supabase
      .from('shifts')
      .update(payload)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      delete payload.grace_period_minutes;
      delete payload.late_threshold_minutes;
      delete payload.minimum_hours_half_day;
      delete payload.allow_remote_checkin;
      const res = await supabase.from('shifts').update(payload).eq('id', body.id).select().single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, shift: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update shift' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    await supabase.from('user_profiles').update({ shift_id: null }).eq('shift_id', id);

    const { error } = await supabase.from('shifts').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete shift' }, { status: 500 });
  }
}
