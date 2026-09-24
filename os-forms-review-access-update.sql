-- Reuse the two whole-OS authenticated accounts for Communications review.
-- Run this once in the NEXT OS Supabase SQL Editor if os-forms-setup.sql was
-- already applied. RLS stays enabled; client submissions remain insert-only.
BEGIN;

DROP POLICY IF EXISTS "Admins can manage forms" ON public.os_forms;
CREATE POLICY "Admins can manage forms"
  ON public.os_forms FOR ALL TO authenticated
  USING (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  )
  WITH CHECK (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  );

DROP POLICY IF EXISTS "Admins can manage responses" ON public.os_form_responses;
CREATE POLICY "Admins can manage responses"
  ON public.os_form_responses FOR ALL TO authenticated
  USING (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  )
  WITH CHECK (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  );

DROP POLICY IF EXISTS discovery_nextos_admin_read ON public.discovery_submissions;
CREATE POLICY discovery_nextos_admin_read
  ON public.discovery_submissions FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
    OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
  );

DROP POLICY IF EXISTS discovery_nextos_admin_download ON storage.objects;
CREATE POLICY discovery_nextos_admin_download ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'discovery-uploads'
    AND (
      (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
      OR lower((SELECT auth.jwt() ->> 'email')) IN ('hudson.tim.uk@gmail.com', 'patrickemma143@gmail.com')
    )
  );

COMMIT;
