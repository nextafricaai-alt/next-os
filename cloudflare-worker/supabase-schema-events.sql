-- Per-school calendar events. Run once in Supabase.
create table if not exists school_events (
  id         bigint generated always as identity primary key,
  tenant_id  text not null,
  title      text not null,
  date       date not null,
  type       text default 'event',   -- event | exam | meeting | term | trip | holiday
  created_at timestamptz default now()
);
create index if not exists school_events_idx on school_events (tenant_id, date);
alter table school_events enable row level security;
do $$ begin execute 'drop policy if exists tenant_rw on school_events'; exception when others then null; end $$;
create policy tenant_rw on school_events for all using (true) with check (true);
grant all on school_events to service_role;
