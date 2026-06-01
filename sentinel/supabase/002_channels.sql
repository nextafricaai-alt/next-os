-- ============================================================================
-- NEXT OS — Supabase schema extension: channels + WhatsApp deliveries
-- ============================================================================
-- A tenant can have multiple channels (WhatsApp, SMS, email, voice) that
-- Sentinel uses to reach the leader. The `kind` field is the channel type;
-- the `address` field is the channel-specific destination.
--
-- whatsapp_deliveries logs every send attempt. We need this for:
--   * Debugging "the leader didn't get the message"
--   * Cost tracking (each Twilio message is billable)
--   * Compliance (showing the leader was notified)
-- ============================================================================

do $$ begin
  create type channel_kind as enum ('whatsapp', 'sms', 'email', 'voice');
exception when duplicate_object then null; end $$;

-- channels: one row per tenant per channel kind
create table if not exists channels (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  kind        channel_kind not null,
  address     text not null,                -- e.g. "256701234567" for whatsapp
  display_name text,                        -- e.g. "Head Teacher mobile"
  enabled     boolean not null default true,
  added_at    timestamptz not null default now(),
  unique (tenant_id, kind, address)
);
create index if not exists idx_channels_tenant on channels(tenant_id);

-- whatsapp_deliveries: every send attempt
create table if not exists whatsapp_deliveries (
  id              uuid primary key default uuid_generate_v4(),
  advisory_id     uuid not null references advisories(id) on delete cascade,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  to_address      text not null,
  attempted_at    timestamptz not null default now(),
  success         boolean not null,
  twilio_sid      text,
  error_code      integer,
  error_message   text
);
create index if not exists idx_wa_deliveries_advisory on whatsapp_deliveries(advisory_id);
create index if not exists idx_wa_deliveries_tenant   on whatsapp_deliveries(tenant_id);

-- RLS: tenants see only their own channels + delivery logs
alter table channels             enable row level security;
alter table whatsapp_deliveries  enable row level security;

create policy channels_self_select on channels
  for select using (tenant_id::text = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

create policy wa_deliveries_self_select on whatsapp_deliveries
  for select using (tenant_id::text = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');
