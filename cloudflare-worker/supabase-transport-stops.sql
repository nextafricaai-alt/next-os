-- ─── Real per-student pickup markers: transport_stops ───────────────────────
--
-- The goal asked for "actual student location coordinates" on the
-- Headteacher's live map, not just the van. Tried geocoding the informal
-- stop names already in transport_students (Kiseka Road, Forest Park,
-- Kalambi, ...) against OpenStreetMap/Nominatim to get real coordinates
-- automatically — the results were actively wrong and dangerous to show on
-- a child-safety map: "Forest Park" resolved to Bwindi Forest National
-- Park, ~500km away in a different region; "Kalambi" resolved to a village
-- on Buvuma, an island in Lake Victoria. Auto-geocoding informal local
-- landmark names is not reliable enough to plot a real child's pickup
-- point, so this does not fabricate coordinates.
--
-- Instead: a small reference table staff fill in ONCE per real stop name
-- (via the Transport screen's own UI), with real coordinates they confirm
-- themselves (e.g. by tapping the actual location on the map, or entering
-- coordinates they already know). Every transport_students row sharing
-- that stop_name then gets a real, staff-confirmed marker. Stops with no
-- entry here simply don't render a pin — never a guessed one.

CREATE TABLE IF NOT EXISTS transport_stops (
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stop_name   text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  set_by      text,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, stop_name)
);

ALTER TABLE transport_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transport_stops_all ON transport_stops;
-- Same permissive pattern as transport_positions/transport_students —
-- nothing here is more sensitive than a shuttle stop name and a map pin.
CREATE POLICY transport_stops_all ON transport_stops FOR ALL USING (true) WITH CHECK (true);
