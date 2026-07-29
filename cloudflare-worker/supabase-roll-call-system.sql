-- ============================================================
-- SMART ROLL CALL SYSTEM — KABS LILY JUNIOR SCHOOL
-- Run this in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ── 1. Add period tracking columns to student_roll_call ──────
ALTER TABLE student_roll_call
  ADD COLUMN IF NOT EXISTS period_number  integer  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start   time,
  ADD COLUMN IF NOT EXISTS period_end     time;

-- ── 2. Drop the old unique constraint (one per student per day)
--       and replace with one per period per student per day
DROP INDEX IF EXISTS uq_roll_call_per_student_per_day;

CREATE UNIQUE INDEX IF NOT EXISTS uq_roll_per_student_period
  ON student_roll_call (student_id, roll_date, period_number);

-- ── 3. Add checked_out_at to teacher_checkins if missing ─────
ALTER TABLE teacher_checkins
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;

-- ── 4. student_notes table (teacher notes synced to profiles) ─
CREATE TABLE IF NOT EXISTS student_notes (
  id          bigserial PRIMARY KEY,
  tenant_id   text        NOT NULL,
  student_id  bigint,
  teacher_id  bigint,
  note        text        NOT NULL,
  note_type   text        DEFAULT 'general',
  created_at  timestamptz DEFAULT now()
);

-- RLS — permissive (all roles in tenant read/write)
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_notes_all ON student_notes;
CREATE POLICY student_notes_all ON student_notes
  FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Make student_roll_call RLS fully permissive ────────────
ALTER TABLE student_roll_call ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roll_call_all ON student_roll_call;
CREATE POLICY roll_call_all ON student_roll_call
  FOR ALL USING (true) WITH CHECK (true);

-- ── 6. Make teacher_checkins RLS fully permissive ─────────────
ALTER TABLE teacher_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_checkins_all ON teacher_checkins;
CREATE POLICY teacher_checkins_all ON teacher_checkins
  FOR ALL USING (true) WITH CHECK (true);

-- ── 7. Make students RLS fully permissive ─────────────────────
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS students_all ON students;
CREATE POLICY students_all ON students
  FOR ALL USING (true) WITH CHECK (true);

-- ── 8. Make timetable_slots RLS fully permissive ──────────────
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timetable_all ON timetable_slots;
CREATE POLICY timetable_all ON timetable_slots
  FOR ALL USING (true) WITH CHECK (true);

-- ── 9. Seed Kabs Lily timetable ───────────────────────────────
-- School day: Mon–Fri (dow 1–5)
-- 8 periods + break + lunch
-- ┌──────────┬──────────────┐
-- │ Period 1 │ 07:30–08:15  │  English
-- │ Period 2 │ 08:15–09:00  │  Mathematics
-- │ Period 3 │ 09:00–09:45  │  Science
-- │ BREAK    │ 09:45–10:15  │  —
-- │ Period 4 │ 10:15–11:00  │  Social Studies
-- │ Period 5 │ 11:00–11:45  │  CRE / MRE
-- │ LUNCH    │ 11:45–13:00  │  —
-- │ Period 6 │ 13:00–13:45  │  English
-- │ Period 7 │ 13:45–14:30  │  Mathematics
-- │ Period 8 │ 14:30–15:15  │  Creative Arts
-- └──────────┴──────────────┘

-- Delete existing Kabs Lily slots first (idempotent re-run)
DELETE FROM timetable_slots
WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre';

-- Streams at Kabs Lily Junior School
DO $$
DECLARE
  v_tenant  TEXT := 'kabs-lily-junior-school-and-kindercare-centre';
  v_streams TEXT[] := ARRAY['Primary Seven', 'Primary Six', 'Primary Five', 'Primary Four', 'Primary Three', 'Primary Two', 'Primary One', 'Top Class', 'Middle Class', 'Baby Class'];
  v_dow     INT;
  v_stream  TEXT;
BEGIN
  FOREACH v_dow IN ARRAY ARRAY[1,2,3,4,5] LOOP  -- Mon–Fri
    FOREACH v_stream IN ARRAY v_streams LOOP
      -- Period 1
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 1, '07:30', '08:15', v_stream, 'English', 'Period 1 · English')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 2
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 2, '08:15', '09:00', v_stream, 'Mathematics', 'Period 2 · Mathematics')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 3
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 3, '09:00', '09:45', v_stream, 'Science', 'Period 3 · Science')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 4 (after 09:45–10:15 break)
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 4, '10:15', '11:00', v_stream, 'Social Studies', 'Period 4 · Social Studies')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 5
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 5, '11:00', '11:45', v_stream, 'CRE / MRE', 'Period 5 · CRE / MRE')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 6 (after 11:45–13:00 lunch)
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 6, '13:00', '13:45', v_stream, 'English', 'Period 6 · English')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 7
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 7, '13:45', '14:30', v_stream, 'Mathematics', 'Period 7 · Mathematics')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
      -- Period 8
      INSERT INTO timetable_slots (tenant_id, day_of_week, period, start_time, end_time, stream, subject, label)
        VALUES (v_tenant, v_dow, 8, '14:30', '15:15', v_stream, 'Creative Arts', 'Period 8 · Creative Arts')
        ON CONFLICT (tenant_id, day_of_week, period, stream) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

SELECT 'Roll call system migration complete — ' || COUNT(*) || ' timetable slots seeded' AS status
FROM timetable_slots
WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre';
