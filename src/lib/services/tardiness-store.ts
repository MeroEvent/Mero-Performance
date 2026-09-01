import { TardinessRecord } from '@/types';

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export const DEFAULT_TARDINESS_RECORDS: TardinessRecord[] = [
  {
    user_id: 'u-staff-1',
    user_name: 'Rohan Sharma (Staff)',
    month: currentMonth,
    year: currentYear,
    very_late_count: 2,
    auto_absents_applied: 0,
    last_updated: new Date().toISOString(),
  },
  {
    user_id: 'u-staff-2',
    user_name: 'Priya Kapoor',
    month: currentMonth,
    year: currentYear,
    very_late_count: 5,
    auto_absents_applied: 1,
    last_updated: new Date().toISOString(),
  },
  {
    user_id: 'u-staff-3',
    user_name: 'David Chen',
    month: currentMonth,
    year: currentYear,
    very_late_count: 1,
    auto_absents_applied: 0,
    last_updated: new Date().toISOString(),
  },
  {
    user_id: 'u-manager-1',
    user_name: 'Alex Rivera (Manager)',
    month: currentMonth,
    year: currentYear,
    very_late_count: 0,
    auto_absents_applied: 0,
    last_updated: new Date().toISOString(),
  },
  {
    user_id: 'u-admin-1',
    user_name: 'Sarah Connor (Admin)',
    month: currentMonth,
    year: currentYear,
    very_late_count: 0,
    auto_absents_applied: 0,
    last_updated: new Date().toISOString(),
  }
];

const STORAGE_KEY_TARDINESS_v1 = 'mero_tardiness_v1';

export class TardinessService {
  private static isBrowser = typeof window !== 'undefined';

  private static getAllRecords(): TardinessRecord[] {
    if (!this.isBrowser) return DEFAULT_TARDINESS_RECORDS;
    const stored = localStorage.getItem(STORAGE_KEY_TARDINESS_v1);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_TARDINESS_v1, JSON.stringify(DEFAULT_TARDINESS_RECORDS));
      return DEFAULT_TARDINESS_RECORDS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_TARDINESS_RECORDS;
    }
  }

  public static getRecords(month: number = currentMonth, year: number = currentYear): TardinessRecord[] {
    return this.getAllRecords().filter(r => r.month === month && r.year === year);
  }

  public static getUserRecord(userId: string, month: number = currentMonth, year: number = currentYear): TardinessRecord | null {
    const records = this.getRecords(month, year);
    return records.find(r => r.user_id === userId) || null;
  }

  public static incrementVeryLate(userId: string, conversionThreshold: number): TardinessRecord {
    const records = this.getAllRecords();
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    let userRecord = records.find(r => r.user_id === userId && r.month === month && r.year === year);
    
    if (!userRecord) {
      userRecord = {
        user_id: userId,
        month,
        year,
        very_late_count: 0,
        auto_absents_applied: 0,
        last_updated: new Date().toISOString(),
      };
      records.push(userRecord);
    }

    userRecord.very_late_count += 1;

    if (conversionThreshold > 0 && userRecord.very_late_count >= conversionThreshold) {
      userRecord.auto_absents_applied += 1;
      userRecord.very_late_count -= conversionThreshold;
    }

    userRecord.last_updated = new Date().toISOString();

    const updatedRecords = records.map(r => 
      (r.user_id === userId && r.month === month && r.year === year) ? userRecord! : r
    );

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_TARDINESS_v1, JSON.stringify(updatedRecords));
    }

    return userRecord;
  }

  public static resetMonthlyRecords(): void {
    const records = this.getAllRecords();
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    
    const newMonth = nextMonthDate.getMonth() + 1;
    const newYear = nextMonthDate.getFullYear();

    // Create new records for the next month based on existing users, zeroing out counts
    const userIds = Array.from(new Set(records.map(r => r.user_id)));
    const newRecords: TardinessRecord[] = userIds.map(userId => {
      const lastRecord = records.find(r => r.user_id === userId);
      return {
        user_id: userId,
        user_name: lastRecord?.user_name,
        month: newMonth,
        year: newYear,
        very_late_count: 0,
        auto_absents_applied: 0,
        last_updated: new Date().toISOString(),
      };
    });

    const updatedRecords = [...records, ...newRecords];

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_TARDINESS_v1, JSON.stringify(updatedRecords));
    }
  }

  public static getCompanyTardinessStats(): { totalVeryLates: number, totalAutoAbsents: number, employeesWithTardiness: number } {
    const records = this.getRecords(new Date().getMonth() + 1, new Date().getFullYear());
    
    let totalVeryLates = 0;
    let totalAutoAbsents = 0;
    let employeesWithTardiness = 0;

    records.forEach(r => {
      totalVeryLates += r.very_late_count;
      totalAutoAbsents += r.auto_absents_applied;
      if (r.very_late_count > 0 || r.auto_absents_applied > 0) {
        employeesWithTardiness++;
      }
    });

    return {
      totalVeryLates,
      totalAutoAbsents,
      employeesWithTardiness
    };
  }
}
