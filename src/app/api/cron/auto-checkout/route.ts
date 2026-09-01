import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateHoursWorked, getNepalDateString, getNepalTimeString } from '@/lib/utils/attendance';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(req: NextRequest) {
  return handleAutoCheckout();
}

export async function POST(req: NextRequest) {
  return handleAutoCheckout();
}

async function handleAutoCheckout() {
  try {
    const supabase = getAdminSupabase();
    const now = new Date();
    const currentNepalDate = getNepalDateString(now);
    const currentNepalTime = getNepalTimeString(now);

    // Fetch all active open attendance records
    const { data: openRecords, error: fetchErr } = await supabase
      .from('attendance_records')
      .select(`
        *,
        user:user_profiles (
          id,
          name,
          email,
          shift:shifts (*)
        )
      `)
      .not('check_in_time', 'is', null)
      .is('check_out_time', null);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!openRecords || openRecords.length === 0) {
      return NextResponse.json({
        message: 'No open check-in sessions to auto-checkout.',
        processedCount: 0,
      });
    }

    const processed: any[] = [];

    for (const record of openRecords) {
      const shift = record.user?.shift;
      const isFlexible = shift?.is_flexible || shift?.allow_remote_checkin || !shift?.end_time;
      const checkInDate = new Date(record.check_in_time);
      const elapsedMs = now.getTime() - checkInDate.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      let shouldAutoCheckout = false;
      let autoCheckoutTime: Date = now;
      let reason = '';

      if (isFlexible) {
        // Flexible shift: Auto-checkout if elapsed > 8 hours
        if (elapsedHours >= 8) {
          shouldAutoCheckout = true;
          autoCheckoutTime = new Date(checkInDate.getTime() + 8 * 60 * 60 * 1000);
          reason = 'Auto-checkout: 8-hour flexible quota elapsed without checkout. Marked absent for admin review.';
        }
      } else {
        // Fixed shift: Check if current time has passed shift end time
        const shiftEndTimeStr = shift?.end_time || '18:00:00';
        const isPastDay = record.date < currentNepalDate;
        const isPastEndTime = isPastDay || currentNepalTime >= shiftEndTimeStr;

        if (isPastEndTime && elapsedHours >= 4) {
          shouldAutoCheckout = true;
          // Calculate shift end timestamp on that day
          const [endH, endM] = shiftEndTimeStr.split(':').map(Number);
          const endTimestamp = new Date(record.date + 'T' + (endH < 10 ? '0' + endH : endH) + ':' + (endM < 10 ? '0' + endM : endM) + ':00+05:45');
          autoCheckoutTime = isNaN(endTimestamp.getTime()) ? now : endTimestamp;
          reason = `Auto-checkout: Exceeded shift end time (${shiftEndTimeStr.slice(0, 5)}). Marked absent for admin review.`;
        }
      }

      if (shouldAutoCheckout) {
        const totalHours = calculateHoursWorked(record.check_in_time, autoCheckoutTime);
        const updatedNotes = [record.notes, reason].filter(Boolean).join(' | ');

        const { data: updated, error: updErr } = await supabase
          .from('attendance_records')
          .update({
            check_out_time: autoCheckoutTime.toISOString(),
            total_hours: totalHours,
            status: 'absent', // Marked absent due to forgotten checkout, pending admin review
            notes: updatedNotes,
            updated_at: now.toISOString(),
          })
          .eq('id', record.id)
          .select()
          .single();

        if (!updErr && updated) {
          processed.push({
            recordId: record.id,
            userName: record.user?.name,
            checkIn: record.check_in_time,
            autoCheckOut: autoCheckoutTime.toISOString(),
            totalHours,
            reason,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processed.length,
      processed,
    });
  } catch (err: any) {
    console.error('Auto-checkout cron error:', err);
    return NextResponse.json({ error: err.message || 'Auto-checkout failed' }, { status: 500 });
  }
}
