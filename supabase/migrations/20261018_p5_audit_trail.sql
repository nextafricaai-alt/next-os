-- ════════════════════════════════════════════════════════════════════════
-- Audit P5 — who changed marks, fees, attendance and deductions, and when.
--                                                                18 Oct 2026
-- One append-only table, audit_log, filled by database triggers, so every
-- route (app, Worker, SQL editor) is recorded the same way and nobody can
-- skip it from a phone.
--
--  • Money, marks, deductions, terms, fee items, bursaries, pupils: every
--    insert, change and delete is logged.
--  • Roll call and staff check-ins: only changes and deletes are logged (the
--    original insert is already its own record, and logging every tick would
--    double the table).
--  • For a change, only the fields that changed are kept (before → after).
--  • Head teacher / admin can read their own school's log. No one — not even
--    the head — can edit or delete it from the app.
--  • Rows older than 3 years can be removed by nx_audit_prune() (run by hand
--    or on a schedule; DPPA 2019 asks us not to keep data longer than needed).
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.audit_log (
  id          bigserial primary key,
  tenant_id   text,
  table_name  text not null,
  row_id      text,
  action      text not null check (action in ('insert','update','delete')),
  actor_id    uuid,
  actor_email text,
  actor_role  text,
  at          timestamptz not null default now(),
  before      jsonb,
  after       jsonb
);
create index if not exists audit_log_tenant_at on public.audit_log (tenant_id, at desc);
create index if not exists audit_log_row on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'audit_log' loop
    execute format('drop policy %I on public.audit_log', pol.policyname);
  end loop;
end $$;
create policy c5_operator_read on public.audit_log for select to authenticated
  using (public.is_platform_operator());
create policy p5_head_read on public.audit_log for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

create or replace function public._nx_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  b jsonb; a jsonb; k text;
  v_role text; v_email text;
begin
  if tg_op = 'UPDATE' then
    b := '{}'::jsonb; a := '{}'::jsonb;
    for k in select jsonb_object_keys(n) loop
      if (o -> k) is distinct from (n -> k) and k not in ('updated_at') then
        b := b || jsonb_build_object(k, o -> k);
        a := a || jsonb_build_object(k, n -> k);
      end if;
    end loop;
    if a = '{}'::jsonb then return null; end if;  -- nothing really changed
  else
    b := o; a := n;
  end if;
  begin v_role := public.current_user_role(); exception when others then v_role := null; end;
  v_email := nullif(auth.jwt() ->> 'email', '');
  insert into audit_log (tenant_id, table_name, row_id, action, actor_id, actor_email, actor_role, before, after)
  values (coalesce(n ->> 'tenant_id', o ->> 'tenant_id'), tg_table_name,
          coalesce(n ->> 'id', o ->> 'id'), lower(tg_op),
          auth.uid(), coalesce(v_email, case when auth.uid() is null then 'system (Worker / SQL)' end),
          v_role, b, a);
  return null;
end $$;
revoke all on function public._nx_audit() from public, anon, authenticated;

-- attach to the tables that exist
do $$
declare
  full_tables text[] := array['fees','receipts','exam_results','payroll_deductions','students',
                              'academic_terms','fee_items','fee_adjustments','staff_rules',
                              'finance_entries','school_finance_ledgers','teachers','users'];
  change_tables text[] := array['student_roll_call','teacher_checkins'];
  t text;
begin
  foreach t in array full_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists nx_audit on public.%I', t);
      execute format('create trigger nx_audit after insert or update or delete on public.%I for each row execute function public._nx_audit()', t);
    end if;
  end loop;
  foreach t in array change_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists nx_audit on public.%I', t);
      execute format('create trigger nx_audit after update or delete on public.%I for each row execute function public._nx_audit()', t);
    end if;
  end loop;
end $$;

create or replace function public.nx_audit_prune(p_keep interval default interval '3 years')
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is not null and not public.is_platform_operator() then
    raise exception 'Only the platform operator can prune the audit log.' using errcode = '42501';
  end if;
  delete from audit_log where at < now() - p_keep;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.nx_audit_prune(interval) from public, anon;
grant execute on function public.nx_audit_prune(interval) to authenticated;

commit;
