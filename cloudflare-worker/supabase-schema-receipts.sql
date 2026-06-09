-- ============================================================================
-- NEXT Schools OS — receipts table
-- Run this in the Schools OS Supabase (project llxhvqkkgftqwefmrofn) SQL editor.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS receipts (
  id             bigserial PRIMARY KEY,
  tenant_id      text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_no     text NOT NULL,                       -- human-friendly, e.g. BF-2026-000123
  student_id     bigint REFERENCES students(id) ON DELETE SET NULL,
  student_name   text,
  guardian_name  text,
  guardian_phone text,
  amount         numeric(14,2) NOT NULL,              -- positive amount received
  currency       text DEFAULT 'UGX',
  kind           text DEFAULT 'fees',                 -- fees | other
  method         text,                                -- cash | momo | mpesa | bank
  reference      text,                                -- payment reference / txn id
  balance_after  numeric(14,2),                       -- student balance after this payment
  term           text,
  issued_by      text,                                -- name/email of the person who issued it
  fee_id         bigint REFERENCES fees(id) ON DELETE SET NULL,
  issued_at      timestamptz DEFAULT now(),
  UNIQUE (tenant_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS receipts_tenant_idx     ON receipts (tenant_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS receipts_tenant_no_idx  ON receipts (tenant_id, receipt_no);

-- Tenant isolation (same pattern as students/fees). USING also governs INSERT here.
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON receipts;
CREATE POLICY tenant_isolation ON receipts
  FOR ALL USING (tenant_id = current_tenant_id());

-- Grants: authenticated/anon respect RLS; service_role (the worker / Nia) bypasses it.
GRANT ALL ON receipts TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE receipts_id_seq TO authenticated, anon, service_role;

-- ============================================================================
-- DONE.
-- ============================================================================
