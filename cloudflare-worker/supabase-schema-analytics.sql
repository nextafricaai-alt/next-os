-- ============================================================================
-- NEXT OS — first-party site analytics (events)
-- Run in the Supabase SQL editor (project llxhvqkkgftqwefmrofn). Safe to re-run.
-- Events are written by the Nia worker (service_role); browsers never touch the DB.
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_events (
  id        bigserial PRIMARY KEY,
  site      text NOT NULL,                 -- e.g. 'puritymukisa.com'
  type      text NOT NULL DEFAULT 'pageview', -- pageview | signin | signup | conversion | event
  path      text,
  referrer  text,
  session   text,                          -- anonymous session id (no PII)
  label     text,                          -- e.g. 'ticket_purchase', 'newsletter'
  value     numeric,                       -- optional amount (e.g. sale value)
  country   text,
  ua        text,
  ts        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_events_site_ts_idx  ON site_events (site, ts DESC);
CREATE INDEX IF NOT EXISTS site_events_type_idx     ON site_events (site, type, ts DESC);

-- Lock it down: only the worker's service_role touches this (it bypasses RLS).
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON site_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE site_events_id_seq TO service_role;

-- ============================================================================
-- DONE.
-- ============================================================================
