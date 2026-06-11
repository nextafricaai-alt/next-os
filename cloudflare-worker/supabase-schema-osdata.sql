-- NEXT OS internal ops data: members, billing/invoices, training. Run once in Supabase.
create table if not exists os_records (
  id         bigint generated always as identity primary key,
  tenant     text not null default 'next',
  kind       text not null,            -- member | invoice | training
  payload    jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists os_records_idx on os_records (tenant, kind, created_at desc);
alter table os_records enable row level security;
do $$ begin execute 'drop policy if exists tenant_rw on os_records'; exception when others then null; end $$;
create policy tenant_rw on os_records for all using (true) with check (true);
grant all on os_records to service_role;
