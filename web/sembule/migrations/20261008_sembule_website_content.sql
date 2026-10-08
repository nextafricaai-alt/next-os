-- Owner-managed copy for the separate Sembule Media Hostinger website.
-- Public visitors can read only the published payload through the restricted view.
create table if not exists public.sembule_website_content (
  id text primary key check (id = 'main'),
  draft_content jsonb not null,
  published_content jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null
);

alter table public.sembule_website_content enable row level security;

revoke all on table public.sembule_website_content from public, anon, authenticated;
grant select, insert, update on table public.sembule_website_content to authenticated;

drop policy if exists "Sembule owners read website content" on public.sembule_website_content;
create policy "Sembule owners read website content"
  on public.sembule_website_content for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true
  ));

drop policy if exists "Sembule owners create website content" on public.sembule_website_content;
create policy "Sembule owners create website content"
  on public.sembule_website_content for insert to authenticated
  with check (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true
  ));

drop policy if exists "Sembule owners update website content" on public.sembule_website_content;
create policy "Sembule owners update website content"
  on public.sembule_website_content for update to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true
  ))
  with check (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true
  ));

create or replace view public.sembule_website_public
with (security_barrier = true)
as
  select id, published_content, published_at
  from public.sembule_website_content
  where id = 'main'
    and published_at is not null
    and published_content is not null;

revoke all on public.sembule_website_public from public;
grant select on public.sembule_website_public to anon, authenticated;
