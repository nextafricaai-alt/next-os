-- Rescue KABSLILY (and the rest of the fleet) from the Fleet Dashboard.
--
-- Root cause: the `tenants` directory table is empty in production, so
-- os-data.jsx / NEXT OS.html fall back to local directory entries and KABSLILY
-- has no persistent Fleet row, even
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
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
DROP POLICY IF EXISTS "Public read" ON public.tenants;
DROP POLICY IF EXISTS "Public access" ON public.tenants;
DROP POLICY IF EXISTS "Public write" ON public.tenants;
DROP POLICY IF EXISTS "Public update" ON public.tenants;
DROP POLICY IF EXISTS "Public delete" ON public.tenants;
DROP POLICY IF EXISTS "Fleet operators manage directory" ON public.tenants;
CREATE POLICY "Public read" ON public.tenants
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Fleet operators manage directory" ON public.tenants
  FOR ALL TO authenticated
  USING (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  )
  WITH CHECK (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  );
GRANT SELECT ON public.tenants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tenants FROM anon;

-- 2. Seed / refresh the three known tenants. KPIs for kabs-lily and
--    peak-primary are computed live from their real students/fees/teachers
--    rows so they don't drift from reality. The old charis-childcare ID is
--    retained as Pikadon's stable directory ID; its unrelated demo KPIs are
--    cleared until Pikadon has real signals.

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
  'Pikadon',
  'childcare', 'Uganda', NULL, 'catalyst', 'active',
  jsonb_build_object(
    'currency', 'UGX',
    'health', 'unknown',
    'lastSignalAt', 'awaiting first signal',
    'prototypeUrl', NULL,
    'kpis', jsonb_build_object('revenue', 0, 'expenses', 0),
    'verticalKpis', '{}'::jsonb,
    'latest', NULL
  )
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  meta = tenants.meta || EXCLUDED.meta,
  updated_at = now();
