-- ─── Attendance + Health + Check-in schema ─────────────────────────────────
-- Run this AFTER supabase-schema-teachers.sql. It adds three tables that
-- carry the daily nervous system of the school:
--
--   1. teacher_checkins      — teachers tap "Check In" when they arrive.
--                              Head sees who's on campus.
--   2. student_roll_call     — per-class roll call records, written by the
--                              teacher who took the roll. Head sees all.
--   3. student_health_records — health/wellbeing notes a teacher logs about
--                              a student. Head sees aggregated watch list.
--
-- Pattern: RLS keeps teachers in their lane (their assigned streams + their
-- own check-ins), while head/admin sees the whole tenant. Bursar sees none.

-- ──────────────────────────────────────────────────────────────────────────
-- TEACHER CHECK-INS
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_checkins (
  id          SERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  checked_in_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  method      TEXT DEFAULT 'manual', -- 'manual' | 'qr' | 'geo'
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teacher_checkins_tenant_date
  ON teacher_checkins (tenant_id, checked_in_at);

ALTER TABLE teacher_checkins ENABLE ROW LEVEL SECURITY;

-- Teacher can read their own check-ins
DROP POLICY IF EXISTS teacher_checkins_select_own ON teacher_checkins;
CREATE POLICY teacher_checkins_select_own ON teacher_checkins FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() IN ('admin','head')
      OR teacher_id = current_teacher_id()
    )
  );

-- Teacher can insert their own check-in
DROP POLICY IF EXISTS teacher_checkins_insert_own ON teacher_checkins;
CREATE POLICY teacher_checkins_insert_own ON teacher_checkins FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND teacher_id = current_teacher_id()
  );

-- ──────────────────────────────────────────────────────────────────────────
-- STUDENT ROLL CALL  (per-day, per-student record from a teacher)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_roll_call (
  id          SERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id),
  stream TEXT NOT NULL,
  taken_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  roll_date   DATE DEFAULT CURRENT_DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- One record per student per day (latest write wins via ON CONFLICT in app)
CREATE UNIQUE INDEX IF NOT EXISTS uq_roll_call_per_student_per_day
  ON student_roll_call (student_id, roll_date);
CREATE INDEX IF NOT EXISTS idx_roll_call_tenant_date
  ON student_roll_call (tenant_id, roll_date);
CREATE INDEX IF NOT EXISTS idx_roll_call_stream_date
  ON student_roll_call (tenant_id, stream, roll_date);

ALTER TABLE student_roll_call ENABLE ROW LEVEL SECURITY;

-- Head/admin: see all. Teacher: see only roll calls for streams they teach.
DROP POLICY IF EXISTS roll_call_select ON student_roll_call;
CREATE POLICY roll_call_select ON student_roll_call FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() IN ('admin','head')
      OR EXISTS (
        SELECT 1 FROM class_assignments ca
        WHERE ca.teacher_id = current_teacher_id()
          AND ca.stream = student_roll_call.stream
      )
    )
  );

-- Teacher can insert a roll call for a student in their assigned stream
DROP POLICY IF EXISTS roll_call_insert ON student_roll_call;
CREATE POLICY roll_call_insert ON student_roll_call FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND teacher_id = current_teacher_id()
    AND EXISTS (
      SELECT 1 FROM class_assignments ca
      WHERE ca.teacher_id = current_teacher_id()
        AND ca.stream = student_roll_call.stream
    )
  );

-- Teacher can update their own roll call for a stream they teach
DROP POLICY IF EXISTS roll_call_update ON student_roll_call;
CREATE POLICY roll_call_update ON student_roll_call FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() IN ('admin','head')
      OR (
        teacher_id = current_teacher_id()
        AND EXISTS (
          SELECT 1 FROM class_assignments ca
          WHERE ca.teacher_id = current_teacher_id()
            AND ca.stream = student_roll_call.stream
        )
      )
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- STUDENT HEALTH RECORDS
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_health_records (
  id          SERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recorded_by_teacher_id INTEGER REFERENCES teachers(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('illness','injury','wellbeing','behavior','other')),
  severity    TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  description TEXT NOT NULL,
  action_taken TEXT,
  follow_up_needed BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_tenant_date
  ON student_health_records (tenant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_student
  ON student_health_records (student_id);

ALTER TABLE student_health_records ENABLE ROW LEVEL SECURITY;

-- Head/admin: see all. Teacher: see only for students in their streams.
DROP POLICY IF EXISTS health_select ON student_health_records;
CREATE POLICY health_select ON student_health_records FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() IN ('admin','head')
      OR EXISTS (
        SELECT 1 FROM students s
        JOIN class_assignments ca ON ca.stream = s.stream
        WHERE s.id = student_health_records.student_id
          AND ca.teacher_id = current_teacher_id()
      )
    )
  );

-- Teacher can log a health record for a student in their stream
DROP POLICY IF EXISTS health_insert ON student_health_records;
CREATE POLICY health_insert ON student_health_records FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND recorded_by_teacher_id = current_teacher_id()
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN class_assignments ca ON ca.stream = s.stream
      WHERE s.id = student_health_records.student_id
        AND ca.teacher_id = current_teacher_id()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────────────────────────────────
SELECT 'teacher_checkins'        AS table_name, COUNT(*) FROM teacher_checkins
UNION ALL
SELECT 'student_roll_call',                COUNT(*) FROM student_roll_call
UNION ALL
SELECT 'student_health_records',           COUNT(*) FROM student_health_records;
