-- ─── Payroll deductions ledger ──────────────────────────────────────────────
-- teacher_payroll (supabase-schema-teachers.sql) holds ONE row per teacher per
-- month with a fixed `amount` — that's the base salary, not a running ledger.
-- Rather than mutate that number in place every time a penalty fires (no audit
-- trail, races between concurrent writes, no way to see *why* pay changed),
-- this adds a separate append-only ledger. Net pay for a month = the
-- teacher_payroll.amount for that month minus the sum of this table's rows
-- for the same teacher_id + month. Matches the same ledger pattern already
-- used for `fees` (charge/payment rows) rather than a single mutable balance.

CREATE TABLE IF NOT EXISTS payroll_deductions (
  id            bigserial PRIMARY KEY,
  tenant_id     text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id    bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month         date NOT NULL,               -- first of the month, matches teacher_payroll.month
  amount        numeric(14,2) NOT NULL,      -- positive = amount deducted
  reason        text NOT NULL,               -- 'late_checkin' | 'syllabus_incomplete' | 'other'
  reference_id  text,                        -- e.g. the teacher_checkins.id or syllabus_coverage.id this came from
  notes         text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_teacher_month
  ON payroll_deductions (teacher_id, month);

-- Same permissive-RLS pattern already live on teacher_checkins/student_roll_call/
-- students/timetable_slots (see supabase-roll-call-system.sql) — this app
-- resolves the logged-in teacher by matching profile email/name against the
-- teachers table client-side rather than via auth.uid()-backed RLS (the
-- `users` table backing current_teacher_id() has 0 rows in production), so
-- strict per-row RLS here would just silently block every insert.
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_deductions_all ON payroll_deductions;
CREATE POLICY payroll_deductions_all ON payroll_deductions
  FOR ALL USING (true) WITH CHECK (true);

-- One deduction per teacher per reason per day for automated reasons
-- (late_checkin), so a flaky network retry can't double-penalize someone.
-- created_at::date isn't allowed here — a timestamptz->date cast depends on
-- the session's timezone setting, so Postgres rejects it as non-IMMUTABLE
-- for an index. `AT TIME ZONE 'UTC'` with a literal zone name is immutable
-- (doesn't depend on any session setting), so cast through that instead.
CREATE UNIQUE INDEX IF NOT EXISTS uq_late_checkin_per_teacher_per_day
  ON payroll_deductions (teacher_id, reason, ((created_at AT TIME ZONE 'UTC')::date))
  WHERE reason = 'late_checkin';
