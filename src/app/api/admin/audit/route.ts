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
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        changer:user_profiles!audit_logs_changed_by_fkey (
          id,
          name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ logs: [] });
    }

    const formatted = (logs || []).map((l: any) => ({
      ...l,
      changed_by_name: l.changer?.name || 'System Admin',
      changed_by_email: l.changer?.email || '',
      old_value: typeof l.old_value === 'object' ? JSON.stringify(l.old_value) : String(l.old_value || ''),
      new_value: typeof l.new_value === 'object' ? JSON.stringify(l.new_value) : String(l.new_value || ''),
    }));

    return NextResponse.json({ logs: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { 
      company_id, 
      entity_type, 
      entity_id, 
      action, 
      changed_by, 
      old_value, 
      new_value, 
      reason 
    } = body;

    if (!entity_type || !entity_id || !action || !changed_by) {
      return NextResponse.json({ error: 'Missing required audit log fields' }, { status: 400 });
    }

    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        company_id: company_id || 'c0000000-0000-0000-0000-000000000001',
        entity_type,
        entity_id,
        action,
        changed_by,
        old_value: typeof old_value === 'string' ? JSON.parse(old_value) : old_value,
        new_value: typeof new_value === 'string' ? JSON.parse(new_value) : new_value,
        reason: reason || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create audit log' }, { status: 500 });
  }
}
