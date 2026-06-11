-- Per-school structure config (primary vs secondary, classes, subjects, A-level combinations). Run once.
create table if not exists school_config (
  tenant_id    text primary key,
  type         text default 'primary',     -- primary | secondary
  classes      jsonb default '[]'::jsonb,   -- ["S1","S2",...] or ["P1V","P1P",...]
  subjects     jsonb default '[]'::jsonb,
  combinations jsonb default '[]'::jsonb,   -- [{ "name":"PCM", "subjects":["Physics","Chemistry","Mathematics"], "classes":["S5","S6"] }]
  updated_at   timestamptz default now()
);
alter table school_config enable row level security;
do $$ begin execute 'drop policy if exists tenant_rw on school_config'; exception when others then null; end $$;
create policy tenant_rw on school_config for all using (true) with check (true);
grant all on school_config to service_role;
