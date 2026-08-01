-- ─── Student profile picture support ────────────────────────────────────
-- students already has a `meta jsonb` catch-all (used this session by the
-- registration-approval flow for petName/sex/bloodGroup/allergies/etc — see
-- supabase-registration-requests.sql), which already covers "comprehensive
-- biographical data" without a schema change. The one thing genuinely
-- missing is a dedicated photo column — safe, additive, single column.
--
-- Storage approach: this app has no Supabase Storage bucket set up
-- anywhere (grepped the whole codebase — zero usage), and creating one
-- needs the dashboard, which is outside what a SQL migration can do. So
-- this follows the SAME pattern school-brand-admin.jsx already uses for
-- the school badge/logo: store the image as a base64 data URL directly in
-- a text column, no separate storage service required. Fine for
-- school-ID-sized photos; would need real Storage if this grows to
-- large/many images per student.

ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url text;
