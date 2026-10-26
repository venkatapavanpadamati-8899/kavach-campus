-- =====================================================================================
-- KAVACH CAMPUS — STEP 22: REMOTE SUPABASE DATABASE READ-ONLY VERIFICATION SCRIPT
-- =====================================================================================
-- PROJECT REF: polbnvszmvblwenfnqll
-- PROJECT URL: https://polbnvszmvblwenfnqll.supabase.co
--
-- INSTRUCTIONS:
-- 1. Open the Supabase SQL Editor:
--    https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
-- 2. Paste and run this script.
-- 3. SAFETY NOTICE:
--    - This script contains ONLY 100% READ-ONLY SELECT queries.
--    - It DOES NOT INSERT, UPDATE, DELETE, DROP, TRUNCATE, or ALTER any data or schema.
--    - It strictly avoids exposing student PII, names, phone numbers, or passwords.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. DATABASE IDENTITY, VERSION & PROJECT ENVIRONMENT
-- -------------------------------------------------------------------------------------
SELECT 
    '1. DATABASE IDENTITY' AS audit_section,
    current_database() AS database_name,
    current_schema() AS active_schema,
    current_user AS connected_user,
    version() AS postgresql_version;

-- -------------------------------------------------------------------------------------
-- 2. TABLE INVENTORY: VERIFY ALL 19 EXPECTED BASE TABLES IN PUBLIC SCHEMA
-- -------------------------------------------------------------------------------------
SELECT 
    '2. TABLE INVENTORY' AS audit_section,
    table_name,
    CASE 
        WHEN table_name IN (
            'profiles', 'student_profiles', 'staff_profiles', 'user_otp_verifications',
            'campus_zones', 'campus_buildings', 'incidents', 'incident_locations',
            'evidence', 'ai_analyses', 'escalations', 'incident_messages',
            'case_actions', 'notifications', 'safe_walks', 'trusted_contacts',
            'audit_logs', 'ai_configuration', 'emergency_configuration'
        ) THEN 'EXPECTED_CORE_TABLE'
        ELSE 'OTHER_PUBLIC_TABLE'
    END AS table_classification
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- TABLE COUNT SUMMARY (Target: 19)
SELECT 
    '2.1 TABLE COUNT SUMMARY' AS audit_section,
    COUNT(*)::text AS actual_table_count,
    CASE 
        WHEN COUNT(*) >= 19 THEN 'PASS — All 19 core tables present'
        ELSE 'FAIL — Missing expected tables'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles', 'student_profiles', 'staff_profiles', 'user_otp_verifications',
    'campus_zones', 'campus_buildings', 'incidents', 'incident_locations',
    'evidence', 'ai_analyses', 'escalations', 'incident_messages',
    'case_actions', 'notifications', 'safe_walks', 'trusted_contacts',
    'audit_logs', 'ai_configuration', 'emergency_configuration'
  );

-- -------------------------------------------------------------------------------------
-- 3. COLUMN INVENTORY & DATA TYPES ACROSS SENSITIVE TABLES
-- -------------------------------------------------------------------------------------
SELECT 
    '3. COLUMN INVENTORY' AS audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'student_profiles', 'safe_walks', 'incidents', 'escalations', 'evidence')
ORDER BY table_name, ordinal_position;

-- -------------------------------------------------------------------------------------
-- 4. CONSTRAINTS, PRIMARY KEYS & FOREIGN KEYS
-- -------------------------------------------------------------------------------------
SELECT 
    '4. CONSTRAINTS & KEYS' AS audit_section,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- -------------------------------------------------------------------------------------
-- 5. INDEX INVENTORY (CHECK FOR PERFORMANCE AND PARTIAL UNIQUE INDEXES)
-- -------------------------------------------------------------------------------------
SELECT 
    '5. INDEX INVENTORY' AS audit_section,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check specifically for idx_profiles_student_id
SELECT 
    '5.1 UNIQUE STUDENT ID INDEX' AS audit_section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'profiles' 
              AND indexname = 'idx_profiles_student_id'
        ) THEN 'PASS — Partial unique index present'
        ELSE 'PENDING — Requires safe migration 008'
    END AS status;

-- -------------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) STATUS ACROSS ALL PUBLIC TABLES
-- -------------------------------------------------------------------------------------
SELECT 
    '6. RLS STATUS' AS audit_section,
    tablename,
    rowsecurity AS rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN 'PASS (Protected)'
        ELSE 'CRITICAL FAIL (RLS Disabled — Unprotected)'
    END AS security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- -------------------------------------------------------------------------------------
-- 7. RLS POLICY INVENTORY (USING CONDITIONS & WITH CHECK EXPRESSIONS)
-- -------------------------------------------------------------------------------------
SELECT 
    '7. RLS POLICIES' AS audit_section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using_clause,
    with_check IS NOT NULL AS has_with_check_clause
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- -------------------------------------------------------------------------------------
-- 8. SECURITY DEFINER HELPER FUNCTIONS & SEARCH PATH HARDENING
-- -------------------------------------------------------------------------------------
SELECT 
    '8. SECURITY FUNCTIONS' AS audit_section,
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.provolatile AS volatility_mode,
    pg_get_userbyid(p.proowner) AS function_owner,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path = public%' 
          OR pg_get_functiondef(p.oid) LIKE '%search_path%' THEN 'PASS — Pinned search_path'
        ELSE 'WARN — Search path not explicitly pinned'
    END AS search_path_hardening
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_staff', 'is_admin', 'is_security_or_admin', 'get_user_role', 'prevent_self_role_escalation')
ORDER BY p.proname;

-- -------------------------------------------------------------------------------------
-- 9. TRIGGER INVENTORY
-- -------------------------------------------------------------------------------------
SELECT 
    '9. TRIGGER INVENTORY' AS audit_section,
    event_object_table AS target_table,
    trigger_name,
    event_manipulation AS event_type,
    action_timing AS timing,
    action_statement AS executed_action
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- -------------------------------------------------------------------------------------
-- 10. STORAGE BUCKET INVENTORY & PRIVACY FLAGS
-- -------------------------------------------------------------------------------------
SELECT 
    '10. STORAGE BUCKETS' AS audit_section,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE 
        WHEN public = false THEN 'PASS — Private Bucket'
        ELSE 'FAIL — Public Bucket (Security Exposure)'
    END AS privacy_status
FROM storage.buckets 
ORDER BY name;

-- -------------------------------------------------------------------------------------
-- 11. STORAGE RLS POLICIES (STORAGE.OBJECTS)
-- -------------------------------------------------------------------------------------
SELECT 
    '11. STORAGE POLICIES' AS audit_section,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using_clause,
    with_check IS NOT NULL AS has_with_check_clause
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- -------------------------------------------------------------------------------------
-- 12. DATA INTEGRITY PREFLIGHT: DUPLICATE STUDENT IDS (CONDITIONAL)
-- -------------------------------------------------------------------------------------
DO $$ 
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'student_id'
    ) INTO col_exists;

    IF col_exists THEN
        RAISE NOTICE 'Executing duplicate student_id preflight check...';
    ELSE
        RAISE NOTICE 'profiles.student_id column does not exist yet; skipping check.';
    END IF;
END $$;

SELECT 
    '12. DUPLICATE STUDENT IDS' AS audit_section,
    COUNT(*) AS duplicate_clusters_found,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS — 0 duplicates, safe for unique index'
        ELSE 'ACTION_REQUIRED — Duplicates must be resolved before migration 008'
    END AS preflight_status
FROM (
    SELECT student_id 
    FROM public.profiles 
    WHERE student_id IS NOT NULL 
    GROUP BY student_id 
    HAVING COUNT(*) > 1
) dupes;

-- -------------------------------------------------------------------------------------
-- 13. DATA INTEGRITY PREFLIGHT: ACTIVE INCIDENT ASSIGNMENTS & ORPHAN CHECKS
-- -------------------------------------------------------------------------------------
SELECT 
    '13. DATA INTEGRITY' AS audit_section,
    'Orphaned Incidents (Invalid student_id)' AS check_name,
    COUNT(*)::text AS count_found
FROM public.incidents i
LEFT JOIN public.profiles p ON i.student_id = p.id
WHERE i.student_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 
    '13. DATA INTEGRITY' AS audit_section,
    'Invalid Incident Status Values' AS check_name,
    COUNT(*)::text AS count_found
FROM public.incidents 
WHERE status NOT IN ('RECEIVED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED', 'FALSE_ALARM')

UNION ALL

SELECT 
    '13. DATA INTEGRITY' AS audit_section,
    'Invalid Incident Severity Values' AS check_name,
    COUNT(*)::text AS count_found
FROM public.incidents 
WHERE severity NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- -------------------------------------------------------------------------------------
-- 14. SAFE WALK SCHEMA VERIFICATION
-- -------------------------------------------------------------------------------------
SELECT 
    '14. SAFE WALK COLUMNS' AS audit_section,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('expires_at', 'auto_sos_enabled', 'auto_sos_timeout_mins', 'last_latitude', 'last_longitude') 
        THEN 'PRESENT'
        ELSE 'EXISTING_BASE'
    END AS migration_status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'safe_walks'
  AND column_name IN ('id', 'student_id', 'status', 'expires_at', 'auto_sos_enabled', 'auto_sos_timeout_mins', 'last_latitude', 'last_longitude')
ORDER BY column_name;

-- -------------------------------------------------------------------------------------
-- 15. STUDENT IDENTITY VERIFICATION SCHEMA VERIFICATION
-- -------------------------------------------------------------------------------------
SELECT 
    '15. ID VERIFICATION COLUMNS' AS audit_section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'student_profiles'
  AND column_name IN (
    'admission_type', 'admission_year', 'expected_graduation_year',
    'id_card_url', 'verification_status', 'verified_at', 'verified_by'
  )
ORDER BY column_name;

-- -------------------------------------------------------------------------------------
-- 16. ESCALATION ENGINE SCHEMA VERIFICATION
-- -------------------------------------------------------------------------------------
SELECT 
    '16. ESCALATION ENGINE COLUMNS' AS audit_section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'escalations'
ORDER BY ordinal_position;
