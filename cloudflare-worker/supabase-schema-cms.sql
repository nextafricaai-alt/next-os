-- ============================================================================
-- NEXT OS — generic CMS engine (schema-driven; Nia builds OSes on top of this)
-- Run ONCE in the Schools OS Supabase (project llxhvqkkgftqwefmrofn) SQL editor.
-- One table set powers every site's CMS — Nia just writes collection definitions.
-- ============================================================================

create table if not exists cms_collections (
  id          bigserial primary key,
  site        text not null,                 -- e.g. 'puritymukisa.com'
  name        text not null,                 -- machine name, e.g. 'songs'
  label       text,                          -- 'Songs'
  icon        text,                          -- emoji/icon
  fields      jsonb default '[]'::jsonb,      -- [{name,label,type}]
  sort        int  default 0,
  created_at  timestamptz default now(),
  unique (site, name)
);

create table if not exists cms_items (
  id          bigserial primary key,
  site        text not null,
  collection  text not null,                 -- matches cms_collections.name
  data        jsonb default '{}'::jsonb,      -- the record's field values
  status      text default 'published',       -- published | draft
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists cms_items_idx on cms_items (site, collection, created_at desc);

-- Locked to the worker (service_role bypasses RLS); browsers never touch these directly.
alter table cms_collections enable row level security;
alter table cms_items       enable row level security;
grant all on cms_collections, cms_items to service_role;
grant usage, select on sequence cms_collections_id_seq to service_role;
grant usage, select on sequence cms_items_id_seq to service_role;

-- ============================================================================
-- DONE. After this, Nia can build any site's OS with zero further SQL.
-- ============================================================================
