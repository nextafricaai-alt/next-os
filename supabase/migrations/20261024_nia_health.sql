-- ════════════════════════════════════════════════════════════════════════
-- Nia Health — Nia checks the school's data and logins and lists every
-- problem it finds for the head teacher.                          24 Oct 2026
--
--  • nia_findings        — one row per problem Nia found (open / fixed /
--                          dismissed / resolved). Written only by the Worker
--                          (service key); head/admin can read their school's.
--  • nx_merge_students() — merges a double pupil into the original record:
--                          fees, attendance, boarding and every other linked
--                          row move across, the parent phone is kept, the
--                          copy is removed. Only the Worker can call it, and
--                          only after the head teacher approves the fix.
-- Nia never fixes anything by itself: every fix waits for the head's tap.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.nia_findings (
  id          bigserial primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  code        text not null,
  subject     text not null default '',
  severity    text not null default 'warn' check (severity in ('critical', 'warn', 'info')),
  area        text not null default 'system',
  title       text not null,
  detail      text,
  data        jsonb not null default '{}'::jsonb,
  fix         text,
  status      text not null default 'open' check (status in ('open', 'fixed', 'dismissed', 'resolved')),
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  closed_at   timestamptz,
  closed_by   text,
  unique (tenant_id, code, subject)
);
create index if not exists nia_findings_open on public.nia_findings (tenant_id, status);

alter table public.nia_findings enable row level security;
drop policy if exists nia_read on public.nia_findings;
create policy nia_read on public.nia_findings for select to authenticated
  using (public.is_platform_operator()
         or (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head', 'admin')));
revoke insert, update, delete on public.nia_findings from anon, authenticated;

create or replace function public.nx_merge_students(p_keep bigint, p_dup bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.students%rowtype;
  d public.students%rowtype;
  c record; r record;
  moved int := 0;
begin
  if p_keep = p_dup then raise exception 'Cannot merge a pupil into themselves'; end if;
  select * into k from public.students where id = p_keep;
  select * into d from public.students where id = p_dup;
  if k.id is null or d.id is null then raise exception 'Pupil not found (already merged?)'; end if;
  if k.tenant_id is distinct from d.tenant_id then raise exception 'Pupils belong to different schools'; end if;

  -- Fees from the handwritten register: never keep two sets for one child.
  if exists (select 1 from public.fees where student_id = p_keep and reference like 'LEDGER-%') then
    delete from public.fees where student_id = p_dup and reference like 'LEDGER-%';
  else
    update public.fees
       set reference = replace(replace(reference, '-C-' || p_dup, '-C-' || p_keep), '-P-' || p_dup, '-P-' || p_keep)
     where student_id = p_dup and reference like 'LEDGER-%';
  end if;

  -- Parent phone / name / class if the original has none.
  update public.students
     set guardian_phone = coalesce(nullif(btrim(guardian_phone), ''), d.guardian_phone),
         stream         = coalesce(nullif(btrim(stream), ''), d.stream)
   where id = p_keep;

  -- Every table that points at a pupil.
  for c in
    select cl.relname as tbl, a.attname as col
    from pg_attribute a join pg_class cl on cl.oid = a.attrelid join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and cl.relkind = 'r' and a.attname = 'student_id' and not a.attisdropped
      and a.atttypid in ('int8'::regtype, 'int4'::regtype, 'numeric'::regtype)
      and cl.relname not in ('students', 'nia_findings')
    union
    select cl.relname, a.attname
    from pg_constraint ct join pg_class cl on cl.oid = ct.conrelid join pg_namespace n on n.oid = cl.relnamespace
    join pg_attribute a on a.attrelid = ct.conrelid and a.attnum = ct.conkey[1]
    where ct.contype = 'f' and ct.confrelid = 'public.students'::regclass and n.nspname = 'public'
      and cl.relname <> 'students'
  loop
    begin
      execute format('update public.%I set %I = $1 where %I = $2', c.tbl, c.col, c.col) using p_keep, p_dup;
    exception when unique_violation then
      for r in execute format('select ctid::text as t from public.%I where %I = $1', c.tbl, c.col) using p_dup loop
        begin
          execute format('update public.%I set %I = $1 where ctid = $2::tid', c.tbl, c.col) using p_keep, r.t;
        exception when unique_violation then
          execute format('delete from public.%I where ctid = $1::tid', c.tbl) using r.t;
        end;
      end loop;
    end;
  end loop;

  delete from public.students where id = p_dup;
  return jsonb_build_object('kept', p_keep, 'kept_name', k.name, 'removed', p_dup, 'removed_name', d.name);
end $$;

revoke all on function public.nx_merge_students(bigint, bigint) from public, anon, authenticated;
grant execute on function public.nx_merge_students(bigint, bigint) to service_role;

-- Check: select status, count(*) from nia_findings group by 1;
