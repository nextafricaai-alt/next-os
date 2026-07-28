-- Populate Fees Ledger (Charges + Payments) for Kabs Lily Junior School
-- Run this in the Supabase SQL Editor

DO $$
DECLARE
  v_tenant text := 'kabs-lily-junior-school-and-kindercare-centre';
  r RECORD;
BEGIN
  -- Delete existing fees records for clean re-population
  DELETE FROM fees WHERE tenant_id = v_tenant;

  -- 1. Insert fee charges (+full_fees) and payments (-amount_paid) into fees table matching student names
  
  -- Baby Class
  PERFORM add_fee_record(v_tenant, 'Namala Leticia', 250000, 0);
  PERFORM add_fee_record(v_tenant, 'Arinaitwe Elijah', 350000, 100000);
  PERFORM add_fee_record(v_tenant, 'Ssentongo Alpha', 390000, 200000);
  PERFORM add_fee_record(v_tenant, 'Blessing Namusisi', 250000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kisakye Jemimah', 250000, 150000);
  PERFORM add_fee_record(v_tenant, 'Male David Joshua', 250000, 100000);
  PERFORM add_fee_record(v_tenant, 'Lataya Elvis', 200000, 0);
  PERFORM add_fee_record(v_tenant, 'Ssuna Traylin', 260000, 40000);
  PERFORM add_fee_record(v_tenant, 'Momoa Kent', 250000, 50000);
  PERFORM add_fee_record(v_tenant, 'Eady Steven', 280000, 150000);
  PERFORM add_fee_record(v_tenant, 'Nalubwama Maria Blessing', 230000, 50000);
  PERFORM add_fee_record(v_tenant, 'Kirabo Wisdom', 235000, 110000);
  PERFORM add_fee_record(v_tenant, 'Kirabo Terisa', 230000, 0);
  PERFORM add_fee_record(v_tenant, 'Mucwanya Janiel', 230000, 0);

  -- Middle Class
  PERFORM add_fee_record(v_tenant, 'Nabbanya Miracle', 155000, 90000);
  PERFORM add_fee_record(v_tenant, 'Kiberu Rohan', 250000, 0);
  PERFORM add_fee_record(v_tenant, 'Ssenyondo Rayan', 200000, 75000);
  PERFORM add_fee_record(v_tenant, 'Kalungi Jovitah', 200000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kemirembe Dorothy', 200000, 100000);
  PERFORM add_fee_record(v_tenant, 'Namatovu Skylar', 280000, 130000);
  PERFORM add_fee_record(v_tenant, 'Bagonza Isaiah', 230000, 150000);
  PERFORM add_fee_record(v_tenant, 'Kalema Abdulrahim Abubakim', 250000, 0);
  PERFORM add_fee_record(v_tenant, 'Kato James', 230000, 230000);
  PERFORM add_fee_record(v_tenant, 'Kassina John', 230000, 230000);
  PERFORM add_fee_record(v_tenant, 'Namayanja Joweria', 280000, 110000);
  PERFORM add_fee_record(v_tenant, 'Kayemba Ronnie', 300000, 80000);
  PERFORM add_fee_record(v_tenant, 'Beesa Imran', 280000, 100000);
  PERFORM add_fee_record(v_tenant, 'Mercy', 200000, 50000);
  PERFORM add_fee_record(v_tenant, 'Mercy Biira', 200000, 150000);
  PERFORM add_fee_record(v_tenant, 'Kyakuna Arthur', 200000, 0);
  PERFORM add_fee_record(v_tenant, 'Kimbugwe Fatham', 260000, 0);
  PERFORM add_fee_record(v_tenant, 'Mwanje Ranwah', 200000, 100000);
  PERFORM add_fee_record(v_tenant, 'Mutumba Hayan', 270000, 150000);
  PERFORM add_fee_record(v_tenant, 'Ndinayo Elijah', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Simoka Aaron', 100000, 0);

  -- Top Class
  PERFORM add_fee_record(v_tenant, 'Mawanda Tanish', 290000, 0);
  PERFORM add_fee_record(v_tenant, 'Namuyanja Sarah', 260000, 100000);
  PERFORM add_fee_record(v_tenant, 'Mutebi Parvin', 260000, 0);
  PERFORM add_fee_record(v_tenant, 'Babirye Daniella', 150000, 0);
  PERFORM add_fee_record(v_tenant, 'Kato Dan', 150000, 0);
  PERFORM add_fee_record(v_tenant, 'Malaika Natalia', 300000, 260000);
  PERFORM add_fee_record(v_tenant, 'Kato Kirumira', 150000, 80000);
  PERFORM add_fee_record(v_tenant, 'Kasswa Emma', 150000, 0);
  PERFORM add_fee_record(v_tenant, 'Mokungi Nicole', 260000, 0);
  PERFORM add_fee_record(v_tenant, 'Asiimwe Timothy', 480000, 390000);
  PERFORM add_fee_record(v_tenant, 'Nagaba Dellah', 230000, 0);
  PERFORM add_fee_record(v_tenant, 'Bahati Rania', 280000, 280000);
  PERFORM add_fee_record(v_tenant, 'Twebaze Isaaya', 230000, 200000);
  PERFORM add_fee_record(v_tenant, 'Namukwaya Daniella', 230000, 100000);
  PERFORM add_fee_record(v_tenant, 'Nakanwoki Emarine', 280000, 70000);

  -- Primary Two
  PERFORM add_fee_record(v_tenant, 'Nansuyimba Martina', 420000, 250000);
  PERFORM add_fee_record(v_tenant, 'Nalukenge Patricia', 280000, 80000);
  PERFORM add_fee_record(v_tenant, 'Abaho Arthur', 280000, 200000);
  PERFORM add_fee_record(v_tenant, 'Nakato Rashidah', 890000, 200000);
  PERFORM add_fee_record(v_tenant, 'Kasswa Rashid', 890000, 0);
  PERFORM add_fee_record(v_tenant, 'Nbagide Mariam', 240000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kalusimbi Teyin', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Namazzi Paris', 280000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kimbowa Elijah', 250000, 90000);
  PERFORM add_fee_record(v_tenant, 'Kalungi Joylin', 200000, 150000);
  PERFORM add_fee_record(v_tenant, 'Kamooga Alton', 280000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kawesa Jonah', 450000, 200000);
  PERFORM add_fee_record(v_tenant, 'Mulindo Martha', 220000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kimera Imran', 280000, 130000);
  PERFORM add_fee_record(v_tenant, 'Tujjeesa Erisabesi', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Kirabo Sarah Nabaagala', 200000, 50000);
  PERFORM add_fee_record(v_tenant, 'Tamale Hilal Nassor', 370000, 200000);
  PERFORM add_fee_record(v_tenant, 'Nafuna Patricia', 350000, 150000);
  PERFORM add_fee_record(v_tenant, 'Kakotio Payton', 280000, 240000);
  PERFORM add_fee_record(v_tenant, 'Ssegazii Mathew', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Nyanzi Calvin Kampala', 180000, 0);

  -- Primary Three
  PERFORM add_fee_record(v_tenant, 'Nachwa Ronah', 250000, 100000);
  PERFORM add_fee_record(v_tenant, 'Nakimuli Queen Kevin', 300000, 100000);
  PERFORM add_fee_record(v_tenant, 'Numbere Micheal', 220000, 0);
  PERFORM add_fee_record(v_tenant, 'Nakaboye Whitney', 280000, 80000);
  PERFORM add_fee_record(v_tenant, 'Kasuja Salmah', 400000, 200000);
  PERFORM add_fee_record(v_tenant, 'Babirye Ronitah', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Lugoboli Charles', 280000, 100000);
  PERFORM add_fee_record(v_tenant, 'Arinaitwe Jeremiah', 280000, 100000);
  PERFORM add_fee_record(v_tenant, 'Nkatia Jamila', 250000, 100000);
  PERFORM add_fee_record(v_tenant, 'Kemicisa Elizabeth', 250000, 0);
  PERFORM add_fee_record(v_tenant, 'Nakayenga Bushirah', 280000, 130000);
  PERFORM add_fee_record(v_tenant, 'Mulungi Sharifah', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Aizuka Trevor', 230000, 0);
  PERFORM add_fee_record(v_tenant, 'Ssebyesero Raymond', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Amanda Mikeiparah', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Kamoga Adasa Esther', 150000, 75000);
  PERFORM add_fee_record(v_tenant, 'Mukisa Tania', 500000, 100000);

  -- Primary Four
  PERFORM add_fee_record(v_tenant, 'Ijungo Mathias', 250000, 100000);
  PERFORM add_fee_record(v_tenant, 'Yiga Rashim', 410000, 200000);
  PERFORM add_fee_record(v_tenant, 'Kasswa David', 500000, 300000);
  PERFORM add_fee_record(v_tenant, 'Asiimwe Brenda', 500000, 300000);
  PERFORM add_fee_record(v_tenant, 'Kimuli Marvin', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Nantongo Hashimin Tara', 400000, 200000);

  -- Primary Five
  PERFORM add_fee_record(v_tenant, 'Nakato Annet Favour', 500000, 300000);
  PERFORM add_fee_record(v_tenant, 'Nakalema Patricia', 350000, 100000);
  PERFORM add_fee_record(v_tenant, 'Nakamoga Victoria', 300000, 100000);
  PERFORM add_fee_record(v_tenant, 'Ssekyanzi Octavian', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Nakato Shabiba', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Nakimuli Maria Ketra', 280000, 0);
  PERFORM add_fee_record(v_tenant, 'Namntovu Jennifer', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Nakituba Anna', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Mulindwa Jash', 450000, 0);
  PERFORM add_fee_record(v_tenant, 'Kitiibwa Shantel', 400000, 0);

  -- Primary Six
  PERFORM add_fee_record(v_tenant, 'Nassuna Leticia', 240000, 0);
  PERFORM add_fee_record(v_tenant, 'Ssekabira Oscar', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Talibu Shubra', 300000, 50000);
  PERFORM add_fee_record(v_tenant, 'Nakiwa Joan', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Ssempijja Shammah', 300000, 0);
  PERFORM add_fee_record(v_tenant, 'Nabukeera Margie', 260000, 200000);
  PERFORM add_fee_record(v_tenant, 'Ikanga Joyce', 500000, 200000);
  PERFORM add_fee_record(v_tenant, 'Nakimbugwe Ketra', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Kanamwanji Malcolm', 250000, 0);
  PERFORM add_fee_record(v_tenant, 'Nalugwa Sauya', 230000, 160000);
  PERFORM add_fee_record(v_tenant, 'Mwanje Rayan', 230000, 0);
  PERFORM add_fee_record(v_tenant, 'Kamooga Emmanuel', 150000, 0);

  -- Primary Seven
  PERFORM add_fee_record(v_tenant, 'Nanteza Keira Tendo', 500000, 380000);
  PERFORM add_fee_record(v_tenant, 'Sophie Bani Musa', 270000, 130000);
  PERFORM add_fee_record(v_tenant, 'Nampala Moureen', 350000, 200000);
  PERFORM add_fee_record(v_tenant, 'Ssekidde Saifuh', 500000, 200000);
  PERFORM add_fee_record(v_tenant, 'Nabbumba Fann', 450000, 150000);
  PERFORM add_fee_record(v_tenant, 'Kamale Topister', 350000, 150000);
  PERFORM add_fee_record(v_tenant, 'Ikanga Obadia', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Mpindi Ruth', 400000, 0);
  PERFORM add_fee_record(v_tenant, 'Mpinda Danabell', 400000, 0);
  PERFORM add_fee_record(v_tenant, 'Asiimwe Brendah', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Kabite Tranella', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Nakamoga Queen', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Mulindwa Josh', 450000, 0);
  PERFORM add_fee_record(v_tenant, 'Waswa Joe', 500000, 0);
  PERFORM add_fee_record(v_tenant, 'Sekiremba Jonah', 450000, 0);

  RAISE NOTICE 'Populated fees ledger for all learners in tenant %', v_tenant;
END $$;

-- Helper function to add charge & payment rows matching student_id
CREATE OR REPLACE FUNCTION add_fee_record(p_tenant text, p_name text, p_full_fee numeric, p_paid numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_sid bigint;
BEGIN
  -- Look up student_id from students table
  SELECT id INTO v_sid FROM students WHERE tenant_id = p_tenant AND LOWER(name) = LOWER(p_name) LIMIT 1;
  
  IF v_sid IS NOT NULL THEN
    -- Charge row (+full_fee)
    INSERT INTO fees (tenant_id, student_id, term, kind, amount, notes)
    VALUES (p_tenant, v_sid, 'Term 2 2026', 'charge', p_full_fee, 'Term 2 Tuition / Boarding Charge');
    
    -- Payment row (-paid) if student made a payment
    IF p_paid > 0 THEN
      INSERT INTO fees (tenant_id, student_id, term, kind, amount, notes)
      VALUES (p_tenant, v_sid, 'Term 2 2026', 'payment', -p_paid, 'Fee Payment');
    END IF;
  END IF;
END $$;
