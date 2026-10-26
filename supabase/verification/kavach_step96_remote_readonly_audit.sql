-- =====================================================================================
-- KAVACH CAMPUS — STEP 96: COMPLETE REMOTE READ-ONLY SECURITY AUDIT SUITE
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll)
-- Supabase URL: https://polbnvszmvblwenfnqll.supabase.co
-- Supabase SQL Editor: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- PURPOSE:
-- 100% READ-ONLY verification of database catalog, schema health, RLS status,
-- policies, storage configuration, security definers, triggers, and constraints.
--
-- STRICT SAFETY GUARANTEES:
-- - 100% READ-ONLY: Contains ONLY SELECT queries against system catalog views.
-- - ZERO SCHEMA OR DATA MUTATION: No INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE.
-- - ZERO PII EXPOSURE: Does NOT output personal student names, phone numbers, or secrets.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- CHECK 1: ALL PUBLIC APPLICATION TABLES AND THEIR RLS STATUS
-- Purpose: Verify that rowsecurity = true on all 27 public tables.
-- Expected: Every application table shows rls_enabled = true.
-- If rls_enabled = false: That table is unprotected by RLS and open to unrestricted access.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- -------------------------------------------------------------------------------------
-- CHECK 2: ALL PUBLIC POLICY EXPRESSIONS (USING & WITH CHECK)
-- Purpose: Inspect all active policies across the public schema.
-- Expected: View command (cmd), roles, permissive/restrictive, and exact SQL expressions.
-- Look for: Any policies with qual = 'true' or with_check = 'true' on sensitive tables.
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
ORDER BY tablename, cmd, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 3: POLICIES GRANTED TO 'anon', 'authenticated', AND 'public' ROLES
-- Purpose: Identify policies that permit unauthenticated (anon) or broad public access.
-- Risk: If 'anon' or '{public}' has SELECT on profiles, incidents, evidence, or audit_logs,
--       unauthenticated attackers can read private campus safety records.
-- -------------------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    'anon' = ANY(roles)
    OR 'public' = ANY(roles)
    OR roles IS NULL
  )
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 4: PERMISSIVE POLICY OR-BEHAVIOR ANALYSIS
-- Purpose: In PostgreSQL, PERMISSIVE policies for the same command combine using OR.
-- Risk: If Table A has both a strict policy ("Users read own") AND a loose policy ("Public view"),
--       the loose policy wins and grants broad access regardless of the strict policy!
-- -------------------------------------------------------------------------------------
SELECT
  tablename,
  cmd,
  COUNT(*) AS permissive_policy_count,
  ARRAY_AGG(policyname ORDER BY policyname) AS policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- -------------------------------------------------------------------------------------
-- CHECK 5: BROAD OR UNRESTRICTED POLICIES (QUAL = 'true' OR WITH_CHECK = 'true')
-- Purpose: Flag any policies that grant unrestricted TRUE access on sensitive tables.
-- Risk: Critical PII leaks if profiles, student_profiles, or incidents use USING (true).
-- -------------------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    TRIM(qual) = 'true'
    OR TRIM(with_check) = 'true'
  )
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 6: PROFILES AND STUDENT_PROFILES ACCESS POLICIES
-- Purpose: Inspect all policies governing user profiles.
-- Expected:
-- - Students can ONLY read their own profile (auth.uid() = id).
-- - Staff can read student profiles only for authorized duties.
-- - Anonymous users CANNOT read profiles.
-- - No user can self-update their own role or approval status.
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
  AND tablename IN ('profiles', 'student_profiles', 'staff_profiles')
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 7: INCIDENTS AND INCIDENT_LOCATIONS ACCESS POLICIES
-- Purpose: Inspect case privacy and exact GPS coordinate protection.
-- Expected:
-- - Students can read ONLY their own incidents (auth.uid() = student_id).
-- - Staff can read only assigned cases or if holding authorized responder roles.
-- - Anonymous users have ZERO access to incidents.
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
  AND tablename IN ('incidents', 'incident_locations', 'incident_messages')
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 8: SAFE WALKS AND TRUSTED CONTACTS ACCESS POLICIES
-- Purpose: Ensure student live tracking and emergency contacts are strictly isolated.
-- Expected:
-- - auth.uid() = student_id / auth.uid() = user_id.
-- - No student can read another student's safe walks or contacts.
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
  AND tablename IN ('safe_walks', 'trusted_contacts')
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 9: ESCALATIONS, CASE ACTIONS, NOTIFICATIONS AND AUDIT LOGS
-- Purpose: Verify operational accountability records cannot be tampered with.
-- Expected:
-- - audit_logs: Read-only for authorized admins; INSERT only via trusted system triggers/functions.
-- - notifications: Users read only their own notifications (auth.uid() = user_id).
-- - escalations: Managed by staff/system.
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
  AND tablename IN ('escalations', 'case_actions', 'notifications', 'audit_logs')
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 10: AI CONFIGURATION AND EMERGENCY CONFIGURATION
-- Purpose: Ensure campus institutional prompts and emergency hotlines are protected.
-- Expected:
-- - Public cannot modify emergency configuration.
-- - ai_configuration is restricted to ADMIN/SUPER_ADMIN.
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
  AND tablename IN ('ai_configuration', 'emergency_configuration', 'ai_analyses')
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- CHECK 11: STORAGE BUCKET CONFIGURATION (storage.buckets)
-- Purpose: Verify privacy flags, file size limits, and allowed MIME types.
-- Expected:
-- - kavach-evidence: public = false, file_size_limit = 10485760 (10MB)
-- - kavach-id-cards: public = false, file_size_limit = 5242880 (5MB)
-- -------------------------------------------------------------------------------------
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('kavach-evidence', 'kavach-id-cards')
ORDER BY id;

-- -------------------------------------------------------------------------------------
-- CHECK 12: STORAGE OBJECT POLICIES (storage.objects)
-- Purpose: Verify file upload, read, and delete authorization in storage.objects.
-- Expected:
-- - Upload (INSERT): WITH CHECK requires (storage.foldername(name))[1] = auth.uid()::text.
-- - Read (SELECT): USING requires (storage.foldername(name))[1] = auth.uid()::text OR authorized staff.
-- - Delete (DELETE): Restricted to owning user or admin.
-- Risk: If upload lacks auth.uid() prefix check, users can upload into other users' folders.
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
-- CHECK 13: SECURITY DEFINER FUNCTIONS & SEARCH_PATH PROTECTION
-- Purpose: Verify that privileged functions prevent search_path injection attacks.
-- Expected: Every function with prosecdef = true MUST declare proconfig containing 'search_path=public'.
-- Risk: Functions without a pinned search_path can be exploited for privilege escalation.
-- -------------------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- -------------------------------------------------------------------------------------
-- CHECK 14: ACTIVE DATABASE TRIGGERS ON SENSITIVE TABLES
-- Purpose: Inspect active triggers protecting role escalation and enforcing timestamps.
-- Expected:
-- - trg_prevent_self_role_escalation on public.profiles.
-- - handle_new_user on auth.users (if configured).
-- -------------------------------------------------------------------------------------
SELECT
  trigger_schema,
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
  AND event_object_table IN ('profiles', 'student_profiles', 'incidents', 'safe_walks', 'users')
ORDER BY event_object_table, trigger_name;

-- -------------------------------------------------------------------------------------
-- CHECK 15: DUPLICATE STUDENT IDENTIFIERS IN PROFILES
-- Purpose: Confirm zero duplicate student_id records among student accounts.
-- Expected: 0 rows returned.
-- Interpretation: Any duplicate causes index creation failure and identity ambiguity.
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
-- CHECK 16: FOREIGN KEY CONSTRAINTS ON SENSITIVE TABLES
-- Purpose: Confirm referential integrity between incidents, profiles, and locations.
-- -------------------------------------------------------------------------------------
SELECT
  con.conname AS constraint_name,
  rel.relname AS table_name,
  con.contype AS constraint_type,
  con.convalidated AS is_validated,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN ('profiles', 'student_profiles', 'incidents', 'incident_locations', 'evidence', 'safe_walks')
ORDER BY rel.relname, con.conname;
