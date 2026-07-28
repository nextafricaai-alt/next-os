-- ====================================================================
-- SEED EXACT 12 TEACHERS FROM PDF CREDENTIALS DIRECTORY
-- Run this in Supabase SQL Editor to make all 12 teacher emails active
-- ====================================================================

DO $$
DECLARE
  v_tenant text := 'kabs-lily-junior-school-and-kindercare-centre';
BEGIN

  -- Delete existing demo teachers to avoid email mismatches
  DELETE FROM class_assignments WHERE tenant_id = v_tenant;
  DELETE FROM teachers WHERE tenant_id = v_tenant;

  -- Insert exact 12 Teachers matching PDF Credentials Directory
  INSERT INTO teachers (tenant_id, full_name, email, phone, monthly_salary, subjects) VALUES
  (v_tenant, 'Mpamulungi Justine', 'mpamulungi.justine@kabslily.ug', '0704772302', 350000, ARRAY['LA 1', 'LA 2', 'LA 4']),
  (v_tenant, 'Nakalembe Jeminma', 'nakalembe.jeminma@kabslily.ug', '0704551553', 300000, ARRAY['LA 3', 'LA 4']),
  (v_tenant, 'Nakanda Mayirah', 'nakanda.mayirah@kabslily.ug', '0755068947', 250000, ARRAY['Pre-Primary']),
  (v_tenant, 'Nalule Harriet', 'nalule.harriet@kabslily.ug', '0701647582', 300000, ARRAY['Luganda', 'LIT 1']),
  (v_tenant, 'Ikubu Christine', 'ikubu.christine@kabslily.ug', '0771791911', 380000, ARRAY['English', 'LIT 2']),
  (v_tenant, 'Nalukenge Jane', 'nalukenge.jane@kabslily.ug', '0758414436', 500000, ARRAY['Administration']),
  (v_tenant, 'Elijja Weiswa', 'elijja.weiswa@kabslily.ug', '0773663675', 420000, ARRAY['Mathematics', 'SST']),
  (v_tenant, 'Ayuto Esther', 'ayuto.esther@kabslily.ug', '0753907727', 350000, ARRAY['Science', 'Mathematics']),
  (v_tenant, 'Ssemakula Ronnie', 'ssemakula.ronnie@kabslily.ug', '0752538166', 450000, ARRAY['English', 'SST']),
  (v_tenant, 'Paul Ongaria', 'paul.ongaria@kabslily.ug', '0703816568', 500000, ARRAY['Science', 'Mathematics']),
  (v_tenant, 'Bunya Samuel', 'bunya.samuel@kabslily.ug', '0759972370', 480000, ARRAY['SST', 'RE']),
  (v_tenant, 'Kwagala Deborah', 'kwagala.deborah@kabslily.ug', '0756770281', 380000, ARRAY['LIT 1', 'English']);

END $$;
