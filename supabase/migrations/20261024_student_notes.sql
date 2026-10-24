-- Pupil notes (Edit pupil → Notes). Safe to run more than once.     24 Oct 2026
alter table public.students add column if not exists notes text;
select 'Pupil notes ready' as result;
