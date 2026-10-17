-- ════════════════════════════════════════════════════════════════════════
-- Audit C5 — close the database to the public (anon) key.  17 Oct 2026
--
-- WHAT IT DOES
--  1. Improves the three helper functions so real staff are recognised:
--       current_tenant_id / current_user_role  → users row, else the school's
--                                                registered head_email
--       current_teacher_id                     → teachers.user_id link, else
--                                                the teacher's email in that school
--     plus a new is_platform_operator() for the NEXT OS operators.
--  2. On every school table: removes ALL existing policies (the "allow
--     everything" ones made the good ones useless) and creates one clean set:
--       • nobody without a sign-in (anon) can read or write anything
--       • signed-in staff see and change ONLY their own school's rows,
--         limited by role (see the spec table below)
--       • NEXT OS operators (you + Hudson) can do everything
--  3. Locks Worker-only tables (os_records, messages, transport, registration
--     requests) to operators; the Worker uses the service key and is unaffected.
--  4. Fixes tenants: no more public insert/update/delete.
--
-- Tables that do not exist are skipped. Runs in one transaction: if any
-- statement fails, nothing changes.
-- To undo in an emergency: run supabase-c5-ROLLBACK.sql
-- ════════════════════════════════════════════════════════════════════════
begin;

-- ─── 1. Helper functions ──────────────────────────────────────────────────
create or replace function public.is_platform_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') in ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin', false)
$$;

create or replace function public.current_tenant_id() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.tenant_id from users u where u.auth_id = auth.uid() limit 1),
    (select t.id from tenants t
      where auth.uid() is not null
        and lower(t.head_email) = lower(auth.jwt() ->> 'email') limit 1))
$$;

create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select lower(u.role) from users u where u.auth_id = auth.uid() limit 1),
    (select 'head' from tenants t
      where auth.uid() is not null
        and lower(t.head_email) = lower(auth.jwt() ->> 'email') limit 1))
$$;

create or replace function public.current_teacher_id() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select t.id from teachers t join users u on u.id = t.user_id
      where u.auth_id = auth.uid() limit 1),
    (select t.id from teachers t
      where auth.uid() is not null
        and lower(t.email) = lower(auth.jwt() ->> 'email')
        and t.tenant_id = public.current_tenant_id() limit 1))
$$;

-- ─── 2. School tables: one clean policy set each ──────────────────────────
-- Role groups:  ANY = head,admin,bursar,teacher,driver   STAFF = head,admin,bursar,teacher
--               FIN = head,admin,bursar                  HEAD  = head,admin
-- spec: table, select, insert, update, delete, tenant column
do $$
declare
  spec text[][] := array[
    -- table                     select   insert   update   delete   tenant col
    array['students',              'STAFF', 'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['fees',                  'FIN',   'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['receipts',              'FIN',   'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['school_income',         'FIN',   'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['school_expenses',       'FIN',   'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['school_finance',        'FIN',   'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['school_assets',         'FIN',   'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['payroll_deductions',    'FINOWN','STAFF', 'HEAD',  'HEAD', 'tenant_id'],
    array['teacher_payroll',       'FINOWN','FIN',   'FIN',   'FIN',  'tenant_id'],
    array['teachers',              'STAFF', 'HEAD',  'HEAD',  'HEAD', 'tenant_id'],
    array['teacher_checkins',      'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['teacher_logs',          'STAFF', 'STAFF', 'HEAD',  'HEAD', 'tenant_id'],
    array['teacher_merits_log',    'STAFF', 'STAFF', 'HEAD',  'HEAD', 'tenant_id'],
    array['student_roll_call',     'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['student_health_records','STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['student_notes',         'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['attendance',            'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['staff_attendance',      'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['enrollments',           'STAFF', 'FIN',   'FIN',   'HEAD', 'tenant_id'],
    array['lesson_plans',          'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['syllabus_coverage',     'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['class_assignments',     'STAFF', 'HEAD',  'HEAD',  'HEAD', 'tenant_id'],
    array['timetable_slots',       'STAFF', 'HEAD',  'HEAD',  'HEAD', 'tenant_id'],
    array['exams',                 'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['exam_results',          'STAFF', 'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['school_events',         'ANY',   'STAFF', 'STAFF', 'HEAD', 'tenant_id'],
    array['school_config',         'ANY',   'HEAD',  'HEAD',  'HEAD', 'tenant_id'],
    -- Worker-only (service key) — operators only from the browser
    array['os_records',            'OP',    'OP',    'OP',    'OP',   'tenant'],
    array['messages',              'OP',    'OP',    'OP',    'OP',   ''],
    array['transport_positions',   'OP',    'OP',    'OP',    'OP',   ''],
    array['transport_stops',       'OP',    'OP',    'OP',    'OP',   ''],
    array['transport_students',    'OP',    'OP',    'OP',    'OP',   ''],
    array['registration_requests', 'OP',    'OP',    'OP',    'OP',   '']
  ];
  r text[]; s text[]; tbl text; col text; pol record; i int; cmd text; grp text; cond text; roles text;
  cmds text[] := array['select','insert','update','delete'];
begin
  foreach s slice 1 in array spec loop
    r := s; tbl := r[1]; col := r[6];
    if to_regclass('public.' || tbl) is null then
      raise notice 'C5: skipping % (table does not exist)', tbl; continue;
    end if;
    if col <> '' and not exists (select 1 from information_schema.columns
        where table_schema = 'public' and table_name = tbl and column_name = col) then
      raise notice 'C5: % has no % column — operators only', tbl, col;
      r := array[tbl, 'OP', 'OP', 'OP', 'OP', ''];
    end if;

    execute format('alter table public.%I enable row level security', tbl);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl);
    end loop;

    -- operators: everything
    execute format('create policy c5_operator_all on public.%I for all to authenticated
                    using (public.is_platform_operator()) with check (public.is_platform_operator())', tbl);

    for i in 1..4 loop
      cmd := cmds[i]; grp := r[i + 1];
      continue when grp = 'OP';
      roles := case grp
        when 'ANY'    then '''head'',''admin'',''bursar'',''teacher'',''driver'''
        when 'STAFF'  then '''head'',''admin'',''bursar'',''teacher'''
        when 'FIN'    then '''head'',''admin'',''bursar'''
        when 'HEAD'   then '''head'',''admin'''
        when 'FINOWN' then '''head'',''admin'',''bursar''' end;
      cond := format('%I = public.current_tenant_id() and public.current_user_role() in (%s)', r[6], roles);
      if grp = 'FINOWN' then
        cond := format('%I = public.current_tenant_id() and (public.current_user_role() in (%s) or teacher_id = public.current_teacher_id())', r[6], roles);
      end if;
      if cmd = 'select' or cmd = 'delete' then
        execute format('create policy c5_school_%s on public.%I for %s to authenticated using (%s)', cmd, tbl, cmd, cond);
      elsif cmd = 'insert' then
        execute format('create policy c5_school_%s on public.%I for %s to authenticated with check (%s)', cmd, tbl, cmd, cond);
      else
        execute format('create policy c5_school_%s on public.%I for %s to authenticated using (%s) with check (%s)', cmd, tbl, cmd, cond, cond);
      end if;
    end loop;
  end loop;
end $$;

-- ─── 3. tenants (the schools list) ────────────────────────────────────────
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'tenants' loop
    execute format('drop policy %I on public.tenants', pol.policyname);
  end loop;
end $$;
alter table public.tenants enable row level security;
create policy c5_operator_all on public.tenants for all to authenticated
  using (public.is_platform_operator()) with check (public.is_platform_operator());
-- A signed-in member sees their own school (login uses this for the head_email fallback).
create policy c5_school_select on public.tenants for select to authenticated
  using (id = public.current_tenant_id()
         or lower(head_email) = lower(auth.jwt() ->> 'email'));
-- A head can edit their own school's details (name, colours, logo).
create policy c5_school_update on public.tenants for update to authenticated
  using (id = public.current_tenant_id() and public.current_user_role() in ('head','admin'))
  with check (id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));
-- No anon access. Public branding (name, colour, logo) is served by the Worker's /brand.

-- ─── 4. users (who belongs to which school) ───────────────────────────────
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'users' loop
    execute format('drop policy %I on public.users', pol.policyname);
  end loop;
end $$;
alter table public.users enable row level security;
create policy c5_operator_all on public.users for all to authenticated
  using (public.is_platform_operator()) with check (public.is_platform_operator());
create policy users_read_own on public.users for select to authenticated
  using (auth_id = auth.uid());
create policy c5_school_select on public.users for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));
create policy c5_school_write on public.users for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));

-- ─── 5. sync_errors: anyone may log an error, only operators read them ────
do $$ begin
  if to_regclass('public.sync_errors') is not null then
    execute 'drop policy if exists "Public read" on public.sync_errors';
    execute 'drop policy if exists c5_operator_read on public.sync_errors';
    execute 'create policy c5_operator_read on public.sync_errors for select to authenticated using (public.is_platform_operator())';
  end if;
end $$;

commit;

-- ─── Check: after running, this should list NO policy whose rule is just "true"
-- except sync_errors "Public write" and the public forms/discovery inserts.
-- select tablename, policyname, roles, cmd, qual, with_check from pg_policies
--  where schemaname = 'public' and (qual = 'true' or with_check = 'true') order by 1, 2;
