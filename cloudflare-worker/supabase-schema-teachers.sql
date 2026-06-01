-- ============================================================================
-- NEXT OS — Teachers Extension (run AFTER supabase-schema.sql + seed)
-- ============================================================================
-- Adds: teachers, class_assignments, lesson_plans, syllabus_coverage,
-- teacher_payroll. RLS policies so each teacher only sees their own scope.
-- ============================================================================

-- 1. TEACHERS — one row per teacher per tenant
CREATE TABLE IF NOT EXISTS teachers (
  id             bigserial PRIMARY KEY,
  tenant_id      text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES users(id) ON DELETE SET NULL,    -- their login (may be null if not yet onboarded)
  full_name      text NOT NULL,
  employee_id    text,
  subjects       text[] DEFAULT '{}',                              -- ['English', 'Literature']
  phone          text,
  email          text,
  hire_date      date,
  monthly_salary numeric(14,2),
  status         text DEFAULT 'active',                            -- active | on_leave | terminated
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teachers_tenant_idx ON teachers (tenant_id);
CREATE INDEX IF NOT EXISTS teachers_user_idx ON teachers (user_id);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_tenant_email_unique'
  ) THEN
    ALTER TABLE teachers ADD CONSTRAINT teachers_tenant_email_unique UNIQUE (tenant_id, email);
  END IF;
END $$;

-- 2. CLASS ASSIGNMENTS — which teacher teaches which stream + subject
CREATE TABLE IF NOT EXISTS class_assignments (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id      bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  stream          text NOT NULL,                                   -- 'P4V', 'P5P', etc.
  subject         text NOT NULL,                                   -- 'English'
  is_class_teacher boolean DEFAULT false,                          -- true = main class teacher for the stream
  created_at      timestamptz DEFAULT now(),
  UNIQUE (teacher_id, stream, subject)
);
CREATE INDEX IF NOT EXISTS class_assignments_teacher_idx ON class_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS class_assignments_stream_idx ON class_assignments (tenant_id, stream);

-- 3. LESSON PLANS — what each teacher plans to teach
CREATE TABLE IF NOT EXISTS lesson_plans (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id  bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  stream      text NOT NULL,
  subject     text NOT NULL,
  week_of     date NOT NULL,                                       -- Monday of the week
  topic       text NOT NULL,
  objectives  text,
  resources   text,
  status      text DEFAULT 'planned',                              -- planned | in_progress | completed
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_plans_teacher_idx ON lesson_plans (teacher_id, week_of);

-- 4. SYLLABUS COVERAGE — planned vs. completed across the term
CREATE TABLE IF NOT EXISTS syllabus_coverage (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id      bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  stream          text NOT NULL,
  subject         text NOT NULL,
  topic           text NOT NULL,
  planned_week    int,                                             -- week 1-12 of the term
  completed_week  int,
  status          text DEFAULT 'pending',                          -- pending | in_progress | done | skipped
  notes           text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS syllabus_teacher_idx ON syllabus_coverage (teacher_id);

-- 5. TEACHER PAYROLL — monthly salary records
CREATE TABLE IF NOT EXISTS teacher_payroll (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id  bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month       date NOT NULL,                                       -- first of the month
  amount      numeric(14,2) NOT NULL,
  status      text DEFAULT 'pending',                              -- pending | paid | held
  paid_at     timestamptz,
  channel     text,                                                -- mpesa | bank | momo
  reference   text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (teacher_id, month)
);
CREATE INDEX IF NOT EXISTS payroll_teacher_idx ON teacher_payroll (teacher_id, month);

-- ============================================================================
-- RLS — Row-Level Security per role
-- ============================================================================

ALTER TABLE teachers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payroll   ENABLE ROW LEVEL SECURITY;

-- Helper: current user's role
CREATE OR REPLACE FUNCTION current_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1
$$;

-- Helper: current teacher's id (NULL if not a teacher)
CREATE OR REPLACE FUNCTION current_teacher_id() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.id FROM teachers t
  JOIN users u ON u.id = t.user_id
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$;

-- Drop existing policies if re-running
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS scoped_select ON teachers';
  EXECUTE 'DROP POLICY IF EXISTS scoped_select ON class_assignments';
  EXECUTE 'DROP POLICY IF EXISTS scoped_select ON lesson_plans';
  EXECUTE 'DROP POLICY IF EXISTS scoped_select ON syllabus_coverage';
  EXECUTE 'DROP POLICY IF EXISTS scoped_select ON teacher_payroll';
END $$;

-- TEACHERS: head/admin/bursar see all in tenant; teachers see only themselves
CREATE POLICY scoped_select ON teachers FOR SELECT USING (
  tenant_id = current_tenant_id() AND (
    current_user_role() IN ('admin', 'head', 'bursar')
    OR id = current_teacher_id()
  )
);

-- CLASS ASSIGNMENTS: head/admin see all; bursar can see for payroll context; teachers see only their own
CREATE POLICY scoped_select ON class_assignments FOR SELECT USING (
  tenant_id = current_tenant_id() AND (
    current_user_role() IN ('admin', 'head', 'bursar')
    OR teacher_id = current_teacher_id()
  )
);

-- LESSON PLANS: head/admin see all (oversight); bursar does NOT see; teachers see only their own
CREATE POLICY scoped_select ON lesson_plans FOR SELECT USING (
  tenant_id = current_tenant_id() AND (
    current_user_role() IN ('admin', 'head')
    OR teacher_id = current_teacher_id()
  )
);

-- SYLLABUS COVERAGE: same as lesson_plans
CREATE POLICY scoped_select ON syllabus_coverage FOR SELECT USING (
  tenant_id = current_tenant_id() AND (
    current_user_role() IN ('admin', 'head')
    OR teacher_id = current_teacher_id()
  )
);

-- PAYROLL: head/admin/bursar see all; teachers see only their own salary
CREATE POLICY scoped_select ON teacher_payroll FOR SELECT USING (
  tenant_id = current_tenant_id() AND (
    current_user_role() IN ('admin', 'head', 'bursar')
    OR teacher_id = current_teacher_id()
  )
);

-- ============================================================================
-- SEED: two teachers (Patrick — English; Mary — Math)
-- ============================================================================

INSERT INTO teachers (tenant_id, full_name, employee_id, subjects, phone, email, hire_date, monthly_salary)
VALUES
  ('peak-primary', 'Patrick Ssemakula', 'PP-T-014', ARRAY['English','Literature'], '+256772333001', 'patrick@peakprimary.test', '2022-02-01', 850000),
  ('peak-primary', 'Mary Namutebi',     'PP-T-022', ARRAY['Mathematics','Science'], '+256772333002', 'mary@peakprimary.test',    '2021-08-15', 900000)
ON CONFLICT DO NOTHING;

-- Patrick teaches English in P4V, P4P, P5V, P5P
INSERT INTO class_assignments (tenant_id, teacher_id, stream, subject, is_class_teacher)
SELECT 'peak-primary', t.id, s.stream, 'English',
       CASE WHEN s.stream = 'P5V' THEN true ELSE false END  -- Patrick is class teacher for P5V
FROM teachers t
CROSS JOIN (VALUES ('P4V'),('P4P'),('P5V'),('P5P')) AS s(stream)
WHERE t.tenant_id='peak-primary' AND t.full_name='Patrick Ssemakula'
ON CONFLICT DO NOTHING;

-- Mary teaches Math in P3V, P3P, P4V, P4P
INSERT INTO class_assignments (tenant_id, teacher_id, stream, subject, is_class_teacher)
SELECT 'peak-primary', t.id, s.stream, 'Mathematics',
       CASE WHEN s.stream = 'P4P' THEN true ELSE false END  -- Mary is class teacher for P4P
FROM teachers t
CROSS JOIN (VALUES ('P3V'),('P3P'),('P4V'),('P4P')) AS s(stream)
WHERE t.tenant_id='peak-primary' AND t.full_name='Mary Namutebi'
ON CONFLICT DO NOTHING;

-- Sample lesson plans for Patrick — this week
INSERT INTO lesson_plans (tenant_id, teacher_id, stream, subject, week_of, topic, objectives, status)
SELECT 'peak-primary', t.id, ca.stream, 'English',
       date_trunc('week', current_date)::date,
       'Comprehension: The Lion and the Mouse',
       'Students will identify main characters, summarise events, and explain the moral.',
       'in_progress'
FROM teachers t JOIN class_assignments ca ON ca.teacher_id = t.id
WHERE t.full_name='Patrick Ssemakula' AND ca.subject='English'
ON CONFLICT DO NOTHING;

-- Sample syllabus coverage rows for Patrick (planned + completed mix)
INSERT INTO syllabus_coverage (tenant_id, teacher_id, stream, subject, topic, planned_week, completed_week, status)
SELECT 'peak-primary', t.id, 'P5V', 'English', s.topic, s.wk, s.comp, s.st
FROM teachers t,
LATERAL (VALUES
  ('Nouns and Pronouns',           1, 1, 'done'),
  ('Verbs: Present Tense',         2, 2, 'done'),
  ('Verbs: Past Tense',            3, 3, 'done'),
  ('Adjectives',                   4, 4, 'done'),
  ('Adverbs',                      5, 5, 'done'),
  ('Comprehension Skills',         6, NULL, 'in_progress'),
  ('Composition: Narrative',       7, NULL, 'pending'),
  ('Composition: Descriptive',     8, NULL, 'pending')
) AS s(topic, wk, comp, st)
WHERE t.full_name='Patrick Ssemakula'
ON CONFLICT DO NOTHING;

-- Sample payroll: last 3 months for both teachers (most paid, current month pending)
INSERT INTO teacher_payroll (tenant_id, teacher_id, month, amount, status, paid_at, channel, reference)
SELECT 'peak-primary', t.id,
       date_trunc('month', current_date - (n || ' month')::interval)::date,
       t.monthly_salary,
       CASE WHEN n = 0 THEN 'pending' ELSE 'paid' END,
       CASE WHEN n = 0 THEN NULL ELSE current_date - (n || ' month')::interval + interval '5 days' END,
       'bank', 'PR' || t.id || '-' || n
FROM teachers t
CROSS JOIN generate_series(0, 2) AS n
WHERE t.tenant_id='peak-primary'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT 'teachers'         AS table_name, count(*) AS rows FROM teachers          WHERE tenant_id='peak-primary'
UNION ALL
SELECT 'class_assignments', count(*) FROM class_assignments WHERE tenant_id='peak-primary'
UNION ALL
SELECT 'lesson_plans',     count(*) FROM lesson_plans     WHERE tenant_id='peak-primary'
UNION ALL
SELECT 'syllabus_coverage',count(*) FROM syllabus_coverage WHERE tenant_id='peak-primary'
UNION ALL
SELECT 'teacher_payroll',  count(*) FROM teacher_payroll  WHERE tenant_id='peak-primary';
