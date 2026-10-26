-- =====================================================================================
-- KAVACH CAMPUS — STEP 90: COMPLETE SUPABASE REMOTE READ-ONLY AUDIT QUERIES
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll)
-- Supabase URL: https://polbnvszmvblwenfnqll.supabase.co
-- Supabase SQL Editor: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- PURPOSE:
-- 100% READ-ONLY verification of database catalog, schema health, RLS status,
-- policies, storage configuration, security definers, constraints, and migration history.
--
-- SAFETY ASSURANCES:
-- - STRICTLY NON-DESTRUCTIVE: Contains ONLY SELECT queries against catalog views.
-- - ZERO MODIFICATION: No CREATE, ALTER, DROP, INSERT, UPDATE, DELETE, or TRUNCATE.
-- - ZERO PII EXPOSURE: Does NOT select student names, personal emails, coordinates, or secrets.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- CHECK A: ALL PUBLIC TABLE ROW LEVEL SECURITY (RLS) STATUS
-- Expected: Every application table in public schema must show rls_enabled = true.
-- Interpretation: If any table shows rls_enabled = false, that table is vulnerable to
--                 unrestricted access unless protected at another layer.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- -------------------------------------------------------------------------------------
-- CHECK B: CRITICAL TABLE RLS & FORCE-RLS STATUS (pg_class)
-- Expected: relrowsecurity = true for all project tables. relforcerowsecurity shows
--           whether RLS applies even to table owners (helpful for strict multi-tenant isolation).
-- -------------------------------------------------------------------------------------
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- -------------------------------------------------------------------------------------
-- CHECK C: ALL PUBLIC SCHEMA ROW LEVEL SECURITY POLICIES
-- Expected: Policies should exist for SELECT, INSERT, UPDATE, DELETE on sensitive tables.
-- Interpretation: Check 'qual' (USING clause) and 'with_check' (WITH CHECK clause).
--                 Ensure no policy provides accidental broad TRUE or unrestricted access.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK D: STORAGE OBJECT POLICIES (storage.objects)
-- Expected: Policies governing 'kavach-evidence' and 'kavach-id-cards' objects.
-- Interpretation: Verify that INSERT requires auth.uid() matching the path prefix,
--                 and SELECT requires owning auth.uid() OR public.is_staff().
-- -------------------------------------------------------------------------------------
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- -------------------------------------------------------------------------------------
-- CHECK E: STORAGE BUCKET CONFIGURATION (storage.buckets)
-- Expected: Both 'kavach-evidence' and 'kavach-id-cards' exist with public = false.
-- Interpretation: Check file_size_limit (evidence <= 10MB, id-cards <= 5MB) and
--                 allowed_mime_types (images, pdfs, mp4) to prevent payload abuse.
-- -------------------------------------------------------------------------------------
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- -------------------------------------------------------------------------------------
-- CHECK F: PREFLIGHT PROBE FOR DUPLICATE STUDENT IDS IN PROFILES
-- Expected: 0 rows returned.
-- Interpretation: If count > 1 for any student_id, the unique partial index
--                 idx_profiles_student_id will fail to create until duplicates are resolved.
-- -------------------------------------------------------------------------------------
SELECT
  student_id,
  COUNT(*) AS duplicate_count
FROM public.profiles
WHERE student_id IS NOT NULL
  AND role = 'STUDENT'
GROUP BY student_id
HAVING COUNT(*) > 1;

-- -------------------------------------------------------------------------------------
-- CHECK G: SECURITY DEFINER FUNCTIONS & SEARCH_PATH SETTINGS
-- Expected: Helper functions (get_user_role, is_staff, is_admin, etc.) with prosecdef = true.
-- Interpretation: Every SECURITY DEFINER function MUST declare proconfig containing
--                 'search_path=public' to prevent search_path hijacking vulnerabilities.
-- -------------------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- -------------------------------------------------------------------------------------
-- CHECK H: INSTALLED POSTGRESQL EXTENSIONS
-- Expected: 'uuid-ossp' and 'pgcrypto' installed and enabled.
-- -------------------------------------------------------------------------------------
SELECT
  extname,
  extversion
FROM pg_extension
ORDER BY extname;

-- -------------------------------------------------------------------------------------
-- CHECK I: RELEVANT INTEGRITY CONSTRAINTS (FK, UNIQUE, CHECK)
-- Expected: Foreign keys enforce referential integrity between incidents, profiles,
--           zones, buildings, escalations; check constraints enforce valid enums/status.
-- -------------------------------------------------------------------------------------
SELECT
  con.conname AS constraint_name,
  rel.relname AS table_name,
  con.contype AS constraint_type, -- 'p': primary key, 'f': foreign key, 'u': unique, 'c': check
  con.convalidated AS is_validated,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relkind IN ('r', 'p')
ORDER BY rel.relname, con.conname;

-- -------------------------------------------------------------------------------------
-- CHECK J: MIGRATION TRACKING (WHERE PERMISSIONS ALLOW)
-- Expected: List of applied migrations tracked by Supabase CLI or internal tables.
-- Interpretation: In standard Supabase setups, schema migrations are tracked in
--                 supabase_migrations.schema_migrations. If table does not exist,
--                 returns notification without error.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE (schemaname = 'supabase_migrations' AND tablename = 'schema_migrations')
   OR (schemaname = 'public' AND tablename LIKE '%migration%');

-- Note: If supabase_migrations.schema_migrations exists in the result above, run:
-- SELECT version, inserted_at FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 50;

-- =====================================================================================
-- END OF KAVACH CAMPUS STEP 90 READ-ONLY AUDIT SCRIPT
-- =====================================================================================
