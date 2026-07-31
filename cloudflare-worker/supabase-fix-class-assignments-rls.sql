-- ─── The REAL class_assignments bug: restrictive RLS, not missing data ─────
--
-- Discovery: class_assignments has had the correct 10 rows for KABSLILY
-- since 2026-07-29 (created_at timestamps match the teachers' own import,
-- two days before this session). It was never empty. What's actually
-- broken: this table has a restrictive RLS policy (see the "scoped_select"
-- policy referenced in supabase-schema-teachers.sql, tied to
-- current_teacher_id() via auth.uid() — which never resolves since the
-- users table has 0 rows), unlike every sibling table in this schema
-- (teachers, students, fees, teacher_checkins, etc.), which all use a
-- permissive `USING (true)` policy.
--
-- Verified directly: the anon key — the same key teacher-view.jsx uses —
-- gets an empty array back from the EXACT query the app runs
-- (select id,stream,subject,is_class_teacher where teacher_id=eq.120),
-- despite a service-role query confirming 10 real rows exist for that
-- teacher. This is why "no classes assigned" showed in the UI, and why
-- every content-range check this session read 0 — RLS was hiding real
-- data, not reporting an empty table. The class-assignments INSERT
-- migration this session chased was solving a problem that didn't exist;
-- this is the fix that was actually needed the whole time.

ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scoped_select ON class_assignments;
DROP POLICY IF EXISTS class_assignments_all ON class_assignments;
CREATE POLICY class_assignments_all ON class_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- Verify: this should now return real rows via the same query the app uses.
SELECT id, teacher_id, stream, subject, is_class_teacher
FROM class_assignments
WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre'
ORDER BY stream;
