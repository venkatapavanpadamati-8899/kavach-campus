-- =====================================================================================
-- KAVACH CAMPUS: STEP 83 SUPABASE RLS AND STORAGE SECURITY AUDIT QUERIES
-- =====================================================================================
-- Project: Kavach Campus (polbnvszmvblwenfnqll)
-- Safety Notice: READ-ONLY ONLY. No DROP, CREATE, ALTER, or UPDATE operations.
-- SQL Editor URL: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- QUERY 1: ALL PUBLIC TABLES AND RLS STATUS
-- Purpose: Verify if every table in public schema has rowsecurity = true (RLS enabled).
-- Expected: All tables show rls_enabled = true. None should be false.
-- -------------------------------------------------------------------------------------
SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- -------------------------------------------------------------------------------------
-- QUERY 2: STORAGE POLICIES ON storage.objects
-- Export as CSV: storage_policies.csv
-- Purpose: Audit qual and with_check expressions for evidence and ID card storage.
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
-- QUERY 3: PUBLIC TABLE POLICIES ACROSS ALL SENSITIVE TABLES
-- Export as CSV: public_table_policies.csv
-- Purpose: Full expression audit for profiles, student_profiles, incidents, safe_walks, etc.
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
  AND tablename IN (
      'profiles', 
      'student_profiles', 
      'staff_profiles', 
      'incidents', 
      'incident_locations', 
      'evidence', 
      'safe_walks', 
      'trusted_contacts', 
      'escalations', 
      'case_actions', 
      'notifications', 
      'audit_logs'
  ) 
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- QUERY 4: PREFLIGHT DUPLICATE STUDENT ID PROBE
-- Purpose: Verify whether any duplicate student_id exists in public.profiles.
-- Expected: 0 rows returned. If > 0, unique index cannot be safely added.
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
-- QUERY 5: SECURITY DEFINER FUNCTIONS AND SEARCH_PATH AUDIT
-- Purpose: Verify that security-definer helper functions declare search_path = public.
-- -------------------------------------------------------------------------------------
SELECT 
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.provolatile AS volatility,
    p.proconfig AS search_path_configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_staff', 'is_admin', 'is_security_or_admin', 'get_user_role', 'prevent_self_role_escalation')
ORDER BY p.proname;
