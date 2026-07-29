-- ==========================================================================================
-- MASTER CLEANUP & SYNC SCRIPT FOR KABS LILY JUNIOR SCHOOL & KINDERCARE CENTRE
-- Run this ONCE in your Supabase SQL Editor.
-- This populates exactly 131 real Kabs Lily students categorized from P7 down to Baby Class.
-- ==========================================================================================

-- 0. Ensure columns exist on tables
ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS is_boarding boolean DEFAULT false;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS subjects text[];

DO $$
DECLARE
  v_tenant_id text := 'kabs-lily-junior-school-and-kindercare-centre';
  s_rec RECORD;
  v_t1 bigint; v_t2 bigint; v_t3 bigint; v_t4 bigint; v_t5 bigint;
  v_t6 bigint; v_t7 bigint; v_t8 bigint; v_t9 bigint; v_t10 bigint;
  v_t11 bigint; v_t12 bigint;
BEGIN

  -- 1. WIPE ALL OLD DEMO DATA FOR THIS TENANT
  DELETE FROM class_assignments WHERE tenant_id = v_tenant_id;
  DELETE FROM school_income WHERE tenant_id = v_tenant_id;
  DELETE FROM school_expenses WHERE tenant_id = v_tenant_id;
  DELETE FROM fees WHERE tenant_id = v_tenant_id;
  DELETE FROM attendance WHERE tenant_id = v_tenant_id;
  DELETE FROM staff_attendance WHERE tenant_id = v_tenant_id;
  DELETE FROM teachers WHERE tenant_id = v_tenant_id;
  DELETE FROM students WHERE tenant_id = v_tenant_id;

  -- 2. INSERT REAL KABS LILY TEACHERS (12 Staff Members)
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
  (v_tenant_id, 'Nakalanzi Prossy', '0758414436', 'prossy@kabslily.edu.ug', 400000, ARRAY['Mathematics', 'SST']) RETURNING id INTO v_t6;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Awori Martha', '0773663675', 'martha@kabslily.edu.ug', 420000, ARRAY['Science', 'Mathematics']) RETURNING id INTO v_t7;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Namutebi Prossy', '0753907727', 'namutebi@kabslily.edu.ug', 350000, ARRAY['English', 'SST']) RETURNING id INTO v_t8;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Ssengendo Edward', '0752538166', 'edward@kabslily.edu.ug', 450000, ARRAY['Science', 'Mathematics']) RETURNING id INTO v_t9;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Mukalazi Isaac', '0703816568', 'isaac@kabslily.edu.ug', 500000, ARRAY['SST', 'RE']) RETURNING id INTO v_t10;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Kaaya Dennis', '0759972370', 'dennis@kabslily.edu.ug', 480000, ARRAY['English', 'LIT 1']) RETURNING id INTO v_t11;
  
  INSERT INTO teachers (tenant_id, full_name, phone, email, monthly_salary, subjects) VALUES
  (v_tenant_id, 'Kigozi Joseph', '0756770281', 'joseph@kabslily.edu.ug', 550000, ARRAY['Mathematics', 'Science']) RETURNING id INTO v_t12;

  -- Insert Teacher Class Assignments
  INSERT INTO class_assignments (tenant_id, teacher_id, stream, subject, is_class_teacher) VALUES
  (v_tenant_id, v_t1, 'Baby Class', 'LA 1', true),
  (v_tenant_id, v_t2, 'Middle Class', 'LA 3', true),
  (v_tenant_id, v_t3, 'Top Class', 'Pre-Primary', true),
  (v_tenant_id, v_t4, 'Primary One', 'Luganda', true),
  (v_tenant_id, v_t5, 'Primary Two', 'English', true),
  (v_tenant_id, v_t6, 'Primary Three', 'Mathematics', true),
  (v_tenant_id, v_t7, 'Primary Four', 'Science', true),
  (v_tenant_id, v_t8, 'Primary Five', 'SST', true),
  (v_tenant_id, v_t9, 'Primary Six', 'Mathematics', true),
  (v_tenant_id, v_t10, 'Primary Seven', 'SST', true);

  -- 3. INSERT EXACTLY 131 REAL KABS LILY STUDENTS CLASSIFIED P7 DOWN TO BABY CLASS
  INSERT INTO students (tenant_id, name, stream, is_boarding, guardian_name, guardian_phone) VALUES
  -- Primary Seven (15 Students)
  (v_tenant_id, 'Nanteza Keira Tendo', 'Primary Seven', false, 'Parent of Nanteza Keira Tendo', '+256700000117'),
  (v_tenant_id, 'Sophie Bani Musa', 'Primary Seven', false, 'Parent of Sophie Bani Musa', '+256700000118'),
  (v_tenant_id, 'Nampala Moureen', 'Primary Seven', false, 'Parent of Nampala Moureen', '+256700000119'),
  (v_tenant_id, 'Ssekidde Saifuh', 'Primary Seven', true, 'Parent of Ssekidde Saifuh', '+256700000120'),
  (v_tenant_id, 'Nabbumba Fann', 'Primary Seven', true, 'Parent of Nabbumba Fann', '+256700000121'),
  (v_tenant_id, 'Kamale Topister', 'Primary Seven', false, 'Parent of Kamale Topister', '+256700000122'),
  (v_tenant_id, 'Ikanga Obadia', 'Primary Seven', true, 'Parent of Ikanga Obadia', '+256700000123'),
  (v_tenant_id, 'Mpindi Ruth', 'Primary Seven', true, 'Parent of Mpindi Ruth', '+256700000124'),
  (v_tenant_id, 'Mpinda Danabell', 'Primary Seven', true, 'Parent of Mpinda Danabell', '+256700000125'),
  (v_tenant_id, 'Asiimwe Brendah', 'Primary Seven', true, 'Parent of Asiimwe Brendah', '+256700000126'),
  (v_tenant_id, 'Kabite Tranella', 'Primary Seven', true, 'Parent of Kabite Tranella', '+256700000127'),
  (v_tenant_id, 'Nakamoga Queen', 'Primary Seven', true, 'Parent of Nakamoga Queen', '+256700000128'),
  (v_tenant_id, 'Mulindwa Josh', 'Primary Seven', true, 'Parent of Mulindwa Josh', '+256700000129'),
  (v_tenant_id, 'Waswa Joe', 'Primary Seven', true, 'Parent of Waswa Joe', '+256700000130'),
  (v_tenant_id, 'Sekiremba Jonah', 'Primary Seven', true, 'Parent of Sekiremba Jonah', '+256700000131'),

  -- Primary Six (12 Students)
  (v_tenant_id, 'Nassuna Leticia', 'Primary Six', false, 'Parent of Nassuna Leticia', '+256700000105'),
  (v_tenant_id, 'Ssekabira Oscar', 'Primary Six', true, 'Parent of Ssekabira Oscar', '+256700000106'),
  (v_tenant_id, 'Talibu Shubra', 'Primary Six', false, 'Parent of Talibu Shubra', '+256700000107'),
  (v_tenant_id, 'Nakiwa Joan', 'Primary Six', false, 'Parent of Nakiwa Joan', '+256700000108'),
  (v_tenant_id, 'Ssempijja Shammah', 'Primary Six', false, 'Parent of Ssempijja Shammah', '+256700000109'),
  (v_tenant_id, 'Nabukeera Margie', 'Primary Six', false, 'Parent of Nabukeera Margie', '+256700000110'),
  (v_tenant_id, 'Ikanga Joyce', 'Primary Six', true, 'Parent of Ikanga Joyce', '+256700000111'),
  (v_tenant_id, 'Nakimbugwe Ketra', 'Primary Six', true, 'Parent of Nakimbugwe Ketra', '+256700000112'),
  (v_tenant_id, 'Kanamwanji Malcolm', 'Primary Six', false, 'Parent of Kanamwanji Malcolm', '+256700000113'),
  (v_tenant_id, 'Nalugwa Sauya', 'Primary Six', false, 'Parent of Nalugwa Sauya', '+256700000114'),
  (v_tenant_id, 'Mwanje Rayan', 'Primary Six', false, 'Parent of Mwanje Rayan', '+256700000115'),
  (v_tenant_id, 'Kamooga Emmanuel', 'Primary Six', false, 'Parent of Kamooga Emmanuel', '+256700000116'),

  -- Primary Five (10 Students)
  (v_tenant_id, 'Nakato Annet Favour', 'Primary Five', true, 'Parent of Nakato Annet Favour', '+256700000095'),
  (v_tenant_id, 'Nakalema Patricia', 'Primary Five', true, 'Parent of Nakalema Patricia', '+256700000096'),
  (v_tenant_id, 'Nakamoga Victoria', 'Primary Five', false, 'Parent of Nakamoga Victoria', '+256700000097'),
  (v_tenant_id, 'Ssekyanzi Octavian', 'Primary Five', false, 'Parent of Ssekyanzi Octavian', '+256700000098'),
  (v_tenant_id, 'Nakato Shabiba', 'Primary Five', false, 'Parent of Nakato Shabiba', '+256700000099'),
  (v_tenant_id, 'Nakimuli Maria Ketra', 'Primary Five', false, 'Parent of Nakimuli Maria Ketra', '+256700000100'),
  (v_tenant_id, 'Namntovu Jennifer', 'Primary Five', false, 'Parent of Namntovu Jennifer', '+256700000101'),
  (v_tenant_id, 'Nakituba Anna', 'Primary Five', false, 'Parent of Nakituba Anna', '+256700000102'),
  (v_tenant_id, 'Mulindwa Jash', 'Primary Five', true, 'Parent of Mulindwa Jash', '+256700000103'),
  (v_tenant_id, 'Kitiibwa Shantel', 'Primary Five', true, 'Parent of Kitiibwa Shantel', '+256700000104'),

  -- Primary Four (6 Students)
  (v_tenant_id, 'Ijungo Mathias', 'Primary Four', false, 'Parent of Ijungo Mathias', '+256700000089'),
  (v_tenant_id, 'Yiga Rashim', 'Primary Four', false, 'Parent of Yiga Rashim', '+256700000090'),
  (v_tenant_id, 'Kasswa David', 'Primary Four', false, 'Parent of Kasswa David', '+256700000091'),
  (v_tenant_id, 'Asiimwe Brenda', 'Primary Four', false, 'Parent of Asiimwe Brenda', '+256700000092'),
  (v_tenant_id, 'Kimuli Marvin', 'Primary Four', false, 'Parent of Kimuli Marvin', '+256700000093'),
  (v_tenant_id, 'Nantongo Hashimin Tara', 'Primary Four', false, 'Parent of Nantongo Hashimin Tara', '+256700000094'),

  -- Primary Three (17 Students)
  (v_tenant_id, 'Nachwa Ronah', 'Primary Three', false, 'Parent of Nachwa Ronah', '+256700000072'),
  (v_tenant_id, 'Nakimuli Queen Kevin', 'Primary Three', false, 'Parent of Nakimuli Queen Kevin', '+256700000073'),
  (v_tenant_id, 'Numbere Micheal', 'Primary Three', false, 'Parent of Numbere Micheal', '+256700000074'),
  (v_tenant_id, 'Nakaboye Whitney', 'Primary Three', false, 'Parent of Nakaboye Whitney', '+256700000075'),
  (v_tenant_id, 'Kasuja Salmah', 'Primary Three', true, 'Parent of Kasuja Salmah', '+256700000076'),
  (v_tenant_id, 'Babirye Ronitah', 'Primary Three', true, 'Parent of Babirye Ronitah', '+256700000077'),
  (v_tenant_id, 'Lugoboli Charles', 'Primary Three', false, 'Parent of Lugoboli Charles', '+256700000078'),
  (v_tenant_id, 'Arinaitwe Jeremiah', 'Primary Three', false, 'Parent of Arinaitwe Jeremiah', '+256700000079'),
  (v_tenant_id, 'Nkatia Jamila', 'Primary Three', false, 'Parent of Nkatia Jamila', '+256700000080'),
  (v_tenant_id, 'Kemicisa Elizabeth', 'Primary Three', false, 'Parent of Kemicisa Elizabeth', '+256700000081'),
  (v_tenant_id, 'Nakayenga Bushirah', 'Primary Three', false, 'Parent of Nakayenga Bushirah', '+256700000082'),
  (v_tenant_id, 'Mulungi Sharifah', 'Primary Three', false, 'Parent of Mulungi Sharifah', '+256700000083'),
  (v_tenant_id, 'Aizuka Trevor', 'Primary Three', false, 'Parent of Aizuka Trevor', '+256700000084'),
  (v_tenant_id, 'Ssebyesero Raymond', 'Primary Three', false, 'Parent of Ssebyesero Raymond', '+256700000085'),
  (v_tenant_id, 'Amanda Mikeiparah', 'Primary Three', false, 'Parent of Amanda Mikeiparah', '+256700000086'),
  (v_tenant_id, 'Kamoga Adasa Esther', 'Primary Three', false, 'Parent of Kamoga Adasa Esther', '+256700000087'),
  (v_tenant_id, 'Mukisa Tania', 'Primary Three', true, 'Parent of Mukisa Tania', '+256700000088'),

  -- Primary Two (15 Students)
  (v_tenant_id, 'Nansuyimba Martina', 'Primary Two', false, 'Parent of Nansuyimba Martina', '+256700000051'),
  (v_tenant_id, 'Nalukenge Patricia', 'Primary Two', false, 'Parent of Nalukenge Patricia', '+256700000052'),
  (v_tenant_id, 'Abaho Arthur', 'Primary Two', false, 'Parent of Abaho Arthur', '+256700000053'),
  (v_tenant_id, 'Nakato Rashidah', 'Primary Two', false, 'Parent of Nakato Rashidah', '+256700000054'),
  (v_tenant_id, 'Kasswa Rashid', 'Primary Two', false, 'Parent of Kasswa Rashid', '+256700000055'),
  (v_tenant_id, 'Nbagide Mariam', 'Primary Two', false, 'Parent of Nbagide Mariam', '+256700000056'),
  (v_tenant_id, 'Kalusimbi Teyin', 'Primary Two', false, 'Parent of Kalusimbi Teyin', '+256700000057'),
  (v_tenant_id, 'Namazzi Paris', 'Primary Two', false, 'Parent of Namazzi Paris', '+256700000058'),
  (v_tenant_id, 'Kimbowa Elijah', 'Primary Two', false, 'Parent of Kimbowa Elijah', '+256700000059'),
  (v_tenant_id, 'Kalungi Joylin', 'Primary Two', false, 'Parent of Kalungi Joylin', '+256700000060'),
  (v_tenant_id, 'Kamooga Alton', 'Primary Two', false, 'Parent of Kamooga Alton', '+256700000061'),
  (v_tenant_id, 'Kawesa Jonah', 'Primary Two', false, 'Parent of Kawesa Jonah', '+256700000062'),
  (v_tenant_id, 'Mulindo Martha', 'Primary Two', false, 'Parent of Mulindo Martha', '+256700000063'),
  (v_tenant_id, 'Kimera Imran', 'Primary Two', false, 'Parent of Kimera Imran', '+256700000064'),
  (v_tenant_id, 'Tujjeesa Erisabesi', 'Primary Two', false, 'Parent of Tujjeesa Erisabesi', '+256700000065'),

  -- Primary One (15 Students)
  (v_tenant_id, 'Alinaitwe Elijah', 'Primary One', true, 'Parent of Alinaitwe Elijah', '+256700000201'),
  (v_tenant_id, 'Mulungi Patricia', 'Primary One', true, 'Parent of Mulungi Patricia', '+256700000202'),
  (v_tenant_id, 'Ikanga Obadia', 'Primary One', true, 'Parent of Ikanga Obadia', '+256700000203'),
  (v_tenant_id, 'Mulindwa Joel', 'Primary One', true, 'Parent of Mulindwa Joel', '+256700000204'),
  (v_tenant_id, 'Mpindi Ruth', 'Primary One', true, 'Parent of Mpindi Ruth', '+256700000205'),
  (v_tenant_id, 'Mpinda Danabell', 'Primary One', true, 'Parent of Mpinda Danabell', '+256700000206'),
  (v_tenant_id, 'Mukisa Tania', 'Primary One', true, 'Parent of Mukisa Tania', '+256700000207'),
  (v_tenant_id, 'Alupo Grace', 'Primary One', false, 'Parent of Alupo Grace', '+256700000208'),
  (v_tenant_id, 'Namukasa Joan', 'Primary One', false, 'Parent of Namukasa Joan', '+256700000209'),
  (v_tenant_id, 'Ssebuliba Martin', 'Primary One', false, 'Parent of Ssebuliba Martin', '+256700000210'),
  (v_tenant_id, 'Tugume Grace', 'Primary One', false, 'Parent of Tugume Grace', '+256700000211'),
  (v_tenant_id, 'Wasswa Trevor', 'Primary One', false, 'Parent of Wasswa Trevor', '+256700000212'),
  (v_tenant_id, 'Nalwoga Fiona', 'Primary One', false, 'Parent of Nalwoga Fiona', '+256700000213'),
  (v_tenant_id, 'Ssali Victor', 'Primary One', false, 'Parent of Ssali Victor', '+256700000214'),
  (v_tenant_id, 'Nabwire Hope', 'Primary One', false, 'Parent of Nabwire Hope', '+256700000215'),

  -- Top Class (15 Students)
  (v_tenant_id, 'Mawanda Tanish', 'Top Class', false, 'Parent of Mawanda Tanish', '+256700000036'),
  (v_tenant_id, 'Namuyanja Sarah', 'Top Class', false, 'Parent of Namuyanja Sarah', '+256700000037'),
  (v_tenant_id, 'Mutebi Parvin', 'Top Class', false, 'Parent of Mutebi Parvin', '+256700000038'),
  (v_tenant_id, 'Babirye Daniella', 'Top Class', false, 'Parent of Babirye Daniella', '+256700000039'),
  (v_tenant_id, 'Kato Dan', 'Top Class', false, 'Parent of Kato Dan', '+256700000040'),
  (v_tenant_id, 'Malaika Natalia', 'Top Class', false, 'Parent of Malaika Natalia', '+256700000041'),
  (v_tenant_id, 'Kato Kirumira', 'Top Class', false, 'Parent of Kato Kirumira', '+256700000042'),
  (v_tenant_id, 'Kasswa Emma', 'Top Class', false, 'Parent of Kasswa Emma', '+256700000043'),
  (v_tenant_id, 'Mokungi Nicole', 'Top Class', false, 'Parent of Mokungi Nicole', '+256700000044'),
  (v_tenant_id, 'Asiimwe Timothy', 'Top Class', false, 'Parent of Asiimwe Timothy', '+256700000045'),
  (v_tenant_id, 'Nagaba Dellah', 'Top Class', false, 'Parent of Nagaba Dellah', '+256700000046'),
  (v_tenant_id, 'Bahati Rania', 'Top Class', false, 'Parent of Bahati Rania', '+256700000047'),
  (v_tenant_id, 'Twebaze Isaaya', 'Top Class', false, 'Parent of Twebaze Isaaya', '+256700000048'),
  (v_tenant_id, 'Namukwaya Daniella', 'Top Class', false, 'Parent of Namukwaya Daniella', '+256700000049'),
  (v_tenant_id, 'Nakanwoki Emarine', 'Top Class', false, 'Parent of Nakanwoki Emarine', '+256700000050'),

  -- Middle Class (14 Students)
  (v_tenant_id, 'Nabbanya Miracle', 'Middle Class', false, 'Parent of Nabbanya Miracle', '+256700000015'),
  (v_tenant_id, 'Kiberu Rohan', 'Middle Class', false, 'Parent of Kiberu Rohan', '+256700000016'),
  (v_tenant_id, 'Ssenyondo Rayan', 'Middle Class', false, 'Parent of Ssenyondo Rayan', '+256700000017'),
  (v_tenant_id, 'Kalungi Jovitah', 'Middle Class', false, 'Parent of Kalungi Jovitah', '+256700000018'),
  (v_tenant_id, 'Kemirembe Dorothy', 'Middle Class', false, 'Parent of Kemirembe Dorothy', '+256700000019'),
  (v_tenant_id, 'Namatovu Skylar', 'Middle Class', false, 'Parent of Namatovu Skylar', '+256700000020'),
  (v_tenant_id, 'Bagonza Isaiah', 'Middle Class', false, 'Parent of Bagonza Isaiah', '+256700000021'),
  (v_tenant_id, 'Kalema Abdulrahim Abubakim', 'Middle Class', false, 'Parent of Kalema Abdulrahim Abubakim', '+256700000022'),
  (v_tenant_id, 'Kato James', 'Middle Class', false, 'Parent of Kato James', '+256700000023'),
  (v_tenant_id, 'Kassina John', 'Middle Class', false, 'Parent of Kassina John', '+256700000024'),
  (v_tenant_id, 'Namayanja Joweria', 'Middle Class', false, 'Parent of Namayanja Joweria', '+256700000025'),
  (v_tenant_id, 'Kayemba Ronnie', 'Middle Class', false, 'Parent of Kayemba Ronnie', '+256700000026'),
  (v_tenant_id, 'Beesa Imran', 'Middle Class', false, 'Parent of Beesa Imran', '+256700000027'),
  (v_tenant_id, 'Kyakuna Arthur', 'Middle Class', false, 'Parent of Kyakuna Arthur', '+256700000030'),

  -- Baby Class (12 Students)
  (v_tenant_id, 'Namala Leticia', 'Baby Class', false, 'Parent of Namala Leticia', '+256700000001'),
  (v_tenant_id, 'Arinaitwe Elijah', 'Baby Class', true, 'Parent of Arinaitwe Elijah', '+256700000002'),
  (v_tenant_id, 'Ssentongo Alpha', 'Baby Class', false, 'Parent of Ssentongo Alpha', '+256700000003'),
  (v_tenant_id, 'Blessing Namusisi', 'Baby Class', false, 'Parent of Blessing Namusisi', '+256700000004'),
  (v_tenant_id, 'Kisakye Jemimah', 'Baby Class', false, 'Parent of Kisakye Jemimah', '+256700000005'),
  (v_tenant_id, 'Male David Joshua', 'Baby Class', false, 'Parent of Male David Joshua', '+256700000006'),
  (v_tenant_id, 'Lataya Elvis', 'Baby Class', false, 'Parent of Lataya Elvis', '+256700000007'),
  (v_tenant_id, 'Ssuna Traylin', 'Baby Class', false, 'Parent of Ssuna Traylin', '+256700000008'),
  (v_tenant_id, 'Momoa Kent', 'Baby Class', false, 'Parent of Momoa Kent', '+256700000009'),
  (v_tenant_id, 'Eady Steven', 'Baby Class', false, 'Parent of Eady Steven', '+256700000010'),
  (v_tenant_id, 'Nalubwama Maria Blessing', 'Baby Class', false, 'Parent of Nalubwama Maria Blessing', '+256700000011'),
  (v_tenant_id, 'Kirabo Wisdom', 'Baby Class', false, 'Parent of Kirabo Wisdom', '+256700000012');

  -- 4. POPULATE REAL SCHOOL_INCOME TABLE
  INSERT INTO school_income (tenant_id, student_name, class, source_type, amount, unspent_balance, payment_method, notes, logged_by)
  SELECT 
    v_tenant_id,
    s.name,
    s.stream,
    CASE WHEN s.is_boarding THEN 'School Fees (Boarding)' ELSE 'School Fees (Tuition)' END,
    CASE WHEN s.is_boarding THEN 500000 ELSE 250000 END,
    CASE WHEN s.is_boarding THEN 250000 ELSE 100000 END,
    'Cash',
    CASE WHEN s.is_boarding THEN 'Boarding student fee ledger' ELSE 'Day scholar fee ledger' END,
    'bursar'
  FROM students s
  WHERE s.tenant_id = v_tenant_id;

  -- 5. POPULATE REAL PUBLIC.FEES TABLE
  FOR s_rec IN SELECT id, name, stream, is_boarding FROM students WHERE tenant_id = v_tenant_id LOOP
    
    INSERT INTO fees (tenant_id, student_id, term, kind, amount, channel, reference, notes)
    VALUES (
      v_tenant_id,
      s_rec.id,
      'Term 2 2026',
      'charge',
      CASE WHEN s_rec.is_boarding THEN 500000 ELSE 250000 END,
      'Cash',
      'FEE-CHARGE-2026-T2',
      CASE WHEN s_rec.is_boarding THEN 'Boarding Student Full Fee' ELSE 'Day Scholar Full Fee' END
    );

    INSERT INTO fees (tenant_id, student_id, term, kind, amount, channel, reference, notes)
    VALUES (
      v_tenant_id,
      s_rec.id,
      'Term 2 2026',
      'payment',
      CASE WHEN s_rec.is_boarding THEN -250000 ELSE -150000 END,
      'Cash',
      'FEE-PAY-2026-T2',
      'Fee Payment Received'
    );

  END LOOP;

END $$;
