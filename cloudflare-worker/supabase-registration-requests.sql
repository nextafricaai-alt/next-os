-- ─── Registration Requests: student/teacher form submissions → Headteacher approval ─
-- New, purely additive table. student-enrollment-form.html and staff-hr-form.html
-- currently only write to localStorage and never reach Supabase at all — this
-- is the real destination for those submissions, plus the queue the
-- Headteacher's Communications tab reads from and approves against.
--
-- Deliberately NOT given a permissive RLS policy like this schema's other
-- tables: submissions can carry bank account numbers, NIN, and health data
-- (see staff-hr-form.html / student-enrollment-form.html fields), so this
-- table has NO client-facing policy at all — every read/write goes through
-- the worker's /registrations/* routes using the service_role key. RLS
-- enabled with zero policies = default deny for the anon key.

CREATE TABLE IF NOT EXISTS registration_requests (
  id                bigserial PRIMARY KEY,
  tenant_id         text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type              text NOT NULL,                    -- 'student' | 'teacher'
  status            text NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'merged' | 'rejected'
  payload           jsonb NOT NULL,                    -- raw form fields
  submitted_at      timestamptz DEFAULT now(),
  reviewed_at       timestamptz,
  reviewed_by       text,
  result_student_id bigint REFERENCES students(id) ON DELETE SET NULL,
  result_teacher_id bigint REFERENCES teachers(id) ON DELETE SET NULL,
  notes             text
);
CREATE INDEX IF NOT EXISTS registration_requests_tenant_status_idx
  ON registration_requests (tenant_id, status, submitted_at);

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY statement — intentional. Nothing except the worker
-- (service_role, bypasses RLS entirely) should ever touch this table.

-- Once this table exists, also add it to the realtime publication so the
-- Headteacher's Communications tab gets an instant push on new submissions
-- (see cloudflare-worker/supabase-enable-realtime.sql — safe to re-run,
-- it only adds tables that exist and aren't already in the publication):
--   ALTER PUBLICATION supabase_realtime ADD TABLE registration_requests;
