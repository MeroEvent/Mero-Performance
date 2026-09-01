-- Seed Data for Mero Attendance System

-- Insert sample company
INSERT INTO public.companies (id, name, logo_url)
VALUES ('c0000000-0000-0000-0000-000000000001', 'Acme Technology Corp', 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Insert sample departments
INSERT INTO public.departments (id, company_id, name, description)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Engineering', 'Software & product development team'),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Human Resources', 'HR & People Operations'),
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Marketing', 'Growth & marketing initiatives')
ON CONFLICT (id) DO NOTHING;

-- Insert company rules
INSERT INTO public.company_rules (company_id, standard_start_time, standard_end_time, standard_daily_hours, grace_period_minutes, late_threshold_minutes, very_late_threshold_minutes, minimum_hours_full_day, minimum_hours_half_day)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    '09:00:00',
    '18:00:00',
    8.00,
    10,
    20,
    60,
    7.00,
    4.00
)
ON CONFLICT (company_id) DO NOTHING;
