-- ════════════════════════════════════════════════════════════════════════
-- Audit P3 + P4 — school terms and term billing as real data.   18 Oct 2026
--
-- Before: the "fee structure" was one JSON blob per school (class → fee) that
-- nothing ever billed from, so a pupil's balance only existed if someone
-- imported a spreadsheet. Term dates were another JSON blob. There was no
-- record of which class a pupil was in for a given term.
--
-- After:
--  • academic_terms   — Term 1/2/3 of each year, with dates; one is "current".
--  • fee_items        — what a term costs, per class (or every class), split
--                        into lines (Tuition, Boarding, Transport, Lunch …),
--                        each for all pupils, boarders only, day pupils only,
--                        or van users only.
--  • fee_adjustments  — bursaries, sibling and staff discounts, waivers per
--                        pupil per term (fixed UGX or a percentage).
--  • class_history    — which class each pupil was in, each term.
--  • nx_bill_term()   — turns the term's fee items into charges on every
--                        active pupil's account. Preview first; running it
--                        again only bills what is missing (new pupils, new
--                        items), never twice.
-- Arrears carry forward on their own: a balance is everything charged minus
-- everything paid, across all terms; statements show "brought forward".
--
-- Discounts are stored in fees as kind = 'discount' (a positive amount that
-- reduces the balance). The Worker and app are updated in the same release.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════
begin;

-- ─── terms ──────────────────────────────────────────────────────────────
create table if not exists public.academic_terms (
  id          bigserial primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  year        integer not null check (year between 2000 and 2100),
  term_no     integer not null check (term_no between 1 and 3),
  name        text not null,
  starts_on   date,
  ends_on     date,
  status      text not null default 'planned' check (status in ('planned','current','closed')),
  billed_at   timestamptz,
  created_at  timestamptz default now(),
  unique (tenant_id, year, term_no),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index if not exists academic_terms_one_current
  on public.academic_terms (tenant_id) where status = 'current';

-- ─── fee items (the fee structure, per term) ───────────────────────────
create table if not exists public.fee_items (
  id          bigserial primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  term_id     bigint not null references public.academic_terms(id) on delete cascade,
  class_key   text not null default '*',       -- 'P5', 'S1', 'BABY CLASS' … or '*' = every class
  name        text not null,                   -- 'Tuition', 'Boarding', 'Transport', 'Lunch' …
  amount      numeric(12,2) not null check (amount > 0),
  applies_to  text not null default 'all' check (applies_to in ('all','boarding','day','transport')),
  created_at  timestamptz default now()
);
create index if not exists fee_items_term on public.fee_items (term_id);

-- ─── bursaries / discounts ──────────────────────────────────────────────
create table if not exists public.fee_adjustments (
  id          bigserial primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  term_id     bigint not null references public.academic_terms(id) on delete cascade,
  student_id  bigint not null references public.students(id) on delete cascade,
  kind        text not null default 'bursary' check (kind in ('bursary','sibling','staff_child','waiver','other')),
  amount      numeric(12,2) check (amount is null or amount > 0),
  percent     numeric(5,2)  check (percent is null or (percent > 0 and percent <= 100)),
  reason      text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz default now(),
  check ((amount is null) <> (percent is null))
);
create index if not exists fee_adjustments_term on public.fee_adjustments (term_id);

-- ─── which class each pupil was in, each term ──────────────────────────
create table if not exists public.class_history (
  tenant_id   text not null references public.tenants(id) on delete cascade,
  term_id     bigint not null references public.academic_terms(id) on delete cascade,
  student_id  bigint not null references public.students(id) on delete cascade,
  stream      text,
  boarding    boolean,
  recorded_at timestamptz default now(),
  primary key (term_id, student_id)
);

-- ─── fees: link charges to a term ──────────────────────────────────────
alter table public.fees add column if not exists term_id   bigint references public.academic_terms(id) on delete set null;
alter table public.fees add column if not exists reference text;
-- If fees.kind has a check that only allows 'charge'/'payment', widen it.
do $$ declare c record; v_dropped boolean := false; begin
  for c in select con.conname from pg_constraint con
           where con.conrelid = 'public.fees'::regclass and con.contype = 'c'
             and pg_get_constraintdef(con.oid) ilike '%kind%'
             and pg_get_constraintdef(con.oid) not ilike '%discount%' loop
    execute format('alter table public.fees drop constraint %I', c.conname);
    v_dropped := true;
  end loop;
  if v_dropped then
    alter table public.fees add constraint fees_kind_p4
      check (kind is null or kind in ('charge','payment','discount','refund','adjustment','opening')) not valid;
  end if;
end $$;
create unique index if not exists fees_billing_ref_uq
  on public.fees (tenant_id, reference) where reference like 'BILL-%' or reference like 'ADJ-%';

-- ─── RLS ────────────────────────────────────────────────────────────────
do $$ declare t text; pol record; begin
  foreach t in array array['academic_terms','fee_items','fee_adjustments','class_history'] loop
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy c5_operator_all on public.%I for all to authenticated using (public.is_platform_operator()) with check (public.is_platform_operator())', t);
  end loop;
end $$;

-- Terms and the fee structure: every staff member of the school can read;
-- head teacher, admin and bursar can change.
create policy p3_read on public.academic_terms for select to authenticated
  using (tenant_id = public.current_tenant_id());
create policy p3_write on public.academic_terms for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'));
create policy p4_read on public.fee_items for select to authenticated
  using (tenant_id = public.current_tenant_id());
create policy p4_write on public.fee_items for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'));
-- Who has a bursary is private: money staff only.
create policy p4_adj_all on public.fee_adjustments for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'))
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'));
create policy p3_hist_read on public.class_history for select to authenticated
  using (tenant_id = public.current_tenant_id());
-- class_history is written only by nx_bill_term / nx_snapshot_classes.

-- ─── helpers ────────────────────────────────────────────────────────────
-- Same rule the app uses: "P5 Blue" → P5, "S 1A" → S1, "Baby Class" → BABY CLASS.
create or replace function public.nx_class_key(p_stream text)
returns text language sql immutable as $$
  select case
    when p_stream is null or btrim(p_stream) = '' then ''
    when (regexp_match(btrim(p_stream), '^([A-Za-z]*\s*\d+)')) is not null
      then upper(regexp_replace((regexp_match(btrim(p_stream), '^([A-Za-z]*\s*\d+)'))[1], '\s+', '', 'g'))
    else upper(btrim(p_stream))
  end
$$;

create or replace function public._nx_money_staff(p_tenant text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is null                       -- service role / SQL editor
      or public.is_platform_operator()
      or (p_tenant = public.current_tenant_id() and public.current_user_role() in ('head','admin','bursar'))
$$;

-- ─── make a term the current one ───────────────────────────────────────
create or replace function public.nx_set_current_term(p_term_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_tenant text;
begin
  select tenant_id into v_tenant from academic_terms where id = p_term_id;
  if v_tenant is null then raise exception 'Term not found.' using errcode = 'P0002'; end if;
  if not public._nx_money_staff(v_tenant) then
    raise exception 'Only the head teacher or bursar can change the current term.' using errcode = '42501';
  end if;
  update academic_terms set status = 'closed' where tenant_id = v_tenant and status = 'current' and id <> p_term_id;
  update academic_terms set status = 'current' where id = p_term_id;
end $$;

-- ─── bill a term ────────────────────────────────────────────────────────
-- p_apply = false → preview only (nothing written). Returns a summary:
-- { pupils, charges, discounts, total_charged, total_discount, new_lines,
--   classes_without_fees: classes with no class-specific item (e.g. no Tuition), lines: [first 500 lines for the preview] }
create or replace function public.nx_bill_term(p_term_id bigint, p_apply boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t academic_terms%rowtype;
  v_has_transport boolean := to_regclass('public.transport_students') is not null;
  v_new_charges int := 0; v_new_disc int := 0;
  v_out jsonb;
begin
  select * into t from academic_terms where id = p_term_id;
  if not found then raise exception 'Term not found.' using errcode = 'P0002'; end if;
  if not public._nx_money_staff(t.tenant_id) then
    raise exception 'Only the head teacher or bursar can bill a term.' using errcode = '42501';
  end if;

  -- active pupils with their class key, boarding and van flags
  create temp table _nx_pupils on commit drop as
  select s.id as student_id, s.name as student_name, s.stream,
         public.nx_class_key(s.stream) as class_key,
         coalesce((to_jsonb(s)->>'is_boarding')::boolean, (to_jsonb(s)->'meta'->>'boarding')::boolean, false) as boarding,
         coalesce((to_jsonb(s)->'meta'->>'uses_van')::boolean, false) as van
  from students s
  where s.tenant_id = t.tenant_id and coalesce(to_jsonb(s)->>'status', 'active') in ('active', '');
  if v_has_transport then
    execute 'update _nx_pupils p set van = true from transport_students ts
             where ts.tenant_id = $1 and ts.student_id = p.student_id and coalesce((to_jsonb(ts)->>''active'')::boolean, true)'
      using t.tenant_id;
  end if;

  -- charge lines: every fee item that applies to each pupil
  create temp table _nx_lines on commit drop as
  select p.student_id, p.student_name, p.stream, i.id as item_id, i.name as item, i.amount,
         'BILL-' || t.id || '-' || i.id || '-' || p.student_id as reference
  from _nx_pupils p
  join fee_items i on i.term_id = t.id
                  and (i.class_key = '*' or upper(btrim(i.class_key)) = p.class_key)
                  and (i.applies_to = 'all'
                       or (i.applies_to = 'boarding' and p.boarding)
                       or (i.applies_to = 'day' and not p.boarding)
                       or (i.applies_to = 'transport' and p.van));

  -- discounts: fixed amount, or a percentage of what this term bills the pupil
  create temp table _nx_disc on commit drop as
  select a.id as adj_id, a.student_id, a.kind,
         least(coalesce(a.amount, round(coalesce(b.billed, 0) * a.percent / 100, 0)), coalesce(b.billed, 0)) as amount,
         'ADJ-' || a.id as reference
  from fee_adjustments a
  left join (select student_id, sum(amount) as billed from _nx_lines group by student_id) b on b.student_id = a.student_id
  where a.term_id = t.id;

  if p_apply then
    insert into fees (tenant_id, student_id, term, term_id, kind, amount, notes, reference)
    select t.tenant_id, l.student_id, t.name, t.id, 'charge', l.amount, l.item, l.reference
    from _nx_lines l
    on conflict (tenant_id, reference) where reference like 'BILL-%' or reference like 'ADJ-%' do nothing;
    get diagnostics v_new_charges = row_count;

    insert into fees (tenant_id, student_id, term, term_id, kind, amount, notes, reference)
    select t.tenant_id, d.student_id, t.name, t.id, 'discount', d.amount, initcap(replace(d.kind, '_', ' ')), d.reference
    from _nx_disc d where d.amount > 0
    on conflict (tenant_id, reference) where reference like 'BILL-%' or reference like 'ADJ-%' do nothing;
    get diagnostics v_new_disc = row_count;

    insert into class_history (tenant_id, term_id, student_id, stream, boarding)
    select t.tenant_id, t.id, p.student_id, p.stream, p.boarding from _nx_pupils p
    on conflict (term_id, student_id) do nothing;

    update academic_terms set billed_at = now() where id = t.id;
  else
    -- preview: how many lines are not billed yet
    select count(*) into v_new_charges from _nx_lines l
    where not exists (select 1 from fees f where f.tenant_id = t.tenant_id and f.reference = l.reference);
    select count(*) into v_new_disc from _nx_disc d
    where d.amount > 0 and not exists (select 1 from fees f where f.tenant_id = t.tenant_id and f.reference = d.reference);
  end if;

  select jsonb_build_object(
    'term', t.name,
    'applied', p_apply,
    'pupils', (select count(*) from _nx_pupils),
    'pupils_billed', (select count(distinct student_id) from _nx_lines),
    'charges', (select count(*) from _nx_lines),
    'discounts', (select count(*) from _nx_disc where amount > 0),
    'total_charged', (select coalesce(sum(amount), 0) from _nx_lines),
    'total_discount', (select coalesce(sum(amount), 0) from _nx_disc),
    'new_lines', v_new_charges + v_new_disc,
    'classes_without_fees', coalesce((select jsonb_agg(distinct coalesce(nullif(p.stream, ''), '(no class)'))
                                      from _nx_pupils p
                                      where not exists (select 1 from _nx_lines l join fee_items i on i.id = l.item_id
                                                        where l.student_id = p.student_id and i.class_key <> '*')), '[]'::jsonb),
    'lines', coalesce((select jsonb_agg(x) from (select student_id, student_name, stream, item, amount from _nx_lines
                                                 order by stream, student_name, item limit 500) x), '[]'::jsonb)
  ) into v_out;

  drop table if exists _nx_pupils; drop table if exists _nx_lines; drop table if exists _nx_disc;
  return v_out;
end $$;

revoke all on function public.nx_bill_term(bigint, boolean) from public, anon;
grant execute on function public.nx_bill_term(bigint, boolean) to authenticated;
revoke all on function public.nx_set_current_term(bigint) from public, anon;
grant execute on function public.nx_set_current_term(bigint) to authenticated;
revoke all on function public._nx_money_staff(text) from public, anon;

commit;
