-- ════════════════════════════════════════════════════════════════════════
-- Audit D4 — an online fee payment can only be recorded once.   17 Oct 2026
--
-- Flutterwave tells the Worker about a payment twice (the webhook and the
-- parent's return to the pay page), often in the same second. Without a
-- database rule both could record it and the pupil was credited twice.
-- These two indexes make a second receipt / payment for the same Flutterwave
-- reference impossible; the Worker treats that as "already recorded".
--
-- If this stops with "duplicates found", run the check query at the bottom,
-- send the result to whoever maintains NEXT OS, and fix those pupils first.
-- ════════════════════════════════════════════════════════════════════════
do $$
declare dup_r int; dup_f int;
begin
  select count(*) into dup_r from (
    select tenant_id, reference from public.receipts
    where reference like 'FEE-%' group by 1, 2 having count(*) > 1) x;
  select count(*) into dup_f from (
    select tenant_id, reference from public.fees
    where kind = 'payment' and reference like 'FEE-%' group by 1, 2 having count(*) > 1) y;
  if dup_r > 0 or dup_f > 0 then
    raise exception 'D4: duplicates found (% receipt refs, % payment refs). Nothing changed. Run the check query below.', dup_r, dup_f;
  end if;
end $$;

create unique index if not exists receipts_online_ref_uq
  on public.receipts (tenant_id, reference) where reference like 'FEE-%';
create unique index if not exists fees_online_ref_uq
  on public.fees (tenant_id, reference) where kind = 'payment' and reference like 'FEE-%';

-- Check query (pupils credited more than once by an online payment):
-- select r.tenant_id, r.reference, r.student_name, count(*) as receipts, sum(r.amount) as total_receipted
-- from public.receipts r where r.reference like 'FEE-%'
-- group by 1, 2, 3 having count(*) > 1 order by 1, 3;
