-- Photo storage for the Sembule website editor.
-- The bucket is public for reading (so visitors can load photos); only active owners can upload, replace or delete.
-- Safe to re-run. Touches only the 'sembule-website' bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sembule-website', 'sembule-website', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Sembule owners upload website photos" on storage.objects;
create policy "Sembule owners upload website photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'sembule-website' and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true));

drop policy if exists "Sembule owners view website photos" on storage.objects;
create policy "Sembule owners view website photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'sembule-website' and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true));

drop policy if exists "Sembule owners update website photos" on storage.objects;
create policy "Sembule owners update website photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'sembule-website' and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true))
  with check (bucket_id = 'sembule-website' and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true));

drop policy if exists "Sembule owners delete website photos" on storage.objects;
create policy "Sembule owners delete website photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sembule-website' and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'owner' and ur.active = true));
