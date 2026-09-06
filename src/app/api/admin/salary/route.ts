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

// GET /api/admin/salary?month=9&year=2026
export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    const todayNepal = getNepalDateString();
    const [currY, currM] = todayNepal.split('-').map(Number);

    const month = parseInt(searchParams.get('month') || String(currM), 10);
    const year = parseInt(searchParams.get('year') || String(currY), 10);
    const departmentId = searchParams.get('departmentId');
    const userId = searchParams.get('userId');

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Fetch active employees (with graceful fallback if base_salary column is pending migration)
    let usersQuery = supabase
      .from('user_profiles')
      .select(`
        id,
        name,
        email,
        avatar_url,
        role,
        department_id,
        position,
        join_date,
        created_at,
        base_salary,
        department:departments (id, name)
      `)
      .neq('is_active', false)
      .order('name', { ascending: true });

    if (departmentId && departmentId !== 'all') {
      usersQuery = usersQuery.eq('department_id', departmentId);
    }

    if (userId && userId !== 'all') {
      usersQuery = usersQuery.eq('id', userId);
    }

    let users: any[] = [];
    const { data: usersData, error: usersErr } = await usersQuery;

    if (usersErr) {
      // Fallback query without base_salary in case migration 013 hasn't been applied yet
      let fallbackQuery = supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          email,
          avatar_url,
          role,
          department_id,
          position,
          join_date,
          created_at,
          department:departments (id, name)
        `)
        .neq('is_active', false)
        .order('name', { ascending: true });

      if (departmentId && departmentId !== 'all') {
        fallbackQuery = fallbackQuery.eq('department_id', departmentId);
      }
      if (userId && userId !== 'all') {
        fallbackQuery = fallbackQuery.eq('id', userId);
      }

      const { data: fallbackUsers } = await fallbackQuery;
      users = fallbackUsers || [];
    } else {
      users = usersData || [];
    }

    // Read fallback salary overrides & payment statuses from company_rules if available
    const fallbackSalaries = new Map<string, number>();
    const fallbackStatuses = new Map<string, string>();
    try {
      const { data: rulesData } = await supabase
        .from('company_rules')
        .select('allowed_ips')
        .limit(1)
        .maybeSingle();

      const rawIps: string[] = Array.isArray(rulesData?.allowed_ips) ? rulesData.allowed_ips : [];
      const statusPrefix = `__POLICY__:payroll_status_${year}_${month}_`;
      rawIps.forEach((entry: string) => {
        if (entry.startsWith('__POLICY__:base_salary_')) {
          const [k, v] = entry.replace('__POLICY__:base_salary_', '').split('=');
          if (k && v && !isNaN(Number(v))) {
            fallbackSalaries.set(k, Number(v));
          }
        } else if (entry.startsWith(statusPrefix)) {
          const [userIdPart, statusVal] = entry.replace(statusPrefix, '').split('=');
          if (userIdPart && statusVal) {
            fallbackStatuses.set(userIdPart, statusVal);
          }
        }
      });
    } catch {
      // Non-fatal
    }

    // 2. Fetch company public holidays in this month
    const { data: holidaysData } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    const holidayMap = new Map<string, any>();
    (holidaysData || []).forEach((h: any) => {
      holidayMap.set(h.date, h);
    });

    // 3. Compute company standard working days in this month (Excluding Saturdays and holidays)
    let companyWorkingDays = 0;
    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay(); // 0 = Sun, 6 = Sat
      const isSat = dayOfWeek === 6;
      const isHol = holidayMap.has(dStr);
      if (!isSat && !isHol) {
        companyWorkingDays++;
      }
    }
    // Fallback if month has odd calendar
    if (companyWorkingDays === 0) companyWorkingDays = 26;

    // 4. Fetch attendance records in this month
    const { data: punchesData } = await supabase
      .from('attendance_records')
      .select('id, user_id, date, status, total_hours, check_in_time')
      .gte('date', startDate)
      .lte('date', endDate);

    const punches = punchesData || [];
    const punchMap = new Map<string, any>();
    punches.forEach((p: any) => {
      punchMap.set(`${p.user_id}_${p.date}`, p);
    });

    // 5. Fetch approved leave requests in this month
    const { data: approvedLeavesData } = await supabase
      .from('leave_requests')
      .select('id, user_id, leave_type, start_date, end_date, total_days')
      .eq('status', 'approved')
      .gte('end_date', startDate)
      .lte('start_date', endDate);

    const leaves = approvedLeavesData || [];

    // 6. Try fetching saved monthly_payroll records
    let savedPayrollMap = new Map<string, any>();
    try {
      const { data: savedData } = await supabase
        .from('monthly_payroll')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      if (savedData) {
        savedData.forEach((row: any) => {
          savedPayrollMap.set(row.user_id, row);
        });
      }
    } catch {
      // Table might not exist yet if migration pending
    }

    // 7. Calculate payroll row for each employee
    const effectiveLimitDate = todayNepal < endDate && todayNepal >= startDate ? todayNepal : endDate;
    const isFutureMonth = startDate > todayNepal;

    const payrollRows = users.map((emp: any) => {
      const baseSalary = Number(emp.base_salary || fallbackSalaries.get(emp.id) || 0);
      const saved = savedPayrollMap.get(emp.id);

      // If already finalized, use the locked saved record
      if (saved && saved.is_finalized) {
        return {
          ...saved,
          employee_name: emp.name,
          employee_email: emp.email,
          avatar_url: emp.avatar_url || null,
          payment_status: saved.payment_status || fallbackStatuses.get(emp.id) || 'processing',
          employee_role: emp.role,
          department_name: emp.department?.name || 'General',
          position: emp.position || 'Team Member',
        };
      }

      // Compute attendance metrics
      let daysPresent = 0;
      let approvedLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let unauthorizedAbsences = 0;
      let totalHours = 0;

      const userJoinDate = emp.join_date || emp.created_at?.split('T')[0] || startDate;

      for (let d = 1; d <= lastDayOfMonth; d++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dStr > effectiveLimitDate && !isFutureMonth) break;
        if (dStr < userJoinDate) continue;

        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const isSat = dayOfWeek === 6;
        const isHol = holidayMap.has(dStr);

        // Saturday and official holidays are non-working days
        if (isSat || isHol) continue;

        const punch = punchMap.get(`${emp.id}_${dStr}`);

        if (punch && punch.check_in_time) {
          if (punch.status === 'half_day') {
            daysPresent += 0.5;
            unauthorizedAbsences += 0.5;
          } else {
            daysPresent += 1;
          }
          totalHours += Number(punch.total_hours || 0);
        } else {
          // Check approved leave
          const matchingLeave = leaves.find(
            (l: any) => l.user_id === emp.id && l.start_date <= dStr && dStr <= l.end_date
          );

          if (matchingLeave) {
            if (matchingLeave.leave_type === 'unpaid') {
              unpaidLeaveDays += 1;
            } else {
              approvedLeaveDays += 1;
            }
          } else {
            // Unauthorized absence
            unauthorizedAbsences += 1;
          }
        }
      }

      const dailyRate = companyWorkingDays > 0 ? Number((baseSalary / companyWorkingDays).toFixed(2)) : 0;
      const deductibleDays = unauthorizedAbsences + unpaidLeaveDays;
      const autoDeduction = Number((deductibleDays * dailyRate).toFixed(2));
      const autoNet = Math.max(0, Number((baseSalary - autoDeduction).toFixed(2)));

      const adminOverride = saved?.admin_override !== undefined && saved?.admin_override !== null 
        ? Number(saved.admin_override) 
        : null;
      const overrideReason = saved?.override_reason || null;
      const isFinalized = Boolean(saved?.is_finalized);

      const effectiveNet = adminOverride !== null ? adminOverride : autoNet;

      return {
        id: saved?.id || `draft-${emp.id}`,
        user_id: emp.id,
        month,
        year,
        employee_name: emp.name,
        employee_email: emp.email,
        avatar_url: emp.avatar_url || null,
        employee_role: emp.role,
        department_name: emp.department?.name || 'General',
        position: emp.position || 'Team Member',
        base_salary: baseSalary,
        working_days: companyWorkingDays,
        days_present: Number(daysPresent.toFixed(1)),
        approved_leave_days: Number(approvedLeaveDays.toFixed(1)),
        unpaid_leave_days: Number(unpaidLeaveDays.toFixed(1)),
        unauthorized_absences: Number(unauthorizedAbsences.toFixed(1)),
        total_hours: Number(totalHours.toFixed(1)),
        daily_rate: dailyRate,
        deduction_amount: autoDeduction,
        net_salary: autoNet,
        effective_net_salary: effectiveNet,
        admin_override: adminOverride,
        override_reason: overrideReason,
        payment_status: saved?.payment_status || fallbackStatuses.get(emp.id) || (isFinalized ? 'processing' : 'pending'),
        is_finalized: isFinalized,
        finalized_at: saved?.finalized_at || null,
      };
    });

    // Summary KPIs
    const totalBaseSalary = payrollRows.reduce((acc, r) => acc + Number(r.base_salary || 0), 0);
    const totalDeductions = payrollRows.reduce((acc, r) => acc + Number(r.deduction_amount || 0), 0);
    const totalNetSalary = payrollRows.reduce((acc, r) => acc + Number(r.effective_net_salary || 0), 0);
    const isMonthFinalized = payrollRows.length > 0 && payrollRows.every((r) => r.is_finalized);

    return NextResponse.json({
      success: true,
      month,
      year,
      working_days: companyWorkingDays,
      is_finalized: isMonthFinalized,
      summary: {
        total_employees: payrollRows.length,
        total_base_salary: totalBaseSalary,
        total_deductions: totalDeductions,
        total_net_salary: totalNetSalary,
      },
      payroll: payrollRows,
    });
  } catch (err: any) {
    console.error('Salary API GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch salary data' }, { status: 500 });
  }
}

// POST /api/admin/salary — Save/Generate Payroll run for month
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { month, year, items } = body;

    if (!month || !year || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required parameters (month, year, items)' }, { status: 400 });
    }

    const upsertPayload = items.map((item: any) => ({
      user_id: item.user_id,
      month,
      year,
      base_salary: item.base_salary || 0,
      working_days: item.working_days || 0,
      days_present: item.days_present || 0,
      approved_leave_days: item.approved_leave_days || 0,
      unpaid_leave_days: item.unpaid_leave_days || 0,
      unauthorized_absences: item.unauthorized_absences || 0,
      total_hours: item.total_hours || 0,
      daily_rate: item.daily_rate || 0,
      deduction_amount: item.deduction_amount || 0,
      net_salary: item.net_salary || 0,
      admin_override: item.admin_override !== undefined ? item.admin_override : null,
      override_reason: item.override_reason || null,
      is_finalized: item.is_finalized || false,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('monthly_payroll')
      .upsert(upsertPayload, { onConflict: 'user_id,month,year' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    console.error('Salary API POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save payroll' }, { status: 500 });
  }
}

// PUT /api/admin/salary — Update base salary or admin override
export async function PUT(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { action } = body;

    // Action 1: Set Employee Base Salary
    if (action === 'set_base_salary') {
      const { user_id, base_salary } = body;
      if (!user_id || base_salary === undefined) {
        return NextResponse.json({ error: 'Missing user_id or base_salary' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ base_salary: Number(base_salary), updated_at: new Date().toISOString() })
        .eq('id', user_id)
        .select()
        .single();

      if (error) {
        // Fallback: store in company_rules allowed_ips policy map if column is missing
        const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
        if (ruleRow) {
          const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
          const prefix = `__POLICY__:base_salary_${user_id}=`;
          const filtered = rawIps.filter((item: string) => !item.startsWith(prefix));
          filtered.push(`${prefix}${Number(base_salary)}`);
          await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
          return NextResponse.json({ success: true, base_salary: Number(base_salary), note: 'saved_to_policy' });
        }
        throw error;
      }
      return NextResponse.json({ success: true, user: data });
    }

    // Action 2: Set Admin Manual Override on a monthly payroll record
    if (action === 'override_payroll') {
      const { user_id, month, year, admin_override, override_reason, admin_id } = body;
      if (!user_id || !month || !year) {
        return NextResponse.json({ error: 'Missing user_id, month, or year' }, { status: 400 });
      }

      const overrideVal = admin_override !== null && admin_override !== '' ? Number(admin_override) : null;

      // Upsert record with the override
      const { data, error } = await supabase
        .from('monthly_payroll')
        .upsert(
          {
            user_id,
            month,
            year,
            admin_override: overrideVal,
            override_reason: overrideReasonVal(override_reason),
            overridden_by: admin_id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month,year' }
        )
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, payroll: data });
    }

    // Action 3: Update Individual Employee Payment Status (paid, processing, pending)
    if (action === 'set_payment_status') {
      const { user_id, month, year, payment_status } = body;
      if (!user_id || !month || !year || !['paid', 'processing', 'pending'].includes(payment_status)) {
        return NextResponse.json({ error: 'Invalid parameters for set_payment_status' }, { status: 400 });
      }

      try {
        await supabase
          .from('monthly_payroll')
          .upsert(
            {
              user_id,
              month,
              year,
              payment_status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,month,year' }
          );
      } catch {
        // Non-fatal if table/column pending migration
      }

      // Always persist to company_rules fallback policy for 100% reliability
      const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
      if (ruleRow) {
        const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
        const prefix = `__POLICY__:payroll_status_${year}_${month}_${user_id}=`;
        const filtered = rawIps.filter((item: string) => !item.startsWith(prefix));
        filtered.push(`${prefix}${payment_status}`);
        await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
      }

      return NextResponse.json({ success: true, user_id, payment_status });
    }

    // Action 4: Bulk Set Payment Status for All Employees in Month
    if (action === 'set_all_payment_status') {
      const { month, year, payment_status, user_ids } = body;
      if (!month || !year || !['paid', 'processing', 'pending'].includes(payment_status)) {
        return NextResponse.json({ error: 'Invalid parameters for set_all_payment_status' }, { status: 400 });
      }

      const targetIds: string[] = Array.isArray(user_ids) ? user_ids : [];

      try {
        if (targetIds.length > 0) {
          await supabase
            .from('monthly_payroll')
            .update({ payment_status, updated_at: new Date().toISOString() })
            .eq('month', month)
            .eq('year', year)
            .in('user_id', targetIds);
        }
      } catch {
        // Non-fatal
      }

      const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
      if (ruleRow) {
        const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
        const statusPrefix = `__POLICY__:payroll_status_${year}_${month}_`;
        let filtered = rawIps.filter((item: string) => {
          if (!item.startsWith(statusPrefix)) return true;
          const uId = item.replace(statusPrefix, '').split('=')[0];
          return targetIds.length > 0 ? !targetIds.includes(uId) : false;
        });
        targetIds.forEach((uid) => {
          filtered.push(`${statusPrefix}${uid}=${payment_status}`);
        });
        await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
      }

      return NextResponse.json({ success: true, payment_status, updated_count: targetIds.length });
    }

    // Action 5: Unified Update (Base Salary + Override + Payment Status)
    if (action === 'update_employee_payroll') {
      const { user_id, month, year, base_salary, admin_override, override_reason, payment_status } = body;
      if (!user_id) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
      }

      // 1. Update base_salary if provided
      if (base_salary !== undefined && !isNaN(Number(base_salary))) {
        const { error: baseErr } = await supabase
          .from('user_profiles')
          .update({ base_salary: Number(base_salary), updated_at: new Date().toISOString() })
          .eq('id', user_id);

        if (baseErr) {
          const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
          if (ruleRow) {
            const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
            const prefix = `__POLICY__:base_salary_${user_id}=`;
            const filtered = rawIps.filter((item: string) => !item.startsWith(prefix));
            filtered.push(`${prefix}${Number(base_salary)}`);
            await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
          }
        }
      }

      // 2. Update override & payment_status if month and year are provided
      if (month && year) {
        const overrideVal = admin_override !== null && admin_override !== '' && admin_override !== undefined
          ? Number(admin_override)
          : null;

        const updateData: any = {
          user_id,
          month,
          year,
          admin_override: overrideVal,
          override_reason: overrideReasonVal(override_reason),
          updated_at: new Date().toISOString(),
        };

        if (payment_status && ['paid', 'processing', 'pending'].includes(payment_status)) {
          updateData.payment_status = payment_status;
        }

        try {
          await supabase
            .from('monthly_payroll')
            .upsert(updateData, { onConflict: 'user_id,month,year' });
        } catch {
          // Non-fatal
        }

        if (payment_status && ['paid', 'processing', 'pending'].includes(payment_status)) {
          const { data: ruleRow } = await supabase.from('company_rules').select('*').limit(1).maybeSingle();
          if (ruleRow) {
            const rawIps: string[] = Array.isArray(ruleRow.allowed_ips) ? ruleRow.allowed_ips : [];
            const prefix = `__POLICY__:payroll_status_${year}_${month}_${user_id}=`;
            const filtered = rawIps.filter((item: string) => !item.startsWith(prefix));
            filtered.push(`${prefix}${payment_status}`);
            await supabase.from('company_rules').update({ allowed_ips: filtered }).eq('id', ruleRow.id);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('Salary API PUT error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update salary' }, { status: 500 });
  }
}

function overrideReasonVal(r: any) {
  return r && String(r).trim().length > 0 ? String(r).trim() : null;
}

// PATCH /api/admin/salary — Finalize or Unfinalize month
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const { month, year, action, admin_id } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Missing month or year' }, { status: 400 });
    }

    const isFinalizing = action === 'finalize';

    const { data, error } = await supabase
      .from('monthly_payroll')
      .update({
        is_finalized: isFinalizing,
        finalized_at: isFinalizing ? new Date().toISOString() : null,
        finalized_by: isFinalizing ? admin_id || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('month', month)
      .eq('year', year)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data?.length || 0, is_finalized: isFinalizing });
  } catch (err: any) {
    console.error('Salary API PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to toggle finalization' }, { status: 500 });
  }
}
