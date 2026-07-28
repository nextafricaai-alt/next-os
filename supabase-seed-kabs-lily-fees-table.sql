-- =====================================================================
-- SUPABASE SEED SCRIPT FOR PUBLIC.FEES TABLE (KABS LILY JUNIOR SCHOOL)
-- Run this in the Supabase SQL Editor to populate the public.fees table
-- for all 131 Kabs Lily students (22 Boarding + 109 Day Scholars)
-- =====================================================================

DO $$
DECLARE
  v_tenant_id text := 'kabs-lily-junior-school-and-kindercare-centre';
  s_rec RECORD;
  v_charge numeric;
  v_paid numeric;
  v_kind_charge text := 'charge';
  v_kind_payment text := 'payment';
BEGIN

  -- 1. Remove existing fees table records for Kabs Lily
  DELETE FROM fees WHERE tenant_id = v_tenant_id;

  -- 2. Loop through each student in students table and insert charge & payment into fees table
  FOR s_rec IN SELECT id, full_name, stream, is_boarding FROM students WHERE tenant_id = v_tenant_id LOOP
    
    -- Set charge and payment based on boarding vs day scholar status
    IF s_rec.is_boarding THEN
      v_charge := 500000;
      v_paid := 250000;
    ELSE
      v_charge := 250000;
      v_paid := 150000;
    END IF;

    -- Insert charge row into fees table
    INSERT INTO fees (
      tenant_id,
      student_id,
      term,
      kind,
      amount,
      channel,
      reference,
      notes
    ) VALUES (
      v_tenant_id,
      s_rec.id,
      'Term 2 2026',
      'charge',
      v_charge,
      'Cash',
      'FEE-CHARGE-2026-T2',
      CASE WHEN s_rec.is_boarding THEN 'Boarding Student Full Fee' ELSE 'Day Scholar Full Fee' END
    );

    -- Insert payment row into fees table (if payment made)
    IF v_paid > 0 THEN
      INSERT INTO fees (
        tenant_id,
        student_id,
        term,
        kind,
        amount,
        channel,
        reference,
        notes
      ) VALUES (
        v_tenant_id,
        s_rec.id,
        'Term 2 2026',
        'payment',
        -v_paid, -- Negative or positive amount matching ledger
        'Cash',
        'FEE-PAY-2026-T2',
        'Fee Payment Received'
      );
    END IF;

  END LOOP;

END $$;
