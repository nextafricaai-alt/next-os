-- ============================================================
-- CharisOS Cloud — Supabase / PostgreSQL Schema
-- Charis Creations Limited
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES  (extends Supabase auth.users)
-- Every person who can log in has a row here.
-- app_role drives what they can see.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT '',
  phone        TEXT DEFAULT '',
  color        TEXT DEFAULT '#3b82f6',
  skills       TEXT[] DEFAULT '{}',
  rate_wedding  INTEGER DEFAULT 0,
  rate_standard INTEGER DEFAULT 0,
  rate_small    INTEGER DEFAULT 0,
  availability  TEXT DEFAULT 'Available',
  notes        TEXT DEFAULT '',
  join_date    TEXT DEFAULT '',
  app_role     TEXT DEFAULT 'Editor',   -- Admin | Editor | Photographer | Accountant
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically create a profile row when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- TEAM   (employee roster — can include people without logins)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team (
  id            SERIAL PRIMARY KEY,
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  color         TEXT DEFAULT '#3b82f6',
  skills        TEXT[] DEFAULT '{}',
  rate_wedding  INTEGER DEFAULT 0,
  rate_standard INTEGER DEFAULT 0,
  rate_small    INTEGER DEFAULT 0,
  availability  TEXT DEFAULT 'Available',
  notes         TEXT DEFAULT '',
  join_date     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT DEFAULT 'Individual',
  phone             TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  location          TEXT DEFAULT '',
  color             TEXT DEFAULT '#3b82f6',
  notes             TEXT DEFAULT '',
  wedding_date      TEXT DEFAULT '',
  referral          TEXT DEFAULT '',
  added_date        TEXT DEFAULT '',
  is_retainer       BOOLEAN DEFAULT FALSE,
  monthly_rate      INTEGER DEFAULT 0,
  retainer_start    TEXT DEFAULT '',
  retainer_services TEXT DEFAULT '',
  retainer_template JSONB DEFAULT '[]',
  retainer_log      JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PROJECTS
-- team, equipment, workflow_checklist stored as JSONB
-- so existing UI shape is preserved without migration.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                  SERIAL PRIMARY KEY,
  ref                 TEXT UNIQUE NOT NULL,
  client_id           INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  client              TEXT NOT NULL DEFAULT '',   -- denormalised name for display
  phone               TEXT DEFAULT '',
  email               TEXT DEFAULT '',
  event_type          TEXT DEFAULT '',
  pkg                 TEXT DEFAULT '',
  date                TEXT DEFAULT '',
  deadline            TEXT DEFAULT '',
  location            TEXT DEFAULT '',
  budget              INTEGER DEFAULT 0,
  deposit             INTEGER DEFAULT 0,
  status              TEXT DEFAULT 'Inquiry',
  team                JSONB DEFAULT '[]',          -- [{name,role,pay,paid}]
  equipment           JSONB DEFAULT '[]',          -- [{equipId,name,...}]
  workflow_checklist  JSONB DEFAULT '[]',          -- [{id,label,icon,done,doneAt}]
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Keep updated_at current on every change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  proj_ref         TEXT DEFAULT '',
  label            TEXT NOT NULL,
  assign_to        TEXT DEFAULT '',
  assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  step_id          INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'Pending',   -- Pending | In Progress | Done
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- ATTENDANCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER REFERENCES team(id) ON DELETE SET NULL,
  member_name TEXT DEFAULT '',
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date        TEXT NOT NULL,     -- stored as YYYY-MM-DD string to match app
  check_in    TEXT DEFAULT '',   -- HH:MM
  check_out   TEXT DEFAULT '',   -- HH:MM
  work_type   TEXT DEFAULT 'Office',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id        SERIAL PRIMARY KEY,
  type      TEXT DEFAULT '',
  title     TEXT NOT NULL,
  body      TEXT DEFAULT '',
  proj_ref  TEXT DEFAULT '',
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read      BOOLEAN DEFAULT FALSE,
  ts        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- EQUIPMENT
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  brand         TEXT DEFAULT '',
  model         TEXT DEFAULT '',
  category      TEXT DEFAULT 'Other',
  condition     TEXT DEFAULT 'Good',
  status        TEXT DEFAULT 'Available',
  serial_no     TEXT DEFAULT '',
  purchase_date TEXT DEFAULT '',
  value         INTEGER DEFAULT 0,
  last_service  TEXT DEFAULT '',
  next_service  TEXT DEFAULT '',
  assigned_to   TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id          SERIAL PRIMARY KEY,
  ref         TEXT UNIQUE NOT NULL,
  client      TEXT NOT NULL DEFAULT '',
  project_ref TEXT DEFAULT '',
  amount      INTEGER DEFAULT 0,
  paid        INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'Draft',
  due_date    TEXT DEFAULT '',
  issue_date  TEXT DEFAULT '',
  description TEXT DEFAULT '',
  payments    JSONB DEFAULT '[]',   -- [{date,amount,method,note}]
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             SERIAL PRIMARY KEY,
  date           TEXT NOT NULL DEFAULT '',
  category       TEXT DEFAULT '',
  description    TEXT DEFAULT '',
  amount         INTEGER DEFAULT 0,
  paid_by        TEXT DEFAULT '',
  project_ref    TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'Cash',
  receipt        TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Admins see everything. Editors/Photographers see own data.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE team          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses      ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an Admin/Owner/PA?
-- App stores roles as 'Owner', 'PA', 'Director', 'Staff' — not 'Admin'.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND app_role IN ('Admin', 'Owner', 'PA')
  );
$$;

-- profiles: users see own row; admins see all
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin());

-- team: authenticated users read; admins write
CREATE POLICY "team_select" ON team FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "team_insert" ON team FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY "team_update" ON team FOR UPDATE
  USING (is_admin());
CREATE POLICY "team_delete" ON team FOR DELETE
  USING (is_admin());

-- clients: all authenticated can read; Owner/PA write
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "clients_write" ON clients FOR ALL
  USING     (is_admin())
  WITH CHECK (is_admin());

-- projects: admins full access; others see assigned projects
CREATE POLICY "projects_admin"  ON projects FOR ALL USING (is_admin());
CREATE POLICY "projects_member" ON projects FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND projects.team @> jsonb_build_array(jsonb_build_object('name', p.name))
    )
  );

-- tasks: admins all; assigned user can read+update own
CREATE POLICY "tasks_admin"    ON tasks FOR ALL USING (is_admin());
CREATE POLICY "tasks_assigned" ON tasks FOR SELECT
  USING (assigned_user_id = auth.uid());
CREATE POLICY "tasks_update_own" ON tasks FOR UPDATE
  USING (assigned_user_id = auth.uid());

-- attendance: own records + admin all
CREATE POLICY "attendance_own"   ON attendance FOR ALL
  USING (user_id = auth.uid() OR member_id IN (
    SELECT id FROM team WHERE profile_id = auth.uid()
  ) OR is_admin());

-- notifications: own only + admin
CREATE POLICY "notifications_own"   ON notifications FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR is_admin());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (is_admin() OR auth.role() = 'authenticated');

-- equipment: all read; admins write
CREATE POLICY "equipment_select" ON equipment FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "equipment_write"  ON equipment FOR ALL USING (is_admin());

-- invoices + expenses: admins and accountants only
CREATE POLICY "invoices_finance" ON invoices FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role = 'Accountant'
  ));
CREATE POLICY "expenses_finance" ON expenses FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role = 'Accountant'
  ));

-- ─────────────────────────────────────────────────────────────
-- REALTIME  — enable for key tables
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;

-- ─────────────────────────────────────────────────────────────
-- SEED: make the first user an Admin
-- After running schema, create an account via Supabase Auth,
-- then run this to promote it (replace the email):
-- UPDATE profiles SET app_role = 'Admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ─────────────────────────────────────────────────────────────
