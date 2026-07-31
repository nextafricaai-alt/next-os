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
-- Fix: add every table this app subscribes to into the publication. Safe,
-- additive, instantly reversible (DROP the table from the publication to
-- undo), and doesn't touch any existing data or RLS policy.

ALTER PUBLICATION supabase_realtime ADD TABLE student_roll_call;
ALTER PUBLICATION supabase_realtime ADD TABLE student_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE student_health_records;
ALTER PUBLICATION supabase_realtime ADD TABLE fees;
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE teachers;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE syllabus_coverage;
ALTER PUBLICATION supabase_realtime ADD TABLE lesson_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE school_income;
ALTER PUBLICATION supabase_realtime ADD TABLE school_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_attendance;
-- Only needed once supabase-communications-hub.sql has been run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- Only needed once supabase-payroll-deductions.sql has been run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE payroll_deductions;

-- If any ALTER above errors with "relation is already member of
-- publication", that table's already covered — safe to skip/re-run
-- the rest. If a table doesn't exist yet (payroll_deductions,
-- messages), run this only after that table's own migration.

-- Verify what's actually in the publication after running the above:
SELECT schemaname, tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' ORDER BY tablename;
