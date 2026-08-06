-- ==========================================================================================
-- MASTER CLEANUP & SYNC SCRIPT FOR KABS LILY JUNIOR SCHOOL & KINDERCARE CENTRE
-- 100% COMPLETE & AUTHORITATIVE DATA FOR ALL 10 CLASSES INCLUDING PRIMARY ONE ("CLASS NOT VISIBLE")
-- ==========================================================================================

-- 0. Ensure columns exist on tables
ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS is_boarding boolean DEFAULT false;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS subjects text[];
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS merit_points integer DEFAULT 0;

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
  DELETE FROM student_health_records WHERE tenant_id = v_tenant_id;
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

  -- Teacher Class Assignments
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

    -- 3. INSERT ALL REAL KABS LILY STUDENTS (100% PDF ACCURATE FOR ALL 10 CLASSES)
  INSERT INTO students (tenant_id, name, stream, is_boarding, guardian_name, guardian_phone) VALUES
  -- Baby Class
  -- Middle Class
  -- Top Class
  -- Primary One
  -- Primary Two
  -- Primary Three
  -- Primary Four
  -- Primary Five
  -- Primary Six
  -- Primary Seven
  (v_tenant_id, 'NAMALA LETICIA', 'Baby Class', false, 'Parent of NAMALA LETICIA', '+25670000001'),
  (v_tenant_id, 'ARINAITWE ELIJAH', 'Baby Class', false, 'Parent of ARINAITWE ELIJAH', '+25670000002'),
  (v_tenant_id, 'SSENTONGO ALPHA', 'Baby Class', false, 'Parent of SSENTONGO ALPHA', '+25670000003'),
  (v_tenant_id, 'BLESSING NAMUSISI', 'Baby Class', false, 'Parent of BLESSING NAMUSISI', '+25670000004'),
  (v_tenant_id, 'KISAKYE JEMIMAH', 'Baby Class', false, 'Parent of KISAKYE JEMIMAH', '+25670000005'),
  (v_tenant_id, 'MALE DAVID JOSHUA', 'Baby Class', false, 'Parent of MALE DAVID JOSHUA', '+25670000006'),
  (v_tenant_id, 'LATAYA ELVIS', 'Baby Class', false, 'Parent of LATAYA ELVIS', '+25670000007'),
  (v_tenant_id, 'SSUNA TRAVIN', 'Baby Class', false, 'Parent of SSUNA TRAVIN', '+25670000008'),
  (v_tenant_id, 'MERCY BIIRA', 'Baby Class', false, 'Parent of MERCY BIIRA', '+25670000009'),
  (v_tenant_id, 'KYAKUWA ARTHUR', 'Baby Class', false, 'Parent of KYAKUWA ARTHUR', '+25670000010'),
  (v_tenant_id, 'KIMBUGWE FAHAM', 'Baby Class', false, 'Parent of KIMBUGWE FAHAM', '+25670000011'),
  (v_tenant_id, 'MWANJE RAWUYAH', 'Baby Class', false, 'Parent of MWANJE RAWUYAH', '+25670000012'),
  (v_tenant_id, 'MUTUMBA HAYAN', 'Baby Class', false, 'Parent of MUTUMBA HAYAN', '+25670000013'),
  (v_tenant_id, 'NDINAYO ELIJAH', 'Baby Class', false, 'Parent of NDINAYO ELIJAH', '+25670000014'),
  (v_tenant_id, 'SIMOLA AARON', 'Baby Class', false, 'Parent of SIMOLA AARON', '+25670000015'),
  (v_tenant_id, 'MOMOA KENT', 'Baby Class', false, 'Parent of MOMOA KENT', '+25670000016'),
  (v_tenant_id, 'EADY STEVEN', 'Baby Class', false, 'Parent of EADY STEVEN', '+25670000017'),
  (v_tenant_id, 'NALUBWAMA MARIA BLESSING', 'Baby Class', false, 'Parent of NALUBWAMA MARIA BLESSING', '+25670000018'),
  (v_tenant_id, 'KIRABO WISDOM', 'Baby Class', false, 'Parent of KIRABO WISDOM', '+25670000019'),
  (v_tenant_id, 'KIRABO TERISA', 'Baby Class', false, 'Parent of KIRABO TERISA', '+25670000020'),
  (v_tenant_id, 'MUGWANYA DANIEL', 'Baby Class', false, 'Parent of MUGWANYA DANIEL', '+25670000021'),
  (v_tenant_id, 'KALEMA ABDULRAHIM', 'Baby Class', false, 'Parent of KALEMA ABDULRAHIM', '+25670000022'),
  (v_tenant_id, 'JOSH LUCAS', 'Baby Class', false, 'Parent of JOSH LUCAS', '+25670000023'),
  (v_tenant_id, 'Muwa', 'Baby Class', false, 'Parent of Muwa', '+25670000024'),
  (v_tenant_id, 'KALUNGI', 'Baby Class', false, 'Parent of KALUNGI', '+25670000025'),
  (v_tenant_id, 'Gift', 'Baby Class', false, 'Parent of Gift', '+25670000026'),
  (v_tenant_id, 'NABBANJA MIRACLE', 'Middle Class', false, 'Parent of NABBANJA MIRACLE', '+25670000027'),
  (v_tenant_id, 'KIBERU ROHAN', 'Middle Class', false, 'Parent of KIBERU ROHAN', '+25670000028'),
  (v_tenant_id, 'SSENYONJO RAYAN', 'Middle Class', false, 'Parent of SSENYONJO RAYAN', '+25670000029'),
  (v_tenant_id, 'KALUNGI JOVITAH', 'Middle Class', false, 'Parent of KALUNGI JOVITAH', '+25670000030'),
  (v_tenant_id, 'KEMIREMBE DOROTHY', 'Middle Class', false, 'Parent of KEMIREMBE DOROTHY', '+25670000031'),
  (v_tenant_id, 'NAMATOVU SKYLAR', 'Middle Class', false, 'Parent of NAMATOVU SKYLAR', '+25670000032'),
  (v_tenant_id, 'BAGONZA ISAIAH', 'Middle Class', false, 'Parent of BAGONZA ISAIAH', '+25670000033'),
  (v_tenant_id, 'MOLUNGI NICOLE', 'Middle Class', false, 'Parent of MOLUNGI NICOLE', '+25670000034'),
  (v_tenant_id, 'ASIIMWE TIMOTHY', 'Middle Class', false, 'Parent of ASIIMWE TIMOTHY', '+25670000035'),
  (v_tenant_id, 'NAGABA DELLAH', 'Middle Class', false, 'Parent of NAGABA DELLAH', '+25670000036'),
  (v_tenant_id, 'BAHAT RANIA ALKANDI MUHAMMAD', 'Middle Class', false, 'Parent of BAHAT RANIA ALKANDI MUHAMMAD', '+25670000037'),
  (v_tenant_id, 'TWEBAZE ISAAYA', 'Middle Class', false, 'Parent of TWEBAZE ISAAYA', '+25670000038'),
  (v_tenant_id, 'NAMUKWAYA DANIELLA', 'Middle Class', false, 'Parent of NAMUKWAYA DANIELLA', '+25670000039'),
  (v_tenant_id, 'NAKAWUKI EMARINE', 'Middle Class', false, 'Parent of NAKAWUKI EMARINE', '+25670000040'),
  (v_tenant_id, 'KATO JAMES', 'Middle Class', false, 'Parent of KATO JAMES', '+25670000041'),
  (v_tenant_id, 'WASSWA JOHN', 'Middle Class', false, 'Parent of WASSWA JOHN', '+25670000042'),
  (v_tenant_id, 'NAMAYANJA JOWERIA', 'Middle Class', false, 'Parent of NAMAYANJA JOWERIA', '+25670000043'),
  (v_tenant_id, 'KAYEMBA RONNIE', 'Middle Class', false, 'Parent of KAYEMBA RONNIE', '+25670000044'),
  (v_tenant_id, 'BEEZA IMRAN', 'Middle Class', false, 'Parent of BEEZA IMRAN', '+25670000045'),
  (v_tenant_id, 'MERCY', 'Middle Class', false, 'Parent of MERCY', '+25670000046'),
  (v_tenant_id, 'MUGWANYA XAVIER', 'Middle Class', false, 'Parent of MUGWANYA XAVIER', '+25670000047'),
  (v_tenant_id, 'MATOVU ALEENA', 'Middle Class', false, 'Parent of MATOVU ALEENA', '+25670000048'),
  (v_tenant_id, 'MAWANDA TANISH', 'Top Class', false, 'Parent of MAWANDA TANISH', '+25670000049'),
  (v_tenant_id, 'NAMUYANJA SARAH', 'Top Class', false, 'Parent of NAMUYANJA SARAH', '+25670000050'),
  (v_tenant_id, 'MUTEBI PARVIN', 'Top Class', false, 'Parent of MUTEBI PARVIN', '+25670000051'),
  (v_tenant_id, 'BABIRYE DANIELLA', 'Top Class', false, 'Parent of BABIRYE DANIELLA', '+25670000052'),
  (v_tenant_id, 'KATO DAN', 'Top Class', false, 'Parent of KATO DAN', '+25670000053'),
  (v_tenant_id, 'MALAIKA NATALIA', 'Top Class', false, 'Parent of MALAIKA NATALIA', '+25670000054'),
  (v_tenant_id, 'KATO KIRUMIRA', 'Top Class', false, 'Parent of KATO KIRUMIRA', '+25670000055'),
  (v_tenant_id, 'WASSWA EMMA', 'Top Class', false, 'Parent of WASSWA EMMA', '+25670000056'),
  (v_tenant_id, 'KIRABO SARAH NABAGGALA', 'Top Class', false, 'Parent of KIRABO SARAH NABAGGALA', '+25670000057'),
  (v_tenant_id, 'TAMALE HILAL NASSAR', 'Top Class', false, 'Parent of TAMALE HILAL NASSAR', '+25670000058'),
  (v_tenant_id, 'NAFUNA PATRICIA', 'Top Class', false, 'Parent of NAFUNA PATRICIA', '+25670000059'),
  (v_tenant_id, 'KAKOTTO PAYTON', 'Top Class', false, 'Parent of KAKOTTO PAYTON', '+25670000060'),
  (v_tenant_id, 'SSESAZZI MATHEW', 'Top Class', false, 'Parent of SSESAZZI MATHEW', '+25670000061'),
  (v_tenant_id, 'NYANZI CALVIN KAMPALA', 'Top Class', false, 'Parent of NYANZI CALVIN KAMPALA', '+25670000062'),
  (v_tenant_id, 'NAMAZZI PARIS', 'Top Class', false, 'Parent of NAMAZZI PARIS', '+25670000063'),
  (v_tenant_id, 'KIMBOWA ELIJAH', 'Top Class', false, 'Parent of KIMBOWA ELIJAH', '+25670000064'),
  (v_tenant_id, 'NABUKEERA SHANAI', 'Top Class', false, 'Parent of NABUKEERA SHANAI', '+25670000065'),
  (v_tenant_id, 'KAGIMU TOM', 'Top Class', false, 'Parent of KAGIMU TOM', '+25670000066'),
  (v_tenant_id, 'NAKIGOZI KENJHA', 'Top Class', false, 'Parent of NAKIGOZI KENJHA', '+25670000067'),
  (v_tenant_id, 'Nyanzi Jeriden', 'Primary One', false, 'Parent of Nyanzi Jeriden', '+25670000068'),
  (v_tenant_id, 'Namuli Ashley Peace', 'Primary One', false, 'Parent of Namuli Ashley Peace', '+25670000069'),
  (v_tenant_id, 'Nakimuli Matuwah', 'Primary One', false, 'Parent of Nakimuli Matuwah', '+25670000070'),
  (v_tenant_id, 'Melvin Kigozi', 'Primary One', false, 'Parent of Melvin Kigozi', '+25670000071'),
  (v_tenant_id, 'Nalumansi Tryphena', 'Primary One', false, 'Parent of Nalumansi Tryphena', '+25670000072'),
  (v_tenant_id, 'Amanya Aaron', 'Primary One', false, 'Parent of Amanya Aaron', '+25670000073'),
  (v_tenant_id, 'Tamale Roger', 'Primary One', false, 'Parent of Tamale Roger', '+25670000074'),
  (v_tenant_id, 'Kwagalakwe Eseza', 'Primary One', false, 'Parent of Kwagalakwe Eseza', '+25670000075'),
  (v_tenant_id, 'Namuwoonge Martha', 'Primary One', false, 'Parent of Namuwoonge Martha', '+25670000076'),
  (v_tenant_id, 'Alupo Brenda', 'Primary One', false, 'Parent of Alupo Brenda', '+25670000077'),
  (v_tenant_id, 'Muwanguzi Erisa', 'Primary One', false, 'Parent of Muwanguzi Erisa', '+25670000078'),
  (v_tenant_id, 'Mukasa Elijah', 'Primary One', false, 'Parent of Mukasa Elijah', '+25670000079'),
  (v_tenant_id, 'Ndagire Angel', 'Primary One', false, 'Parent of Ndagire Angel', '+25670000080'),
  (v_tenant_id, 'Obadia Kirangwa', 'Primary One', false, 'Parent of Obadia Kirangwa', '+25670000081'),
  (v_tenant_id, 'Namiyenya Jaselyn', 'Primary One', false, 'Parent of Namiyenya Jaselyn', '+25670000082'),
  (v_tenant_id, 'Luwedde Keren', 'Primary One', false, 'Parent of Luwedde Keren', '+25670000083'),
  (v_tenant_id, 'Mehek Jot', 'Primary One', false, 'Parent of Mehek Jot', '+25670000084'),
  (v_tenant_id, 'Nambatya Patricia', 'Primary One', false, 'Parent of Nambatya Patricia', '+25670000085'),
  (v_tenant_id, 'Kyambadde Ernest', 'Primary One', false, 'Parent of Kyambadde Ernest', '+25670000086'),
  (v_tenant_id, 'Nsobya Praise', 'Primary One', false, 'Parent of Nsobya Praise', '+25670000087'),
  (v_tenant_id, 'Amirah', 'Primary One', false, 'Parent of Amirah', '+25670000088'),
  (v_tenant_id, 'Harriet', 'Primary One', false, 'Parent of Harriet', '+25670000089'),
  (v_tenant_id, 'Flavia', 'Primary One', false, 'Parent of Flavia', '+25670000090'),
  (v_tenant_id, 'NANSOMBA MARTINA', 'Primary Two', false, 'Parent of NANSOMBA MARTINA', '+25670000091'),
  (v_tenant_id, 'NALUKENCE PATRICIA', 'Primary Two', false, 'Parent of NALUKENCE PATRICIA', '+25670000092'),
  (v_tenant_id, 'ABAHO ARTHUR', 'Primary Two', false, 'Parent of ABAHO ARTHUR', '+25670000093'),
  (v_tenant_id, 'NAKATO RASHIDAH', 'Primary Two', false, 'Parent of NAKATO RASHIDAH', '+25670000094'),
  (v_tenant_id, 'WASSWA RASHID', 'Primary Two', false, 'Parent of WASSWA RASHID', '+25670000095'),
  (v_tenant_id, 'NDAGIRE MARIAM', 'Primary Two', false, 'Parent of NDAGIRE MARIAM', '+25670000096'),
  (v_tenant_id, 'WALUSIMBI TEVIN', 'Primary Two', false, 'Parent of WALUSIMBI TEVIN', '+25670000097'),
  (v_tenant_id, 'KALUNGI JOVIN', 'Primary Two', false, 'Parent of KALUNGI JOVIN', '+25670000098'),
  (v_tenant_id, 'KAMOGA ALTON', 'Primary Two', false, 'Parent of KAMOGA ALTON', '+25670000099'),
  (v_tenant_id, 'KAWEESA JONAH', 'Primary Two', false, 'Parent of KAWEESA JONAH', '+25670000100'),
  (v_tenant_id, 'MUHINDO MARTHA', 'Primary Two', false, 'Parent of MUHINDO MARTHA', '+25670000101'),
  (v_tenant_id, 'KIMERA IMRAN', 'Primary Two', false, 'Parent of KIMERA IMRAN', '+25670000102'),
  (v_tenant_id, 'MUTEESA ELISABESI', 'Primary Two', false, 'Parent of MUTEESA ELISABESI', '+25670000103'),
  (v_tenant_id, 'KIMERA JOSEPH', 'Primary Two', false, 'Parent of KIMERA JOSEPH', '+25670000104'),
  (v_tenant_id, 'NALUGEMBE PRECIOUS', 'Primary Two', false, 'Parent of NALUGEMBE PRECIOUS', '+25670000105'),
  (v_tenant_id, 'Zalwango Marion', 'Primary Two', false, 'Parent of Zalwango Marion', '+25670000106'),
  (v_tenant_id, 'KIRABO SUCCESS', 'Primary Two', false, 'Parent of KIRABO SUCCESS', '+25670000107'),
  (v_tenant_id, 'LUGENDO JIMSON', 'Primary Two', false, 'Parent of LUGENDO JIMSON', '+25670000108'),
  (v_tenant_id, 'KALEMA RIHANNA', 'Primary Two', false, 'Parent of KALEMA RIHANNA', '+25670000109'),
  (v_tenant_id, 'SSEBYESERO RAYMOND', 'Primary Two', false, 'Parent of SSEBYESERO RAYMOND', '+25670000110'),
  (v_tenant_id, 'Amanda Mikeira', 'Primary Two', false, 'Parent of Amanda Mikeira', '+25670000111'),
  (v_tenant_id, 'KAMOGA ADASA ESTHER', 'Primary Two', false, 'Parent of KAMOGA ADASA ESTHER', '+25670000112'),
  (v_tenant_id, 'Mpindi Ruth', 'Primary Two', false, 'Parent of Mpindi Ruth', '+25670000113'),
  (v_tenant_id, 'MULINDWA JOEL', 'Primary Two', false, 'Parent of MULINDWA JOEL', '+25670000114'),
  (v_tenant_id, 'MUKISA TANIA', 'Primary Two', false, 'Parent of MUKISA TANIA', '+25670000115'),
  (v_tenant_id, 'MWANJE RAKIB', 'Primary Two', false, 'Parent of MWANJE RAKIB', '+25670000116'),
  (v_tenant_id, 'NAGIINA RONAH', 'Primary Three', false, 'Parent of NAGIINA RONAH', '+25670000117'),
  (v_tenant_id, 'NAKIMULI QUEEN KEVIN', 'Primary Three', false, 'Parent of NAKIMULI QUEEN KEVIN', '+25670000118'),
  (v_tenant_id, 'MUMBEERE MICHEAL', 'Primary Three', false, 'Parent of MUMBEERE MICHEAL', '+25670000119'),
  (v_tenant_id, 'NAKABUYE WHITNEY', 'Primary Three', false, 'Parent of NAKABUYE WHITNEY', '+25670000120'),
  (v_tenant_id, 'KASUJJA SALMAH', 'Primary Three', false, 'Parent of KASUJJA SALMAH', '+25670000121'),
  (v_tenant_id, 'BABIRYE RONITAH', 'Primary Three', false, 'Parent of BABIRYE RONITAH', '+25670000122'),
  (v_tenant_id, 'LUGOLOBI CHARLES', 'Primary Three', false, 'Parent of LUGOLOBI CHARLES', '+25670000123'),
  (v_tenant_id, 'ARINAITWE JEREMIAH', 'Primary Three', false, 'Parent of ARINAITWE JEREMIAH', '+25670000124'),
  (v_tenant_id, 'NAKATIZA JOANITA', 'Primary Three', false, 'Parent of NAKATIZA JOANITA', '+25670000125'),
  (v_tenant_id, 'KEMIGISA ELIZA BETH', 'Primary Three', false, 'Parent of KEMIGISA ELIZA BETH', '+25670000126'),
  (v_tenant_id, 'NAKAYENGA BUSHIRAH', 'Primary Three', false, 'Parent of NAKAYENGA BUSHIRAH', '+25670000127'),
  (v_tenant_id, 'MULUNGI SHARIFAH', 'Primary Three', false, 'Parent of MULUNGI SHARIFAH', '+25670000128'),
  (v_tenant_id, 'AIZUKA TREVOR', 'Primary Three', false, 'Parent of AIZUKA TREVOR', '+25670000129'),
  (v_tenant_id, 'NABUKEERA MARGIE', 'Primary Three', false, 'Parent of NABUKEERA MARGIE', '+25670000130'),
  (v_tenant_id, 'IKANGA JOYCE', 'Primary Three', false, 'Parent of IKANGA JOYCE', '+25670000131'),
  (v_tenant_id, 'NAKIMBUGWE KETRA', 'Primary Three', false, 'Parent of NAKIMBUGWE KETRA', '+25670000132'),
  (v_tenant_id, 'KANAMWANJI MALCOM', 'Primary Three', false, 'Parent of KANAMWANJI MALCOM', '+25670000133'),
  (v_tenant_id, 'NALUGIWA SAUYAH', 'Primary Three', false, 'Parent of NALUGIWA SAUYAH', '+25670000134'),
  (v_tenant_id, 'MWANJE RAYAN', 'Primary Three', false, 'Parent of MWANJE RAYAN', '+25670000135'),
  (v_tenant_id, 'KAMOGA EMMANUEL', 'Primary Three', false, 'Parent of KAMOGA EMMANUEL', '+25670000136'),
  (v_tenant_id, 'JJUNJU MATHIAS', 'Primary Four', false, 'Parent of JJUNJU MATHIAS', '+25670000137'),
  (v_tenant_id, 'YIGA RASHIM', 'Primary Four', false, 'Parent of YIGA RASHIM', '+25670000138'),
  (v_tenant_id, 'Wasswa David', 'Primary Four', false, 'Parent of Wasswa David', '+25670000139'),
  (v_tenant_id, 'Asiimwe Brenda', 'Primary Four', false, 'Parent of Asiimwe Brenda', '+25670000140'),
  (v_tenant_id, 'Kimuli Marvin', 'Primary Four', false, 'Parent of Kimuli Marvin', '+25670000141'),
  (v_tenant_id, 'Nantongo Hashimin Tara', 'Primary Four', false, 'Parent of Nantongo Hashimin Tara', '+25670000142'),
  (v_tenant_id, 'Octavian', 'Primary Four', false, 'Parent of Octavian', '+25670000143'),
  (v_tenant_id, 'Nakato Shabibah', 'Primary Four', false, 'Parent of Nakato Shabibah', '+25670000144'),
  (v_tenant_id, 'Nakimuli Maria Ketra', 'Primary Four', false, 'Parent of Nakimuli Maria Ketra', '+25670000145'),
  (v_tenant_id, 'Namatovu Jenifer', 'Primary Four', false, 'Parent of Namatovu Jenifer', '+25670000146'),
  (v_tenant_id, 'Nakituba Anna', 'Primary Four', false, 'Parent of Nakituba Anna', '+25670000147'),
  (v_tenant_id, 'Mulindwa Josh', 'Primary Four', false, 'Parent of Mulindwa Josh', '+25670000148'),
  (v_tenant_id, 'Kitiibwa Shantel', 'Primary Four', false, 'Parent of Kitiibwa Shantel', '+25670000149'),
  (v_tenant_id, 'Nakato Annet favour', 'Primary Five', false, 'Parent of Nakato Annet favour', '+25670000150'),
  (v_tenant_id, 'Nakalema Patricia', 'Primary Five', false, 'Parent of Nakalema Patricia', '+25670000151'),
  (v_tenant_id, 'Nakamoga Victoria', 'Primary Five', false, 'Parent of Nakamoga Victoria', '+25670000152'),
  (v_tenant_id, 'Nakiyonga Juliet Kizza', 'Primary Five', false, 'Parent of Nakiyonga Juliet Kizza', '+25670000153'),
  (v_tenant_id, 'Nassuna Leticia', 'Primary Six', false, 'Parent of Nassuna Leticia', '+25670000154'),
  (v_tenant_id, 'Ssekabira Osca', 'Primary Six', false, 'Parent of Ssekabira Osca', '+25670000155'),
  (v_tenant_id, 'Talibu Shubra', 'Primary Six', false, 'Parent of Talibu Shubra', '+25670000156'),
  (v_tenant_id, 'Nakiwu Joan', 'Primary Six', false, 'Parent of Nakiwu Joan', '+25670000157'),
  (v_tenant_id, 'Ssempijja Sharom', 'Primary Six', false, 'Parent of Ssempijja Sharom', '+25670000158'),
  (v_tenant_id, 'Kasule Ronnie', 'Primary Six', false, 'Parent of Kasule Ronnie', '+25670000159'),
  (v_tenant_id, 'Mariam Kusasira', 'Primary Six', false, 'Parent of Mariam Kusasira', '+25670000160'),
  (v_tenant_id, 'Kamoga Exodus', 'Primary Six', false, 'Parent of Kamoga Exodus', '+25670000161'),
  (v_tenant_id, 'Kamoga Elijah', 'Primary Six', false, 'Parent of Kamoga Elijah', '+25670000162'),
  (v_tenant_id, 'Kayemba Rickey Ntale', 'Primary Six', false, 'Parent of Kayemba Rickey Ntale', '+25670000163'),
  (v_tenant_id, 'NANTEZA KETRA TENDO', 'Primary Seven', false, 'Parent of NANTEZA KETRA TENDO', '+25670000164'),
  (v_tenant_id, 'SOPHIE BINT MUSA', 'Primary Seven', false, 'Parent of SOPHIE BINT MUSA', '+25670000165'),
  (v_tenant_id, 'NAMPALA MOUREEN', 'Primary Seven', false, 'Parent of NAMPALA MOUREEN', '+25670000166'),
  (v_tenant_id, 'Ssekidde Saifun', 'Primary Seven', false, 'Parent of Ssekidde Saifun', '+25670000167'),
  (v_tenant_id, 'Nabbumba Ednar', 'Primary Seven', false, 'Parent of Nabbumba Ednar', '+25670000168'),
  (v_tenant_id, 'KAMALE TEOPISTER', 'Primary Seven', false, 'Parent of KAMALE TEOPISTER', '+25670000169'),
  (v_tenant_id, 'SSEBUKEERE JOEL', 'Primary Seven', false, 'Parent of SSEBUKEERE JOEL', '+25670000170'),
  (v_tenant_id, 'NAKANGU MERUSH JEMIMAH', 'Primary Seven', false, 'Parent of NAKANGU MERUSH JEMIMAH', '+25670000171'),
  (v_tenant_id, 'NAKAMOGA QUEEN FLORENCE', 'Primary Seven', false, 'Parent of NAKAMOGA QUEEN FLORENCE', '+25670000172'),
  (v_tenant_id, 'KABIITE MARIA NGONDE', 'Primary Seven', false, 'Parent of KABIITE MARIA NGONDE', '+25670000173'),
  (v_tenant_id, 'ZAWEDDE CLAIRE', 'Primary Seven', false, 'Parent of ZAWEDDE CLAIRE', '+25670000174'),
  (v_tenant_id, 'NAMIGADDE MONIDAH', 'Primary Seven', false, 'Parent of NAMIGADDE MONIDAH', '+25670000175');

  -- 4. INSERT EXACT FEES CHARGES AND PAYMENTS
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMALA LETICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ARINAITWE ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ARINAITWE ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 390000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSENTONGO ALPHA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSENTONGO ALPHA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BLESSING NAMUSISI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BLESSING NAMUSISI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BLESSING NAMUSISI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KISAKYE JEMIMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KISAKYE JEMIMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MALE DAVID JOSHUA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MALE DAVID JOSHUA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MALE DAVID JOSHUA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LATAYA ELVIS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LATAYA ELVIS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LATAYA ELVIS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSUNA TRAVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSUNA TRAVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSUNA TRAVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSUNA TRAVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MERCY BIIRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MERCY BIIRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KYAKUWA ARTHUR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KYAKUWA ARTHUR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KYAKUWA ARTHUR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMBUGWE FAHAM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMBUGWE FAHAM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -90000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMBUGWE FAHAM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAWUYAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAWUYAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 270000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTUMBA HAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTUMBA HAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTUMBA HAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTUMBA HAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDINAYO ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -90000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDINAYO ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDINAYO ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDINAYO ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SIMOLA AARON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SIMOLA AARON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MOMOA KENT';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MOMOA KENT';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MOMOA KENT';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MOMOA KENT';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'EADY STEVEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'EADY STEVEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'EADY STEVEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'EADY STEVEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'EADY STEVEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'EADY STEVEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUBWAMA MARIA BLESSING';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUBWAMA MARIA BLESSING';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUBWAMA MARIA BLESSING';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUBWAMA MARIA BLESSING';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 235000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO WISDOM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -110000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO WISDOM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO WISDOM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO TERISA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO TERISA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUGWANYA DANIEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUGWANYA DANIEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUGWANYA DANIEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUGWANYA DANIEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA ABDULRAHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA ABDULRAHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA ABDULRAHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA ABDULRAHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'JOSH LUCAS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'JOSH LUCAS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'JOSH LUCAS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Muwa';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALUNGI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 155000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABBANJA MIRACLE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -90000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABBANJA MIRACLE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABBANJA MIRACLE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIBERU ROHAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIBERU ROHAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSENYONJO RAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -75000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSENYONJO RAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALUNGI JOVITAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALUNGI JOVITAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KEMIREMBE DOROTHY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KEMIREMBE DOROTHY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMATOVU SKYLAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -130000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMATOVU SKYLAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMATOVU SKYLAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMATOVU SKYLAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMATOVU SKYLAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -10000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMATOVU SKYLAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BAGONZA ISAIAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BAGONZA ISAIAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BAGONZA ISAIAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 260000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MOLUNGI NICOLE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -210000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MOLUNGI NICOLE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 480000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ASIIMWE TIMOTHY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -390000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ASIIMWE TIMOTHY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAGABA DELLAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAGABA DELLAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BAHAT RANIA ALKANDI MUHAMMAD';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'TWEBAZE ISAAYA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'TWEBAZE ISAAYA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMUKWAYA DANIELLA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMUKWAYA DANIELLA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMUKWAYA DANIELLA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAWUKI EMARINE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAWUKI EMARINE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -170000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAWUKI EMARINE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KATO JAMES';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WASSWA JOHN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAYANJA JOWERIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -110000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAYANJA JOWERIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAYANJA JOWERIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAYANJA JOWERIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAYEMBA RONNIE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAYEMBA RONNIE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAYEMBA RONNIE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -20000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAYEMBA RONNIE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BEEZA IMRAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BEEZA IMRAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MERCY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MERCY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MERCY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUGWANYA XAVIER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUGWANYA XAVIER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MATOVU ALEENA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MAWANDA TANISH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 260000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMUYANJA SARAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMUYANJA SARAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -110000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMUYANJA SARAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTEBI PARVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTEBI PARVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTEBI PARVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BABIRYE DANIELLA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BABIRYE DANIELLA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BABIRYE DANIELLA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KATO DAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MALAIKA NATALIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -260000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MALAIKA NATALIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KATO KIRUMIRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KATO KIRUMIRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KATO KIRUMIRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KATO KIRUMIRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WASSWA EMMA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WASSWA EMMA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO SARAH NABAGGALA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO SARAH NABAGGALA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 370000 FROM students WHERE tenant_id = v_tenant_id AND name = 'TAMALE HILAL NASSAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'TAMALE HILAL NASSAR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAFUNA PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAFUNA PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAKOTTO PAYTON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -240000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAKOTTO PAYTON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSESAZZI MATHEW';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 180000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NYANZI CALVIN KAMPALA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -20000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NYANZI CALVIN KAMPALA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NYANZI CALVIN KAMPALA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NYANZI CALVIN KAMPALA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAZZI PARIS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAZZI PARIS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMAZZI PARIS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMBOWA ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -90000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMBOWA ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -90000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMBOWA ELIJAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 360000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA SHANAI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA SHANAI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA SHANAI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA SHANAI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA SHANAI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAGIMU TOM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 210000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nyanzi Jeriden';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 390000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namuli Ashley Peace';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namuli Ashley Peace';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namuli Ashley Peace';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -110000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namuli Ashley Peace';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakimuli Matuwah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakimuli Matuwah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Melvin Kigozi';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Melvin Kigozi';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nalumansi Tryphena';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Amanya Aaron';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Amanya Aaron';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Tamale Roger';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -140000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Tamale Roger';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Tamale Roger';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 260000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kwagalakwe Eseza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kwagalakwe Eseza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kwagalakwe Eseza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kwagalakwe Eseza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kwagalakwe Eseza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namuwoonge Martha';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namuwoonge Martha';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Alupo Brenda';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Alupo Brenda';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Alupo Brenda';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Muwanguzi Erisa';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Muwanguzi Erisa';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Muwanguzi Erisa';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mukasa Elijah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mukasa Elijah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ndagire Angel';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ndagire Angel';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ndagire Angel';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Obadia Kirangwa';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Obadia Kirangwa';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 170000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namiyenya Jaselyn';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Luwedde Keren';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Luwedde Keren';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mehek Jot';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mehek Jot';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mehek Jot';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 260000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nambatya Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nambatya Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nambatya Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nambatya Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kyambadde Ernest';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -180000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kyambadde Ernest';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 180000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nsobya Praise';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Harriet';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Harriet';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Flavia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Flavia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 420000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NANSOMBA MARTINA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -160000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NANSOMBA MARTINA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NANSOMBA MARTINA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NANSOMBA MARTINA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUKENCE PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUKENCE PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUKENCE PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUKENCE PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUKENCE PATRICIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ABAHO ARTHUR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ABAHO ARTHUR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 390000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATO RASHIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATO RASHIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATO RASHIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATO RASHIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 390000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WASSWA RASHID';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WASSWA RASHID';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WASSWA RASHID';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 240000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDAGIRE MARIAM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDAGIRE MARIAM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NDAGIRE MARIAM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'WALUSIMBI TEVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALUNGI JOVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALUNGI JOVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA ALTON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA ALTON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA ALTON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA ALTON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 450000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAWEESA JONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAWEESA JONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAWEESA JONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAWEESA JONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 220000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUHINDO MARTHA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUHINDO MARTHA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUHINDO MARTHA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA IMRAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -130000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA IMRAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA IMRAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTEESA ELISABESI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTEESA ELISABESI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUTEESA ELISABESI';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA JOSEPH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA JOSEPH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA JOSEPH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIMERA JOSEPH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGEMBE PRECIOUS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -120000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGEMBE PRECIOUS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGEMBE PRECIOUS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Zalwango Marion';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Zalwango Marion';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Zalwango Marion';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 275000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO SUCCESS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO SUCCESS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KIRABO SUCCESS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LUGENDO JIMSON';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA RIHANNA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -170000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA RIHANNA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -110000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KALEMA RIHANNA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSEBYESERO RAYMOND';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSEBYESERO RAYMOND';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Amanda Mikeira';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Amanda Mikeira';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Amanda Mikeira';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Amanda Mikeira';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA ADASA ESTHER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -75000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA ADASA ESTHER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 450000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mpindi Ruth';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MULINDWA JOEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUKISA TANIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUKISA TANIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUKISA TANIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUKISA TANIA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAKIB';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAKIB';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAKIB';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAKIB';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAGIINA RONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAGIINA RONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAGIINA RONAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKIMULI QUEEN KEVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKIMULI QUEEN KEVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKIMULI QUEEN KEVIN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 220000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUMBEERE MICHEAL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUMBEERE MICHEAL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MUMBEERE MICHEAL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKABUYE WHITNEY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKABUYE WHITNEY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKABUYE WHITNEY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKABUYE WHITNEY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKABUYE WHITNEY';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 400000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KASUJJA SALMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KASUJJA SALMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KASUJJA SALMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BABIRYE RONITAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'BABIRYE RONITAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LUGOLOBI CHARLES';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LUGOLOBI CHARLES';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LUGOLOBI CHARLES';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'LUGOLOBI CHARLES';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ARINAITWE JEREMIAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ARINAITWE JEREMIAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ARINAITWE JEREMIAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATIZA JOANITA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATIZA JOANITA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKATIZA JOANITA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KEMIGISA ELIZA BETH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAYENGA BUSHIRAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -130000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAYENGA BUSHIRAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAYENGA BUSHIRAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MULUNGI SHARIFAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MULUNGI SHARIFAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'AIZUKA TREVOR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'AIZUKA TREVOR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'AIZUKA TREVOR';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 260000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA MARGIE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NABUKEERA MARGIE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'IKANGA JOYCE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'IKANGA JOYCE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKIMBUGWE KETRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKIMBUGWE KETRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKIMBUGWE KETRA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KANAMWANJI MALCOM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGIWA SAUYAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -160000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGIWA SAUYAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGIWA SAUYAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -25000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NALUGIWA SAUYAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 230000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'MWANJE RAYAN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMOGA EMMANUEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'JJUNJU MATHIAS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'JJUNJU MATHIAS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'JJUNJU MATHIAS';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 410000 FROM students WHERE tenant_id = v_tenant_id AND name = 'YIGA RASHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'YIGA RASHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'YIGA RASHIM';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Wasswa David';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Wasswa David';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Asiimwe Brenda';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Asiimwe Brenda';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Asiimwe Brenda';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kimuli Marvin';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -250000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kimuli Marvin';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 400000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nantongo Hashimin Tara';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nantongo Hashimin Tara';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Octavian';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakato Shabibah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakato Shabibah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakato Shabibah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakimuli Maria Ketra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakimuli Maria Ketra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakimuli Maria Ketra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namatovu Jenifer';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Namatovu Jenifer';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakituba Anna';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 450000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mulindwa Josh';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 400000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kitiibwa Shantel';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakato Annet favour';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakato Annet favour';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 240000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakalema Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakalema Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakalema Patricia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakamoga Victoria';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakamoga Victoria';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakamoga Victoria';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakiyonga Juliet Kizza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakiyonga Juliet Kizza';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 240000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nassuna Leticia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nassuna Leticia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nassuna Leticia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nassuna Leticia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nassuna Leticia';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssekabira Osca';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Talibu Shubra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Talibu Shubra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Talibu Shubra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Talibu Shubra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -40000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Talibu Shubra';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nakiwu Joan';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssempijja Sharom';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssempijja Sharom';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -70000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssempijja Sharom';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssempijja Sharom';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 300000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kasule Ronnie';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kasule Ronnie';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kasule Ronnie';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kasule Ronnie';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 280000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mariam Kusasira';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Mariam Kusasira';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kamoga Exodus';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kamoga Elijah';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 320000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kayemba Rickey Ntale';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kayemba Rickey Ntale';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Kayemba Rickey Ntale';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NANTEZA KETRA TENDO';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -380000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NANTEZA KETRA TENDO';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 270000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SOPHIE BINT MUSA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SOPHIE BINT MUSA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SOPHIE BINT MUSA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SOPHIE BINT MUSA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SOPHIE BINT MUSA';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMPALA MOUREEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMPALA MOUREEN';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 500000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssekidde Saifun';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Ssekidde Saifun';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 450000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nabbumba Ednar';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nabbumba Ednar';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'Nabbumba Ednar';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMALE TEOPISTER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMALE TEOPISTER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KAMALE TEOPISTER';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSEBUKEERE JOEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSEBUKEERE JOEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -80000 FROM students WHERE tenant_id = v_tenant_id AND name = 'SSEBUKEERE JOEL';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKANGU MERUSH JEMIMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -50000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKANGU MERUSH JEMIMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -60000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKANGU MERUSH JEMIMAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAMOGA QUEEN FLORENCE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAMOGA QUEEN FLORENCE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAMOGA QUEEN FLORENCE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAKAMOGA QUEEN FLORENCE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KABIITE MARIA NGONDE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -150000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KABIITE MARIA NGONDE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KABIITE MARIA NGONDE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'KABIITE MARIA NGONDE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ZAWEDDE CLAIRE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -120000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ZAWEDDE CLAIRE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ZAWEDDE CLAIRE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -100000 FROM students WHERE tenant_id = v_tenant_id AND name = 'ZAWEDDE CLAIRE';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'charge', 350000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMIGADDE MONIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -200000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMIGADDE MONIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -90000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMIGADDE MONIDAH';
  INSERT INTO fees (tenant_id, student_id, term, kind, amount) SELECT v_tenant_id, id, 'Term 2 2026', 'payment', -30000 FROM students WHERE tenant_id = v_tenant_id AND name = 'NAMIGADDE MONIDAH';

  -- 5. POPULATE SCHOOL_INCOME TABLE
  INSERT INTO school_income (tenant_id, student_name, class, source_type, amount, unspent_balance, payment_method, notes, logged_by)
  SELECT 
    v_tenant_id,
    s.name,
    s.stream,
    CASE WHEN s.is_boarding THEN 'School Fees (Boarding)' ELSE 'School Fees (Tuition)' END,
    COALESCE(ABS(p.total_paid), 0),
    COALESCE(ABS(p.total_paid), 0),
    'Cash',
    'Logged fee payment from onboarding pack',
    'bursar'
  FROM students s
  LEFT JOIN (
    SELECT student_id, SUM(amount) AS total_paid FROM fees WHERE kind = 'payment' GROUP BY student_id
  ) p ON s.id = p.student_id
  WHERE s.tenant_id = v_tenant_id AND COALESCE(ABS(p.total_paid), 0) > 0;

END $$;
