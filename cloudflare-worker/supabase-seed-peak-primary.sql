-- ============================================================================
-- NEXT OS — Seed Peak Primary School into Supabase
-- ============================================================================
-- Run this AFTER supabase-schema.sql.
-- Paste into Supabase SQL Editor → New query → RUN.
-- Idempotent: ON CONFLICT clauses make it safe to re-run.
-- ============================================================================

-- 1. The tenant row itself
INSERT INTO tenants (id, name, vertical, country, currency, subdomain, tier, status, term, meta)
VALUES (
  'peak-primary',
  'Peak Primary School',
  'school',
  'Uganda',
  'UGX',
  'peakprimary',
  'builder',
  'active',
  'Term 2 Week 6',
  '{"teachers": 38, "streams": 14, "term_fee_p1_p3": 450000, "term_fee_p4_p7": 600000, "founded": 2014}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  term = EXCLUDED.term,
  meta = EXCLUDED.meta,
  updated_at = now();

-- 2. Students (28 sample students across all 14 streams)
-- Stream codes: P1V, P1P, P2V, P2P, P3V, P3P, P4V, P4P, P5V, P5P, P6V, P6P, P7V, P7P
INSERT INTO students (tenant_id, name, stream, guardian_name, guardian_phone, status) VALUES
  ('peak-primary', 'Mirembe Nakato',     'P4V', 'Mrs. Sarah Nakato',     '+256772111001', 'active'),
  ('peak-primary', 'Daniel Okello',      'P4V', 'Mr. James Okello',      '+256772111002', 'active'),
  ('peak-primary', 'Ruth Asiimwe',       'P3P', 'Mrs. Grace Asiimwe',    '+256772111003', 'active'),
  ('peak-primary', 'Brian Mugisha',      'P5V', 'Mr. Robert Mugisha',    '+256772111004', 'active'),
  ('peak-primary', 'Sarah Namutebi',     'P2P', 'Mrs. Florence N.',      '+256772111005', 'active'),
  ('peak-primary', 'Joseph Kato',        'P6V', 'Mr. Vincent Kato',      '+256772111006', 'active'),
  ('peak-primary', 'Patricia Atim',      'P3V', 'Mrs. Mary Atim',        '+256772111007', 'active'),
  ('peak-primary', 'James Wamala',       'P7V', 'Mr. Edward Wamala',     '+256772111008', 'active'),
  ('peak-primary', 'Faith Nansubuga',    'P5P', 'Mrs. Christine N.',     '+256772111009', 'active'),
  ('peak-primary', 'Isaac Lubega',       'P4P', 'Mr. Henry Lubega',      '+256772111010', 'active'),
  ('peak-primary', 'Esther Akello',      'P6P', 'Mrs. Rose Akello',      '+256772111011', 'active'),
  ('peak-primary', 'Peter Mukasa',       'P2V', 'Mr. Samuel Mukasa',     '+256772111012', 'active'),
  ('peak-primary', 'Joan Birungi',       'P5V', 'Mrs. Agnes Birungi',    '+256772111013', 'active'),
  ('peak-primary', 'Moses Kayemba',      'P7P', 'Mr. Patrick K.',        '+256772111014', 'active'),
  ('peak-primary', 'Linda Namusoke',     'P1V', 'Mrs. Joyce Namusoke',   '+256772111015', 'active'),
  ('peak-primary', 'David Ssempa',       'P3V', 'Mr. Ronald Ssempa',     '+256772111016', 'active'),
  ('peak-primary', 'Grace Tumusiime',    'P6V', 'Mrs. Beatrice T.',      '+256772111017', 'active'),
  ('peak-primary', 'Emmanuel Ssali',     'P4V', 'Mr. John Ssali',        '+256772111018', 'active'),
  ('peak-primary', 'Rebecca Auma',       'P2V', 'Mrs. Sylvia Auma',      '+256772111019', 'active'),
  ('peak-primary', 'Andrew Kibirige',    'P7V', 'Mr. Charles K.',        '+256772111020', 'active'),
  ('peak-primary', 'Sharon Nabakooza',   'P5P', 'Mrs. Janet N.',         '+256772111021', 'active'),
  ('peak-primary', 'Brenda Najjuma',     'P3P', 'Mrs. Diana Najjuma',    '+256772111022', 'active'),
  ('peak-primary', 'Trevor Lwanga',      'P1P', 'Mr. Stephen Lwanga',    '+256772111023', 'active'),
  ('peak-primary', 'Aisha Nankunda',     'P2P', 'Mrs. Hadija N.',        '+256772111024', 'active'),
  ('peak-primary', 'Kevin Owomugisha',   'P6P', 'Mr. Eric O.',           '+256772111025', 'active'),
  ('peak-primary', 'Hellen Nantongo',    'P1P', 'Mrs. Edith Nantongo',   '+256772111026', 'active'),
  ('peak-primary', 'Mark Sserwadda',     'P5V', 'Mr. Andrew S.',         '+256772111027', 'active'),
  ('peak-primary', 'Diana Akampurira',   'P7P', 'Mrs. Phionah A.',       '+256772111028', 'active');

-- 3. Fees — charge each student the term fee, then record partial payments
-- Term 2 2026 fees: P1-P3 = UGX 450,000; P4-P7 = UGX 600,000
-- Charges first (positive amounts)
INSERT INTO fees (tenant_id, student_id, term, kind, amount, notes)
SELECT 'peak-primary', id, 'Term 2 2026', 'charge',
       CASE WHEN stream LIKE 'P1%' OR stream LIKE 'P2%' OR stream LIKE 'P3%' THEN 450000 ELSE 600000 END,
       'Term 2 fees - opening charge'
FROM students WHERE tenant_id = 'peak-primary';

-- Payments — most parents paid fully or partially. 3 are overdue 30+ days.
-- We use student name to target specific payments.
INSERT INTO fees (tenant_id, student_id, term, kind, amount, channel, reference, notes, occurred_at)
SELECT 'peak-primary', s.id, 'Term 2 2026', 'payment',
       -- Most paid in full; some partial; 3 paid nothing (Brian, Isaac, Rebecca)
       CASE s.name
         WHEN 'Brian Mugisha'  THEN  0
         WHEN 'Isaac Lubega'   THEN  0
         WHEN 'Rebecca Auma'   THEN  0
         WHEN 'Ruth Asiimwe'   THEN -270000   -- partial: 180K outstanding
         WHEN 'Patricia Atim'  THEN -355000   -- partial: 95K outstanding
         WHEN 'Joan Birungi'   THEN -380000   -- partial: 220K outstanding
         WHEN 'David Ssempa'   THEN -305000   -- partial: 145K outstanding
         WHEN 'Sharon Nabakooza' THEN -340000  -- partial: 110K outstanding
         WHEN 'Brenda Najjuma' THEN -340000   -- partial: 110K outstanding
         -- Everyone else paid in full
         ELSE -1 * (CASE WHEN s.stream LIKE 'P1%' OR s.stream LIKE 'P2%' OR s.stream LIKE 'P3%'
                         THEN 450000 ELSE 600000 END)
       END,
       'mpesa', 'MP' || s.id || '2026', 'Term 2 payment',
       now() - interval '15 days'
FROM students s WHERE s.tenant_id = 'peak-primary'
  AND s.name NOT IN ('Brian Mugisha', 'Isaac Lubega', 'Rebecca Auma');

-- 4. Attendance — last 5 school days (Mon-Fri this week)
-- Most kids 100% present; the at-risk ones (Brian, Isaac, Rebecca) missed 2-3 days
INSERT INTO attendance (tenant_id, student_id, date, present, arrival_at)
SELECT 'peak-primary', s.id, d::date,
       CASE
         WHEN s.name IN ('Brian Mugisha', 'Isaac Lubega') AND d::date > current_date - 4 THEN false
         WHEN s.name = 'Rebecca Auma' AND d::date > current_date - 3 THEN false
         ELSE true
       END,
       CASE
         WHEN s.name IN ('Brian Mugisha', 'Isaac Lubega') AND d::date > current_date - 4 THEN NULL
         WHEN s.name = 'Rebecca Auma' AND d::date > current_date - 3 THEN NULL
         ELSE '07:35'::time
       END
FROM students s
CROSS JOIN generate_series(current_date - 4, current_date, '1 day'::interval) d
WHERE s.tenant_id = 'peak-primary'
  AND extract(dow from d) BETWEEN 1 AND 5  -- weekdays only
ON CONFLICT (student_id, date) DO NOTHING;

-- 5. Enrollment inquiries — 4 new prospective parents waiting in WhatsApp
INSERT INTO enrollments (tenant_id, child_name, parent_name, parent_phone, grade_interest, source, status, notes) VALUES
  ('peak-primary', 'Joshua Mubiru',   'Mrs. Annette Mubiru',  '+256772900101', 'P1', 'whatsapp', 'new', 'Asked about intake for Term 3 2026'),
  ('peak-primary', 'Esther Nansamba', 'Mr. Edward Nansamba',  '+256772900102', 'P1', 'whatsapp', 'new', 'Asked about boarding option'),
  ('peak-primary', 'Caleb Wasswa',    'Mrs. Florence Wasswa', '+256772900103', 'P3', 'whatsapp', 'new', 'Transferring from Kampala'),
  ('peak-primary', 'Lillian Adong',   'Mr. Patrick Adong',    '+256772900104', 'P3', 'website',  'new', 'Wants to schedule a school visit');

-- ============================================================================
-- Quick sanity checks (just SELECTs — these run after the inserts to verify)
-- ============================================================================

-- Should return 1
SELECT 'tenants' AS table_name, count(*) AS rows FROM tenants WHERE id = 'peak-primary'
UNION ALL
-- Should return 28
SELECT 'students', count(*) FROM students WHERE tenant_id = 'peak-primary'
UNION ALL
-- Should return ~50+ (charges + payments)
SELECT 'fees', count(*) FROM fees WHERE tenant_id = 'peak-primary'
UNION ALL
-- Should return ~140 (28 students × 5 weekdays)
SELECT 'attendance', count(*) FROM attendance WHERE tenant_id = 'peak-primary'
UNION ALL
-- Should return 4
SELECT 'enrollments', count(*) FROM enrollments WHERE tenant_id = 'peak-primary';

-- ============================================================================
-- Computed KPIs (what Nia will see)
-- ============================================================================

-- Outstanding balance per student (positive = owes money)
SELECT s.name, s.stream,
       COALESCE(sum(f.amount), 0) AS balance_ugx
FROM students s
LEFT JOIN fees f ON f.student_id = s.id
WHERE s.tenant_id = 'peak-primary'
GROUP BY s.id, s.name, s.stream
HAVING COALESCE(sum(f.amount), 0) > 0
ORDER BY balance_ugx DESC;

-- Aggregate health: collection rate, overdue count, at-risk students
SELECT
  'Collection rate' AS metric,
  ROUND(100.0 * (
    SELECT -1 * sum(amount) FROM fees WHERE tenant_id='peak-primary' AND kind='payment'
  ) / NULLIF((
    SELECT sum(amount) FROM fees WHERE tenant_id='peak-primary' AND kind='charge'
  ), 0), 1) AS value
UNION ALL
SELECT 'Overdue accounts',
  (SELECT count(*) FROM (
     SELECT student_id, sum(amount) AS bal FROM fees
     WHERE tenant_id='peak-primary' GROUP BY student_id HAVING sum(amount) > 0
   ) AS o)
UNION ALL
SELECT 'At-risk students (missed 2+ days this week)',
  (SELECT count(*) FROM (
     SELECT student_id FROM attendance
     WHERE tenant_id='peak-primary' AND date > current_date - 7 AND present = false
     GROUP BY student_id HAVING count(*) >= 2
   ) AS r);
