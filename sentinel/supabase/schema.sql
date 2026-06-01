-- ============================================================================
-- NEXT OS — Supabase schema for multi-tenant Sentinel supervision
-- ============================================================================
-- This is the spine of the mothership. Three core tables:
--   1. tenants         — every ship in the fleet (one row per client)
--   2. health_signals  — the data stream coming up from each ship
--   3. advisories      — what Sentinel sends back down
--
-- Supabase Realtime is enabled on advisories so the frontend Sentinel panel
-- subscribes to a channel and replaces the localhost WebSocket without any
-- protocol change. The payload shape matches what ws-bridge already emits.
--
-- Row-Level Security (RLS) ensures each tenant only sees their own data,
-- while the NEXT team (service_role) sees everything.
-- ============================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums --------------------------------------------------------------------
do $$ begin
  create type vertical as enum (
    'school', 'hospital', 'home', 'ngo', 'company', 'church', 'organisation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type advisory_severity as enum ('info', 'warn', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type advisory_type as enum (
    'financial-leak',
    'enrollment-drop',
    'capacity-warning',
    'energy-cost-spike',
    'inventory-risk',
    'donor-drought',
    'burn-rate-warning'
  );
exception when duplicate_object then null; end $$;

-- 1. tenants ---------------------------------------------------------------
-- Every ship in the fleet. A school, a hospital, a family, etc.
create table if not exists tenants (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,        -- e.g. 'st-marys-demo'
  name            text not null,               -- 'St. Mary's Demo School'
  vertical        vertical not null,
  country         text,
  currency        text default 'UGX',
  profile         jsonb not null,              -- the full template-engine profile
  data_source     jsonb,                       -- TenantDataSource (encrypted at app layer)
  sentinel_secret text not null default encode(gen_random_bytes(32), 'hex'),
  active          boolean not null default true,
  onboarded_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_tenants_vertical on tenants(vertical);
create index if not exists idx_tenants_active   on tenants(active);

-- 2. health_signals --------------------------------------------------------
-- The stream coming up from each ship. Append-only.
create table if not exists health_signals (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  captured_at timestamptz not null,
  vertical    vertical not null,
  kpis        jsonb not null,                  -- the vertical-specific KPI payload
  signature   text not null,                   -- HMAC of payload + tenant_secret
  notes       text,
  ingested_at timestamptz not null default now()
);

create index if not exists idx_health_signals_tenant_time
  on health_signals(tenant_id, captured_at desc);

-- 3. advisories ------------------------------------------------------------
-- What Sentinel says back. Realtime channel sits on top of this table.
create table if not exists advisories (
  id                       uuid primary key default uuid_generate_v4(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  emitted_at               timestamptz not null default now(),
  vertical                 vertical not null,
  advisory_type            advisory_type not null,
  severity                 advisory_severity not null,
  title                    text not null,
  message                  text not null,
  recommended_actions      jsonb not null default '[]'::jsonb,
  evidence                 jsonb not null default '{}'::jsonb,
  human_approval_required  boolean not null default true,
  acknowledged_at          timestamptz,
  acknowledged_by          text
);

create index if not exists idx_advisories_tenant_time
  on advisories(tenant_id, emitted_at desc);

-- Realtime: turn on for advisories so the frontend can subscribe ----------
alter publication supabase_realtime add table advisories;

-- Row-Level Security -------------------------------------------------------
-- Each tenant can only see their own rows. The NEXT team uses service_role
-- which bypasses RLS.
alter table tenants         enable row level security;
alter table health_signals  enable row level security;
alter table advisories      enable row level security;

-- Tenants: a logged-in user can only see the tenant matching their JWT claim.
create policy tenant_self_select on tenants
  for select using (id::text = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

create policy health_self_select on health_signals
  for select using (tenant_id::text = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

create policy advisories_self_select on advisories
  for select using (tenant_id::text = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

-- ============================================================================
-- Notes for future passes
-- ============================================================================
-- * Once the agent grows from advisor to semi-autonomous, add a `repair_actions`
--   table to log what was attempted and what was approved.
-- * For the WhatsApp wow moment, add `channels` table linking tenants to their
--   messaging endpoints (WhatsApp Business numbers, etc.).
-- * `tenants.data_source` connection strings must be encrypted application-side
--   before insert. Supabase Vault is the right home for the encryption keys.
