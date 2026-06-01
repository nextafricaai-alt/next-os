-- Migration: add check-out tracking to teacher_checkins
-- Run this once. Re-running is safe (IF NOT EXISTS guards).

ALTER TABLE teacher_checkins
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

-- Teacher can update their own check-in to set checked_out_at
DROP POLICY IF EXISTS teacher_checkins_update_own ON teacher_checkins;
CREATE POLICY teacher_checkins_update_own ON teacher_checkins FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() IN ('admin','head')
      OR teacher_id = current_teacher_id()
    )
  );

-- Verify the column landed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teacher_checkins' AND column_name = 'checked_out_at';
