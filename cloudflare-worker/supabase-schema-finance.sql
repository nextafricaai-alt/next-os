-- NEXT Schools OS — full finance (income/expenses) + assets. Run once in Supabase.
create table if not exists school_finance (
  id          bigint generated always as identity primary key,
  tenant_id   text not null,
  kind        text not null,            -- income | expense
  category    text,                     -- maintenance|food|salaries|events|utilities|supplies|transport|donation|grant|other
  description text,
  amount      numeric(14,2) not null,
  method      text,                     -- cash|bank|mtn|airtel|cheque
  occurred_at date default current_date,
  created_by  text,
  created_at  timestamptz default now()
);
create index if not exists school_finance_idx on school_finance (tenant_id, occurred_at);

create table if not exists school_assets (
  id          bigint generated always as identity primary key,
  tenant_id   text not null,
  name        text not null,
  category    text,                     -- building|vehicle|equipment|furniture|land|it|other
  value       numeric(14,2) default 0,
  condition   text,                     -- good|fair|poor
  acquired    date,
  notes       text,
  created_at  timestamptz default now()
);
create index if not exists school_assets_idx on school_assets (tenant_id);

alter table school_finance enable row level security;
alter table school_assets  enable row level security;
do $$ begin
  execute 'drop policy if exists tenant_rw on school_finance';
  execute 'drop policy if exists tenant_rw on school_assets';
exception when others then null; end $$;
create policy tenant_rw on school_finance for all using (true) with check (true);
create policy tenant_rw on school_assets  for all using (true) with check (true);
grant all on school_finance, school_assets to service_role;
