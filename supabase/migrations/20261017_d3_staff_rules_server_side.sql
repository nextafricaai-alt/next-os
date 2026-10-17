-- ════════════════════════════════════════════════════════════════════════
-- Audit D3 — check-in, late penalties and merit points decided by the
-- database, not by the teacher's phone.                         17 Oct 2026
--
-- Before: the teacher's browser decided whether they were late (using the
-- phone's own clock and time zone), whether they were at the school gate,
-- and then wrote its own penalty — or skipped it. Any signed-in user could
-- also call award_teacher_merit() to give anyone unlimited merit points, and
-- a teacher could insert payroll deductions against a colleague.
--
-- After:
--  • staff_rules: per school — late cut-off (Kampala time), penalty amount,
--    gate location + radius, merit points per action.
--  • A check-in always uses the server's clock, is always the signed-in
--    teacher's own, once per day, and (if a gate is set) must come with a
--    GPS fix inside the radius.
--  • Late → the penalty is written by the database. On time → +merit.
--  • Roll call and new lesson plans earn merit by database trigger.
--  • award_teacher_merit() is only callable by a head/admin (or operator).
--  • Teachers can no longer insert payroll deductions; heads/bursars can.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.staff_rules (
  tenant_id           text primary key references public.tenants(id) on delete cascade,
  late_after          time    not null default '07:15',
  late_penalty_ugx    numeric(12,2) not null default 2000,
  gate_lat            double precision,
  gate_lng            double precision,
  gate_radius_m       integer not null default 300,
  max_gps_accuracy_m  integer not null default 300,
  merit_on_time       integer not null default 5,
  merit_roll_call     integer not null default 2,
  merit_lesson_plan   integer not null default 10,
  updated_at          timestamptz default now()
);
alter table public.staff_rules enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'staff_rules' loop
    execute format('drop policy %I on public.staff_rules', pol.policyname);
  end loop;
end $$;
create policy c5_operator_all on public.staff_rules for all to authenticated
  using (public.is_platform_operator()) with check (public.is_platform_operator());
create policy staff_rules_read on public.staff_rules for select to authenticated
  using (tenant_id = public.current_tenant_id());
create policy staff_rules_head_write on public.staff_rules for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));

-- Kabs Lily's gate (the pin the head teacher shared; was hard-coded in the app).
insert into public.staff_rules (tenant_id, gate_lat, gate_lng)
select 'kabs-lily-junior-school-and-kindercare-centre', 0.3283056, 32.4716944
where exists (select 1 from public.tenants where id = 'kabs-lily-junior-school-and-kindercare-centre')
on conflict (tenant_id) do nothing;

alter table public.teacher_checkins add column if not exists lat         double precision;
alter table public.teacher_checkins add column if not exists lng         double precision;
alter table public.teacher_checkins add column if not exists accuracy_m  double precision;
alter table public.teacher_checkins add column if not exists distance_m  double precision;
alter table public.teacher_checkins add column if not exists checked_out_at timestamptz;

-- ─── merit: one internal helper, not callable from the browser ──────────
create or replace function public._nx_add_merit(p_teacher_id bigint, p_points integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_tenant text;
begin
  if p_points is null or p_points = 0 then return; end if;
  select tenant_id into v_tenant from teachers where id = p_teacher_id;
  if v_tenant is null then return; end if;
  update teachers set merit_points = coalesce(merit_points, 0) + p_points where id = p_teacher_id;
  insert into teacher_merits_log (tenant_id, teacher_id, points, reason) values (v_tenant, p_teacher_id, p_points, p_reason);
end $$;
revoke all on function public._nx_add_merit(bigint, integer, text) from public, anon, authenticated;

-- The old RPC stays (head teachers may award points by hand) but checks the caller.
create or replace function public.award_teacher_merit(p_teacher_id bigint, p_points integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_tenant text;
begin
  select tenant_id into v_tenant from teachers where id = p_teacher_id;
  if v_tenant is null then return; end if;
  if not (public.is_platform_operator()
          or (v_tenant = public.current_tenant_id() and public.current_user_role() in ('head','admin'))) then
    raise exception 'Only the head teacher can award merit points.' using errcode = '42501';
  end if;
  perform public._nx_add_merit(p_teacher_id, p_points, p_reason);
end $$;
revoke all on function public.award_teacher_merit(bigint, integer, text) from public, anon;
grant execute on function public.award_teacher_merit(bigint, integer, text) to authenticated;

-- ─── check-in guard (before insert / update) ────────────────────────────
create or replace function public._nx_checkin_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r staff_rules%rowtype;
  v_role text := public.current_user_role();
  v_me   bigint;
  g_lat double precision; g_lng double precision; d double precision;
  v_day date;
begin
  -- Service role (the Worker, SQL editor) and operators are not limited.
  if auth.uid() is null or public.is_platform_operator() then return new; end if;

  if tg_op = 'UPDATE' then
    if v_role = 'teacher' then
      v_me := public.current_teacher_id();
      if old.teacher_id is distinct from v_me then
        raise exception 'You can only check yourself out.' using errcode = '42501';
      end if;
      new.teacher_id := old.teacher_id; new.tenant_id := old.tenant_id;
      new.checked_in_at := old.checked_in_at;
      new.lat := old.lat; new.lng := old.lng; new.accuracy_m := old.accuracy_m; new.distance_m := old.distance_m;
      if new.checked_out_at is distinct from old.checked_out_at then new.checked_out_at := now(); end if;
    end if;
    return new;
  end if;

  -- INSERT
  new.checked_in_at := now();
  new.created_at := now();
  if v_role = 'teacher' then
    v_me := public.current_teacher_id();
    if v_me is null then
      raise exception 'Your account is not linked to a teacher profile yet — ask your head teacher.' using errcode = '42501';
    end if;
    new.teacher_id := v_me;
    new.tenant_id := public.current_tenant_id();
  end if;

  v_day := (now() at time zone 'Africa/Kampala')::date;
  if exists (select 1 from teacher_checkins c
             where c.teacher_id = new.teacher_id
               and (c.checked_in_at at time zone 'Africa/Kampala')::date = v_day) then
    raise exception 'Already checked in today.' using errcode = '23505';
  end if;

  select * into r from staff_rules where tenant_id = new.tenant_id;
  g_lat := r.gate_lat; g_lng := r.gate_lng;
  if g_lat is null and to_regclass('public.transport_settings') is not null then
    execute 'select school_lat, school_lng from transport_settings where tenant_id = $1'
      into g_lat, g_lng using new.tenant_id;
  end if;
  if v_role = 'teacher' and g_lat is not null and g_lng is not null then
    if new.lat is null or new.lng is null then
      raise exception 'Turn on Location: check-in needs your GPS position at the school gate.' using errcode = '22023';
    end if;
    if coalesce(new.accuracy_m, 9999) > coalesce(r.max_gps_accuracy_m, 300) then
      raise exception 'Your GPS signal is too weak (accuracy % m). Step outside and try again.', round(coalesce(new.accuracy_m, 9999)) using errcode = '22023';
    end if;
    d := 6371000 * 2 * asin(sqrt(
           power(sin(radians(new.lat - g_lat) / 2), 2) +
           cos(radians(g_lat)) * cos(radians(new.lat)) * power(sin(radians(new.lng - g_lng) / 2), 2)));
    new.distance_m := round(d::numeric, 1);
    if d > coalesce(r.gate_radius_m, 300) then
      raise exception 'You are % m from the school gate (must be within % m).', round(d), coalesce(r.gate_radius_m, 300) using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists nx_checkin_guard on public.teacher_checkins;
create trigger nx_checkin_guard before insert or update on public.teacher_checkins
  for each row execute function public._nx_checkin_guard();

-- ─── after check-in: penalty or merit ───────────────────────────────────
create or replace function public._nx_checkin_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r staff_rules%rowtype;
  t_local timestamp := new.checked_in_at at time zone 'Africa/Kampala';
  v_late_after time := '07:15';
  v_penalty numeric := 2000;
  v_merit integer := 5;
begin
  select * into r from staff_rules where tenant_id = new.tenant_id;
  if found then v_late_after := r.late_after; v_penalty := r.late_penalty_ugx; v_merit := r.merit_on_time; end if;
  if t_local::time > v_late_after then
    begin
      insert into payroll_deductions (tenant_id, teacher_id, month, amount, reason, reference_id, notes)
      values (new.tenant_id, new.teacher_id, date_trunc('month', t_local)::date, v_penalty, 'late_checkin', new.id::text,
              'Checked in at ' || to_char(t_local, 'HH24:MI') || ' (Kampala time), after the ' || to_char(v_late_after, 'HH24:MI') || ' cut-off.');
    exception when unique_violation then null; -- already penalised today
    end;
  else
    perform public._nx_add_merit(new.teacher_id, v_merit, 'On-time check-in');
  end if;
  return null;
end $$;
drop trigger if exists nx_checkin_after on public.teacher_checkins;
create trigger nx_checkin_after after insert on public.teacher_checkins
  for each row execute function public._nx_checkin_after();

-- ─── merit for roll call (once per teacher / class / period / day) ──────
create or replace function public._nx_rollcall_merit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_reason text; v_pts integer := 2;
begin
  if new.teacher_id is null then return null; end if;
  select merit_roll_call into v_pts from staff_rules where tenant_id = new.tenant_id;
  v_pts := coalesce(v_pts, 2);
  v_reason := 'Completed Roll Call for ' || coalesce(new.stream, '?') || ' · P' || coalesce(new.period_number::text, '?');
  if not exists (select 1 from teacher_merits_log m
                 where m.teacher_id = new.teacher_id and m.reason = v_reason
                   and (m.created_at at time zone 'Africa/Kampala')::date = (now() at time zone 'Africa/Kampala')::date) then
    perform public._nx_add_merit(new.teacher_id, v_pts, v_reason);
  end if;
  return null;
end $$;
drop trigger if exists nx_rollcall_merit on public.student_roll_call;
create trigger nx_rollcall_merit after insert on public.student_roll_call
  for each row execute function public._nx_rollcall_merit();

-- ─── merit for a newly created lesson plan ──────────────────────────────
create or replace function public._nx_lessonplan_merit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pts integer;
begin
  if new.teacher_id is null then return null; end if;
  select merit_lesson_plan into v_pts from staff_rules where tenant_id = new.tenant_id;
  perform public._nx_add_merit(new.teacher_id, coalesce(v_pts, 10), 'Created Lesson Plan for ' || coalesce(new.subject, ''));
  return null;
end $$;
drop trigger if exists nx_lessonplan_merit on public.lesson_plans;
create trigger nx_lessonplan_merit after insert on public.lesson_plans
  for each row execute function public._nx_lessonplan_merit();

-- ─── payroll deductions: heads / bursars only (penalties come from triggers)
drop policy if exists c5_school_insert on public.payroll_deductions;
create policy c5_school_insert on public.payroll_deductions for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'));

commit;
