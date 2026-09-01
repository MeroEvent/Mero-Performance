# Phase 1: MVP — Task Breakdown

> **Goal:** Deliver a working attendance system where employees can check in/out, view their own attendance, and admins can manage employees and see basic reports.

---

## 1. Project Setup & Infrastructure

- [x] Initialize Next.js 14+ project (App Router, TypeScript)
- [x] Configure Tailwind CSS + UI components
- [x] Set up Supabase project (database, auth)
- [x] Configure environment variables (.env.local)
- [x] Set up project folder structure (app/, components/, lib/, types/, utils/)
- [x] Configure ESLint, Prettier
- [x] Set up Vercel deployment pipeline
- [x] Create shared layout (sidebar, header, responsive shell)

---

## 2. Database Schema (Phase 1 tables)

- [x] `companies` — company details, basic settings (start time, end time, standard hours)
- [x] `departments` — department name, company_id
- [x] `users` — name, email, role (admin/manager/staff), department_id, manager_id, join_date, is_active
- [x] `attendance_records` — user_id, date, check_in_time, check_out_time, total_hours, status (on_time/late/absent), device_info
- [x] `company_rules` — working hours, grace period, late threshold (basic config only)
- [x] Set up Row Level Security (RLS) policies for each table
- [x] Create database seed script (demo company, admin user, sample employees)

---

## 3. Authentication & Authorization

- [x] Supabase Auth setup (email/password)
- [x] Sign-up page (admin creates first account → becomes admin)
- [x] Login page
- [x] Password reset (forgot password flow)
- [x] Auth middleware — protect all routes, redirect unauthenticated users
- [x] Role-based route guards (admin, manager, staff)
- [x] Session management (persist login, auto-refresh tokens)
- [x] Logout functionality

---

## 4. Employee Check-In / Check-Out

- [x] Large, prominent "Check In" button on employee dashboard
- [x] "Check Out" button (replaces check-in after checking in)
- [x] Automatic timestamp capture on tap
- [x] Visual status indicator — "You are checked in since 9:02 AM"
- [x] Live session duration timer (hours:minutes since check-in)
- [x] Prevent double check-in (cannot check in if already checked in)
- [x] Success confirmation toast/message after action
- [x] Auto-calculate status on check-in (On Time / Late) based on company rules
- [x] Auto-calculate total hours on check-out
- [x] Store device info with each record

---

## 5. Employee Portal

### 5.1 Dashboard
- [x] Today's attendance status card (checked in/out, hours worked)
- [x] This month's summary stats:
  - Days present
  - Days absent
  - Days late
  - Total hours worked
- [x] Quick check-in/out widget (same as section 4)

### 5.2 Attendance History (List View)
- [x] Table/list of attendance records
- [x] Columns: Date, Check-in Time, Check-out Time, Hours Worked, Status
- [x] Filter by month/date range
- [x] Pagination

### 5.3 Attendance Calendar View
- [x] Monthly calendar with color-coded days:
  - ✅ Present — Green
  - ❌ Absent — Red
  - ⚠️ Late — Yellow
  - 🔘 Holiday — Gray
- [x] Click day to see details

### 5.4 Profile
- [x] View own profile (name, email, department, role, manager)
- [x] Update contact info
- [x] Change password

---

## 6. Admin Dashboard

### 6.1 Overview / Home
- [x] Total employees count
- [x] Currently checked-in count (real-time)
- [x] Total absent today
- [x] Attendance rate (%) for today
- [x] Simple daily attendance chart (present vs absent, last 7 days)

### 6.2 Employee Management
- [x] List all employees (table with search, filter by department/role)
- [x] Add new employee form (name, email, role, department, manager)
- [x] Edit employee details
- [x] Deactivate / activate employee
- [x] View individual employee's attendance records

### 6.3 Company Rules Configuration (Basic)
- [x] Set standard start time (e.g., 9:00 AM)
- [x] Set standard end time (e.g., 6:00 PM)
- [x] Set standard daily hours (e.g., 8 hours)
- [x] Set grace period (e.g., 10 minutes)
- [x] Set late threshold (e.g., 10–20 minutes)
- [x] Set weekly offs (e.g., Saturday, Sunday)

### 6.4 Department Management
- [x] List departments
- [x] Add / edit / delete departments

---

## 7. Manager Portal (Basic)

- [x] View team members list (employees assigned to this manager)
- [x] See who's checked in / absent / late today
- [x] View any team member's attendance history
- [x] Today's team summary stats

---

## 8. Basic Reports

- [x] Individual attendance report (select employee + date range → table)
- [x] Team attendance summary (manager's team, date range)
- [x] Download as CSV/Excel
- [x] Print-friendly view

---

## 9. Email Notifications (Basic)

- [x] Set up Resend email integration
- [x] "Forgot to check in" reminder email (triggered if not checked in by X time)
- [x] "Forgot to check out" reminder email (triggered if still checked in by Y time)
- [x] Daily cron/scheduled function to trigger reminders

---

## 10. Testing & Polish

- [x] Test all auth flows (login, signup, reset, logout)
- [x] Test check-in/out edge cases (midnight, double-tap, timezone)
- [x] Test RLS policies (staff can't see other staff, manager sees only team)
- [x] Responsive design testing (mobile, tablet, desktop)
- [x] Error handling & loading states across all pages
- [x] 404 and error pages
- [x] Deploy & production build verification (`npx next build` succeeded)

---

## Deliverables at End of Phase 1

| What | Description | Status |
|------|-------------|--------|
| **Working Auth** | Login, signup, role-based access | ✅ Completed |
| **Check-In/Out** | One-tap with timestamp, status calc | ✅ Completed |
| **Employee Portal** | Dashboard, calendar, list view, profile | ✅ Completed |
| **Admin Dashboard** | Stats, employee CRUD, basic rules config | ✅ Completed |
| **Manager View** | Team status, attendance history | ✅ Completed |
| **Reports** | Individual & team, CSV export | ✅ Completed |
| **Email Reminders** | Check-in/out reminder emails | ✅ Completed |
| **Build Verified** | 100% Passing Next.js 15 App Router Build | ✅ Completed |
