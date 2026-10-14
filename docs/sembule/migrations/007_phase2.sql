-- 007 Phase 2: client portal + pay page, crew call page, hire deposits, reviews and referrals.
BEGIN;

-- Private share links (random, unguessable). Only the holder of the link can read that one record.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS portal_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS portal_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.job_crew ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS invoices_portal_token_idx ON public.invoices(portal_token);
CREATE UNIQUE INDEX IF NOT EXISTS quotes_portal_token_idx ON public.quotes(portal_token);
CREATE UNIQUE INDEX IF NOT EXISTS job_crew_share_token_idx ON public.job_crew(share_token);

-- Client portal: one invoice or quote, by token. No client contact details, no costs, no profit.
CREATE OR REPLACE FUNCTION public.client_portal(p_token uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb; co jsonb; fs jsonb; inv record; q record;
BEGIN
  SELECT jsonb_build_object('name',s.company_name,'phone',s.phone,'email',s.email,'address',s.address,'website',s.website,'tin',s.tin)
    INTO co FROM public.settings s LIMIT 1;
  SELECT jsonb_build_object('bank',f.bank_details,'momo',f.momo_details,'airtel',f.airtel_details) INTO fs FROM public.finance_settings f LIMIT 1;

  SELECT i.*, j.title AS job_title, j.starts_at, j.ends_at, j.venue, j.delivery_link, j.delivered_at,
         COALESCE(c.organisation, c.name) AS client_name
    INTO inv FROM public.invoices i JOIN public.jobs j ON j.id=i.job_id JOIN public.clients c ON c.id=i.client_id
   WHERE i.portal_token = p_token AND i.status = 'issued';
  IF FOUND THEN
    SELECT jsonb_build_object(
      'kind','invoice','company',co,'pay',fs,'reference',inv.reference,'currency',inv.currency,'issued_on',inv.issued_on,
      'client',inv.client_name,'job',inv.job_title,'starts_at',inv.starts_at,'ends_at',inv.ends_at,'venue',inv.venue,
      'files_link', CASE WHEN inv.delivered_at IS NOT NULL THEN inv.delivery_link END,
      'balance', (SELECT to_jsonb(b) - 'invoice_id' - 'job_id' FROM public.invoice_balances b WHERE b.invoice_id=inv.id),
      'dues', jsonb_build_array(
         jsonb_build_object('label','Booking','percent',inv.booking_percent,'due',inv.booking_due_on),
         jsonb_build_object('label','Pre-production','percent',inv.preproduction_percent,'due',inv.preproduction_due_on),
         jsonb_build_object('label','Completion','percent',inv.completion_percent,'due',inv.completion_due_on)),
      'lines', COALESCE((SELECT jsonb_agg(jsonb_build_object('description',l.description,'quantity',l.quantity,'unit_price',l.unit_price,'line_total',l.line_total) ORDER BY l.description) FROM public.invoice_lines l WHERE l.invoice_id=inv.id),'[]'::jsonb),
      'payments', COALESCE((SELECT jsonb_agg(jsonb_build_object('receipt',p.receipt_number,'amount',p.amount,'paid_at',p.paid_at,'method',p.method) ORDER BY p.paid_at) FROM public.payments p WHERE p.invoice_id=inv.id AND p.voided_at IS NULL),'[]'::jsonb)
    ) INTO v;
    RETURN v;
  END IF;

  SELECT qq.*, COALESCE(c.organisation, c.name) AS client_name INTO q
    FROM public.quotes qq JOIN public.clients c ON c.id=qq.client_id
   WHERE qq.portal_token = p_token AND qq.status IN ('sent','accepted');
  IF FOUND THEN
    SELECT jsonb_build_object(
      'kind','quote','company',co,'reference',q.reference,'currency',q.currency,'issued_on',q.issued_on,'valid_until',q.valid_until,
      'client',q.client_name,'status',q.status,'inclusions',q.inclusions,'exclusions',q.exclusions,
      'lines', COALESCE((SELECT jsonb_agg(jsonb_build_object('description',l.description,'quantity',l.quantity,'days',l.days,'unit_price',l.unit_price,'line_total',l.line_total) ORDER BY l.position) FROM public.quote_lines l WHERE l.quote_id=q.id),'[]'::jsonb)
    ) INTO v;
    RETURN v;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.client_portal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_portal(uuid) TO anon, authenticated;

-- Crew call page: one crew booking, by token. No pay, no prices.
CREATE OR REPLACE FUNCTION public.crew_call_page(p_token uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'company',(SELECT s.company_name FROM public.settings s LIMIT 1),
    'name',cr.name,'role',jc.role,'call_time',jc.call_time,'availability',jc.availability,'instructions',jc.instructions,
    'reference',j.reference,'title',j.title,'starts_at',j.starts_at,'ends_at',j.ends_at,'venue',j.venue,
    'venue_contact_name',j.venue_contact_name,'venue_contact_phone',j.venue_contact_phone,'brief',j.call_sheet_brief,
    'team',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',c2.name,'role',j2.role)) FROM public.job_crew j2 JOIN public.crew c2 ON c2.id=j2.crew_id WHERE j2.job_id=j.id),'[]'::jsonb),
    'checklist',COALESCE((SELECT jsonb_agg(jsonb_build_object('category',k.category,'label',k.label,'done',k.completed_at IS NOT NULL) ORDER BY k.category,k.label) FROM public.job_checklists k WHERE k.job_id=j.id),'[]'::jsonb))
  FROM public.job_crew jc JOIN public.jobs j ON j.id=jc.job_id JOIN public.crew cr ON cr.id=jc.crew_id
  WHERE jc.share_token = p_token;
$$;
REVOKE ALL ON FUNCTION public.crew_call_page(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crew_call_page(uuid) TO anon, authenticated;

-- Crew can confirm or decline from their page.
CREATE OR REPLACE FUNCTION public.crew_respond(p_token uuid, p_answer text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_answer NOT IN ('confirmed','declined') THEN RETURN false; END IF;
  UPDATE public.job_crew SET availability = p_answer WHERE share_token = p_token;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.crew_respond(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crew_respond(uuid,text) TO anon, authenticated;

-- Hire deposits (money: owner and director only)
CREATE TABLE public.hire_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id), client_id uuid NOT NULL REFERENCES public.clients(id),
  items text NOT NULL, amount numeric(16,2) NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('mtn_momo','airtel_money','bank','cash')),
  received_at timestamptz NOT NULL DEFAULT now(), reference text,
  returned_at timestamptz, deducted numeric(16,2) NOT NULL DEFAULT 0 CHECK (deducted >= 0),
  deduction_reason text, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (deducted <= amount), CHECK (deducted = 0 OR length(trim(coalesce(deduction_reason,''))) > 0)
);
ALTER TABLE public.hire_deposits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hire_deposits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.hire_deposits TO authenticated;
CREATE POLICY permitted_read ON public.hire_deposits FOR SELECT TO authenticated USING ((SELECT private.current_role()) IN ('owner','director'));
CREATE POLICY permitted_insert ON public.hire_deposits FOR INSERT TO authenticated WITH CHECK ((SELECT private.current_role()) IN ('owner','director'));
CREATE POLICY permitted_update ON public.hire_deposits FOR UPDATE TO authenticated USING ((SELECT private.current_role()) IN ('owner','director')) WITH CHECK ((SELECT private.current_role()) IN ('owner','director'));
CREATE TRIGGER money_audit_log AFTER INSERT OR UPDATE OR DELETE ON public.hire_deposits FOR EACH ROW EXECUTE FUNCTION private.audit_money();

-- Reviews and referrals (operational: all roles)
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id), job_id uuid REFERENCES public.jobs(id),
  requested_at timestamptz, rating integer CHECK (rating BETWEEN 1 AND 5),
  quote text, may_publish boolean NOT NULL DEFAULT false, received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id uuid REFERENCES public.clients(id), referrer_name text,
  referred_name text NOT NULL CHECK (length(trim(referred_name)) > 0), referred_phone text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','booked','not_interested')),
  thanked boolean NOT NULL DEFAULT false, notes text, created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['reviews','referrals'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format($p$CREATE POLICY permitted_read ON public.%I FOR SELECT TO authenticated USING ((SELECT private.current_role()) IN ('owner','director','production_lead'))$p$, t);
    EXECUTE format($p$CREATE POLICY permitted_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT private.current_role()) IN ('owner','director','production_lead'))$p$, t);
    EXECUTE format($p$CREATE POLICY permitted_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.current_role()) IN ('owner','director','production_lead')) WITH CHECK ((SELECT private.current_role()) IN ('owner','director','production_lead'))$p$, t);
  END LOOP;
END $$;

COMMIT;
