-- NEXT OS client forms, Sembule discovery submissions, and responses.
-- Safe to re-run; never reset the shared supabase_realtime publication.
-- Before using Communications, set app_metadata.role = 'nextos_admin' for
-- each trusted NEXT OS operator in Supabase Auth. Never use user_metadata
-- for authorization; users can edit their own user_metadata.

CREATE TABLE IF NOT EXISTS public.os_forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.os_form_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid REFERENCES public.os_forms(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  seen boolean DEFAULT false
);

ALTER TABLE public.os_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_form_responses ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.os_forms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.os_forms TO authenticated;
GRANT INSERT ON public.os_form_responses TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.os_form_responses TO authenticated;

DROP POLICY IF EXISTS "Public can read forms" ON public.os_forms;
CREATE POLICY "Public can read forms"
  ON public.os_forms FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage forms" ON public.os_forms;
CREATE POLICY "Admins can manage forms"
  ON public.os_forms FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin');

DROP POLICY IF EXISTS "Public can insert responses" ON public.os_form_responses;
CREATE POLICY "Public can insert responses"
  ON public.os_form_responses FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.os_forms f
      WHERE f.id = os_form_responses.form_id AND f.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage responses" ON public.os_form_responses;
CREATE POLICY "Admins can manage responses"
  ON public.os_form_responses FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin');

-- Tony's Sembule Media discovery form uses its richer native UI and answer
-- schema, while storing its submissions in the same NEXT OS Supabase project.
CREATE TABLE IF NOT EXISTS public.discovery_submissions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_company text NOT NULL CHECK (length(trim(client_company)) BETWEEN 1 AND 2000),
  contact_name text NOT NULL CHECK (length(trim(contact_name)) BETWEEN 1 AND 2000),
  contact_email text NOT NULL CHECK (length(trim(contact_email)) BETWEEN 3 AND 320 AND contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  contact_phone text NOT NULL CHECK (length(trim(contact_phone)) BETWEEN 7 AND 50),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','reviewing','contacted','archived')),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object' AND answers ? 'sections' AND jsonb_typeof(answers->'sections') = 'array' AND octet_length(answers::text) <= 1048576)
);

CREATE INDEX IF NOT EXISTS discovery_submissions_created_at_idx
  ON public.discovery_submissions (created_at DESC);
ALTER TABLE public.discovery_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_submissions FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, client_company, contact_name, contact_email, contact_phone, status, answers)
  ON public.discovery_submissions TO anon;
GRANT SELECT ON public.discovery_submissions TO authenticated;

DROP POLICY IF EXISTS discovery_public_insert ON public.discovery_submissions;
CREATE POLICY discovery_public_insert
  ON public.discovery_submissions FOR INSERT TO anon
  WITH CHECK (status = 'received' AND answers->>'schema_version' = '1');

DROP POLICY IF EXISTS discovery_nextos_admin_read ON public.discovery_submissions;
CREATE POLICY discovery_nextos_admin_read
  ON public.discovery_submissions FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin');

-- Private file uploads are available to the client form and authorized NEXT OS admins.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('discovery-uploads', 'discovery-uploads', false, 10485760, ARRAY[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'
])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS discovery_public_upload ON storage.objects;
CREATE POLICY discovery_public_upload ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'discovery-uploads'
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}\.(png|jpg|jpeg|webp|gif|svg|pdf|doc|docx|xls|xlsx|csv)$'
  );

DROP POLICY IF EXISTS discovery_nextos_admin_download ON storage.objects;
CREATE POLICY discovery_nextos_admin_download ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'discovery-uploads'
    AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'nextos_admin'
  );

-- Add only these tables to the existing publication; don't drop other subscribers.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'os_forms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.os_forms';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'os_form_responses'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.os_form_responses';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'discovery_submissions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.discovery_submissions';
  END IF;
END $$;
