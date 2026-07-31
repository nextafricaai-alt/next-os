-- ─── Fix: class_assignments is empty for KABSLILY ──────────────────────────
-- supabase-MASTER-CLEAN-KABS-LILY.sql (repo root) already defines the
-- teacher→stream mapping below (its lines 67-77), but the live database has
-- 12 kabs-lily teachers and ZERO class_assignments rows — meaning that part
-- of the script never actually ran (most likely: someone ran only the
-- teachers section of that large script in the SQL editor, and never
-- reached the class_assignments INSERT further down).
--
-- This is why teacher-view.jsx shows "No lessons assigned to you yet" /
-- "You have no class assignments yet" for every KABSLILY teacher — nothing
-- is broken in the app, there's just no class_assignments data to read.
--
-- Rather than re-run the original destructive "wipe everything" script,
-- this looks teachers up by their (stable, already-confirmed-live) email
-- and inserts just the missing assignments, safe to re-run.
--
-- NOTE: the original script only assigned 10 of the 12 teachers as class
-- teachers (Kaaya Dennis and Kigozi Joseph were left out — not an omission
-- I'm introducing, that's how the source script was written). Left as-is
-- here too rather than guess which stream they should own.

INSERT INTO class_assignments (tenant_id, teacher_id, stream, subject, is_class_teacher)
SELECT 'kabs-lily-junior-school-and-kindercare-centre', t.id, v.stream, v.subject, true
FROM teachers t
JOIN (VALUES
  ('justine@kabslily.edu.ug', 'Baby Class',     'LA 1'),
  ('jeminma@kabslily.edu.ug', 'Middle Class',   'LA 3'),
  ('mayirah@kabslily.edu.ug', 'Top Class',      'Pre-Primary'),
  ('harriet@kabslily.edu.ug', 'Primary One',    'Luganda'),
  ('christine@kabslily.edu.ug', 'Primary Two',  'English'),
  ('prossy@kabslily.edu.ug', 'Primary Three',   'Mathematics'),
  ('martha@kabslily.edu.ug', 'Primary Four',    'Science'),
  ('namutebi@kabslily.edu.ug', 'Primary Five',  'SST'),
  ('edward@kabslily.edu.ug', 'Primary Six',     'Mathematics'),
  ('isaac@kabslily.edu.ug', 'Primary Seven',    'SST')
) AS v(email, stream, subject) ON v.email = t.email
WHERE t.tenant_id = 'kabs-lily-junior-school-and-kindercare-centre'
ON CONFLICT (teacher_id, stream, subject) DO NOTHING;

-- Verify
SELECT t.full_name, t.email, ca.stream, ca.subject
FROM class_assignments ca JOIN teachers t ON t.id = ca.teacher_id
WHERE ca.tenant_id = 'kabs-lily-junior-school-and-kindercare-centre'
ORDER BY ca.stream;
