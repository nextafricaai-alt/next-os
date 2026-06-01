-- ============================================================================
-- NEXT OS — Multi-Tenant Supabase Schema (v1)
-- ============================================================================
-- Run this in Supabase → SQL Editor → New query → paste → RUN.
-- Idempotent: safe to run more than once (uses IF NOT EXISTS / CREATE OR REPLACE).
--
-- Architecture: One database, all tenants share tables, isolated by tenant_id +
-- Row-Level Security. The service_role key bypasses RLS (Nia uses it). The
-- anon key respects RLS (browser uses it for client-side reads).
-- ============================================================================

-- 1. TENANTS — one row per client organization (school, NGO, church, etc.)
CREATE TABLE IF NOT EXISTS tenants (
  id           text PRIMARY KEY,                                  -- e.g. 'peak-primary'
  name         text NOT NULL,                                     -- 'Peak Primary School'
  vertical     text NOT NULL DEFAULT 'school',                    -- school | ngo | church | ...
  country      text DEFAULT 'Uganda',
  currency     text DEFAULT 'UGX',
  subdomain    text UNIQUE,                                       -- 'peakprimary'
  tier         text DEFAULT 'catalyst',                           -- catalyst | builder | architect
  status       text DEFAULT 'active',                             -- active | paused | trial
  term         text,                                              -- 'Term 2 Week 6'
  meta         jsonb DEFAULT '{}'::jsonb,                         -- escape hatch for per-tenant settings
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. USERS — head teachers, bursars, teachers per tenant
-- Note: Supabase Auth handles the actual login; this table links auth.users
-- to a tenant + role.
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id      uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text,
  role         text NOT NULL DEFAULT 'staff',                     -- admin | head | bursar | teacher | staff
  phone        text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id);

-- 3. STUDENTS — every student in every school
CREATE TABLE IF NOT EXISTS students (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  stream          text,                                           -- 'P4V', 'P3P', etc.
  guardian_name   text,
  guardian_phone  text,
  date_of_birth   date,
  enrolled_at     date DEFAULT current_date,
  status          text DEFAULT 'active',                          -- active | inactive | graduated
  meta            jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS students_tenant_idx ON students (tenant_id);
CREATE INDEX IF NOT EXISTS students_stream_idx ON students (tenant_id, stream);

-- 4. FEES — every fee record (charges + payments)
CREATE TABLE IF NOT EXISTS fees (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  bigint NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term        text,                                               -- 'Term 2 2026'
  kind        text NOT NULL,                                      -- charge | payment | adjustment
  amount      numeric(14,2) NOT NULL,                             -- positive for charge, negative for payment
  channel     text,                                               -- mpesa | bank | cash | momo
  reference   text,                                               -- payment reference
  notes       text,
  occurred_at timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fees_tenant_idx  ON fees (tenant_id);
CREATE INDEX IF NOT EXISTS fees_student_idx ON fees (student_id);

-- 5. ATTENDANCE — daily attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  bigint NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT current_date,
  present     boolean NOT NULL,
  arrival_at  time,                                               -- '07:42' if present
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE INDEX IF NOT EXISTS attendance_tenant_date_idx ON attendance (tenant_id, date);

-- 6. ENROLLMENTS — new inquiries from prospective parents
CREATE TABLE IF NOT EXISTS enrollments (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  child_name      text,
  parent_name     text,
  parent_phone    text NOT NULL,
  grade_interest  text,                                           -- 'P1', 'P3', etc.
  source          text DEFAULT 'whatsapp',                        -- whatsapp | website | referral
  status          text DEFAULT 'new',                             -- new | contacted | visit_booked | enrolled | lost
  notes           text,
  received_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enrollments_tenant_status_idx ON enrollments (tenant_id, status);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Each table gets RLS enabled. Policies say "user can only see rows where the
-- row's tenant_id matches the tenant_id stored on the user's account."
-- ============================================================================

ALTER TABLE tenants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE students    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Helper: get the current logged-in user's tenant_id
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1
$$;

-- Drop existing policies if re-running (safe)
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON tenants';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON users';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON students';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON fees';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON attendance';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON enrollments';
END $$;

-- Tenants: a user can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING (id = current_tenant_id());

-- Users: only see other users in your tenant
CREATE POLICY tenant_isolation ON users
  FOR ALL USING (tenant_id = current_tenant_id());

-- Students / fees / attendance / enrollments: tenant-scoped
CREATE POLICY tenant_isolation ON students
  FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation ON fees
  FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation ON attendance
  FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation ON enrollments
  FOR ALL USING (tenant_id = current_tenant_id());

-- ============================================================================
-- DONE. service_role key bypasses RLS, so Nia (the worker) sees all tenants.
-- anon key respects RLS, so browser users only see their own.
-- ============================================================================
