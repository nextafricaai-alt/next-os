-- Import all Kabs Lily Teachers with Classes & Subjects into Supabase
-- Run this in the Supabase SQL Editor

-- 1. Ensure class_assignments table exists
CREATE TABLE IF NOT EXISTS class_assignments (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id      bigint NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  stream          text NOT NULL,
  subject         text NOT NULL,
  is_class_teacher boolean DEFAULT false
);

DO $$
DECLARE
  v_tenant_id text := 'kabs-lily-junior-school-and-kindercare-centre';
  v_t1 bigint; v_t2 bigint; v_t3 bigint; v_t4 bigint; v_t5 bigint;
  v_t6 bigint; v_t7 bigint; v_t8 bigint; v_t9 bigint; v_t10 bigint;
  v_t11 bigint; v_t12 bigint; v_t13 bigint; v_t14 bigint; v_t15 bigint;
BEGIN
  -- Delete existing teachers for clean re-import
  DELETE FROM class_assignments WHERE tenant_id = v_tenant_id;
  DELETE FROM teachers WHERE tenant_id = v_tenant_id;

  -- Insert Teachers with Subjects ARRAY
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Mpamulungi Justine', '0704772302', 'justine@kabslily.edu.ug', 350000, ARRAY['LA 1', 'LA 2', 'LA 4']) RETURNING id INTO v_t1;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Nakalembe Jeminma', '0704551553', 'jeminma@kabslily.edu.ug', 300000, ARRAY['LA 3', 'LA 4']) RETURNING id INTO v_t2;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Nakanda Mayirah', '0755068947', 'mayirah@kabslily.edu.ug', 250000, ARRAY[]::text[]) RETURNING id INTO v_t3;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Nalule Harriet', '0701647582', 'harriet@kabslily.edu.ug', 300000, ARRAY['Luganda', 'LIT 1']) RETURNING id INTO v_t4;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Ikubu Christine', '0771791911', 'christine@kabslily.edu.ug', 380000, ARRAY['English', 'LIT 2']) RETURNING id INTO v_t5;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Nalukenge Jane', '0750845160', 'jane@kabslily.edu.ug', 350000, ARRAY['Religious Education', 'Math']) RETURNING id INTO v_t6;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Elijja Weiswa', '', 'weiswa@kabslily.edu.ug', 300000, ARRAY['Math']) RETURNING id INTO v_t7;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Ayuto Esther', '0778787509', 'esther@kabslily.edu.ug', 330000, ARRAY['SST', 'Science']) RETURNING id INTO v_t8;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Ssemakula Ronnie', '0754972846', 'ronnie@kabslily.edu.ug', 350000, ARRAY['Science', 'Math']) RETURNING id INTO v_t9;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Paul Ongaria', '0780742619', 'paul@kabslily.edu.ug', 330000, ARRAY['English', 'Religious Education']) RETURNING id INTO v_t10;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Bunya Samuel', '0772555001', 'samuel@kabslily.edu.ug', 350000, ARRAY['SST', 'Religious Education']) RETURNING id INTO v_t11;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Joyce Kabali', '0782204110', 'kabalijoyce2@gmail.com', 0, ARRAY['English', 'LIT 2']) RETURNING id INTO v_t12;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Kwagala Deborah', '0709269324', 'deborah@kabslily.edu.ug', 250000, ARRAY[]::text[]) RETURNING id INTO v_t13;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Nalongo', '', 'nalongo@kabslily.edu.ug', 150000, ARRAY[]::text[]) RETURNING id INTO v_t14;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Nabukera Flavia', '0755866495', 'flavia@kabslily.edu.ug', 230000, ARRAY[]::text[]) RETURNING id INTO v_t15;

  -- Insert Class Assignments
  INSERT INTO class_assignments (tenant_id, teacher_id, stream, subject, is_class_teacher) VALUES
  (v_tenant_id, v_t1, 'Baby Class', 'LA 1', true),
  (v_tenant_id, v_t2, 'Middle Class', 'LA 3', true),
  (v_tenant_id, v_t3, 'Top Class', 'General', true),
  (v_tenant_id, v_t4, 'P.1', 'Luganda', true),
  (v_tenant_id, v_t5, 'P.2', 'English', true),
  (v_tenant_id, v_t6, 'P.3', 'Math', true),
  (v_tenant_id, v_t7, 'P.4', 'Math', true),
  (v_tenant_id, v_t8, 'P.5', 'Science', true),
  (v_tenant_id, v_t9, 'P.6', 'Science', true),
  (v_tenant_id, v_t10, 'P.7', 'English', true),
  (v_tenant_id, v_t11, 'P.7', 'SST', false),
  (v_tenant_id, v_t12, 'P.3', 'English', false),
  (v_tenant_id, v_t12, 'P.4', 'LIT 2', false);

  RAISE NOTICE 'Imported 15 teachers with subjects and class assignments for %', v_tenant_id;
END $$;
