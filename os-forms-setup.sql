-- NEXT OS client forms and responses.
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
END $$;
