-- ─── Communications Hub: parent ↔ teacher/head messaging ───────────────────
-- New, purely additive table — doesn't touch any existing data. Threads are
-- keyed by student_id (not a parent_id, since there's no parent auth/login
-- yet — see supabase-parent-rls-remediation-plan.sql), which matches how
-- GuardianLookup already identifies a parent for the rest of the dashboard.
--
-- Safe to run any time; nothing in the app queries this table until this
-- migration has run, so there's no ordering dependency on other scripts.

CREATE TABLE IF NOT EXISTS messages (
  id            bigserial PRIMARY KEY,
  tenant_id     text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    bigint NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sender_role   text NOT NULL,                    -- 'parent' | 'teacher' | 'head' | 'bursar'
  sender_name   text NOT NULL,
  teacher_id    bigint REFERENCES teachers(id) ON DELETE SET NULL,  -- set when sender_role is staff
  body          text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  read_at       timestamptz
);
CREATE INDEX IF NOT EXISTS messages_student_idx ON messages (tenant_id, student_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS messages_all ON messages';
END $$;
-- Matches this table's peers (student_notes, student_roll_call): permissive
-- for now, same known gap tracked in supabase-parent-rls-remediation-plan.sql.
-- The Parent Dashboard itself doesn't rely on this being open — it reads/
-- writes messages through the worker's /messages/* routes (service_role,
-- scoped server-side), same pattern as /parent/child-data.
CREATE POLICY messages_all ON messages FOR ALL USING (true) WITH CHECK (true);
