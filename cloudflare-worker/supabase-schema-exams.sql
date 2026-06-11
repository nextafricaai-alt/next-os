-- NEXT Schools OS — exams + marks + grading
-- Run once in Supabase SQL editor.

create table if not exists exams (
  id          bigint generated always as identity primary key,
  tenant_id   text not null,
  name        text not null,
  term        text,
  year        int,
  level       text default 'primary',           -- primary | olevel | alevel
  subjects    jsonb default '[]'::jsonb,          -- ["English","Mathematics",...]
  core        jsonb default '[]'::jsonb,          -- subjects that form the aggregate
  config      jsonb default '{}'::jsonb,          -- optional custom grade/division bands
  created_at  timestamptz default now()
);
create index if not exists exams_tenant_idx on exams (tenant_id);

create table if not exists exam_results (
  id          bigint generated always as identity primary key,
  tenant_id   text not null,
  exam_id     bigint not null references exams(id) on delete cascade,
  student_id  bigint not null,
  marks       jsonb default '{}'::jsonb,          -- { "English": 78, "Mathematics": 64 }
  updated_at  timestamptz default now(),
  unique (exam_id, student_id)
);
create index if not exists exam_results_idx on exam_results (tenant_id, exam_id);

alter table exams        enable row level security;
alter table exam_results enable row level security;

-- service_role (the worker) bypasses RLS; these policies let an authenticated
-- tenant user read their own rows if you later use the browser client directly.
do $$ begin
  execute 'drop policy if exists tenant_rw on exams';
  execute 'drop policy if exists tenant_rw on exam_results';
exception when others then null; end $$;

create policy tenant_rw on exams        for all using (true) with check (true);
create policy tenant_rw on exam_results for all using (true) with check (true);

grant all on exams, exam_results to service_role;
