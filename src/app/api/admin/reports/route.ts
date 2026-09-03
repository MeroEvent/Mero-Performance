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
    const departmentId = searchParams.get('departmentId');
    const todayNepal = getNepalDateString();
    const [currY, currM] = todayNepal.split('-').map(Number);
    const defaultStart = `${currY}-${String(currM).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currY, currM, 0).getDate();
    const defaultEnd = `${currY}-${String(currM).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;

    // 1. Fetch Users in scope (Excluding administrators from general attendance tracking)
    let usersQuery = supabase
      .from('user_profiles')
      .select(`
        id,
        name,
        email,
        role,
        department_id,
        position,
        join_date,
        created_at,
        department:departments (id, name)
      `)
      .neq('is_active', false);

    if (userId && userId !== 'all') {
      usersQuery = usersQuery.eq('id', userId);
    }

    const { data: usersData, error: usersErr } = await usersQuery;
    let users = usersData || [];

    // Fallback if userId was specified but not found by department filter
    if (userId && userId !== 'all' && users.length === 0) {
      const { data: directUser } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          email,
          role,
          department_id,
          position,
          join_date,
          created_at,
          department:departments (id, name)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (directUser) {
        users = [directUser];
      }
    }

    // 2. Fetch recorded punches for date range
    let punchQuery = supabase
      .from('attendance_records')
      .select(`
        *,
        user:user_profiles!attendance_records_user_id_fkey (
          id,
          name,
          email,
          role,
          department_id,
          position,
          department:departments (id, name)
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (userId && userId !== 'all') {
      punchQuery = punchQuery.eq('user_id', userId);
    }

    const { data: punchesData, error: punchErr } = await punchQuery;
    if (punchErr) throw punchErr;
    const punches = punchesData || [];

    // Map existing punches by "user_id_date"
    const punchMap = new Map<string, any>();
    punches.forEach((p: any) => {
      punchMap.set(`${p.user_id}_${p.date}`, {
        ...p,
        user_name: p.user?.name || 'Unknown',
        user_email: p.user?.email || '',
        department_name: p.user?.department?.name || 'General',
      });
    });

    // 3. Fetch approved leaves overlapping date range
    let leaveQuery = supabase
      .from('leave_requests')
      .select(`
        *,
        user:user_profiles!leave_requests_user_id_fkey (
          id,
          name,
          email,
          department_id,
          position,
          department:departments (id, name)
        )
      `)
      .eq('status', 'approved')
      .gte('end_date', startDate)
      .lte('start_date', endDate);

    if (userId && userId !== 'all') {
      leaveQuery = leaveQuery.eq('user_id', userId);
    }

    const { data: approvedLeaves } = await leaveQuery;
    const leaves = approvedLeaves || [];

    // 4. Fetch company public holidays for date range
    const { data: holidaysData } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    const holidayMap = new Map<string, string>();
    (holidaysData || []).forEach((h: any) => {
      holidayMap.set(h.date, h.name || 'Public Holiday');
    });

    // 5. If past period has zero punches and zero leaves across all queried employees, return empty
    if (endDate < defaultStart && punches.length === 0 && leaves.length === 0) {
      return NextResponse.json({ records: [] });
    }

    // 6. Determine day range boundary: up to today or month end
    const currentNepalDate = getNepalDateString();
    let maxDateStr = endDate;
    if (startDate <= currentNepalDate && currentNepalDate <= endDate) {
      maxDateStr = currentNepalDate;
    } else if (startDate > currentNepalDate) {
      // Future month
      return NextResponse.json({ records: [] });
    }

    // Parse start and max date safely
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const [mYear, mMonth, mDay] = maxDateStr.split('-').map(Number);
    const startObj = new Date(Date.UTC(sYear, sMonth - 1, sDay));
    const maxObj = new Date(Date.UTC(mYear, mMonth - 1, mDay));

    const finalRecords: any[] = [];

    // 6. Generate day-by-day complete master log for each employee
    for (const emp of users) {
      const deptName = Array.isArray(emp.department)
        ? (emp.department[0] as any)?.name || 'General'
        : (emp.department as any)?.name || 'General';

      const userStartDateStr = (emp as any).join_date || (emp as any).created_at?.split('T')[0] || currentNepalDate;
      const curr = new Date(startObj);
      while (curr <= maxObj) {
        const year = curr.getUTCFullYear();
        const month = String(curr.getUTCMonth() + 1).padStart(2, '0');
        const day = String(curr.getUTCDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayOfWeek = curr.getUTCDay(); // 0 = Sun, 6 = Sat

        const isSaturday = dayOfWeek === 6;
        const isOfficialHoliday = holidayMap.has(dateStr);
        const holidayTitle = isOfficialHoliday ? holidayMap.get(dateStr)! : isSaturday ? 'Saturday / Weekly Off' : null;

        const punchKey = `${emp.id}_${dateStr}`;
        const existingPunch = punchMap.get(punchKey);

        if (existingPunch && existingPunch.check_in_time) {
          // Scenario 1: Punched in (Present, Late, Half-Day)
          finalRecords.push(existingPunch);
        } else if (dateStr < userStartDateStr) {
          // User was not hired yet on this date — skip synthetic absent
          curr.setUTCDate(curr.getUTCDate() + 1);
          continue;
        } else {
          // Check for approved leave
          const matchingLeave = leaves.find(
            (l: any) => l.user_id === emp.id && l.start_date <= dateStr && dateStr <= l.end_date
          );

          if (matchingLeave) {
            // Scenario 3: Approved Leave
            finalRecords.push({
              id: existingPunch?.id || `leave-${matchingLeave.id}-${dateStr}`,
              user_id: emp.id,
              date: dateStr,
              check_in_time: null,
              check_out_time: null,
              total_hours: 0,
              status: 'on_leave',
              shift_name: 'Approved Leave',
              notes: `Approved ${matchingLeave.leave_type.toUpperCase()} Leave: ${matchingLeave.reason}`,
              user_name: emp.name || 'Employee',
              user_email: emp.email || '',
              department_name: deptName,
            });
          } else if (holidayTitle) {
            // Scenario 4: Saturday / Public Holiday (No punch required)
            finalRecords.push({
              id: existingPunch?.id || `holiday-${emp.id}-${dateStr}`,
              user_id: emp.id,
              date: dateStr,
              check_in_time: null,
              check_out_time: null,
              total_hours: 0,
              status: 'holiday',
              shift_name: 'Weekly Off / Holiday',
              notes: holidayTitle,
              user_name: emp.name || 'Employee',
              user_email: emp.email || '',
              department_name: deptName,
            });
          } else {
            // Scenario 2: Regular Working Day with NO punch and NO leave (Absent)
            finalRecords.push({
              id: existingPunch?.id || `absent-${emp.id}-${dateStr}`,
              user_id: emp.id,
              date: dateStr,
              check_in_time: null,
              check_out_time: null,
              total_hours: 0,
              status: 'absent',
              shift_name: 'Regular Shift',
              notes: 'Absent / No Punch Recorded',
              user_name: emp.name || 'Employee',
              user_email: emp.email || '',
              department_name: deptName,
            });
          }
        }

        // Advance to next day
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    // Sort by date descending, then employee name ascending
    finalRecords.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return (a.user_name || '').localeCompare(b.user_name || '');
    });

    return NextResponse.json({ records: finalRecords });
  } catch (err: any) {
    console.error('Reports API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch report records' }, { status: 500 });
  }
}
