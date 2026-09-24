-- NEXT Discovery standalone setup only.
-- For NEXT OS, run ../os-forms-setup.sql instead. It installs these
-- discovery submission and private-upload resources into the shared NEXT OS
-- Supabase project alongside the Communications client forms.
-- Public users can INSERT only. Only explicitly approved administrators can read.
BEGIN;
CREATE TABLE public.discovery_submissions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_company text NOT NULL CHECK (length(trim(client_company)) BETWEEN 1 AND 2000),
  contact_name text NOT NULL CHECK (length(trim(contact_name)) BETWEEN 1 AND 2000),
  contact_email text NOT NULL CHECK (length(contact_email) BETWEEN 3 AND 320 AND contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  contact_phone text NOT NULL CHECK (length(trim(contact_phone)) BETWEEN 7 AND 50),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','reviewing','contacted','archived')),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers)='object' AND answers ? 'sections' AND jsonb_typeof(answers->'sections')='array' AND octet_length(answers::text)<=1048576)
);
CREATE INDEX discovery_submissions_created_at_idx ON public.discovery_submissions (created_at DESC);
ALTER TABLE public.discovery_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_submissions FROM PUBLIC, anon, authenticated;
GRANT INSERT (id,client_company,contact_name,contact_email,contact_phone,status,answers) ON public.discovery_submissions TO anon;
GRANT SELECT ON public.discovery_submissions TO authenticated;
CREATE POLICY discovery_public_insert ON public.discovery_submissions
 FOR INSERT TO anon WITH CHECK (status='received' AND answers->>'schema_version'='1');

-- Auth alone does not grant access. The account must also be in this allowlist.
CREATE TABLE public.discovery_admins (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.discovery_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.discovery_admins TO authenticated;
CREATE POLICY discovery_admin_own_membership ON public.discovery_admins
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY discovery_admin_read ON public.discovery_submissions
 FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.discovery_admins WHERE user_id=(SELECT auth.uid()))
 );

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('discovery-uploads','discovery-uploads',false,10485760,ARRAY[
 'image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'
]);
CREATE POLICY discovery_public_upload ON storage.objects
 FOR INSERT TO anon WITH CHECK (
  bucket_id='discovery-uploads'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|jpeg|webp|gif|svg|pdf|doc|docx|xls|xlsx|csv)$'
 );
CREATE POLICY discovery_admin_download ON storage.objects
 FOR SELECT TO authenticated USING (
  bucket_id='discovery-uploads'
  AND EXISTS (SELECT 1 FROM public.discovery_admins WHERE user_id=(SELECT auth.uid()))
 );
-- No public SELECT / UPDATE / DELETE policies. No public bucket.
-- No upsert. Files use a new UUID filename for every upload attempt.
-- Supabase manages the storage schema and its table grants; do not change its ownership.
COMMIT;

-- AFTER creating your administrator in Authentication > Users, run separately:
-- INSERT INTO public.discovery_admins (user_id) VALUES ('YOUR-AUTH-USER-UUID');
-- Additional accounts do not gain access until explicitly added here.
-- Revoke an administrator using the SQL Editor:
-- DELETE FROM public.discovery_admins WHERE user_id='YOUR-AUTH-USER-UUID';
