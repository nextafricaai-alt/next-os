-- 006: screen/display checklist, company TIN and registration on documents,
-- and let every signed-in team member read company details (they print on documents).
ALTER TABLE public.job_checklists DROP CONSTRAINT IF EXISTS job_checklists_category_check;
ALTER TABLE public.job_checklists ADD CONSTRAINT job_checklists_category_check
  CHECK (category IN ('livestream','sound','backup','delivery','display'));

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tin text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS registration_no text;

DROP POLICY IF EXISTS permitted_read ON public.settings;
CREATE POLICY permitted_read ON public.settings FOR SELECT TO authenticated
  USING ((SELECT private.current_role()) IN ('owner','director','production_lead'));

INSERT INTO public.settings (id, company_name, trading_name, phone, website)
SELECT true, 'Sembule Media Ltd', 'Sembule Media', '+256 774 345634','sembulemedia.com'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);
