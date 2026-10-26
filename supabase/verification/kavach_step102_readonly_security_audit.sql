-- =====================================================================================
-- KAVACH CAMPUS — STEP 102: READ-ONLY SUPABASE SECURITY POLICY AUDIT SUITE
-- =====================================================================================
-- Project: Kavach Campus (Supabase Project Ref: polbnvszmvblwenfnqll)
-- Workspace: D:\Kavach Campus
-- Target URL: https://polbnvszmvblwenfnqll.supabase.co
-- SQL Editor: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- STRICT SAFETY GUARANTEES:
-- - 100% READ-ONLY: Contains ONLY SELECT queries on PostgreSQL system catalogs.
-- - ZERO MUTATION: Absolutely NO INSERT, UPDATE, DELETE, ALTER, DROP, or TRUNCATE.
-- - ZERO PII EXPOSURE: Queries schemas, metadata, policy text, and counts only.
-- - NON-DISRUPTIVE: Safe to execute on live production database at any time.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- SECTION 1: PUBLIC TABLES AND ROW-LEVEL SECURITY (RLS) STATUS
-- Purpose: Verify that rowsecurity = true on every sensitive public table.
-- Expected: Every table (profiles, incidents, evidence, etc.) shows rls_enabled = true.
-- Warning: If any table shows rls_enabled = false, that table is completely unprotected.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- -------------------------------------------------------------------------------------
-- SECTION 2: ALL PUBLIC RLS POLICIES (THE AUTHORITATIVE QUERY A)
-- Purpose: Inspect the exact USING and WITH CHECK SQL expressions for all public policies.
-- Key Checks:
-- 1. Does any policy use qual = 'true' on sensitive tables (profiles, incidents, evidence)?
-- 2. Are multiple PERMISSIVE policies present on the same table/command (evaluating as OR)?
-- 3. Does student access check auth.uid() = id or auth.uid() = student_id?
-- 4. Does staff access require is_approved = true and is_staff() / assignment?
-- -------------------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- -------------------------------------------------------------------------------------
-- SECTION 3: STORAGE OBJECT SECURITY POLICIES (THE AUTHORITATIVE QUERY B)
-- Purpose: Inspect all policies governing storage.objects uploads and downloads.
-- Key Checks:
-- 1. Does INSERT enforce folder path prefix: (storage.foldername(name))[1] = auth.uid()::text?
-- 2. Does SELECT restrict reading to file owner or authorized staff/case handlers?
-- 3. Are UPDATE and DELETE restricted to file owners or administrators?
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
-- SECTION 4: STORAGE BUCKET CONFIGURATION & PRIVACY STATUS
-- Purpose: Verify that both kavach-evidence and kavach-id-cards buckets exist and are private.
-- Expected:
-- - id = 'kavach-evidence': public = false, file_size_limit = 10485760 (10 MiB)
-- - id = 'kavach-id-cards': public = false, file_size_limit = 5242880 (5 MiB)
-- -------------------------------------------------------------------------------------
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY id;

-- -------------------------------------------------------------------------------------
-- SECTION 5: POLICIES EXPOSED TO UNRESTRICTED ROLES ('anon' OR 'public')
-- Purpose: Detect any policy that grants permissions to unauthenticated users or public role.
-- Risk: Anonymous access to profiles, incidents, evidence, or audit_logs is a critical breach.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    'anon' = ANY(roles)
    OR 'public' = ANY(roles)
    OR roles IS NULL
  )
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- SECTION 6: OVERLAPPING PERMISSIVE POLICIES ANALYSIS (OR-COMBINATION RISKS)
-- Purpose: Identify tables with multiple PERMISSIVE policies for the same command.
-- In PostgreSQL, PERMISSIVE policies combine via OR: (Policy A) OR (Policy B).
-- If Policy A is strict but Policy B has USING (true), Policy B completely negates Policy A.
-- -------------------------------------------------------------------------------------
SELECT
  tablename,
  cmd,
  COUNT(*) AS permissive_policy_count,
  ARRAY_AGG(policyname ORDER BY policyname) AS active_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- -------------------------------------------------------------------------------------
-- SECTION 7: SECURITY DEFINER FUNCTIONS & SEARCH_PATH CONFIGURATION
-- Purpose: Inspect all custom SECURITY DEFINER functions to verify secure search_path.
-- Risk: A SECURITY DEFINER function without pinned search_path = public is vulnerable to
--       search-path hijacking by malicious authenticated users.
-- -------------------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- -------------------------------------------------------------------------------------
-- SECTION 8: ACTIVE DATABASE TRIGGERS ON SENSITIVE TABLES
-- Purpose: Verify triggers enforcing security constraints (e.g., self-role escalation block).
-- -------------------------------------------------------------------------------------
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  p.proname AS function_name,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS trigger_timing,
  CASE t.tgtype::integer & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
    ELSE 'OTHER'
  END AS trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- -------------------------------------------------------------------------------------
-- SECTION 9: VERIFY UNIQUE CONSTRAINTS (STUDENT ID DEDUPLICATION)
-- Purpose: Confirm unique constraint or index exists on student_profiles.student_id_number.
-- -------------------------------------------------------------------------------------
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'student_profiles')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- -------------------------------------------------------------------------------------
-- SECTION 10: APPLICATION-REFERENCED COLUMNS IN SENSITIVE TABLES
-- Purpose: Verify schema structure matches application expectations for authorization.
-- -------------------------------------------------------------------------------------
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'student_profiles',
    'staff_profiles',
    'incidents',
    'incident_locations',
    'evidence',
    'safe_walks',
    'trusted_contacts',
    'audit_logs'
  )
ORDER BY table_name, ordinal_position;
