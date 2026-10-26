-- =====================================================================================
-- KAVACH CAMPUS: STEP 80.3 & 80.4 AUDIT QUERIES
-- =====================================================================================
-- Run these queries individually in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- After running Query A and Query B, click "Export" -> "Download CSV" and share the results.
-- For Query 3, verify whether it returns 0 rows (which indicates all public tables have RLS enabled).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- QUERY A: STORAGE POLICIES AUDIT (Export as CSV: storage_policies.csv)
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
-- QUERY B: PUBLIC TABLE POLICIES AUDIT (Export as CSV: public_table_policies.csv)
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
      'incidents',
      'safe_walks',
      'case_actions',
      'notifications',
      'audit_logs'
  )
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- QUERY 3: RLS DISABLED TABLES CHECK (Check if result is 0 rows)
-- -------------------------------------------------------------------------------------
SELECT
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
