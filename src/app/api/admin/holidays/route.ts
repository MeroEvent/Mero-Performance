import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// 1. GET ALL HOLIDAYS
export async function GET() {
  try {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const holidays = (data || []).map((h: any) => ({
      ...h,
      is_paid: h.is_paid !== undefined ? h.is_paid : true,
    }));

    return NextResponse.json({ holidays });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch holidays' }, { status: 500 });
  }
}

// 2. CREATE NEW HOLIDAY
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { name, date, description, is_paid, is_recurring, company_id } = body;

    if (!name || !name.trim() || !date) {
      return NextResponse.json({ error: 'Holiday name and date are required.' }, { status: 400 });
    }

    const payload: any = {
      name: name.trim(),
      date,
      description: description?.trim() || null,
      is_recurring: Boolean(is_recurring),
      company_id: company_id || 'c0000000-0000-0000-0000-000000000001',
    };

    // Include is_paid if supported
    if (is_paid !== undefined) {
      payload.is_paid = Boolean(is_paid);
    }

    let { data, error } = await supabase
      .from('holidays')
      .insert(payload)
      .select()
      .single();

    // If is_paid column error occurred, fallback without is_paid
    if (error && error.message.includes('is_paid')) {
      delete payload.is_paid;
      const res = await supabase.from('holidays').insert(payload).select().single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      holiday: {
        ...data,
        is_paid: is_paid !== undefined ? is_paid : true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create holiday' }, { status: 500 });
  }
}

// 3. UPDATE HOLIDAY
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { id, name, date, description, is_paid, is_recurring } = body;

    if (!id || !name || !date) {
      return NextResponse.json({ error: 'Holiday ID, name, and date are required.' }, { status: 400 });
    }

    const payload: any = {
      name: name.trim(),
      date,
      description: description?.trim() || null,
      is_recurring: Boolean(is_recurring),
    };

    if (is_paid !== undefined) {
      payload.is_paid = Boolean(is_paid);
    }

    let { data, error } = await supabase
      .from('holidays')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message.includes('is_paid')) {
      delete payload.is_paid;
      const res = await supabase.from('holidays').update(payload).eq('id', id).select().single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      holiday: {
        ...data,
        is_paid: is_paid !== undefined ? is_paid : true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update holiday' }, { status: 500 });
  }
}

// 4. DELETE HOLIDAY
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('holidays').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete holiday' }, { status: 500 });
  }
}
