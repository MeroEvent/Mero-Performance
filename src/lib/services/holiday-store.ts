import { Holiday } from '@/types';

export const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: 'h-1', name: 'New Year', date: '2026-01-01', description: 'English New Year', is_recurring: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-2', name: 'Makar Sankranti / Maghe Sankranti', date: '2026-01-14', description: 'Winter solstice festival', is_recurring: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-3', name: 'Maha Shivaratri', date: '2026-02-14', description: 'Hindu festival celebrated annually in honour of the god Shiva', is_recurring: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-4', name: 'Holi', date: '2026-03-03', description: 'Festival of Colors', is_recurring: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-5', name: 'Nepali New Year', date: '2026-04-14', description: 'Bisket Jatra / Nepali New Year', is_recurring: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-6', name: 'Buddha Jayanti', date: '2026-05-01', description: 'Birth of Lord Buddha', is_recurring: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-7', name: 'Dashain (Phulpati)', date: '2026-10-18', description: 'Major Hindu festival in Nepal', is_recurring: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-8', name: 'Dashain (Vijaya Dashami)', date: '2026-10-21', description: 'Main day of Dashain', is_recurring: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-9', name: 'Tihar (Bhai Tika)', date: '2026-11-10', description: 'Festival of Lights', is_recurring: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 'h-10', name: 'Christmas Day', date: '2026-12-25', description: 'Christmas', is_recurring: true, created_at: '2026-01-01T00:00:00Z' },
];

const STORAGE_KEY_HOLIDAYS = 'mero_holidays_v1';

export class HolidayService {
  private static isBrowser = typeof window !== 'undefined';

  public static getHolidays(): Holiday[] {
    let holidays = DEFAULT_HOLIDAYS;
    if (this.isBrowser) {
      const stored = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
      if (stored) {
        try {
          holidays = JSON.parse(stored);
        } catch {
          holidays = DEFAULT_HOLIDAYS;
        }
      } else {
        localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(DEFAULT_HOLIDAYS));
      }
    }
    // Return sorted by date
    return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  public static addHoliday(holiday: Omit<Holiday, 'id' | 'created_at'>): Holiday {
    const holidays = this.getHolidays();
    const newHoliday: Holiday = {
      ...holiday,
      id: `h-gen-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    
    const updatedHolidays = [...holidays, newHoliday];
    
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(updatedHolidays));
    }
    
    return newHoliday;
  }

  public static updateHoliday(id: string, updates: Partial<Holiday>): Holiday {
    const holidays = this.getHolidays();
    const index = holidays.findIndex(h => h.id === id);
    if (index === -1) throw new Error('Holiday not found');

    const updatedHoliday = { ...holidays[index], ...updates };
    holidays[index] = updatedHoliday;

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(holidays));
    }

    return updatedHoliday;
  }

  public static deleteHoliday(id: string): void {
    const holidays = this.getHolidays();
    const updatedHolidays = holidays.filter(h => h.id !== id);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(updatedHolidays));
    }
  }

  public static isHoliday(dateStr: string): Holiday | null {
    const holidays = this.getHolidays();
    return holidays.find(h => h.date === dateStr) || null;
  }

  public static getHolidaysInRange(startDate: string, endDate: string): Holiday[] {
    const holidays = this.getHolidays();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return holidays.filter(h => {
      const hDate = new Date(h.date).getTime();
      return hDate >= start && hDate <= end;
    });
  }

  public static getUpcomingHolidays(limit: number = 5): Holiday[] {
    const holidays = this.getHolidays();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const upcoming = holidays.filter(h => h.date >= todayStr);
    return upcoming.slice(0, limit);
  }
}
