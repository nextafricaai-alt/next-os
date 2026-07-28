-- Migration: School Finance Ledgers (Income & Expenses)
-- Run this in the Supabase SQL Editor

-- 1. Create school_income table
CREATE TABLE IF NOT EXISTS school_income (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date              timestamp with time zone DEFAULT now(),
  student_name      text NOT NULL,
  class             text,
  source_type       text NOT NULL,
  amount            numeric(14,2) NOT NULL,
  unspent_balance   numeric(14,2) NOT NULL,
  payment_method    text NOT NULL,
  received_by       text,
  notes             text,
  logged_by         text
);

-- 2. Create school_expenses table
CREATE TABLE IF NOT EXISTS school_expenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date              timestamp with time zone DEFAULT now(),
  category          text NOT NULL,
  description       text NOT NULL,
  amount            numeric(14,2) NOT NULL,
  paid_to           text,
  income_source_id  uuid REFERENCES school_income(id) ON DELETE SET NULL,
  notes             text,
  receipt_attached  boolean DEFAULT false,
  logged_by         text
);

-- 3. Enable RLS
ALTER TABLE school_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_expenses ENABLE ROW LEVEL SECURITY;

-- 4. Apply Tenant Isolation Policies (assumes current_tenant_id() function exists)
CREATE POLICY tenant_isolation ON school_income
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON school_expenses
  FOR ALL USING (tenant_id = current_tenant_id());

-- 5. Enable Realtime
-- This tells Supabase to broadcast changes via websockets
alter publication supabase_realtime add table school_income;
alter publication supabase_realtime add table school_expenses;
