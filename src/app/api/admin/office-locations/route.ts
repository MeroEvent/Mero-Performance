import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const DEFAULT_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

// GET ALL OFFICE LOCATIONS
export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('office_locations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch office locations' }, { status: 500 });
  }
}

// CREATE OR UPDATE OFFICE LOCATION
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();

    const name = body.name?.trim() || 'Main Office';
    const latitude = parseFloat(body.latitude);
    const longitude = parseFloat(body.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ error: 'Valid latitude and longitude are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('office_locations')
      .insert({
        company_id: body.company_id || DEFAULT_COMPANY_ID,
        name,
        latitude,
        longitude,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create office location' }, { status: 500 });
  }
}

// UPDATE OFFICE LOCATION
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (body.name) updates.name = body.name.trim();
    if (body.latitude !== undefined) updates.latitude = parseFloat(body.latitude);
    if (body.longitude !== undefined) updates.longitude = parseFloat(body.longitude);

    const { data, error } = await supabase
      .from('office_locations')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update office location' }, { status: 500 });
  }
}

// DELETE OFFICE LOCATION
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('office_locations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete office location' }, { status: 500 });
  }
}