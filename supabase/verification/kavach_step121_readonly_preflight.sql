-- =====================================================================================
-- KAVACH CAMPUS — STEP 121: 100% READ-ONLY PRE-FLIGHT VERIFICATION SQL
-- =====================================================================================
-- Project: Kavach Campus (Supabase Ref: polbnvszmvblwenfnqll)
-- Date: 2026-10-18
--
-- STRICT SAFETY GUARANTEES:
-- - 100% READ-ONLY: Contains ONLY SELECT queries on system catalogs and information_schema.
-- - ZERO MUTATION: Absolutely NO INSERT, UPDATE, DELETE, ALTER, DROP, CREATE, GRANT, or REVOKE.
-- - ZERO PII EXPOSURE: Queries schema metadata, data types, policies, triggers, and grants only.
-- - NON-DISRUPTIVE: Completely safe to execute in the Supabase Dashboard SQL Editor at any time:
--   https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- SECTION 1: AUDIT_LOGS SCHEMA & NOT-NULL CONSTRAINTS
-- Purpose: Inspect exact column names, nullability, and data types for public.audit_logs
-- Target: Confirm existence of entity_type, metadata vs details, and mandatory fields.
-- -------------------------------------------------------------------------------------
SELECT 
    '1. AUDIT_LOGS COLUMNS' AS audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- -------------------------------------------------------------------------------------
-- SECTION 2: SENSITIVE CORE TABLES COLUMN AUDIT
-- Purpose: Verify column existence and types for student_profiles, incidents, evidence, profiles
-- Target: Verify id, verification_status, verified_at, verified_by, verification_notes,
--         ocr_extracted_data, id_card_url on student_profiles;
--         case_id, id, student_id, assigned_to on incidents;
--         case_id, file_path, uploaded_by on evidence.
-- -------------------------------------------------------------------------------------
SELECT 
    '2. CORE SENSITIVE COLUMNS' AS audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'student_profiles' AND column_name IN ('id', 'verification_status', 'verified_at', 'verified_by', 'verification_notes', 'ocr_extracted_data', 'id_card_url', 'course', 'admission_type', 'admission_year', 'expected_graduation_year'))
    OR (table_name = 'incidents' AND column_name IN ('id', 'case_id', 'student_id', 'assigned_to', 'status', 'is_anonymous'))
    OR (table_name = 'evidence' AND column_name IN ('id', 'case_id', 'file_path', 'uploaded_by', 'file_name', 'mime_type'))
    OR (table_name = 'profiles' AND column_name IN ('id', 'role', 'is_approved', 'student_id', 'college_email'))
    OR (table_name = 'incident_locations' AND column_name IN ('id', 'incident_id', 'latitude', 'longitude', 'accuracy', 'created_at'))
  )
ORDER BY table_name, column_name;

-- -------------------------------------------------------------------------------------
-- SECTION 3: ROW-LEVEL SECURITY (RLS) STATUS ACROSS ALL PUBLIC TABLES
-- Purpose: Verify that rowsecurity = true on every public table.
-- Target: Zero tables with rls_enabled = false.
-- -------------------------------------------------------------------------------------
SELECT 
    '3. RLS STATUS' AS audit_section,
    c.relname AS tablename,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- -------------------------------------------------------------------------------------
-- SECTION 4: COMPLETE ACTIVE RLS POLICIES ON SENSITIVE TABLES
-- Purpose: Inspect every active policy expression (USING and WITH CHECK)
-- Target: Verify absence of broad staff policies and existence of case-bound policies.
-- -------------------------------------------------------------------------------------
SELECT 
    '4. ACTIVE RLS POLICIES' AS audit_section,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('incidents', 'student_profiles', 'evidence', 'incident_locations', 'profiles', 'audit_logs', 'escalations', 'case_actions')
ORDER BY tablename, cmd, policyname;

-- -------------------------------------------------------------------------------------
-- SECTION 5: ACTIVE TRIGGERS ON STUDENT_PROFILES AND PROFILES
-- Purpose: Inspect active user-defined triggers.
-- Target: Check if trg_prevent_student_profile_tampering and trg_prevent_self_role_escalation exist.
-- -------------------------------------------------------------------------------------
SELECT 
    '5. ACTIVE TRIGGERS' AS audit_section,
    c.relname AS tablename,
    t.tgname AS trigger_name,
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    r.rolname AS function_owner,
    t.tgenabled AS trigger_enabled,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND c.relname IN ('student_profiles', 'profiles')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- -------------------------------------------------------------------------------------
-- SECTION 6: SECURITY HELPER FUNCTIONS AUDIT
-- Purpose: Audit ownership, security definer flag, and execution settings (search_path)
-- Target: is_reviewer, is_admin, is_staff, is_security_or_admin, prevent_student_profile_tampering.
-- -------------------------------------------------------------------------------------
SELECT 
    '6. SECURITY FUNCTIONS' AS audit_section,
    p.proname AS function_name,
    r.rolname AS function_owner,
    p.prosecdef AS is_security_definer,
    proconfig AS execution_settings,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.proname IN (
    'is_reviewer',
    'is_admin',
    'is_staff',
    'is_security_or_admin',
    'prevent_student_profile_tampering',
    'prevent_self_role_escalation'
)
ORDER BY p.proname;

-- -------------------------------------------------------------------------------------
-- SECTION 7: STORAGE BUCKETS PRIVACY & STORAGE OBJECT POLICIES
-- Purpose: Verify storage bucket privacy (public = false) and RLS on storage.objects
-- Target: Check kavach-evidence and kavach-id-cards buckets and their folder-prefix policies.
-- -------------------------------------------------------------------------------------
SELECT 
    '7.1 STORAGE BUCKETS' AS audit_section,
    id,
    name,
    public AS is_public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id IN ('kavach-evidence', 'kavach-id-cards');

SELECT 
    '7.2 STORAGE POLICIES' AS audit_section,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- -------------------------------------------------------------------------------------
-- SECTION 8: ROLE TABLE GRANTS
-- Purpose: Verify table permissions granted to anon, authenticated, and service_role
-- Target: Confirm anon has no table-level write or unrestricted read permissions.
-- -------------------------------------------------------------------------------------
SELECT 
    '8. ROLE TABLE GRANTS' AS audit_section,
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('student_profiles', 'evidence', 'incidents', 'incident_locations', 'profiles', 'audit_logs')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- -------------------------------------------------------------------------------------
-- SECTION 9: UNRESTRICTED PUBLIC / ANONYMOUS POLICIES DETECTOR
-- Purpose: Detect any policy exposed to 'anon' or 'public' role on sensitive public tables
-- Risk: Any row returned here on sensitive tables represents potential data leakage.
-- -------------------------------------------------------------------------------------
SELECT 
    '9. PUBLIC/ANON POLICIES' AS audit_section,
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('student_profiles', 'incidents', 'evidence', 'incident_locations', 'profiles', 'audit_logs')
  AND ('anon' = ANY(roles) OR 'public' = ANY(roles));
