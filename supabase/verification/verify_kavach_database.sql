-- =====================================================================================
-- KAVACH CAMPUS: SAFE READ-ONLY POST-MIGRATION VERIFICATION SCRIPT
-- =====================================================================================
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- This script DOES NOT modify any data.
-- =====================================================================================

-- 1. VERIFY ALL 19 BASE TABLES IN PUBLIC SCHEMA
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. VERIFY RLS IS ENABLED ON ALL TABLES
SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 3. VERIFY ALL RLS POLICIES (Check for no circular recursion and correct roles)
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

-- 4. VERIFY SECURITY DEFINER FUNCTIONS AND TRIGGERS
SELECT 
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.provolatile AS volatility,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_staff', 'is_admin', 'is_security_or_admin', 'get_user_role', 'prevent_self_role_escalation');

-- 5. VERIFY STORAGE BUCKET & STORAGE RLS POLICIES
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE name = 'kavach-evidence';

SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 6. VERIFY ENUMS
SELECT 
    t.typname, 
    e.enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
WHERE t.typname IN ('app_role', 'incident_status', 'priority_level')
ORDER BY t.typname, e.enumsortorder;

-- 7. VERIFY MIGRATION 007 COLUMNS IN student_profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'student_profiles' 
  AND column_name IN (
    'admission_type',
    'admission_year',
    'expected_graduation_year',
    'id_card_url',
    'verification_status',
    'verified_at',
    'verified_by',
    'verification_notes',
    'ocr_extracted_data'
  )
ORDER BY column_name;

-- 8. VERIFY UNIQUE INDEX ON profiles.student_id
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'profiles' 
  AND indexname = 'idx_profiles_student_id';

-- 9. VERIFY PRIVATE STORAGE BUCKET 'kavach-id-cards'
SELECT 
    id, 
    name, 
    public 
FROM storage.buckets 
WHERE name IN ('kavach-evidence', 'kavach-id-cards');

-- 10. VERIFY ROOT SUPER_ADMIN PROVISIONING (MIGRATION 006)
SELECT 
    id, 
    full_name, 
    college_email, 
    role, 
    is_approved, 
    student_id 
FROM public.profiles 
WHERE role = 'SUPER_ADMIN';
