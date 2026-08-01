-- ─── Live Shuttle Tracking: real cross-device sync ──────────────────────────
-- Found while building this: transport-telemetry.js and driver-view.jsx have
-- REAL browser GPS (navigator.geolocation) but only ever write to
-- localStorage — grepped both files for fetch/supabase/sb./.from(: zero
-- hits. That means a driver's live position never leaves their own
-- browser, so a Headteacher (on a different device) can never actually see
-- it — "live tracking" was real on one screen and nonexistent everywhere
-- else. These two tables + the worker's /transport/* routes are the actual
-- cross-device sync layer.

-- One row per van, upserted on every GPS ping — this is "where is the van
-- right now", not a location history log.
CREATE TABLE IF NOT EXISTS transport_positions (
  tenant_id     text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  van_id        text NOT NULL,
  van_name      text,
  driver_name   text,
  driver_phone  text,
  lat           double precision,
  lng           double precision,
  speed_kmh     numeric(6,2),
  heading       numeric(6,2),
  status        text DEFAULT 'normal',   -- 'normal' | 'stopped' | 'arrived'
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, van_id)
);

-- The pickup queue: which students are on which van, in what order, and
-- their current leg status. pickup_order is a plain integer so the
-- Headteacher's "next pickup" view is just ORDER BY pickup_order for
-- whoever is still 'waiting'.
CREATE TABLE IF NOT EXISTS transport_students (
  id            bigserial PRIMARY KEY,
  tenant_id     text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  van_id        text NOT NULL,
  student_id    bigint REFERENCES students(id) ON DELETE CASCADE,
  student_name  text NOT NULL,           -- denormalized so the queue UI works even if student_id is unset
  stream        text,
  stop_name     text,
  pickup_order  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'waiting',  -- 'waiting' | 'on_board' | 'arrived'
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transport_students_van_idx ON transport_students (tenant_id, van_id, pickup_order);

ALTER TABLE transport_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transport_positions_all ON transport_positions;
DROP POLICY IF EXISTS transport_students_all ON transport_students;
-- Permissive, matching this schema's general pattern (see the note in
-- supabase-parent-rls-remediation-plan.sql on why — no real auth accounts
-- exist yet to key strict RLS off). Nothing here is as sensitive as the
-- registration_requests/payroll tables, so this follows the norm rather
-- than the worker-only lockdown those get.
CREATE POLICY transport_positions_all ON transport_positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY transport_students_all ON transport_students FOR ALL USING (true) WITH CHECK (true);

-- Add to the realtime publication so the Headteacher's map/queue update
-- live (safe to re-run cloudflare-worker/supabase-enable-realtime.sql,
-- which already includes these two table names).
