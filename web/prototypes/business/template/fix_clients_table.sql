-- ============================================================
-- CharisOS Cloud — Clients Table Fix
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── STEP 1: Add missing columns to the clients table ─────────
-- These columns were added to the app but never migrated to the DB.
-- "ADD COLUMN IF NOT EXISTS" is safe to run even if some already exist.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS wedding_date      TEXT    DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral          TEXT    DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS added_date        TEXT    DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_retainer       BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_rate      INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS retainer_start    TEXT    DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS retainer_services TEXT    DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS retainer_template JSONB   DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS retainer_log      JSONB   DEFAULT '[]';

-- ── STEP 2: Fix is_admin() to match the app's actual role names ─
-- The app stores roles as 'Owner', 'PA', 'Director', 'Staff' etc.
-- The old is_admin() only checked for 'Admin' which nobody has,
-- so ALL write operations on clients/team/equipment/invoices/expenses
-- were silently blocked by RLS.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND app_role IN ('Admin', 'Owner', 'PA')
  );
$$;

-- ── STEP 3: Fix the clients_write RLS policy ─────────────────
-- Add WITH CHECK so INSERT operations are also covered properly.

DROP POLICY IF EXISTS "clients_write" ON clients;
CREATE POLICY "clients_write" ON clients FOR ALL
  USING    (is_admin())
  WITH CHECK (is_admin());

-- ── STEP 4: Fix other write policies that also break ─────────
-- team, equipment, invoices, expenses all use the same is_admin()
-- so they were broken too. The function fix above covers them all,
-- but let's also tighten the WITH CHECK clauses while we're here.

DROP POLICY IF EXISTS "team_insert" ON team;
DROP POLICY IF EXISTS "team_update" ON team;
DROP POLICY IF EXISTS "team_delete" ON team;
CREATE POLICY "team_insert" ON team FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "team_update" ON team FOR UPDATE USING (is_admin());
CREATE POLICY "team_delete" ON team FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "equipment_write" ON equipment;
CREATE POLICY "equipment_write" ON equipment FOR ALL
  USING    (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "invoices_finance" ON invoices;
CREATE POLICY "invoices_finance" ON invoices FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role = 'Accountant'
  ))
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role = 'Accountant'
  ));

DROP POLICY IF EXISTS "expenses_finance" ON expenses;
CREATE POLICY "expenses_finance" ON expenses FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role = 'Accountant'
  ))
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND app_role = 'Accountant'
  ));

-- ── Done ─────────────────────────────────────────────────────
-- After running this, client saves, team edits, equipment changes,
-- invoices, and expenses will all work correctly for Owner and PA.
