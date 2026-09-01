import { LeaveTypeConfig, LeaveBalance, LeaveRequest, LeaveStatus } from '@/types';
import { AttendanceService } from './attendance-store';

export const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: 'lt-1', type: 'sick', label: 'Sick Leave', description: 'For medical reasons', annual_quota: 12, is_active: true, color: 'rose' },
  { id: 'lt-2', type: 'casual', label: 'Casual Leave', description: 'For personal matters', annual_quota: 10, is_active: true, color: 'amber' },
  { id: 'lt-3', type: 'vacation', label: 'Vacation', description: 'Annual paid time off', annual_quota: 15, is_active: true, color: 'blue' },
  { id: 'lt-4', type: 'unpaid', label: 'Unpaid Leave', description: 'Leave without pay', annual_quota: 99, is_active: true, color: 'slate' },
  { id: 'lt-5', type: 'wfh', label: 'Work From Home', description: 'Remote work allowance', annual_quota: 24, is_active: true, color: 'indigo' },
  { id: 'lt-6', type: 'comp_off', label: 'Compensatory Off', description: 'For extra days worked', annual_quota: 5, is_active: true, color: 'teal' },
];

const currentYear = new Date().getFullYear();

const generateDefaultBalances = (): LeaveBalance[] => {
  const users = ['u-admin-1', 'u-manager-1', 'u-staff-1', 'u-staff-2', 'u-staff-3'];
  const balances: LeaveBalance[] = [];

  users.forEach((userId) => {
    DEFAULT_LEAVE_TYPES.forEach((type) => {
      let used = 0;
      if (userId === 'u-staff-1' && type.type === 'sick') used = 2;
      if (userId === 'u-staff-1' && type.type === 'casual') used = 1;
      if (userId === 'u-staff-2' && type.type === 'vacation') used = 3;

      balances.push({
        user_id: userId,
        leave_type: type.type,
        total_quota: type.annual_quota,
        used,
        remaining: type.annual_quota - used,
        year: currentYear,
      });
    });
  });

  return balances;
};

export const DEFAULT_LEAVE_BALANCES = generateDefaultBalances();

export const DEFAULT_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr-1',
    user_id: 'u-staff-1',
    user_name: 'Rohan Sharma (Staff)',
    leave_type: 'sick',
    start_date: '2026-08-01',
    end_date: '2026-08-02',
    total_days: 2,
    reason: 'Fever and cold',
    status: 'approved',
    reviewer_id: 'u-manager-1',
    reviewer_name: 'Alex Rivera (Manager)',
    reviewed_at: '2026-07-30T10:00:00Z',
    created_at: '2026-07-29T09:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
  },
  {
    id: 'lr-2',
    user_id: 'u-staff-2',
    user_name: 'Priya Kapoor',
    leave_type: 'vacation',
    start_date: '2026-08-10',
    end_date: '2026-08-12',
    total_days: 3,
    reason: 'Family trip',
    status: 'approved',
    reviewer_id: 'u-manager-1',
    reviewer_name: 'Alex Rivera (Manager)',
    reviewed_at: '2026-08-05T14:30:00Z',
    created_at: '2026-08-01T11:00:00Z',
    updated_at: '2026-08-05T14:30:00Z',
  },
  {
    id: 'lr-3',
    user_id: 'u-staff-3',
    user_name: 'David Chen',
    leave_type: 'casual',
    start_date: '2026-08-25',
    end_date: '2026-08-25',
    total_days: 1,
    reason: 'Personal errands',
    status: 'pending',
    created_at: '2026-08-15T09:15:00Z',
    updated_at: '2026-08-15T09:15:00Z',
  },
  {
    id: 'lr-4',
    user_id: 'u-staff-2',
    user_name: 'Priya Kapoor',
    leave_type: 'sick',
    start_date: '2026-08-20',
    end_date: '2026-08-20',
    total_days: 1,
    reason: 'Doctor appointment',
    status: 'pending',
    created_at: '2026-08-16T10:00:00Z',
    updated_at: '2026-08-16T10:00:00Z',
  },
  {
    id: 'lr-5',
    user_id: 'u-staff-1',
    user_name: 'Rohan Sharma (Staff)',
    leave_type: 'casual',
    start_date: '2026-07-15',
    end_date: '2026-07-15',
    total_days: 1,
    reason: 'Attending a wedding',
    status: 'rejected',
    reviewer_id: 'u-manager-1',
    reviewer_name: 'Alex Rivera (Manager)',
    reviewer_comment: 'Project deadline on this day. Cannot approve.',
    reviewed_at: '2026-07-10T16:00:00Z',
    created_at: '2026-07-08T14:00:00Z',
    updated_at: '2026-07-10T16:00:00Z',
  }
];

const STORAGE_KEY_LEAVE_TYPES = 'mero_leave_types_v1';
const STORAGE_KEY_LEAVE_BALANCES = 'mero_leave_balances_v1';
const STORAGE_KEY_LEAVE_REQUESTS = 'mero_leave_requests_v1';

export class LeaveService {
  private static isBrowser = typeof window !== 'undefined';

  public static getLeaveTypes(): LeaveTypeConfig[] {
    if (!this.isBrowser) return DEFAULT_LEAVE_TYPES;
    const stored = localStorage.getItem(STORAGE_KEY_LEAVE_TYPES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_LEAVE_TYPES, JSON.stringify(DEFAULT_LEAVE_TYPES));
      return DEFAULT_LEAVE_TYPES;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_LEAVE_TYPES;
    }
  }

  public static getLeaveBalances(userId: string): LeaveBalance[] {
    const balances = this.getAllLeaveBalances();
    return balances.filter(b => b.user_id === userId);
  }

  private static getAllLeaveBalances(): LeaveBalance[] {
    if (!this.isBrowser) return DEFAULT_LEAVE_BALANCES;
    const stored = localStorage.getItem(STORAGE_KEY_LEAVE_BALANCES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_LEAVE_BALANCES, JSON.stringify(DEFAULT_LEAVE_BALANCES));
      return DEFAULT_LEAVE_BALANCES;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_LEAVE_BALANCES;
    }
  }

  public static getLeaveRequests(userId?: string): LeaveRequest[] {
    let requests = DEFAULT_LEAVE_REQUESTS;
    if (this.isBrowser) {
      const stored = localStorage.getItem(STORAGE_KEY_LEAVE_REQUESTS);
      if (stored) {
        try {
          requests = JSON.parse(stored);
        } catch {
          requests = DEFAULT_LEAVE_REQUESTS;
        }
      } else {
        localStorage.setItem(STORAGE_KEY_LEAVE_REQUESTS, JSON.stringify(DEFAULT_LEAVE_REQUESTS));
      }
    }
    if (userId) {
      return requests.filter(r => r.user_id === userId);
    }
    return requests;
  }

  public static getPendingRequests(managerId: string): LeaveRequest[] {
    const users = AttendanceService.getUsers();
    const teamMembers = users.filter(u => u.manager_id === managerId).map(u => u.id);
    const requests = this.getLeaveRequests();
    return requests.filter(r => r.status === 'pending' && teamMembers.includes(r.user_id));
  }

  public static submitLeaveRequest(
    requestData: Omit<LeaveRequest, 'id' | 'status' | 'reviewer_id' | 'reviewer_name' | 'reviewer_comment' | 'reviewed_at' | 'created_at' | 'updated_at'>
  ): LeaveRequest {
    const requests = this.getLeaveRequests();
    const now = new Date().toISOString();
    
    const newRequest: LeaveRequest = {
      ...requestData,
      id: `lr-gen-${Date.now()}`,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    const updatedRequests = [newRequest, ...requests];

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_LEAVE_REQUESTS, JSON.stringify(updatedRequests));
      
      // Update balance
      const balances = this.getAllLeaveBalances();
      const updatedBalances = balances.map(b => {
        if (b.user_id === newRequest.user_id && b.leave_type === newRequest.leave_type) {
          return {
            ...b,
            used: b.used + newRequest.total_days,
            remaining: b.remaining - newRequest.total_days
          };
        }
        return b;
      });
      localStorage.setItem(STORAGE_KEY_LEAVE_BALANCES, JSON.stringify(updatedBalances));
    }

    return newRequest;
  }

  public static reviewLeaveRequest(
    requestId: string, 
    reviewerId: string, 
    action: 'approved' | 'rejected', 
    comment?: string
  ): LeaveRequest {
    const requests = this.getLeaveRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) throw new Error('Request not found');
    
    const request = requests[requestIndex];
    const reviewers = AttendanceService.getUsers();
    const reviewer = reviewers.find(u => u.id === reviewerId);
    const now = new Date().toISOString();

    const updatedRequest: LeaveRequest = {
      ...request,
      status: action,
      reviewer_id: reviewerId,
      reviewer_name: reviewer?.name,
      reviewer_comment: comment,
      reviewed_at: now,
      updated_at: now,
    };

    requests[requestIndex] = updatedRequest;

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_LEAVE_REQUESTS, JSON.stringify(requests));
      
      if (action === 'rejected') {
        const balances = this.getAllLeaveBalances();
        const updatedBalances = balances.map(b => {
          if (b.user_id === request.user_id && b.leave_type === request.leave_type) {
            return {
              ...b,
              used: Math.max(0, b.used - request.total_days),
              remaining: b.remaining + request.total_days
            };
          }
          return b;
        });
        localStorage.setItem(STORAGE_KEY_LEAVE_BALANCES, JSON.stringify(updatedBalances));
      }
    }

    return updatedRequest;
  }

  public static cancelLeaveRequest(requestId: string): LeaveRequest {
    const requests = this.getLeaveRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) throw new Error('Request not found');
    
    const request = requests[requestIndex];
    const now = new Date().toISOString();

    const updatedRequest: LeaveRequest = {
      ...request,
      status: 'cancelled',
      updated_at: now,
    };

    requests[requestIndex] = updatedRequest;

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_LEAVE_REQUESTS, JSON.stringify(requests));
      
      // If it wasn't already rejected, restore balance
      if (request.status !== 'rejected') {
        const balances = this.getAllLeaveBalances();
        const updatedBalances = balances.map(b => {
          if (b.user_id === request.user_id && b.leave_type === request.leave_type) {
            return {
              ...b,
              used: Math.max(0, b.used - request.total_days),
              remaining: b.remaining + request.total_days
            };
          }
          return b;
        });
        localStorage.setItem(STORAGE_KEY_LEAVE_BALANCES, JSON.stringify(updatedBalances));
      }
    }

    return updatedRequest;
  }

  public static getTeamLeaveCalendar(managerId: string): LeaveRequest[] {
    const users = AttendanceService.getUsers();
    const teamMembers = users.filter(u => u.manager_id === managerId).map(u => u.id);
    const requests = this.getLeaveRequests();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return requests.filter(r => {
      if (r.status !== 'approved' || !teamMembers.includes(r.user_id)) return false;
      
      const startDate = new Date(r.start_date);
      const endDate = new Date(r.end_date);
      
      const startsInMonth = startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
      const endsInMonth = endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear;
      
      return startsInMonth || endsInMonth;
    });
  }
}
