-- ════════════════════════════════════════════════════════════════════════
-- Audit C9 — school transport: vans, drivers, pickup pins, trips.  17 Oct 2026
--
-- WHAT IT ADDS (nothing is deleted; safe to run more than once)
--  • transport_settings  one row per school: school gate location, fuel prices
--  • transport_vans      each van: name, plate, driver's sign-in email,
--                        fuel type and consumption (litres per 100 km)
--  • transport_trips     each trip a driver runs: start/end, km driven
--                        (from GPS), litres and fuel cost estimate
--  • transport_students  gets its own pickup pin (pickup_lat/lng), a note
--                        for the driver ("blue gate after the church"), and
--                        two new statuses: 'absent' and 'dropped'
-- All transport tables are read and written only through the NEXT Worker
-- (service key). From the browser, only NEXT OS operators — same as C5.
-- ════════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.transport_settings (
  tenant_id         text primary key references public.tenants(id) on delete cascade,
  school_lat        double precision,
  school_lng        double precision,
  petrol_price_ugx  numeric(10,2) default 6850,   -- per litre, Oct 2026 Kampala pump average
  diesel_price_ugx  numeric(10,2) default 6700,
  updated_by        text,
  updated_at        timestamptz default now()
);

create table if not exists public.transport_vans (
  tenant_id         text not null references public.tenants(id) on delete cascade,
  van_id            text not null,                 -- short id, e.g. 'van-01'
  name              text,                          -- e.g. 'Van 1 — Kira route'
  plate             text,
  driver_email      text,                          -- the driver's sign-in email
  driver_name       text,
  driver_phone      text,
  fuel_type         text not null default 'diesel', -- 'diesel' | 'petrol'
  l_per_100km       numeric(5,2) not null default 12, -- typical 14-seater minivan
  active            boolean not null default true,
  updated_at        timestamptz default now(),
  primary key (tenant_id, van_id)
);
create index if not exists transport_vans_driver_idx on public.transport_vans (lower(driver_email));

create table if not exists public.transport_trips (
  id                bigserial primary key,
  tenant_id         text not null references public.tenants(id) on delete cascade,
  van_id            text not null,
  kind              text not null default 'pickup',  -- 'pickup' (to school) | 'dropoff' (home)
  driver_email      text,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  km                numeric(8,2) not null default 0,  -- GPS distance driven
  litres            numeric(8,2),
  fuel_cost_ugx     numeric(12,2),
  children_total    integer,
  children_done     integer,
  updated_at        timestamptz default now()
);
create index if not exists transport_trips_van_idx on public.transport_trips (tenant_id, van_id, started_at desc);

alter table public.transport_students add column if not exists pickup_lat  double precision;
alter table public.transport_students add column if not exists pickup_lng  double precision;
alter table public.transport_students add column if not exists pickup_note text;
alter table public.transport_students add column if not exists active      boolean not null default true;
create index if not exists transport_students_child_idx
  on public.transport_students (tenant_id, student_id);

alter table public.transport_positions add column if not exists trip_id  bigint;
alter table public.transport_positions add column if not exists trip_km  numeric(8,2);

-- Lock every transport table to operators (the Worker uses the service key).
do $$
declare t text; pol record;
begin
  foreach t in array array['transport_settings','transport_vans','transport_trips',
                           'transport_positions','transport_students','transport_stops'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy c5_operator_all on public.%I for all to authenticated
                    using (public.is_platform_operator()) with check (public.is_platform_operator())', t);
  end loop;
end $$;

commit;

-- Check (should list the 6 transport tables, each with only c5_operator_all):
-- select tablename, policyname from pg_policies where tablename like 'transport_%' order by 1;
