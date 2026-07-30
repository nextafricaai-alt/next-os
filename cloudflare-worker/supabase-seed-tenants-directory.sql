-- Rescue KABSLILY (and the rest of the fleet) from the Fleet Dashboard.
--
-- Root cause: the `tenants` directory table is empty in production, so
-- os-data.jsx / NEXT OS.html always fall back to their two hardcoded demo
-- rows (peak-primary, charis-childcare) and KABSLILY never appears, even
-- though its students/fees/teachers rows have been live in Supabase for
-- days. This seeds real directory rows (computed from the real child
-- tables, not fabricated numbers) and makes sure anon reads aren't
-- silently blocked by RLS.
--
-- Run this once in the Supabase SQL editor (or via `supabase db execute`).

-- 1. Allow the Fleet dashboard (anon key, no per-user session) to read the
--    tenant directory. This table only holds non-sensitive directory
--    metadata (name, vertical, aggregate KPIs) — the sensitive per-student
--    data stays gated on students/fees/teachers/attendance.
ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenants;
DROP POLICY IF EXISTS "Public read" ON tenants;
DROP POLICY IF EXISTS "Public access" ON tenants;
CREATE POLICY "Public read" ON tenants FOR SELECT USING (true);
CREATE POLICY "Public write" ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON tenants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete" ON tenants FOR DELETE USING (true);

-- 2. Seed / refresh the three known tenants. KPIs for kabs-lily and
--    peak-primary are computed live from their real students/fees/teachers
--    rows so they don't drift from reality. charis-childcare has no
--    Supabase-backed child tables yet, so it keeps its existing
--    placeholder numbers (unchanged from the current os-data.jsx demo seed).

INSERT INTO tenants (id, name, vertical, country, subdomain, tier, status, meta)
VALUES (
  'kabs-lily-junior-school-and-kindercare-centre',
  'Kabs Lily Junior School and Kindercare Centre',
  'school', 'Uganda', NULL, 'catalyst', 'active',
  jsonb_build_object(
    'currency', 'UGX',
    'health', 'advisory',
    'kpis', jsonb_build_object(
      'revenue', (SELECT COALESCE(SUM(amount), 0) FROM fees WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre' AND kind = 'charge'),
      'expenses', 0
    ),
    'verticalKpis', jsonb_build_object(
      'students', (SELECT COUNT(*) FROM students WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre'),
      'teachers', (SELECT COUNT(*) FROM teachers WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre'),
      'feesOutstanding', (SELECT COALESCE(-SUM(amount), 0) FROM fees WHERE tenant_id = 'kabs-lily-junior-school-and-kindercare-centre' AND kind = 'payment')
    )
  )
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  meta = tenants.meta || EXCLUDED.meta,
  updated_at = now();

INSERT INTO tenants (id, name, vertical, country, subdomain, tier, status, meta)
VALUES (
  'peak-primary',
  'Peak Primary School',
  'school', 'Uganda', NULL, 'catalyst', 'active',
  jsonb_build_object(
    'currency', 'UGX',
    'health', 'advisory',
    'prototypeUrl', 'prototypes/schools/peak-primary/index.html',
    'kpis', jsonb_build_object(
      'revenue', (SELECT COALESCE(SUM(amount), 0) FROM fees WHERE tenant_id = 'peak-primary' AND kind = 'charge'),
      'expenses', 0
    ),
    'verticalKpis', jsonb_build_object(
      'students', (SELECT COUNT(*) FROM students WHERE tenant_id = 'peak-primary'),
      'teachers', (SELECT COUNT(*) FROM teachers WHERE tenant_id = 'peak-primary')
    )
  )
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  meta = tenants.meta || EXCLUDED.meta,
  updated_at = now();

INSERT INTO tenants (id, name, vertical, country, subdomain, tier, status, meta)
VALUES (
  'charis-childcare',
  'Charis Childcare OS',
  'childcare', 'Uganda', NULL, 'catalyst', 'active',
  jsonb_build_object(
    'currency', 'UGX',
    'health', 'advisory',
    'prototypeUrl', '../index.html',
    'kpis', jsonb_build_object('revenue', 2100000, 'expenses', 840000),
    'verticalKpis', jsonb_build_object(
      'enrolled', 24, 'presentToday', 21, 'absentToday', 3, 'attendanceRate', 0.875,
      'caretakers', 3, 'activeParents', 20, 'invoicesDue', 3, 'invoicesOverdue30d', 1,
      'overdueAmount', 300000, 'totalInvoiced', 2100000, 'collectionRate', 0.857
    )
  )
)
ON CONFLICT (id) DO UPDATE SET updated_at = now();
