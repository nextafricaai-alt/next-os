-- ════════════════════════════════════════════════════════════════════════
-- Boarding on real data + teacher list repair.                  18 Oct 2026
--
-- Boarding: the old screen showed a fixed school name and term and had no
-- hostels or night roll call behind it. Now:
--  • hostels              — name, boys/girls/mixed, beds, matron + phone
--  • boarding_assignments — which hostel and bed each boarder sleeps in
--  • boarding_rollcall    — night roll call: present / absent / sick / on leave
--  • students.is_boarding — the "boarder" flag (already used by Add student)
-- Staff can read; the head/admin manage hostels and beds; any staff member
-- on duty (head, admin, teacher/matron) can mark the night roll call.
--
-- Teachers: people who were given a teacher login but have no row in
-- `teachers` didn't appear in the Teachers screen. This adds the missing rows.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════
begin;

alter table public.students add column if not exists is_boarding boolean not null default false;

create table if not exists public.hostels (
  id           bigserial primary key,
  tenant_id    text not null references public.tenants(id) on delete cascade,
  name         text not null,
  gender       text not null default 'mixed' check (gender in ('boys','girls','mixed')),
  capacity     integer not null default 0 check (capacity >= 0),
  matron_name  text,
  matron_phone text,
  created_at   timestamptz default now(),
  unique (tenant_id, name)
);

create table if not exists public.boarding_assignments (
  tenant_id   text not null references public.tenants(id) on delete cascade,
  student_id  bigint not null references public.students(id) on delete cascade,
  hostel_id   bigint references public.hostels(id) on delete set null,
  bed         text,
  updated_at  timestamptz default now(),
  primary key (tenant_id, student_id)
);

create table if not exists public.boarding_rollcall (
  id          bigserial primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  roll_date   date not null,
  student_id  bigint not null references public.students(id) on delete cascade,
  hostel_id   bigint references public.hostels(id) on delete set null,
  status      text not null check (status in ('present','absent','sick','leave')),
  note        text,
  marked_by   uuid default auth.uid(),
  marked_at   timestamptz default now(),
  unique (tenant_id, roll_date, student_id)
);
create index if not exists boarding_rollcall_day on public.boarding_rollcall (tenant_id, roll_date);

do $$ declare t text; pol record; begin
  foreach t in array array['hostels','boarding_assignments','boarding_rollcall'] loop
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy c5_operator_all on public.%I for all to authenticated using (public.is_platform_operator()) with check (public.is_platform_operator())', t);
    execute format('create policy b_read on public.%I for select to authenticated using (tenant_id = public.current_tenant_id() and public.current_user_role() in (''head'',''admin'',''bursar'',''teacher''))', t);
  end loop;
end $$;
create policy b_hostels_write on public.hostels for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));
create policy b_assign_write on public.boarding_assignments for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin'));
create policy b_roll_write on public.boarding_rollcall for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','teacher'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','teacher'));

-- Record who changed boarding data (P5 audit trail), if it is installed.
do $$ declare t text; begin
  if to_regprocedure('public._nx_audit()') is not null then
    foreach t in array array['hostels','boarding_assignments'] loop
      execute format('drop trigger if exists nx_audit on public.%I', t);
      execute format('create trigger nx_audit after insert or update or delete on public.%I for each row execute function public._nx_audit()', t);
    end loop;
    execute 'drop trigger if exists nx_audit on public.boarding_rollcall';
    execute 'create trigger nx_audit after update or delete on public.boarding_rollcall for each row execute function public._nx_audit()';
  end if;
end $$;

-- Teachers with a login but no teachers row → add the row so they show up.
insert into public.teachers (tenant_id, user_id, full_name, email)
select u.tenant_id, u.id, coalesce(nullif(u.full_name, ''), u.email), lower(u.email)
from public.users u
where lower(u.role) = 'teacher' and coalesce((to_jsonb(u)->>'active')::boolean, true)
  and not exists (select 1 from public.teachers t
                  where t.tenant_id = u.tenant_id
                    and (t.user_id = u.id or lower(t.email) = lower(u.email)));

commit;

-- Checks:
-- select tenant_id, count(*) from teachers group by 1;
-- select role, count(*) from users where tenant_id = 'kabs-lily-junior-school-and-kindercare-centre' group by 1;
