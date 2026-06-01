-- ─── Digital Timetable schema + seed ──────────────────────────────────────
-- Run AFTER supabase-schema-teachers.sql.
--
-- Model: one row per (day_of_week, period, stream). Each row is a slot —
-- a 40-minute teaching block on a specific class, taught by a specific
-- teacher in a specific subject. NULL teacher = unassigned / "free".
--
-- The head teacher's Timetable panel queries today's slots + cross-references
-- teacher_checkins + student_roll_call to color-code each cell:
--   GREEN  = in session, roll taken (or completed earlier today with roll)
--   ORANGE = scheduled now/next, teacher checked in, no roll yet
--   RED    = past or current, teacher absent or no roll → ALARM
--   GRAY   = unassigned slot or free period

CREATE TABLE IF NOT EXISTS timetable_slots (
  id          SERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon … 7=Sun
  period      INT NOT NULL CHECK (period BETWEEN 1 AND 12),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  stream      TEXT NOT NULL,
  subject     TEXT NOT NULL,
  teacher_id  INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, day_of_week, period, stream)
);
CREATE INDEX IF NOT EXISTS idx_tt_tenant_day ON timetable_slots (tenant_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_tt_teacher ON timetable_slots (teacher_id);

ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;

-- Read: all roles in the tenant can read the timetable
DROP POLICY IF EXISTS tt_select_all ON timetable_slots;
CREATE POLICY tt_select_all ON timetable_slots FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Write: head/admin only
DROP POLICY IF EXISTS tt_insert_head ON timetable_slots;
CREATE POLICY tt_insert_head ON timetable_slots FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin','head')
  );
DROP POLICY IF EXISTS tt_update_head ON timetable_slots;
CREATE POLICY tt_update_head ON timetable_slots FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin','head')
  );

-- ──────────────────────────────────────────────────────────────────────────
-- SEED — Peak Primary sample timetable
-- ──────────────────────────────────────────────────────────────────────────
-- 8-period day (Mon-Fri), aligned with typical Ugandan primary schedule.
-- Periods 1-3 morning, BREAK, 4-5 mid-morning, LUNCH, 6-8 afternoon.

-- Wipe existing seed rows so re-running this script doesn't pile duplicates
DELETE FROM timetable_slots WHERE tenant_id = 'peak-primary';

-- Helper: insert one slot
-- We'll use Patrick (English, P4V/P + P5V/P) and Mary (Math, P3V/P + P4V/P).
-- All 14 streams get a full Mon-Fri timetable; assigned subjects pull real
-- teacher_id, unassigned ones leave teacher_id NULL.

WITH t AS (
  SELECT id, full_name FROM teachers WHERE tenant_id = 'peak-primary'
),
patrick AS (SELECT id FROM t WHERE full_name = 'Patrick Ssemakula' LIMIT 1),
mary    AS (SELECT id FROM t WHERE full_name = 'Mary Namutebi'     LIMIT 1),
periods AS (
  -- period_num, start, end
  SELECT * FROM (VALUES
    (1, TIME '08:00', TIME '08:40'),
    (2, TIME '08:40', TIME '09:20'),
    (3, TIME '09:20', TIME '10:00'),
    -- BREAK 10:00-10:30
    (4, TIME '10:30', TIME '11:10'),
    (5, TIME '11:10', TIME '11:50'),
    -- LUNCH 11:50-13:30
    (6, TIME '13:30', TIME '14:10'),
    (7, TIME '14:10', TIME '14:50'),
    (8, TIME '14:50', TIME '15:30')
  ) AS p(period_num, start_t, end_t)
),
streams AS (
  SELECT s FROM (VALUES
    ('P1V'),('P1P'),('P2V'),('P2P'),('P3V'),('P3P'),('P4V'),('P4P'),
    ('P5V'),('P5P'),('P6V'),('P6P'),('P7V'),('P7P')
  ) AS x(s)
),
days AS (
  SELECT d FROM generate_series(1, 5) d  -- Mon-Fri
)
INSERT INTO timetable_slots
  (tenant_id, day_of_week, period, start_time, end_time, stream, subject, teacher_id, label)
SELECT
  'peak-primary' AS tenant_id,
  days.d         AS day_of_week,
  periods.period_num AS period,
  periods.start_t    AS start_time,
  periods.end_t      AS end_time,
  streams.s          AS stream,
  -- Subject rotation per period (so each stream sees variety across the day)
  CASE
    WHEN periods.period_num IN (1, 6) THEN 'English'
    WHEN periods.period_num IN (2, 7) THEN 'Mathematics'
    WHEN periods.period_num IN (3, 8) THEN 'Science'
    WHEN periods.period_num = 4 THEN 'Social Studies'
    WHEN periods.period_num = 5 THEN 'Religious Ed'
  END AS subject,
  -- Teacher: Patrick takes English for P4V/P + P5V/P; Mary takes Math for P3V/P + P4V/P
  CASE
    WHEN periods.period_num IN (1, 6) AND streams.s IN ('P4V','P4P','P5V','P5P')
      THEN (SELECT id FROM patrick)
    WHEN periods.period_num IN (2, 7) AND streams.s IN ('P3V','P3P','P4V','P4P')
      THEN (SELECT id FROM mary)
    ELSE NULL
  END AS teacher_id,
  'Period ' || periods.period_num AS label
FROM days
CROSS JOIN periods
CROSS JOIN streams;

-- ──────────────────────────────────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────────────────────────────────
SELECT
  day_of_week,
  COUNT(*) AS slots,
  COUNT(teacher_id) AS assigned_slots,
  COUNT(*) FILTER (WHERE teacher_id IS NULL) AS open_slots
FROM timetable_slots
WHERE tenant_id = 'peak-primary'
GROUP BY day_of_week
ORDER BY day_of_week;
