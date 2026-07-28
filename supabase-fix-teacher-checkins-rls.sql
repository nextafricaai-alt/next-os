-- ====================================================================
-- FIX RLS POLICIES FOR TEACHER CHECKINS & ATTENDANCE TABLES
-- Run this in Supabase SQL Editor to allow teachers to check in freely
-- ====================================================================

-- 1. Create table teacher_checkins if not exists
CREATE TABLE IF NOT EXISTS teacher_checkins (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL,
  teacher_id      bigint,
  checked_in_at   timestamptz DEFAULT now(),
  checked_out_at  timestamptz,
  method          text DEFAULT 'manual'
);

-- 2. Drop restrict RLS policies and allow public access
ALTER TABLE teacher_checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_checkins_public_all ON teacher_checkins;
CREATE POLICY teacher_checkins_public_all ON teacher_checkins FOR ALL USING (true) WITH CHECK (true);

-- 3. Also fix RLS for student_roll_call
CREATE TABLE IF NOT EXISTS student_roll_call (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL,
  teacher_id      bigint,
  student_id      bigint,
  stream          text,
  roll_date       date DEFAULT CURRENT_DATE,
  status          text DEFAULT 'present',
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE student_roll_call DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_roll_call ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_roll_call_public_all ON student_roll_call;
CREATE POLICY student_roll_call_public_all ON student_roll_call FOR ALL USING (true) WITH CHECK (true);
