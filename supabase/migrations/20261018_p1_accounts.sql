-- ════════════════════════════════════════════════════════════════════════
-- Audit P1 — real accounts for every role.                     18 Oct 2026
--
-- The head teacher now adds, resets and switches off staff logins from the
-- app (Rules & Audit → Staff accounts). This adds what the database needs:
--  • users.active / deactivated_at — a switched-off login stops counting as
--    staff in every database rule at once (the Worker also blocks it in
--    Supabase Auth so it can't sign in or refresh).
--  • users.phone if missing.
--  • the role helpers ignore switched-off accounts.
--  • users rows can only be written by the Worker (service role) — nobody
--    can promote themselves from the browser.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════
begin;

alter table public.users add column if not exists active boolean not null default true;
alter table public.users add column if not exists deactivated_at timestamptz;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists created_at timestamptz default now();

create or replace function public.current_tenant_id() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.tenant_id from users u where u.auth_id = auth.uid() and coalesce(u.active, true) limit 1),
    (select t.id from tenants t
      where auth.uid() is not null
        and lower(t.head_email) = lower(auth.jwt() ->> 'email') limit 1))
$$;

create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select lower(u.role) from users u where u.auth_id = auth.uid() and coalesce(u.active, true) limit 1),
    (select 'head' from tenants t
      where auth.uid() is not null
        and lower(t.head_email) = lower(auth.jwt() ->> 'email') limit 1))
$$;

create or replace function public.current_teacher_id() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select t.id from teachers t join users u on u.id = t.user_id
      where u.auth_id = auth.uid() and coalesce(u.active, true) limit 1),
    (select t.id from teachers t
      where auth.uid() is not null
        and lower(t.email) = lower(auth.jwt() ->> 'email')
        and t.tenant_id = public.current_tenant_id() limit 1))
$$;

-- users: read your own row and (head/admin) your school's rows; no browser writes.
alter table public.users enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'users'
               and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL') loop
    execute format('drop policy %I on public.users', pol.policyname);
  end loop;
end $$;
drop policy if exists p1_users_read on public.users;
create policy p1_users_read on public.users for select to authenticated
  using (auth_id = auth.uid()
         or public.is_platform_operator()
         or (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin')));
revoke insert, update, delete on public.users from anon, authenticated;

commit;

-- Check (should list every staff login with active = true):
-- select email, role, active from users where tenant_id = 'kabs-lily-junior-school-and-kindercare-centre' order by role, email;
