-- =====================================================================================
-- KAVACH CAMPUS: COMPLETE REMOTE DATABASE AUDIT
-- STEP 26 | ROBUST CATALOG-SAFE | READ-ONLY | NO DATABASE CHANGES
-- =====================================================================================
-- Target Project: https://polbnvszmvblwenfnqll.supabase.co
-- Dashboard Link: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- IMPROVEMENTS IN STEP 26:
-- 1. All catalog queries use robust joins (no unsafe 'table'::regclass casts that fail if absent).
-- 2. Fixed pg_tables column reference to tablename AS table_name (prevents error 42703).
-- 3. Added search_path verification check to SECURITY DEFINER functions.
-- 4. Expanded storage bucket check to include both 'kavach-id-cards' and 'identity-documents'.
-- 5. 100% READ-ONLY, non-destructive, safe to run in Supabase SQL Editor.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. REQUIRED BASE TABLES & RLS STATUS (Target: All 8 critical tables PASS)
-- -------------------------------------------------------------------------------------
SELECT 
    r.table_name,
    CASE WHEN t.tablename IS NOT NULL THEN 'PASS' ELSE 'FAIL (Table Missing)' END AS table_status,
    COALESCE(t.rowsecurity, FALSE) AS rls_enabled,
    CASE 
        WHEN t.tablename IS NULL THEN 'FAIL'
        WHEN t.rowsecurity = TRUE THEN 'PASS'
        ELSE 'WARN (RLS Disabled)'
    END AS overall_status
FROM (
    VALUES 
        ('profiles'),
        ('student_profiles'),
        ('staff_profiles'),
        ('incidents'),
        ('safe_walks'),
        ('escalations'),
        ('evidence'),
        ('audit_logs')
) AS r(table_name)
LEFT JOIN pg_tables t 
    ON t.schemaname = 'public' 
    AND t.tablename = r.table_name
ORDER BY r.table_name;

-- -------------------------------------------------------------------------------------
-- 2. REQUIRED MIGRATION 008 COLUMNS
-- -------------------------------------------------------------------------------------
SELECT 
    r.table_name,
    r.column_name,
    CASE WHEN c.column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL (Column Missing)' END AS status
FROM (
    VALUES 
        ('profiles', 'student_id'),
        ('profiles', 'role'),
        ('profiles', 'is_approved'),
        ('student_profiles', 'admission_type'),
        ('student_profiles', 'admission_year'),
        ('student_profiles', 'expected_graduation_year'),
        ('student_profiles', 'id_card_url'),
        ('student_profiles', 'verification_status'),
        ('student_profiles', 'verified_at'),
        ('student_profiles', 'verified_by'),
        ('student_profiles', 'verification_notes'),
        ('student_profiles', 'ocr_extracted_data'),
        ('safe_walks', 'expires_at'),
        ('safe_walks', 'auto_sos_enabled'),
        ('safe_walks', 'auto_sos_timeout_mins'),
        ('safe_walks', 'start_latitude'),
        ('safe_walks', 'start_longitude'),
        ('safe_walks', 'last_latitude'),
        ('safe_walks', 'last_longitude'),
        ('safe_walks', 'last_location_at'),
        ('safe_walks', 'completed_at'),
        ('safe_walks', 'escalation_incident_id')
) AS r(table_name, column_name)
LEFT JOIN information_schema.columns c 
    ON c.table_schema = 'public' 
    AND c.table_name = r.table_name 
    AND c.column_name = r.column_name
ORDER BY r.table_name, r.column_name;

-- -------------------------------------------------------------------------------------
-- 3. RLS ENABLEMENT ON CRITICAL TABLES (Using tablename AS table_name)
-- -------------------------------------------------------------------------------------
SELECT 
    t.tablename AS table_name,
    t.rowsecurity AS rls_enabled,
    CASE WHEN t.rowsecurity THEN 'PASS' ELSE 'FAIL' END AS status
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
      'profiles',
      'student_profiles',
      'staff_profiles',
      'incidents',
      'safe_walks',
      'escalations',
      'evidence',
      'audit_logs'
  )
ORDER BY t.tablename;

-- -------------------------------------------------------------------------------------
-- 4. EXISTING RLS POLICIES ACROSS SENSITIVE TABLES
-- -------------------------------------------------------------------------------------
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using_clause,
    with_check IS NOT NULL AS has_with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'profiles',
      'student_profiles',
      'staff_profiles',
      'incidents',
      'safe_walks',
      'escalations',
      'evidence',
      'audit_logs'
  )
ORDER BY tablename, policyname;

-- -------------------------------------------------------------------------------------
-- 5. SECURITY DEFINER HELPER FUNCTION SETTINGS & PINNED SEARCH_PATH
-- -------------------------------------------------------------------------------------
SELECT 
    p.proname AS function_name,
    pg_get_userbyid(p.proowner) AS function_owner,
    p.prosecdef AS security_definer,
    p.proconfig AS function_settings,
    CASE 
        WHEN p.proconfig::text LIKE '%search_path=public%' THEN 'PASS (Pinned search_path)'
        ELSE 'WARN (Search path not explicitly pinned)'
    END AS search_path_security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'get_user_role',
      'is_staff',
      'is_admin',
      'is_security_or_admin',
      'prevent_self_role_escalation'
  )
ORDER BY p.proname;

-- -------------------------------------------------------------------------------------
-- 6. STUDENT ID UNIQUE INDEX VERIFICATION
-- -------------------------------------------------------------------------------------
SELECT 
    indexname,
    indexdef,
    CASE 
        WHEN indexname = 'idx_profiles_student_id' THEN 'PASS'
        ELSE 'FAIL'
    END AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND indexname = 'idx_profiles_student_id';

-- -------------------------------------------------------------------------------------
-- 7. CHECK FOR DUPLICATE STUDENT IDS (CRITICAL PREFLIGHT FOR UNIQUE INDEX)
-- -------------------------------------------------------------------------------------
SELECT 
    student_id,
    COUNT(*) AS duplicate_count
FROM public.profiles
WHERE student_id IS NOT NULL 
  AND role::text = 'STUDENT'
GROUP BY student_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- -------------------------------------------------------------------------------------
-- 8. SELF-ROLE ESCALATION PREVENTION TRIGGER
-- -------------------------------------------------------------------------------------
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'profiles'
  AND trigger_name = 'trg_prevent_self_role_escalation';

-- -------------------------------------------------------------------------------------
-- 9. STORAGE BUCKET PRIVACY AUDIT (Checks all potential private buckets)
-- -------------------------------------------------------------------------------------
SELECT 
    id,
    name,
    public AS is_public,
    CASE WHEN public = FALSE THEN 'PASS (Private)' ELSE 'FAIL (Public Exposure)' END AS status
FROM storage.buckets
WHERE id IN ('kavach-evidence', 'kavach-id-cards', 'identity-documents')
ORDER BY id;

-- -------------------------------------------------------------------------------------
-- 10. STORAGE RLS POLICIES (STORAGE.OBJECTS)
-- -------------------------------------------------------------------------------------
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using_clause,
    with_check IS NOT NULL AS has_with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- -------------------------------------------------------------------------------------
-- 11. CHECK SAFE WALK STATUS CONSTRAINT (ROBUST CATALOG JOIN - NO REGCLASS CAST TRAP)
-- -------------------------------------------------------------------------------------
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS definition,
    con.convalidated AS validated
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'safe_walks'
  AND con.contype = 'c'
ORDER BY con.conname;

-- -------------------------------------------------------------------------------------
-- 12. CHECK ESCALATIONS TABLE STRUCTURE
-- -------------------------------------------------------------------------------------
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'escalations'
ORDER BY ordinal_position;
