import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

function getNepalDateString(dateVal: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateVal); // YYYY-MM-DD
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch user profile safely
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        id,
        name,
        email,
        department_id,
        join_date,
        created_at,
        department:departments(id, name)
      `)
      .eq('id', userId)
      .maybeSingle();

    const userName = userProfile?.name || 'Staff Member';
    const userEmail = userProfile?.email || '';
    const deptName = Array.isArray((userProfile as any)?.department)
      ? (userProfile as any).department[0]?.name || 'General'
      : (userProfile as any)?.department?.name || 'General';

    const todayNepal = getNepalDateString();
    const userStartDateStr = userProfile?.join_date || userProfile?.created_at?.split('T')[0] || todayNepal;
    const [currY, currM] = todayNepal.split('-').map(Number);
    const defaultStart = `${currY}-${String(currM).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currY, currM, 0).getDate();
    const defaultEnd = `${currY}-${String(currM).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;

    // 2. Fetch recorded punches for user
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const punchMap = new Map<string, any>();
    (records || []).forEach((r: any) => {
      punchMap.set(r.date, {
        ...r,
        user_name: userName,
        user_email: userEmail,
        department_name: deptName,
      });
    });

    // 3. Fetch approved leaves
    const { data: approvedLeaves } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('end_date', startDate)
      .lte('start_date', endDate);

    const leaves = approvedLeaves || [];

    // 4. Fetch holidays
    const { data: holidaysData } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    const holidayMap = new Map<string, string>();
    (holidaysData || []).forEach((h: any) => {
      holidayMap.set(h.date, h.name || 'Public Holiday');
    });

    // 5. If past period has zero punches and zero leaves (system was not active / in use), return empty
    if (endDate < defaultStart && punchMap.size === 0 && leaves.length === 0) {
      return NextResponse.json({ records: [] });
    }

    // 6. Generate daily timeline
    let maxDateStr = endDate;
    if (startDate <= todayNepal && todayNepal <= endDate) {
      maxDateStr = todayNepal;
    } else if (startDate > todayNepal) {
      return NextResponse.json({ records: [] });
    }

    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const [mYear, mMonth, mDay] = maxDateStr.split('-').map(Number);
    const startObj = new Date(Date.UTC(sYear, sMonth - 1, sDay));
    const maxObj = new Date(Date.UTC(mYear, mMonth - 1, mDay));

    const finalRecords: any[] = [];
    const curr = new Date(startObj);

    while (curr <= maxObj) {
      const year = curr.getUTCFullYear();
      const month = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const day = String(curr.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = curr.getUTCDay();

      const isSaturday = dayOfWeek === 6;
      const isOfficialHoliday = holidayMap.has(dateStr);
      const holidayTitle = isOfficialHoliday ? holidayMap.get(dateStr)! : isSaturday ? 'Saturday / Weekly Off' : null;

      const existingPunch = punchMap.get(dateStr);

      if (existingPunch && existingPunch.check_in_time) {
        finalRecords.push(existingPunch);
      } else if (dateStr < userStartDateStr) {
        // User had not joined yet / account was not created on this date — skip synthetic absent
        curr.setUTCDate(curr.getUTCDate() + 1);
        continue;
      } else {
        const matchingLeave = leaves.find(
          (l: any) => l.start_date <= dateStr && dateStr <= l.end_date
        );

        if (matchingLeave) {
          finalRecords.push({
            id: existingPunch?.id || `leave-${matchingLeave.id}-${dateStr}`,
            user_id: userId,
            date: dateStr,
            check_in_time: null,
            check_out_time: null,
            total_hours: 0,
            status: 'on_leave',
            shift_name: 'Approved Leave',
            notes: `Approved ${matchingLeave.leave_type.toUpperCase()} Leave: ${matchingLeave.reason}`,
            user_name: userName,
            user_email: userEmail,
            department_name: deptName,
          });
        } else if (holidayTitle) {
          finalRecords.push({
            id: existingPunch?.id || `holiday-${userId}-${dateStr}`,
            user_id: userId,
            date: dateStr,
            check_in_time: null,
            check_out_time: null,
            total_hours: 0,
            status: 'holiday',
            shift_name: 'Weekly Off / Holiday',
            notes: holidayTitle,
            user_name: userName,
            user_email: userEmail,
            department_name: deptName,
          });
        } else {
          finalRecords.push({
            id: existingPunch?.id || `absent-${userId}-${dateStr}`,
            user_id: userId,
            date: dateStr,
            check_in_time: null,
            check_out_time: null,
            total_hours: 0,
            status: 'absent',
            shift_name: 'Regular Shift',
            notes: 'Absent / No Punch Recorded',
            user_name: userName,
            user_email: userEmail,
            department_name: deptName,
          });
        }
      }

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Sort by date descending
    finalRecords.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ records: finalRecords });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch history' }, { status: 500 });
  }
}
