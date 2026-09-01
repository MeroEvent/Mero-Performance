# Phase 2: Enhanced Features — Task Breakdown

> **Goal:** Build on the Phase 1 MVP by adding leave management, tardiness automation, location/IP verification, enhanced manager controls, in-app notifications, holiday calendar, and advanced reporting.

---

## 1. Leave Management System

### 1.1 Leave Types & Configuration
- [x] Define leave types: Sick, Casual, Vacation/Annual, Unpaid, Work From Home (WFH), Compensatory Off
- [x] Admin UI to configure leave types available for the company
- [x] Admin UI to set annual quota per leave type (e.g., 12 sick leaves/year)
- [x] Configure maximum consecutive leaves allowed
- [x] Configure notice period required for leave requests
- [x] Leave carry-forward rules (optional toggle)

### 1.2 Database Schema Additions
- [x] `leave_types` table — name, description, company_id, annual_quota, is_active
- [x] `leave_requests` table — user_id, leave_type_id, start_date, end_date, reason, attachment_url, status (pending/approved/rejected), reviewer_id, reviewer_comment, created_at
- [x] `leave_balances` table — user_id, leave_type_id, total_quota, used, remaining, year
- [x] RLS policies for leave tables

### 1.3 Employee Leave Portal
- [x] "Apply for Leave" form (leave type, start/end date, reason, optional file attachment)
- [x] View leave balance dashboard (per leave type: total / used / remaining)
- [x] Leave history list with status badges (Pending / Approved / Rejected)
- [x] Cancel pending leave requests
- [x] Low balance alert indicators

### 1.4 Manager Leave Approvals
- [x] Pending leave requests queue (list of team requests awaiting action)
- [x] View request details (dates, reason, attachment, team calendar overlap)
- [x] Approve / Reject with comment
- [x] Team leave calendar view (see who's on leave which days)
- [x] Check team availability before approving

### 1.5 Leave ↔ Attendance Integration
- [x] Approved leaves automatically mark attendance calendar as "On Leave" (Blue)
- [x] Prevent check-in on approved leave days
- [x] Leave days excluded from absent calculations

---

## 2. Tardiness Rules & Automation

### 2.1 Advanced Tardiness Engine
- [x] "4 Very Late = 1 Absent" auto-conversion rule
- [x] Configurable conversion ratio (admin can change 4 to any number)
- [x] Cumulative tardiness counter per employee per month
- [x] Auto-reset tardiness counter on configurable cycle (monthly/quarterly)
- [x] Early departure tracking — flag if checked out before minimum hours

### 2.2 Half-Day Auto Detection
- [x] Auto-mark as "Half Day" if total hours between half-day and full-day thresholds
- [x] Admin-configurable half-day hour range

### 2.3 Tardiness Dashboard & Reports
- [x] Employee: View personal tardiness count and conversion status
- [x] Manager: Team tardiness summary with trend indicators
- [x] Admin: Company-wide tardiness analytics with monthly/quarterly breakdown

---

## 3. GPS Location Verification

### 3.1 Admin Configuration
- [x] Set office GPS coordinates (latitude, longitude) — support multiple offices
- [x] Set allowed radius in meters (e.g., 200m)
- [x] Toggle GPS verification on/off per company
- [x] UI to add/edit/delete office locations on a map preview

### 3.2 Check-In Location Capture
- [x] Request browser geolocation permission on check-in
- [x] Capture and store lat/lng with each attendance record
- [x] Calculate distance from nearest office location
- [x] Block check-in if outside allowed radius (with configurable enforcement: block vs warn)
- [x] Show location info on attendance record details

### 3.3 Location Display
- [x] Show "Verified Location ✓" or "Outside Office ⚠" badge on records
- [x] Admin/Manager can view check-in locations in attendance detail view

---

## 4. IP Address Restriction

### 4.1 Admin Configuration
- [x] Add/edit/delete allowed IP addresses or CIDR ranges
- [x] Toggle IP restriction on/off per company
- [x] Whitelist management UI

### 4.2 Check-In IP Validation
- [x] Capture client IP on check-in (via API headers)
- [x] Validate against whitelist
- [x] Block or warn if IP not in allowed list (configurable enforcement)
- [x] Store IP address with attendance record
- [x] Show IP verification status on records

---

## 5. Manager Portal — Enhanced Attendance Controls

### 5.1 Edit / Correct Attendance Records
- [x] Manager can add a missing check-in or check-out for a team member
- [x] Adjust check-in/check-out times with mandatory reason field
- [x] Mark manual attendance entry (e.g., employee forgot device)
- [x] Add notes/comments to any attendance record

### 5.2 Override System Status
- [x] Manager can override auto-calculated status (e.g., change "Late" to "On Time" with reason)
- [x] Override requires written justification

### 5.3 Audit Trail
- [x] Every edit/override creates an audit log entry
- [x] Audit log captures: who changed, what changed, old value, new value, reason, timestamp
- [x] Display edit history on attendance record detail view
- [x] Admin can view all audit logs company-wide

---

## 6. In-App Notification System

### 6.1 Database & Service Layer
- [x] `notifications` table enhancements (action_url, related_entity_id, related_entity_type)
- [x] Notification creation service (reusable helper to create notifications)

### 6.2 Notification Triggers
- [x] Employee submits leave request → Manager gets notification
- [x] Manager approves/rejects leave → Employee gets notification
- [x] Manager edits attendance record → Employee gets notification
- [x] Tardiness threshold warning → Employee gets notification
- [x] System alerts (e.g., upcoming holidays) → All employees

### 6.3 Notification UI
- [x] Bell icon in header with unread count badge
- [x] Dropdown notification panel (latest notifications list)
- [x] Mark individual as read
- [x] "Mark all as read" button
- [x] Click notification to navigate to relevant page
- [x] Full notifications page with pagination and filters

---

## 7. Holiday Calendar Management

### 7.1 Admin Holiday CRUD
- [x] Add holiday (name, date, optional description, recurring flag)
- [x] Edit / delete holidays
- [x] Annual holiday calendar view (visual calendar)
- [x] Import holidays from CSV

### 7.2 Holiday ↔ Attendance Integration
- [x] Holidays excluded from absent calculations
- [x] Holiday days shown as "Holiday" (Gray) on employee calendar
- [x] Check-in on holiday shows special indicator
- [x] Holiday count in monthly attendance summary

---

## 8. Advanced Reports & Exports

### 8.1 New Report Types
- [x] Department-wise attendance comparison report
- [x] Tardiness analytics report (trends, worst offenders, improvement tracking)
- [x] Leave utilization report (per type, per department)
- [x] Payroll-ready report (hours worked, absences, deductions summary)

### 8.2 Export Enhancements
- [x] PDF export with formatted layout and company branding
- [x] Excel export with multiple sheets (summary + detailed)
- [x] Custom date range picker for all reports
- [x] Department and role filters on all reports

### 8.3 Visualizations
- [x] Line chart: Attendance trends over time
- [x] Bar chart: Department attendance comparison
- [x] Pie chart: Leave type distribution
- [x] Heatmap: Punctuality patterns (day-of-week × hour)

---

## 9. Database Migrations & Schema Updates

- [x] Create migration script for all new Phase 2 tables
- [x] Update RLS policies for new tables (leave_requests, leave_balances, leave_types, audit_logs)
- [x] Add indexes for performance on new query patterns
- [x] Seed data for leave types and sample leave requests

---

## 10. Testing & Integration

- [x] Test leave request → approval → calendar reflection flow end-to-end
- [x] Test tardiness auto-conversion ("4 Very Late = 1 Absent")
- [x] Test GPS check-in with mock geolocation
- [x] Test IP restriction with various IP scenarios
- [x] Test manager attendance edit + audit trail creation
- [x] Test notification delivery for all trigger events
- [x] Test holiday exclusion from attendance calculations
- [x] Test PDF and Excel export output
- [x] Responsive testing on all new views
- [x] Build verification (`npx next build`)

---

## Deliverables at End of Phase 2

| Feature | Description | Status |
|---------|-------------|--------|
| **Leave Management** | Full request → approve → balance tracking workflow | ✅ Completed |
| **Tardiness Automation** | Auto "4 Very Late = 1 Absent", cumulative tracking | ✅ Completed |
| **GPS Verification** | Capture & verify check-in location against office coordinates | ✅ Completed |
| **IP Restriction** | Whitelist office IPs, block/warn unauthorized networks | ✅ Completed |
| **Manager Edit Controls** | Correct attendance records with full audit trail | ✅ Completed |
| **In-App Notifications** | Real-time bell icon, unread badges, notification feed | ✅ Completed |
| **Holiday Calendar** | Admin CRUD, auto-excluded from absent counts | ✅ Completed |
| **Advanced Reports** | PDF/Excel export, department comparisons, visualizations | ✅ Completed |
