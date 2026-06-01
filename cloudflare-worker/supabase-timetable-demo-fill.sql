-- ─── Timetable Demo Fill ───────────────────────────────────────────────────
-- Re-seeds Peak's timetable so MOST slots are assigned to Patrick or Mary.
-- This isn't realistic for a real school (a teacher can't be in 14 streams
-- at once), but it makes the head teacher's color-coded panel come alive.
--
-- After running this:
--   - Future periods today  → ORANGE (pending)
--   - Past periods today    → RED (no roll call taken)
--   - Current period today  → RED or ORANGE
--   - Once teachers take rolls → those cells turn GREEN
--
-- Also: inserts a demo check-in for Patrick (so his current period would be
-- ORANGE not RED) and a sample roll call (so one cell goes GREEN).

-- 1. Wipe and re-seed timetable with denser assignments
DELETE FROM timetable_slots WHERE tenant_id = 'peak-primary';

WITH t AS (SELECT id, full_name FROM teachers WHERE tenant_id = 'peak-primary'),
patrick AS (SELECT id FROM t WHERE full_name = 'Patrick Ssemakula' LIMIT 1),
mary    AS (SELECT id FROM t WHERE full_name = 'Mary Namutebi'     LIMIT 1),
periods AS (
  SELECT * FROM (VALUES
    (1, TIME '08:00', TIME '08:40'),
    (2, TIME '08:40', TIME '09:20'),
    (3, TIME '09:20', TIME '10:00'),
    (4, TIME '10:30', TIME '11:10'),
    (5, TIME '11:10', TIME '11:50'),
    (6, TIME '13:30', TIME '14:10'),
    (7, TIME '14:10', TIME '14:50'),
    (8, TIME '14:50', TIME '15:30')
  ) AS p(period_num, start_t, end_t)
),
streams AS (
  SELECT s, row_number() OVER () AS stream_idx FROM (VALUES
    ('P1V'),('P1P'),('P2V'),('P2P'),('P3V'),('P3P'),('P4V'),('P4P'),
    ('P5V'),('P5P'),('P6V'),('P6P'),('P7V'),('P7P')
  ) AS x(s)
),
days AS (SELECT d FROM generate_series(1, 5) d)
INSERT INTO timetable_slots
  (tenant_id, day_of_week, period, start_time, end_time, stream, subject, teacher_id, label)
SELECT
  'peak-primary',
  days.d,
  periods.period_num,
  periods.start_t,
  periods.end_t,
  streams.s,
  CASE (periods.period_num + streams.stream_idx) % 5
    WHEN 0 THEN 'English'
    WHEN 1 THEN 'Mathematics'
    WHEN 2 THEN 'Science'
    WHEN 3 THEN 'Social Studies'
    WHEN 4 THEN 'Religious Ed'
  END,
  -- Alternate Patrick and Mary across streams so every slot is covered for the demo
  CASE (periods.period_num + streams.stream_idx) % 2
    WHEN 0 THEN (SELECT id FROM patrick)
    ELSE        (SELECT id FROM mary)
  END,
  'Period ' || periods.period_num
FROM days CROSS JOIN periods CROSS JOIN streams;

-- 2. Insert today's demo check-in for Patrick (if not already)
-- Only if Patrick exists and hasn't already checked in today
INSERT INTO teacher_checkins (tenant_id, teacher_id, checked_in_at, method)
SELECT
  'peak-primary',
  (SELECT id FROM teachers WHERE full_name = 'Patrick Ssemakula' AND tenant_id = 'peak-primary'),
  (CURRENT_DATE + TIME '08:00')::timestamptz,
  'demo'
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_checkins
  WHERE tenant_id = 'peak-primary'
    AND teacher_id = (SELECT id FROM teachers WHERE full_name = 'Patrick Ssemakula' AND tenant_id = 'peak-primary')
    AND checked_in_at >= CURRENT_DATE
);

-- 3. Insert a demo roll call so ONE cell goes GREEN (Patrick / P4V if assigned to him)
-- Pick one stream Patrick "teaches" today (whatever the demo assignment puts him on at P1)
INSERT INTO student_roll_call (tenant_id, student_id, teacher_id, stream, status, roll_date)
SELECT
  'peak-primary',
  st.id,
  ts.teacher_id,
  ts.stream,
  'present',
  CURRENT_DATE
FROM timetable_slots ts
JOIN students st ON st.tenant_id = ts.tenant_id AND st.stream = ts.stream
WHERE ts.tenant_id = 'peak-primary'
  AND ts.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)
  AND ts.period = 1
  AND ts.teacher_id = (SELECT id FROM teachers WHERE full_name = 'Patrick Ssemakula' AND tenant_id = 'peak-primary')
ON CONFLICT (student_id, roll_date) DO NOTHING;

-- 4. Verify
SELECT
  'Slots seeded'              AS metric, COUNT(*)::text AS value FROM timetable_slots WHERE tenant_id = 'peak-primary'
UNION ALL
SELECT 'Patrick check-ins today', COUNT(*)::text FROM teacher_checkins
  WHERE tenant_id = 'peak-primary' AND checked_in_at >= CURRENT_DATE
UNION ALL
SELECT 'Demo roll calls today',   COUNT(*)::text FROM student_roll_call
  WHERE tenant_id = 'peak-primary' AND roll_date = CURRENT_DATE;
