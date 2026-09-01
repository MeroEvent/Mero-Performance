# 📘 Usage Guide: New Modular Database Services

## Quick Reference

### Import the Services

```typescript
import {
  userService,
  attendanceService,
  companyRulesService,
} from "@/lib/services/database";
```

---

## 👤 User Service

### Get All Users

```typescript
const users = await userService.getAll();
// Returns: UserProfile[]
```

### Get User by ID

```typescript
const user = await userService.getById("user-uuid");
// Returns: UserProfile | null
```

### Update User

```typescript
const updated = await userService.update("user-uuid", {
  name: "New Name",
  position: "Senior Developer",
  phone: "+1234567890",
});
// Returns: UserProfile | null
```

### Toggle User Active Status

```typescript
const success = await userService.toggleActive("user-uuid");
// Returns: boolean
```

---

## 📊 Attendance Service

### Get Attendance Records

```typescript
// Get all records
const all = await attendanceService.getRecords();

// Get records for specific user
const userRecords = await attendanceService.getRecords({
  userId: "user-uuid",
});

// Get records with date range
const rangeRecords = await attendanceService.getRecords({
  userId: "user-uuid",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
});

// Get recent records (limit)
const recent = await attendanceService.getRecords({
  companyId: "company-uuid",
  limit: 10,
});
```

### Get Today's Record

```typescript
const todayRecord = await attendanceService.getTodayRecord("user-uuid");
// Returns: AttendanceRecord | null
```

### Check In

```typescript
try {
  const record = await attendanceService.checkIn(
    "user-uuid", // userId
    "company-uuid", // companyId
    "Chrome Browser", // deviceInfo (optional)
    "192.168.1.1", // ipAddress (optional)
    { lat: 27.7172, lng: 85.324 }, // location (optional)
  );

  console.log("Checked in:", record);
} catch (error) {
  console.error("Check-in failed:", error.message);
}
```

### Check Out

```typescript
try {
  const record = await attendanceService.checkOut("user-uuid");
  console.log("Checked out. Total hours:", record.total_hours);
} catch (error) {
  console.error("Check-out failed:", error.message);
}
```

### Get Employee Stats

```typescript
const stats = await attendanceService.getEmployeeStats("user-uuid");
// Returns: AttendanceSummaryStats
// {
//   daysPresent: 20,
//   daysAbsent: 2,
//   daysLate: 3,
//   totalHoursWorked: 165.5,
//   attendancePercentage: 91
// }
```

### Get Admin Stats

```typescript
const stats = await attendanceService.getAdminStats("company-uuid");
// Returns: AdminOverviewStats
// {
//   totalEmployees: 50,
//   currentlyCheckedIn: 42,
//   absentToday: 8,
//   lateToday: 5,
//   attendanceRate: 84
// }
```

---

## ⚙️ Company Rules Service

### Get Company Rules

```typescript
const rules = await companyRulesService.get("company-uuid");
// Returns: CompanyRules | null
```

### Update Company Rules

```typescript
const updated = await companyRulesService.update("company-uuid", {
  standard_start_time: "08:00:00",
  grace_period_minutes: 15,
  late_threshold_minutes: 30,
});
// Returns: CompanyRules | null
```

---

## 💡 Common Patterns

### Pattern 1: Load Data in useEffect

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { attendanceService } from '@/lib/services/database';

export default function MyComponent() {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile?.id) return;

      setIsLoading(true);
      const data = await attendanceService.getRecords({
        userId: profile.id,
      });
      setRecords(data);
      setIsLoading(false);
    }

    loadData();
  }, [profile?.id]);

  if (isLoading) return <div>Loading...</div>;

  return <div>{/* Render data */}</div>;
}
```

### Pattern 2: Handle Actions with Error Handling

```typescript
const handleCheckIn = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const record = await attendanceService.checkIn(
      profile.id,
      profile.company_id,
      "Browser",
    );

    setSuccess("Checked in successfully!");
    // Refresh data
    await loadData();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Pattern 3: Server Component (Direct Query)

```typescript
// app/admin/page.tsx
import { attendanceService } from '@/lib/services/database';

export default async function AdminPage() {
  // Direct server-side query
  const stats = await attendanceService.getAdminStats('company-uuid');

  return (
    <div>
      <h1>Total Employees: {stats.totalEmployees}</h1>
    </div>
  );
}
```

---

## 🔄 Migration Examples

### Example 1: Admin Dashboard

**Before (localStorage):**

```typescript
const [stats, setStats] = useState(() => AttendanceService.getAdminStats());
```

**After (Supabase):**

```typescript
const { profile } = useAuth();
const [stats, setStats] = useState(null);

useEffect(() => {
  async function load() {
    if (!profile?.company_id) return;
    const data = await attendanceService.getAdminStats(profile.company_id);
    setStats(data);
  }
  load();
}, [profile?.company_id]);
```

### Example 2: Check-In Widget

**Before (localStorage):**

```typescript
const handleCheckIn = async () => {
  const newRec = AttendanceService.checkIn(user.id, "Chrome");
  setTodayRecord(newRec);
};
```

**After (Supabase):**

```typescript
const handleCheckIn = async () => {
  try {
    const newRec = await attendanceService.checkIn(
      user.id,
      user.company_id,
      "Chrome",
    );
    setTodayRecord(newRec);
  } catch (error) {
    alert(error.message);
  }
};
```

### Example 3: Employee List

**Before (localStorage):**

```typescript
const loadUsers = () => {
  setUsers(AttendanceService.getUsers());
};
```

**After (Supabase):**

```typescript
const loadUsers = async () => {
  setIsLoading(true);
  const data = await userService.getAll();
  setUsers(data);
  setIsLoading(false);
};
```

---

## ⚡ Performance Tips

### 1. Use Filters to Reduce Data

```typescript
// ❌ Bad: Load all records then filter in JS
const all = await attendanceService.getRecords();
const filtered = all.filter((r) => r.user_id === userId);

// ✅ Good: Filter in database
const filtered = await attendanceService.getRecords({ userId });
```

### 2. Limit Results When Possible

```typescript
// ✅ Only load what you need
const recent = await attendanceService.getRecords({
  userId,
  limit: 10,
});
```

### 3. Cache Data When Appropriate

```typescript
// Cache company rules (they change rarely)
let rulesCache = null;

async function getRules(companyId) {
  if (!rulesCache) {
    rulesCache = await companyRulesService.get(companyId);
  }
  return rulesCache;
}
```

---

## 🐛 Error Handling

### Always Use Try-Catch

```typescript
async function saveData() {
  try {
    const result = await userService.update(userId, updates);
    if (!result) {
      throw new Error("Update failed");
    }
    return result;
  } catch (error) {
    console.error("Error saving:", error);
    // Show error to user
    toast.error(error.message);
    return null;
  }
}
```

### Check for Null Results

```typescript
const user = await userService.getById(userId);

if (!user) {
  // Handle missing user
  return <div>User not found</div>;
}

// Safe to use user
return <div>{user.name}</div>;
```

---

## 🎯 Best Practices

1. ✅ **Always use async/await** with these services
2. ✅ **Check for null** before using results
3. ✅ **Add loading states** for better UX
4. ✅ **Handle errors gracefully** with try-catch
5. ✅ **Use filters** to reduce database load
6. ✅ **Get user from auth context** (`useAuth()`)
7. ✅ **Refresh data after mutations** (create/update/delete)
8. ✅ **Show success/error messages** to users

---

## 📚 Type Reference

### UserProfile

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff";
  company_id?: string;
  department_id?: string;
  department_name?: string;
  manager_id?: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
  join_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### AttendanceRecord

```typescript
interface AttendanceRecord {
  id: string;
  company_id?: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  status: AttendanceStatus;
  device_info?: string;
  ip_address?: string;
  location_lat?: number;
  location_lng?: number;
  user_name?: string;
  user_email?: string;
  department_name?: string;
  created_at: string;
  updated_at: string;
}
```

### CompanyRules

```typescript
interface CompanyRules {
  id: string;
  company_id: string;
  standard_start_time: string;
  standard_end_time: string;
  standard_daily_hours: number;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  very_late_threshold_minutes: number;
  minimum_hours_full_day: number;
  minimum_hours_half_day: number;
  work_days: number[];
  created_at: string;
  updated_at: string;
}
```

---

## 🚀 Ready to Use!

Your new modular database services are ready to use throughout your application. Replace localStorage calls with these clean, type-safe Supabase queries.

**Happy coding!** 🎉
