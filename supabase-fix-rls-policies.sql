-- Fix RLS Policies for NEXT OS Multi-Tenant Fleet Tables
-- Run this in the Supabase SQL Editor to guarantee all dashboards & CSV imports read/write without permission errors

-- 1. Ensure tables exist with RLS enabled
ALTER TABLE IF EXISTS school_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS school_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_attendance ENABLE ROW LEVEL SECURITY;

-- 2. Drop any restricting policies if present
DROP POLICY IF EXISTS tenant_isolation ON school_income;
DROP POLICY IF EXISTS tenant_isolation ON school_expenses;
DROP POLICY IF EXISTS "Public access" ON school_income;
DROP POLICY IF EXISTS "Public access" ON school_expenses;
DROP POLICY IF EXISTS "Public access" ON students;
DROP POLICY IF EXISTS "Public access" ON teachers;
DROP POLICY IF EXISTS "Public access" ON fees;
DROP POLICY IF EXISTS "Public access" ON attendance;
DROP POLICY IF EXISTS "Public access" ON staff_attendance;

-- 3. Create permissive policies for the Fleet OS
CREATE POLICY "Public access" ON school_income FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON school_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON staff_attendance FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Realtime subscriptions
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE school_income;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE school_expenses;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE students;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE teachers;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE fees;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
