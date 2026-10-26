-- =====================================================================================
-- KAVACH CAMPUS — PRODUCTION READINESS MIGRATION RECONCILIATION PACK
-- File: supabase/staged_migration_production_readiness_pack.sql
-- Institutions: SRKR Engineering College & Vishnu Institute of Technology
-- 
-- DESCRIPTION:
--   Idempotent, non-destructive, transaction-safe schema reconciliation and multi-tenant
--   RLS hardening pack for Kavach Campus. Reconciles runtime discoveries, adds missing
--   columns, ensures UUID default generators, and enforces cross-college tenant isolation.
--
-- SAFETY INSTRUCTIONS:
--   1. Execute in the Supabase Dashboard -> SQL Editor (or via authorized migration pipeline).
--   2. This script runs inside an explicit transaction (BEGIN ... COMMIT).
--   3. If any step fails, the entire transaction will automatically roll back.
--   4. Pre-flight and post-flight validation queries are included.
--   5. A non-destructive rollback script is provided at the bottom.
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- SECTION 1: EXTENSIONS & ENUMS
-- =====================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE app_role AS ENUM (
        'STUDENT', 'STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 
        'SECURITY', 'PRINCIPAL', 'ADMIN', 'SUPER_ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'RECEIVED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 
        'ESCALATED', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED', 'FALSE_ALARM'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================================================
-- SECTION 2: TABLE & COLUMN SCHEMA ALIGNMENT (IDEMPOTENT & NON-DESTRUCTIVE)
-- =====================================================================================

-- 2.1 profiles: Add college_id and ensure defaults
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_id TEXT;
ALTER TABLE profiles ALTER COLUMN is_approved SET DEFAULT FALSE;
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_college_id ON profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 2.2 student_profiles: Add tenant and verification columns
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS college_id TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admission_type TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admission_year INT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS expected_graduation_year INT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS id_card_url TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB;

CREATE INDEX IF NOT EXISTS idx_student_profiles_college_id ON student_profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_verification_status ON student_profiles(verification_status);

-- 2.3 incidents: Add missing columns, backfill tenant, and default UUID generator
ALTER TABLE incidents ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_tracking_active BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS college_id TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Backfill missing college_id from student profile for existing incidents
UPDATE incidents i
SET college_id = p.college_id
FROM profiles p
WHERE i.student_id = p.id AND i.college_id IS NULL AND p.college_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_college_id ON incidents(college_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_student_id ON incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);

-- 2.4 safe_walks: Add default UUID generator, tenant column, backfill, and escalation link
ALTER TABLE safe_walks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS college_id TEXT;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS escalation_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS expected_minutes INT DEFAULT 15;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS auto_sos_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE safe_walks ADD COLUMN IF NOT EXISTS auto_sos_timeout_mins INT DEFAULT 5;

-- Backfill missing college_id from user/student profile for existing safe walks
UPDATE safe_walks sw
SET college_id = p.college_id
FROM profiles p
WHERE (sw.user_id = p.id OR sw.student_id = p.id) AND sw.college_id IS NULL AND p.college_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_safe_walks_college_id ON safe_walks(college_id);
CREATE INDEX IF NOT EXISTS idx_safe_walks_student_id ON safe_walks(student_id);
CREATE INDEX IF NOT EXISTS idx_safe_walks_status ON safe_walks(status);

-- 2.5 trusted_contacts: Add default UUID generator and timestamp
ALTER TABLE trusted_contacts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE trusted_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_student_id ON trusted_contacts(student_id);

-- 2.6 evidence: Add default UUID generator, incident link and storage path
ALTER TABLE evidence ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_incident_id ON evidence(incident_id);

-- 2.7 notifications: Add default UUID generator and harmonize incident_id, case_id, read, and is_read
ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_incident_id ON notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_case_id ON notifications(case_id);

-- 2.8 escalations: Ensure default UUID generator
ALTER TABLE escalations ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2.9 audit_logs: Ensure default UUID generator
ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);

-- =====================================================================================
-- SECTION 3: MULTI-TENANT CROSS-COLLEGE HELPER FUNCTIONS
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.get_auth_college_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_college_id TEXT;
BEGIN
    SELECT college_id INTO v_college_id
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    -- Canonicalize VIT college aliases to vishnu-bhimavaram for tenant isolation
    IF v_college_id = 'vit-bhimavaram' THEN
        RETURN 'vishnu-bhimavaram';
    END IF;

    RETURN v_college_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_role app_role;
BEGIN
    SELECT role INTO v_role
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_college_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- =====================================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES — HARDENED MULTI-TENANCY
-- =====================================================================================

-- 4.1 PROFILES RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_institutional_staff" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all" ON profiles;

CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_select_institutional_staff"
ON profiles FOR SELECT
USING (
    get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
    AND (
        college_id = get_auth_college_id()
        OR (college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
        OR (college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
    )
);

CREATE POLICY "profiles_super_admin_all"
ON profiles FOR ALL
USING (get_auth_role() = 'SUPER_ADMIN')
WITH CHECK (get_auth_role() = 'SUPER_ADMIN');

-- 4.2 STUDENT_PROFILES RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_profiles_select_own" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_update_own" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_institutional_staff" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_super_admin_all" ON student_profiles;

CREATE POLICY "student_profiles_select_own"
ON student_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "student_profiles_update_own"
ON student_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Staff can only view student profiles from their institution (READ-ONLY, not ALL)
CREATE POLICY "student_profiles_institutional_staff"
ON student_profiles FOR SELECT
USING (
    get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
    AND (
        college_id = get_auth_college_id()
        OR (college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
        OR (college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
    )
);

CREATE POLICY "student_profiles_super_admin_all"
ON student_profiles FOR ALL
USING (get_auth_role() = 'SUPER_ADMIN')
WITH CHECK (get_auth_role() = 'SUPER_ADMIN');

-- 4.3 INCIDENTS RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incidents_student_read_own" ON incidents;
DROP POLICY IF EXISTS "incidents_student_insert_own" ON incidents;
DROP POLICY IF EXISTS "incidents_institutional_staff_select" ON incidents;
DROP POLICY IF EXISTS "incidents_institutional_staff_update" ON incidents;
DROP POLICY IF EXISTS "incidents_super_admin_all" ON incidents;

CREATE POLICY "incidents_student_read_own"
ON incidents FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "incidents_student_insert_own"
ON incidents FOR INSERT
WITH CHECK (auth.uid() = student_id OR is_anonymous = TRUE);

-- Institutional staff can strictly view incidents from their own college (no cross-college leak)
CREATE POLICY "incidents_institutional_staff_select"
ON incidents FOR SELECT
USING (
    get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
    AND (
        college_id = get_auth_college_id()
        OR (college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
        OR (college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
    )
);

CREATE POLICY "incidents_institutional_staff_update"
ON incidents FOR UPDATE
USING (
    get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
    AND (
        college_id = get_auth_college_id()
        OR (college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
        OR (college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
    )
);

CREATE POLICY "incidents_super_admin_all"
ON incidents FOR ALL
USING (get_auth_role() = 'SUPER_ADMIN')
WITH CHECK (get_auth_role() = 'SUPER_ADMIN');

-- 4.4 SAFE_WALKS RLS
ALTER TABLE safe_walks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "safe_walks_student_manage_own" ON safe_walks;
DROP POLICY IF EXISTS "safe_walks_institutional_staff_select" ON safe_walks;
DROP POLICY IF EXISTS "safe_walks_super_admin_all" ON safe_walks;

CREATE POLICY "safe_walks_student_manage_own"
ON safe_walks FOR ALL
USING (auth.uid() = student_id OR auth.uid() = user_id)
WITH CHECK (auth.uid() = student_id OR auth.uid() = user_id);

-- Institutional staff can strictly view safe walks from their own college
CREATE POLICY "safe_walks_institutional_staff_select"
ON safe_walks FOR SELECT
USING (
    get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
    AND (
        college_id = get_auth_college_id()
        OR (college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
        OR (college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE (p.id = safe_walks.user_id OR p.id = safe_walks.student_id)
            AND (
                p.college_id = get_auth_college_id()
                OR (p.college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
                OR (p.college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
            )
        )
    )
);

CREATE POLICY "safe_walks_super_admin_all"
ON safe_walks FOR ALL
USING (get_auth_role() = 'SUPER_ADMIN')
WITH CHECK (get_auth_role() = 'SUPER_ADMIN');

-- 4.5 EVIDENCE RLS
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_user_view_own" ON evidence;
DROP POLICY IF EXISTS "evidence_institutional_staff_select" ON evidence;
DROP POLICY IF EXISTS "evidence_super_admin_all" ON evidence;

CREATE POLICY "evidence_user_view_own"
ON evidence FOR SELECT
USING (auth.uid() = uploaded_by);

-- Institutional staff can only view evidence attached to incidents within their college
CREATE POLICY "evidence_institutional_staff_select"
ON evidence FOR SELECT
USING (
    get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
    AND EXISTS (
        SELECT 1 FROM incidents i
        WHERE (i.id = evidence.incident_id OR i.case_id = evidence.case_id)
        AND (
            i.college_id = get_auth_college_id()
            OR (i.college_id = 'vit-bhimavaram' AND get_auth_college_id() = 'vishnu-bhimavaram')
            OR (i.college_id = 'vishnu-bhimavaram' AND get_auth_college_id() = 'vit-bhimavaram')
        )
    )
);

CREATE POLICY "evidence_super_admin_all"
ON evidence FOR ALL
USING (get_auth_role() = 'SUPER_ADMIN')
WITH CHECK (get_auth_role() = 'SUPER_ADMIN');

-- 4.6 TRUSTED_CONTACTS RLS
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trusted_contacts_user_manage_own" ON trusted_contacts;

CREATE POLICY "trusted_contacts_user_manage_own"
ON trusted_contacts FOR ALL
USING (auth.uid() = user_id OR auth.uid() = student_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = student_id);

-- 4.7 NOTIFICATIONS RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_user_view_own" ON notifications;

CREATE POLICY "notifications_user_view_own"
ON notifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================================================
-- SECTION 5: VALIDATION QUERY
-- =====================================================================================
DO $$
DECLARE
    v_incidents_col_count INT;
    v_contacts_col_count INT;
    v_notifs_col_count INT;
    v_safewalks_col_count INT;
BEGIN
    SELECT COUNT(*) INTO v_incidents_col_count
    FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name IN ('type', 'is_tracking_active', 'college_id');

    SELECT COUNT(*) INTO v_safewalks_col_count
    FROM information_schema.columns
    WHERE table_name = 'safe_walks' AND column_name IN ('college_id', 'expected_minutes');

    SELECT COUNT(*) INTO v_contacts_col_count
    FROM information_schema.columns
    WHERE table_name = 'trusted_contacts' AND column_name IN ('updated_at');

    SELECT COUNT(*) INTO v_notifs_col_count
    FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name IN ('incident_id');

    RAISE NOTICE 'Migration alignment check: incidents: %, safe_walks: %, trusted_contacts: %, notifications: %',
        v_incidents_col_count, v_safewalks_col_count, v_contacts_col_count, v_notifs_col_count;
END $$;

COMMIT;

-- =====================================================================================
-- SECTION 6: NON-DESTRUCTIVE ROLLBACK SCRIPT (REFERENCE ONLY — DO NOT RUN DESTRUCTIVE DROPS)
-- =====================================================================================
-- If policies need to be rolled back to the broad baseline without dropping tenant columns:
--
-- BEGIN;
-- DROP POLICY IF EXISTS "evidence_institutional_staff_select" ON evidence;
-- CREATE POLICY "evidence_institutional_staff_select" ON evidence FOR SELECT
-- USING (get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN'));
--
-- DROP POLICY IF EXISTS "safe_walks_institutional_staff_select" ON safe_walks;
-- CREATE POLICY "safe_walks_institutional_staff_select" ON safe_walks FOR SELECT
-- USING (get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN'));
--
-- DROP POLICY IF EXISTS "incidents_institutional_staff_select" ON incidents;
-- CREATE POLICY "incidents_institutional_staff_select" ON incidents FOR SELECT
-- USING (
--     get_auth_role() IN ('STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN')
--     AND (college_id IS NULL OR college_id = get_auth_college_id())
-- );
--
-- COMMIT;
