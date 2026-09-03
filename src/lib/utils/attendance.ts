import { AttendanceStatus } from '@/types';

/**
 * Gets the current date string (YYYY-MM-DD) in Nepal Timezone (Asia/Kathmandu: UTC+5:45).
 */
export function getNepalDateString(dateVal: Date | string = new Date()): string {
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Gets the current time string (HH:mm:ss) in Nepal Timezone (Asia/Kathmandu: UTC+5:45).
 */
export function getNepalTimeString(dateVal: Date | string = new Date()): string {
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(d);
}

/**
 * Calculates check-in status (on_time, late, very_late) based on standard start time and rules.
 * Standard start time format: "09:00:00" or "09:00"
 * If employee has a flexible shift (isFlexible = true), check-in is always marked on_time.
 */
export function calculateCheckInStatus(
  checkInDate: Date,
  standardStartTimeStr: string = '09:00:00',
  gracePeriodMinutes: number = 15,
  lateThresholdMinutes: number = 30,
  isFlexible: boolean = false
): AttendanceStatus {
  if (isFlexible) {
    return 'on_time';
  }

  // Parse shift start time (HH:mm)
  const [targetHour, targetMinute] = (standardStartTimeStr || '09:00:00')
    .split(':')
    .map(Number);
  const targetTotalMinutes = (targetHour || 9) * 60 + (targetMinute || 0);

  // Get check-in time in Nepal timezone
  const nepalTimeStr = getNepalTimeString(checkInDate);
  const [actualHour, actualMinute] = nepalTimeStr.split(':').map(Number);
  const actualTotalMinutes = (actualHour || 0) * 60 + (actualMinute || 0);

  const diffMinutes = actualTotalMinutes - targetTotalMinutes;

  if (diffMinutes <= gracePeriodMinutes) {
    return 'on_time';
  } else if (diffMinutes <= lateThresholdMinutes) {
    return 'late';
  } else {
    return 'very_late';
  }
}

/**
 * Evaluates workday completion on checkout based on total hours worked.
 */
export function evaluateWorkdayStatus(
  hoursWorked: number,
  minFullDay: number = 7,
  minHalfDay: number = 4
): 'full_day' | 'half_day' | 'absent' {
  if (hoursWorked >= minFullDay) return 'full_day';
  if (hoursWorked >= minHalfDay) return 'half_day';
  return 'absent';
}

/**
 * Calculates total hours worked between check-in and check-out.
 */
export function calculateHoursWorked(
  checkInTime: string | Date,
  checkOutTime: string | Date
): number {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return 0;
  
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Calculates number of working days between two dates (excluding Saturday / weekend).
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  weekendDays: number[] = [6] // Saturday is default in Nepal
): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 1;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0=Sunday, 6=Saturday
    if (!weekendDays.includes(dayOfWeek)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return Math.max(1, count);
}

/**
 * Formats duration in seconds into HH:MM:SS format for live timer.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * Formats a Date or ISO string into readable 12-hour time (e.g. 09:15 AM).
 */
export function formatTime(timeVal: string | Date | null | undefined): string {
  if (!timeVal) return '--:--';
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return '--:--';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats date into readable string (e.g., Aug 17, 2026).
 */
export function formatDateDisplay(dateVal: string | Date): string {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns color tokens and human label for an attendance status.
 */
export function getStatusBadge(status: AttendanceStatus | string) {
  switch (status) {
    case 'on_time':
    case 'present':
      return {
        bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        dot: 'bg-emerald-500',
        label: 'Present',
      };
    case 'late':
    case 'very_late':
      return {
        bg: 'bg-amber-50/80 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800/50',
        dot: 'bg-amber-500',
        label: 'Late',
      };
    case 'half_day':
      return {
        bg: 'bg-slate-50 dark:bg-slate-850',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-750',
        dot: 'bg-slate-500',
        label: 'Half Day',
      };
    case 'absent':
      return {
        bg: 'bg-rose-50/80 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800/50',
        dot: 'bg-rose-500',
        label: 'Absent',
      };
    case 'on_leave':
    case 'leave':
      return {
        bg: 'bg-slate-50 dark:bg-slate-850',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-750',
        dot: 'bg-slate-400',
        label: 'On Leave',
      };
    case 'holiday':
      return {
        bg: 'bg-slate-50 dark:bg-slate-850',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-750',
        dot: 'bg-slate-400',
        label: 'Holiday',
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
        label: 'Unknown',
      };
  }
}
