-- Mero Attendance Management System - Database Schema
-- Run this script in your Supabase SQL Editor

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE attendance_status AS ENUM ('on_time', 'late', 'very_late', 'absent', 'half_day');

-- 3. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Company Rules Table
CREATE TABLE IF NOT EXISTS public.company_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    standard_start_time TIME DEFAULT '09:00:00',
    standard_end_time TIME DEFAULT '18:00:00',
    standard_daily_hours NUMERIC(4, 2) DEFAULT 8.00,
    grace_period_minutes INT DEFAULT 10,
    late_threshold_minutes INT DEFAULT 20,
    very_late_threshold_minutes INT DEFAULT 60,
    minimum_hours_full_day NUMERIC(4, 2) DEFAULT 7.00,
    minimum_hours_half_day NUMERIC(4, 2) DEFAULT 4.00,
    work_days INT[] DEFAULT ARRAY[1, 2, 3, 4, 5], -- 1=Monday .. 5=Friday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'staff' NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    position VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    total_hours NUMERIC(5, 2) DEFAULT 0.00,
    status attendance_status DEFAULT 'on_time',
    device_info TEXT,
    ip_address VARCHAR(100),
    location_lat NUMERIC(10, 8),
    location_lng NUMERIC(11, 8),
    notes TEXT,
    edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON public.attendance_records(company_id, date);
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON public.users(manager_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS POLICIES

-- Users Table Policies
CREATE POLICY "Users can read own profile or admins/managers can read company users"
ON public.users FOR SELECT
USING (
    auth.uid() = id
    OR
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.company_id = users.company_id
        AND u.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Admins can insert or update users in their company"
ON public.users FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.company_id = users.company_id AND u.role = 'admin'
    )
);

CREATE POLICY "Users can update basic details of own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Attendance Records Policies
CREATE POLICY "Employees can view own attendance records"
ON public.attendance_records FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.company_id = attendance_records.company_id
        AND (u.role = 'admin' OR (u.role = 'manager' AND EXISTS (
            SELECT 1 FROM public.users target WHERE target.id = attendance_records.user_id AND target.manager_id = u.id
        )))
    )
);

CREATE POLICY "Employees can check-in/out for themselves"
ON public.attendance_records FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Employees can update own active check-in record"
ON public.attendance_records FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins & Managers can insert/update team attendance records"
ON public.attendance_records FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.company_id = attendance_records.company_id
        AND u.role IN ('admin', 'manager')
    )
);

-- Company & Rules Policies
CREATE POLICY "Users can view own company info"
ON public.companies FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.company_id = companies.id
    )
);

CREATE POLICY "Users can view company rules"
ON public.company_rules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.company_id = company_rules.company_id
    )
);

CREATE POLICY "Admins can modify company rules"
ON public.company_rules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.company_id = company_rules.company_id AND u.role = 'admin'
    )
);

-- Departments Policies
CREATE POLICY "Users can view company departments"
ON public.departments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.company_id = departments.company_id
    )
);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.company_id = departments.company_id AND u.role = 'admin'
    )
);

-- Notifications Policies
CREATE POLICY "Users can manage own notifications"
ON public.notifications FOR ALL
USING (user_id = auth.uid());

-- Trigger to handle automatically creating a user entry on Auth Signup (optional DB trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
