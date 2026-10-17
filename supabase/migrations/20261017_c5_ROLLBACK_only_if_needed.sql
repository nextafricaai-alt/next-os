-- EMERGENCY ROLLBACK for supabase-c5-lock-down-rls.sql
-- Re-opens the school tables to everyone, exactly as insecure as before C5.
-- Use ONLY if staff are locked out and you need the app working while we fix
-- the cause. Then tell Claude what broke and run the C5 migration again.
begin;
do $$
declare t text;
begin
  foreach t in array array['students','fees','receipts','school_income','school_expenses','school_finance',
    'school_assets','payroll_deductions','teacher_payroll','teachers','teacher_checkins','teacher_logs',
    'teacher_merits_log','student_roll_call','student_health_records','student_notes','attendance',
    'staff_attendance','enrollments','lesson_plans','syllabus_coverage','class_assignments','timetable_slots',
    'exams','exam_results','school_events','school_config','os_records','messages','transport_positions',
    'transport_stops','transport_students','tenants','users'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists c5_rollback_open on public.%I', t);
      execute format('create policy c5_rollback_open on public.%I for all using (true) with check (true)', t);
    end if;
  end loop;
end $$;
commit;
