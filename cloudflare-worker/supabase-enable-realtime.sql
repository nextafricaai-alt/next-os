-- ─── Root cause of "real-time sync isn't actually live" ────────────────────
--
-- Verified directly (Node script, real network, outside any browser sandbox):
-- a Supabase JS client subscribed cleanly (status: SUBSCRIBED) to
-- student_roll_call with NO filter and event:'*', then an INSERT into that
-- table produced ZERO postgres_changes events after 12 seconds. Same result
-- with a real school-shaped row (tenant_id, teacher_id, student_id, stream,
-- status, period_number, roll_date matching the live schema).
--
-- Cause: a table only emits postgres_changes events if it has been added to
-- Postgres's `supabase_realtime` publication — this is a separate step from
-- creating the table or writing correct RLS. None of this repo's SQL files
-- (supabase-schema.sql, supabase-schema-teachers.sql,
-- supabase-roll-call-system.sql, supabase-schema-attendance-health.sql, the
-- new supabase-communications-hub.sql, etc.) contain an ALTER PUBLICATION
-- statement — grepped the whole cloudflare-worker/ directory, zero hits.
--
-- Practical effect: every `.channel(...).on('postgres_changes', ...)`
-- subscription in this app — teacher-view.jsx's roll-call/health-record
-- watchers, head-staff-panel.jsx's staff/roll-call/syllabus watchers,
-- parent-view.jsx's fee/roll-call/note/message watchers,
-- school-data-store.js's income/expense/attendance/teacher/fee watchers —
-- has been silently receiving nothing, this whole session and (since no
-- migration ever enabled it) very likely since this schema was first stood
-- up. Where a page also has a setInterval polling fallback (e.g.
-- head-staff-panel.jsx's 30s refresh), the sync still eventually happens,
-- just not "instantly." Where a page has no polling fallback, sync only
-- happens when the viewer manually reloads.
--
-- Turns out `fees` and `teachers` were ALREADY in the publication before
-- this migration (added at some earlier point, not tracked in any repo
-- file) — plain ALTER PUBLICATION ADD TABLE fails hard on a table that's
-- already a member, which stops the whole pasted script partway through in
-- the SQL editor. Rewritten as a DO block that checks pg_publication_tables
-- first and skips anything already present, so this runs cleanly in one
-- shot regardless of what's already been added, in the SQL editor or
-- anywhere else.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'student_roll_call', 'student_notes', 'student_health_records', 'fees',
    'teacher_checkins', 'teachers', 'students', 'syllabus_coverage',
    'lesson_plans', 'school_income', 'school_expenses', 'attendance',
    'staff_attendance', 'messages', 'payroll_deductions', 'class_assignments',
    'registration_requests', 'transport_positions', 'transport_students'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl)
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
       )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- Verify what's actually in the publication after running the above:
SELECT schemaname, tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' ORDER BY tablename;
