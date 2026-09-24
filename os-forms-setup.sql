-- NEXT OS: Generic Client Forms Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE public.os_forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text DEFAULT 'active'
);

CREATE TABLE public.os_form_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid REFERENCES public.os_forms(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  seen boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.os_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_form_responses ENABLE ROW LEVEL SECURITY;

-- Forms can be read by anyone (so client-form.html can load them)
CREATE POLICY "Public can read forms" ON public.os_forms FOR SELECT USING (true);

-- Forms can be managed by authenticated admins
CREATE POLICY "Admins can manage forms" ON public.os_forms FOR ALL USING (auth.role() = 'authenticated');

-- Responses can be inserted by anyone (so clients can submit)
CREATE POLICY "Public can insert responses" ON public.os_form_responses FOR INSERT WITH CHECK (true);

-- Responses can only be read/updated by authenticated admins
CREATE POLICY "Admins can manage responses" ON public.os_form_responses FOR ALL USING (auth.role() = 'authenticated');

-- Enable Realtime for form responses so NEXT OS gets notified immediately
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.os_form_responses;
