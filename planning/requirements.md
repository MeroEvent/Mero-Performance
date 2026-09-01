# Mero Attendance Management System - Requirements Document

## Project Overview

A comprehensive attendance management system for companies where employees can check in/out, track attendance, manage leaves, and generate reports. Built with Next.js, Supabase, and deployed on Vercel.

---

## 1. Core Features

### 1.1 User Authentication & Roles

- **Roles:**
  - **Admin** - Full system access, manage company rules, all reports
  - **Manager** - Manage team attendance, approve leaves, view team reports
  - **Employee/Staff** - Self check-in/out, view own attendance only

- **Authentication:**
  - Email/password login via Supabase Auth
  - Secure session management
  - Password reset functionality

---

### 1.2 Check-In/Check-Out System

#### Employee Self Check-In/Out

- Large, prominent "Check In" and "Check Out" buttons
- Single tap action to record attendance
- Automatic timestamp capture (date + time)
- Visual status indicator (Checked In / Checked Out)
- Display current session duration
- Cannot check in twice without checking out first
- Success confirmation message after action

#### Security & Verification (Optional Settings)

- **GPS Location Verification:**
  - Capture GPS coordinates on check-in/out
  - Verify employee is within allowed radius of office
  - Configurable office location(s) and radius per company
  - Show location on attendance record
- **IP Address Restriction:**
  - Optional: Restrict check-in to office WiFi IP range
  - Configurable allowed IP addresses/ranges
  - Block check-in from unauthorized networks

#### Attendance Record Capture

Each check-in/out records:

- Employee ID
- Date
- Check-in time
- Check-out time
- GPS location (if enabled)
- IP address (if enabled)
- Device information
- Total hours worked (calculated)
- Status (On Time / Late / Very Late)

---

### 1.3 Tardiness & Absence Rules

#### Configurable Company Rules

- **Grace Period:** First X minutes don't count as late (e.g., 5-10 min)
- **Late:** Arrived after grace period but within threshold (e.g., 10-20 min)
- **Very Late:** Arrived 20+ minutes late
- **Absent:** Didn't check in at all
- **Half Day:** Worked less than minimum hours

#### Automatic Calculations

- **4 "Very Late" = 1 Absent**
- Track cumulative tardiness
- Monthly/quarterly tardiness reports
- Automatic status assignment based on check-in time
- Early departure tracking (leaving before minimum hours)

#### Working Hours Rules

- Standard working hours per day (e.g., 8 hours)
- Minimum hours required (e.g., 7 hours for full day)
- Half-day threshold (e.g., 4-7 hours)
- Overtime calculation (hours beyond standard)

---

### 1.4 Leave Management

#### Leave Types

- **Sick Leave**
- **Casual Leave**
- **Vacation/Annual Leave**
- **Unpaid Leave**
- **Work From Home (WFH)**
- **Compensatory Off**

#### Leave Request System

- Employee submits leave request:
  - Leave type
  - Start date
  - End date
  - Reason
  - Attachment (optional - medical certificate, etc.)
- Manager receives notification
- Manager can approve/reject with comments
- Employee receives notification of decision
- Approved leaves reflect in attendance calendar

#### Leave Balance Tracking

- Each employee has leave quota per type
- Configurable limits per company (e.g., 12 sick leaves/year)
- Real-time balance display
- Alerts when balance is low
- Annual reset on company policy date
- Carry forward rules (optional)

---

### 1.5 Employee Portal (Staff View)

#### Dashboard

- Quick check-in/out button
- Current status display
- Today's attendance summary
- This month's summary:
  - Days present
  - Days absent
  - Days late
  - Total hours worked
  - Overtime hours
- Leave balance overview
- Upcoming leaves
- Recent notifications

#### Attendance Reports (Self)

- **Calendar View:**
  - Monthly calendar with color-coded days
  - Present (Green)
  - Absent (Red)
  - Late (Yellow)
  - Very Late (Orange)
  - Leave (Blue)
  - Holiday (Gray)
  - Work From Home (Purple)

- **List View:**
  - Date
  - Check-in time
  - Check-out time
  - Hours worked
  - Status
  - Location (if applicable)

- **Export:**
  - Download own attendance report (PDF/Excel)
  - Date range selection
  - Monthly/quarterly/yearly reports

#### Leave Management

- View leave balance
- Apply for leave
- View leave history
- Check leave request status
- Cancel pending leave requests

#### Profile

- View own profile
- Update contact information
- Change password
- View department, role, manager

---

### 1.6 Manager Portal

#### Team Dashboard

- **Real-time Status:**
  - Who's checked in right now
  - Who's absent today
  - Who's late today
  - Who's on leave today
  - Total team members count

- **Today's Summary:**
  - Total present
  - Total absent
  - Total on leave
  - Average check-in time

#### Team Attendance Management

- View any team member's attendance
- Edit/correct attendance records:
  - Add missing check-in/out
  - Adjust times (with reason)
  - Mark manual attendance
  - Add notes/comments
  - Audit trail of all changes
- Mark absences with reasons
- Override system-calculated status

#### Leave Approvals

- Pending leave requests list
- View leave request details
- Approve/reject with comments
- View team leave calendar
- Check team availability

#### Team Reports

- Individual attendance reports
- Team attendance summary
- Tardiness reports
- Leave utilization reports
- Export team reports (PDF/Excel)
- Date range filters
- Department-wise filtering

---

### 1.7 Admin Dashboard

#### Company-wide Overview

- **Real-time Statistics:**
  - Total employees
  - Currently checked in
  - Total absences today
  - Average attendance rate
  - Tardiness trends

- **Analytics & Charts:**
  - Daily attendance graph
  - Monthly trends
  - Department-wise attendance
  - Punctuality metrics
  - Leave utilization charts

#### Employee Management

- Add new employees
- Edit employee details:
  - Name, email, phone
  - Department
  - Role (Admin/Manager/Staff)
  - Manager assignment
  - Join date
  - Leave quotas
- Deactivate/activate employees
- Bulk import employees (CSV)
- Assign managers to teams

#### Company Rules Configuration

- **Working Hours:**
  - Standard start time (e.g., 9:00 AM)
  - Standard end time (e.g., 6:00 PM)
  - Standard daily hours (e.g., 8 hours)
  - Minimum hours for full day
  - Half-day threshold

- **Tardiness Rules:**
  - Grace period duration
  - Late threshold
  - Very late threshold
  - Very late to absent conversion ratio
  - Early departure rules

- **Leave Policies:**
  - Leave types available
  - Annual quota per leave type
  - Leave carry forward rules
  - Maximum consecutive leaves allowed
  - Notice period required for leaves

- **Location Settings:**
  - Office GPS coordinates
  - Allowed radius for check-in
  - Multiple office locations
  - IP whitelist for check-in

- **Working Days:**
  - Weekly offs (e.g., Saturday, Sunday)
  - Company holidays calendar
  - Flexible/custom schedules

#### Holiday Management

- Add/edit/delete holidays
- Annual holiday calendar
- Import holidays (CSV)
- Holiday affects attendance calculations

#### Advanced Reports

- Company-wide attendance reports
- Department comparisons
- Tardiness analytics
- Leave patterns analysis
- Payroll-ready reports
- Custom date ranges
- Export all reports (PDF/Excel/CSV)

#### Audit Logs

- Track all system changes
- Who made what changes when
- Attendance record modifications
- Rule changes history
- User activity logs

---

## 2. Notification System

### 2.1 In-App Notifications

- Real-time notification feed
- Unread count badge
- Mark as read functionality
- Notification types:
  - Leave request status
  - Manager actions
  - Reminders
  - System alerts

### 2.2 Email Notifications

- **For Employees:**
  - Forgot to check in reminder (e.g., 9:30 AM)
  - Forgot to check out reminder (e.g., 6:30 PM)
  - Leave request status update
  - Monthly attendance summary
  - Leave balance low alert

- **For Managers:**
  - New leave request pending
  - Team member absent notification
  - Team tardiness alerts
  - Weekly team summary

- **For Admins:**
  - New employee added
  - System alerts
  - Monthly company report

### 2.3 Push Notifications (PWA)

- Browser push notifications
- Enable/disable in user settings
- Same triggers as email notifications
- Works even when app is closed

---

## 3. Technical Requirements

### 3.1 Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Next.js API Routes + Server Actions
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime
- **Email:** Resend
- **Deployment:** Vercel
- **PWA:** next-pwa

### 3.2 Database Schema (High-Level)

**Tables:**

- `users` - Employee accounts (name, email, role, department, manager_id)
- `companies` - Company details and settings
- `attendance_records` - Check-in/out logs
- `leaves` - Leave requests and approvals
- `leave_balances` - Current leave quotas
- `holidays` - Company holiday calendar
- `company_rules` - Configurable rules
- `notifications` - In-app notifications
- `audit_logs` - System change tracking
- `departments` - Company departments

### 3.3 Security Features

- Row Level Security (RLS) in Supabase
- Role-based access control (RBAC)
- JWT authentication tokens
- Secure password hashing
- API rate limiting
- HTTPS only
- CSRF protection
- Input validation and sanitization

### 3.4 Performance

- Server-side rendering (SSR) for SEO
- Client-side caching
- Optimistic UI updates
- Image optimization
- Code splitting
- Edge caching on Vercel
- Database query optimization
- Real-time subscriptions for live data

---

## 4. User Experience

### 4.1 Responsive Design

- Mobile-first design
- Works on phones, tablets, desktops
- Touch-friendly buttons
- Optimized for small screens

### 4.2 Progressive Web App (PWA)

- Installable on any device
- Add to home screen
- Offline capability (view cached data)
- App-like experience
- Push notification support

### 4.3 Accessibility

- WCAG 2.1 compliant
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

---

## 5. Reporting & Analytics

### 5.1 Report Types

- **Individual Attendance Report**
- **Team Attendance Summary**
- **Department-wise Report**
- **Tardiness Report**
- **Leave Utilization Report**
- **Payroll-Ready Report** (hours worked, absences, deductions)
- **Monthly Summary Report**
- **Custom Date Range Reports**

### 5.2 Export Formats

- PDF (formatted, printable)
- Excel/CSV (data analysis)
- JSON (API export)

### 5.3 Visualizations

- Attendance calendar (color-coded)
- Line charts (attendance trends)
- Bar charts (department comparison)
- Pie charts (leave distribution)
- Heatmaps (punctuality patterns)

---

## 6. Future Enhancements (Optional)

### Phase 2 Features

- Shift management (morning/evening/night shifts)
- Break time tracking
- Geofencing with automatic check-in
- Face recognition for check-in
- Integration with biometric devices
- Slack/Teams integration
- SMS notifications (Twilio)
- Mobile native apps (iOS/Android)
- Payroll system integration
- HR system integration (API)
- Multi-company support (SaaS model)
- Custom fields for attendance
- Advanced analytics with AI insights
- Attendance predictions

---

## 7. Success Metrics

### Key Performance Indicators (KPIs)

- User adoption rate (% of employees using system)
- Average check-in/out compliance rate
- Time saved in attendance processing
- Reduction in attendance disputes
- Manager approval response time
- System uptime and reliability
- User satisfaction score

---

## 8. Compliance & Privacy

### Data Protection

- GDPR compliance (if applicable)
- Data encryption at rest and in transit
- User consent for location tracking
- Right to data export
- Right to be forgotten
- Data retention policies
- Privacy policy and terms of service

### Audit & Compliance

- Immutable attendance records
- Complete audit trail
- Manager override tracking
- Compliance with labor laws
- Export for legal/audit purposes

---

## 9. Development Phases

### Phase 1: MVP (Minimum Viable Product)

- User authentication (Admin, Manager, Staff)
- Self check-in/out functionality
- Basic attendance tracking
- Simple admin dashboard
- Employee portal (view own attendance)
- Basic reports (individual, team)
- Email notifications (reminders)

### Phase 2: Enhanced Features

- Leave management (request, approve, track)
- Tardiness rules and automation
- GPS location verification
- IP address restriction
- Manager portal (edit attendance, approvals)
- Advanced reports and exports
- In-app notifications
- Holiday calendar

### Phase 3: Analytics & Optimization

- Advanced analytics dashboard
- Payroll-ready reports
- PWA with push notifications
- Audit logs
- Department management
- Bulk operations
- Custom rule configurations
- Mobile optimization

---

## 10. User Stories

### As an Employee:

- I want to check in quickly when I arrive at work
- I want to see my attendance history and status
- I want to apply for leave easily
- I want to track my leave balance
- I want to receive reminders if I forget to check out
- I want to view my monthly attendance report

### As a Manager:

- I want to see who's present in my team right now
- I want to approve/reject leave requests quickly
- I want to edit attendance if someone forgot to check in
- I want to view my team's attendance patterns
- I want to generate team reports for review
- I want to receive alerts about team absences

### As an Admin:

- I want to configure company attendance rules
- I want to add and manage all employees
- I want to see company-wide attendance statistics
- I want to generate payroll-ready reports
- I want to track system changes and modifications
- I want to manage holidays and working days
- I want to export data for compliance and audits

---

## Summary

This attendance management system provides a complete solution for companies to:

- Track employee attendance accurately
- Automate tardiness and absence calculations
- Manage leaves efficiently
- Generate comprehensive reports
- Provide self-service portals for employees
- Enable managers to oversee their teams
- Give admins full control over company policies

Built with modern, scalable technology stack (Next.js + Supabase + Vercel) and designed as a PWA for easy access without app store deployment.
