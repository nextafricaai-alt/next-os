-- Migration: Kabs Lily Seed Data & Attendance Tables
-- Run this in the Supabase SQL Editor

-- 1. Ensure staff_attendance table exists (as it might be missing from standard schema)
CREATE TABLE IF NOT EXISTS staff_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id  bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT current_date,
  time_in     time NOT NULL,
  status      text NOT NULL, -- 'On Duty', 'In Class', 'On Route'
  room        text,
  vehicle     text,
  created_at  timestamp with time zone DEFAULT now()
);
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
-- Assuming current_tenant_id() exists, otherwise fallback to standard auth check
-- CREATE POLICY tenant_isolation ON staff_attendance FOR ALL USING (tenant_id = current_tenant_id());

-- Enable Realtime for attendance
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table staff_attendance;


-- 2. Seed Data for Kabs Lily
DO $$
DECLARE
  v_tenant_id text := 'kabs-lily-junior-school-and-kindercare-centre';
  v_student_1 bigint;
  v_student_2 bigint;
  v_student_3 bigint;
  v_student_4 bigint;
  v_student_5 bigint;
  v_teacher_1 bigint;
  v_teacher_2 bigint;
  v_teacher_3 bigint;
  v_teacher_4 bigint;
  v_inc_1 uuid;
BEGIN
  -- We assume the tenant exists. If not, insert it (safe fallback).
  INSERT INTO tenants (id, name, vertical, subdomain) 
  VALUES (v_tenant_id, 'Kabs Lily Junior School', 'school', 'kabs-lily')
  ON CONFLICT (id) DO NOTHING;

  -- Clear existing mock data to avoid duplicates on re-run
  DELETE FROM school_income WHERE tenant_id = v_tenant_id;
  DELETE FROM school_expenses WHERE tenant_id = v_tenant_id;
  DELETE FROM staff_attendance WHERE tenant_id = v_tenant_id;
  DELETE FROM attendance WHERE tenant_id = v_tenant_id;
  DELETE FROM fees WHERE tenant_id = v_tenant_id;
  DELETE FROM teachers WHERE tenant_id = v_tenant_id;
  DELETE FROM students WHERE tenant_id = v_tenant_id;


  -- Seed Students
  INSERT INTO students (tenant_id, name, stream, guardian_name, guardian_phone, date_of_birth) VALUES
  (v_tenant_id, 'Brian Mukasa', 'P.4', 'Mrs. Mukasa', '0772123456', '2015-05-10') RETURNING id INTO v_student_1;
  INSERT INTO students (tenant_id, name, stream, guardian_name, guardian_phone, date_of_birth) VALUES
  (v_tenant_id, 'Grace Kintu', 'Baby Class', 'Mr. Kintu', '0752987654', '2020-02-14') RETURNING id INTO v_student_2;
  INSERT INTO students (tenant_id, name, stream, guardian_name, guardian_phone, date_of_birth) VALUES
  (v_tenant_id, 'Alvin Mwesigwa', 'P.1', 'Dr. Mwesigwa', '0788111222', '2018-11-20') RETURNING id INTO v_student_3;
  INSERT INTO students (tenant_id, name, stream, guardian_name, guardian_phone, date_of_birth) VALUES
  (v_tenant_id, 'Divine Okello', 'P.7', 'Ms. Okello', '0700555666', '2012-08-30') RETURNING id INTO v_student_4;
  INSERT INTO students (tenant_id, name, stream, guardian_name, guardian_phone, date_of_birth) VALUES
  (v_tenant_id, 'Joy Babirye', 'Top Class', 'Mrs. Babirye', '0779999888', '2019-01-05') RETURNING id INTO v_student_5;

  -- Seed Teachers
  INSERT INTO teachers (tenant_id, user_id, full_name, role, department, phone_number, email) VALUES
  (v_tenant_id, gen_random_uuid(), 'Nalukenge Jane', 'Head Teacher', 'Administration', '0771000001', 'jane@kabslily.edu.ug') RETURNING id INTO v_teacher_1;
  INSERT INTO teachers (tenant_id, user_id, full_name, role, department, phone_number, email) VALUES
  (v_tenant_id, gen_random_uuid(), 'Mr. Bbosa Yusufu', 'Shuttle Driver', 'Transport', '0771000002', 'bbosa@kabslily.edu.ug') RETURNING id INTO v_teacher_2;
  INSERT INTO teachers (tenant_id, user_id, full_name, role, department, phone_number, email) VALUES
  (v_tenant_id, gen_random_uuid(), 'Tr. Sarah Namuli', 'Class Teacher', 'P.4', '0771000003', 'sarah@kabslily.edu.ug') RETURNING id INTO v_teacher_3;
  INSERT INTO teachers (tenant_id, user_id, full_name, role, department, phone_number, email) VALUES
  (v_tenant_id, gen_random_uuid(), 'Tr. Moses K.', 'Class Teacher', 'P.1', '0771000004', 'moses@kabslily.edu.ug') RETURNING id INTO v_teacher_4;

  -- Seed Incomes
  INSERT INTO school_income (tenant_id, student_name, class, source_type, amount, unspent_balance, payment_method, received_by, notes, logged_by) VALUES
  (v_tenant_id, 'Brian Mukasa', 'P.4', 'School Fees (Tuition)', 750000, 580000, 'Cash', 'Nalukenge Jane', 'Term 2 fees - full payment', 'bursar')
  RETURNING id INTO v_inc_1;
  INSERT INTO school_income (tenant_id, student_name, class, source_type, amount, unspent_balance, payment_method, received_by, notes, logged_by) VALUES
  (v_tenant_id, 'Alvin Mwesigwa', 'P.1', 'Transport (Shuttle)', 120000, 120000, 'Mobile Money', 'Nalukenge Jane', 'Term 2 morning route', 'bursar');

  -- Seed Expenses
  INSERT INTO school_expenses (tenant_id, category, description, amount, paid_to, income_source_id, notes, receipt_attached, logged_by) VALUES
  (v_tenant_id, 'Fuel & Transport', 'Shuttle Van Diesel (Mr. Bbosa)', 50000, 'Total Energies Kireka', v_inc_1, 'Morning shuttle route fuel', true, 'bursar');
  INSERT INTO school_expenses (tenant_id, category, description, amount, paid_to, income_source_id, notes, receipt_attached, logged_by) VALUES
  (v_tenant_id, 'Utilities', 'Yaka Electricity Token', 120000, 'UMEME', v_inc_1, 'Monthly prepaid token for main block', false, 'bursar');

  -- Seed Fees (Payment history)
  INSERT INTO fees (tenant_id, student_id, kind, amount, description, due_date, status) VALUES
  (v_tenant_id, v_student_1, 'payment', 750000, 'School Fees (Tuition)', current_date, 'paid');
  INSERT INTO fees (tenant_id, student_id, kind, amount, description, due_date, status) VALUES
  (v_tenant_id, v_student_3, 'payment', 120000, 'Transport (Shuttle)', current_date, 'paid');

  -- Seed Gate Attendance (attendance table)
  INSERT INTO attendance (tenant_id, student_id, date, present, notes) VALUES
  (v_tenant_id, v_student_1, current_date, true, '07:42 AM - Main Gate - RFID Tag');
  INSERT INTO attendance (tenant_id, student_id, date, present, notes) VALUES
  (v_tenant_id, v_student_2, current_date, true, '07:45 AM - Main Gate - Manual Check-in');
  INSERT INTO attendance (tenant_id, student_id, date, present, notes) VALUES
  (v_tenant_id, v_student_3, current_date, true, '07:50 AM - Main Gate - Shuttle Dropoff');
  INSERT INTO attendance (tenant_id, student_id, date, present, notes) VALUES
  (v_tenant_id, v_student_4, current_date, true, '07:55 AM - Main Gate - Shuttle Dropoff');
  INSERT INTO attendance (tenant_id, student_id, date, present, notes) VALUES
  (v_tenant_id, v_student_5, current_date, false, '08:10 AM - Main Gate - Parent Dropoff (Late)');

  -- Seed Staff Attendance
  INSERT INTO staff_attendance (tenant_id, teacher_id, date, time_in, status, room, vehicle) VALUES
  (v_tenant_id, v_teacher_1, current_date, '06:45:00', 'On Duty', 'Administration', null);
  INSERT INTO staff_attendance (tenant_id, teacher_id, date, time_in, status, room, vehicle) VALUES
  (v_tenant_id, v_teacher_2, current_date, '06:30:00', 'On Route', null, 'UAB 218 Y');
  INSERT INTO staff_attendance (tenant_id, teacher_id, date, time_in, status, room, vehicle) VALUES
  (v_tenant_id, v_teacher_3, current_date, '07:15:00', 'In Class', 'Room 4A', null);
  INSERT INTO staff_attendance (tenant_id, teacher_id, date, time_in, status, room, vehicle) VALUES
  (v_tenant_id, v_teacher_4, current_date, '07:20:00', 'In Class', 'Room 1B', null);

END $$;
