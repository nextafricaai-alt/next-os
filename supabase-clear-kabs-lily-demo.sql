-- Clear all demo / mock data for Kabs Lily Junior School & Kindercare Centre
-- Run this in the Supabase SQL Editor

DO $$
DECLARE
  v_tenant_id text := 'kabs-lily-junior-school-and-kindercare-centre';
BEGIN
  -- Delete all financial records, attendance, fees, teachers, and students for this tenant
  DELETE FROM school_income WHERE tenant_id = v_tenant_id;
  DELETE FROM school_expenses WHERE tenant_id = v_tenant_id;
  DELETE FROM staff_attendance WHERE tenant_id = v_tenant_id;
  DELETE FROM attendance WHERE tenant_id = v_tenant_id;
  DELETE FROM fees WHERE tenant_id = v_tenant_id;
  DELETE FROM teachers WHERE tenant_id = v_tenant_id;
  DELETE FROM students WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE 'Cleared all demo data for tenant %', v_tenant_id;
END $$;
