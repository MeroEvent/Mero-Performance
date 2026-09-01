import { AuditLogEntry } from '@/types';

export const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-1',
    entity_type: 'attendance',
    entity_id: 'att-u-staff-1-2026-08-16',
    action: 'update',
    changed_by: 'u-manager-1',
    changed_by_name: 'Alex Rivera (Manager)',
    old_value: JSON.stringify({ status: 'late' }),
    new_value: JSON.stringify({ status: 'on_time' }),
    reason: 'Approved late arrival due to client meeting',
    created_at: '2026-08-16T10:30:00Z',
  },
  {
    id: 'audit-2',
    entity_type: 'leave',
    entity_id: 'lv-123',
    action: 'update',
    changed_by: 'u-admin-1',
    changed_by_name: 'Sarah Connor (Admin)',
    old_value: JSON.stringify({ status: 'pending' }),
    new_value: JSON.stringify({ status: 'approved' }),
    reason: 'Leave request approved',
    created_at: '2026-08-15T14:20:00Z',
  },
  {
    id: 'audit-3',
    entity_type: 'rules',
    entity_id: 'rule-001',
    action: 'update',
    changed_by: 'u-admin-1',
    changed_by_name: 'Sarah Connor (Admin)',
    old_value: JSON.stringify({ grace_period_minutes: 10 }),
    new_value: JSON.stringify({ grace_period_minutes: 15 }),
    reason: 'Updated company grace period policy',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'audit-4',
    entity_type: 'user',
    entity_id: 'u-staff-2',
    action: 'update',
    changed_by: 'u-manager-1',
    changed_by_name: 'Alex Rivera (Manager)',
    old_value: JSON.stringify({ position: 'Backend Developer' }),
    new_value: JSON.stringify({ position: 'Backend Specialist' }),
    reason: 'Title promotion',
    created_at: '2026-08-01T11:00:00Z',
  }
];

const STORAGE_KEY_AUDIT_LOGS_v1 = 'mero_audit_logs_v1';

export class AuditService {
  private static isBrowser = typeof window !== 'undefined';

  private static getAllLogs(): AuditLogEntry[] {
    if (!this.isBrowser) return DEFAULT_AUDIT_LOGS;
    const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS_v1);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS_v1, JSON.stringify(DEFAULT_AUDIT_LOGS));
      return DEFAULT_AUDIT_LOGS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_AUDIT_LOGS;
    }
  }

  public static getLogs(filters?: { entity_type?: string, entity_id?: string, changed_by?: string }): AuditLogEntry[] {
    let logs = this.getAllLogs();

    if (filters) {
      if (filters.entity_type) {
        logs = logs.filter(log => log.entity_type === filters.entity_type);
      }
      if (filters.entity_id) {
        logs = logs.filter(log => log.entity_id === filters.entity_id);
      }
      if (filters.changed_by) {
        logs = logs.filter(log => log.changed_by === filters.changed_by);
      }
    }

    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public static getLogsForEntity(entityType: string, entityId: string): AuditLogEntry[] {
    return this.getLogs({ entity_type: entityType, entity_id: entityId });
  }

  public static addLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): AuditLogEntry {
    const logs = this.getAllLogs();
    const newLog: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS_v1, JSON.stringify(updatedLogs));
    }

    return newLog;
  }
}
