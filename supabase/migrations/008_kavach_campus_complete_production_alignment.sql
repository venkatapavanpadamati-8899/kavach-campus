-- =====================================================================================
-- KAVACH CAMPUS: MIGRATION 008 — COMPLETE PRODUCTION ALIGNMENT & SECURITY HARMONIZATION
-- =====================================================================================
-- Run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- This script is 100% NON-DESTRUCTIVE and IDEMPOTENT.
-- It resolves all pending schema items detected during live remote database probing:
-- 1. safe_walks column alignment (expires_at, auto_sos_enabled, location tracking)
-- 2. SECURITY DEFINER helper functions (prevents 42P17 infinite recursion loops)
-- 3. student_profiles ID card & 4-year/3-year batch verification columns
-- 4. Storage buckets provisioning ('kavach-evidence' and 'kavach-id-cards')
-- 5. Storage RLS policies for private, authenticated document access
-- 6. Super Admin account provisioning for venkatapavanpadamati1@gmail.com
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: EXTENSIONS & ENUMS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('STUDENT', 'STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- SECTION 2: SECURITY DEFINER HELPER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_security_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('SECURITY', 'ADMIN', 'SUPER_ADMIN')
  );
$$;

-- -----------------------------------------------------------------------------
-- SECTION 3: SAFE_WALKS COLUMN ALIGNMENT
-- -----------------------------------------------------------------------------
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS auto_sos_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS auto_sos_timeout_mins INT DEFAULT 5;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS start_latitude DOUBLE PRECISION;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS start_longitude DOUBLE PRECISION;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS escalation_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL;
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.safe_walks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Status constraint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'safe_walks_status_check'
    ) THEN
        ALTER TABLE public.safe_walks ADD CONSTRAINT safe_walks_status_check 
        CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE', 'ESCALATED'));
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- SECTION 4: STUDENT_PROFILES ID CARD & BATCH VERIFICATION ALIGNMENT
-- -----------------------------------------------------------------------------
ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS admission_type TEXT DEFAULT 'REGULAR',
    ADD COLUMN IF NOT EXISTS admission_year INT,
    ADD COLUMN IF NOT EXISTS expected_graduation_year INT,
    ADD COLUMN IF NOT EXISTS id_card_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING_UPLOAD',
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_admission_type') THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT check_admission_type
        CHECK (admission_type IN ('REGULAR', 'LATERAL_ENTRY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_verification_status') THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT check_verification_status
        CHECK (verification_status IN ('PENDING_UPLOAD', 'PENDING_VERIFICATION', 'PENDING_MANUAL_REVIEW', 'VERIFIED', 'REJECTED'));
    END IF;
END $$;

-- Enforce unique student_id across student profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
ON public.profiles(student_id)
WHERE student_id IS NOT NULL AND role = 'STUDENT';

CREATE INDEX IF NOT EXISTS idx_student_profiles_verification_status
ON public.student_profiles(verification_status);

-- -----------------------------------------------------------------------------
-- SECTION 5: ESCALATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and admin view escalations" ON public.escalations;
CREATE POLICY "Staff and admin view escalations" ON public.escalations
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff and admin manage escalations" ON public.escalations;
CREATE POLICY "Staff and admin manage escalations" ON public.escalations
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- SECTION 6: STORAGE BUCKETS & RLS POLICIES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('kavach-evidence', 'kavach-evidence', false),
    ('kavach-id-cards', 'kavach-id-cards', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Evidence Storage Policies
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload evidence" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kavach-evidence');

DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
CREATE POLICY "Users and staff read evidence" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'kavach-evidence'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.is_staff()
    )
);

-- ID Card Storage Policies
DROP POLICY IF EXISTS "Students upload own ID card" ON storage.objects;
CREATE POLICY "Students upload own ID card" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'kavach-id-cards'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Students read own ID card" ON storage.objects;
CREATE POLICY "Students read own ID card" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'kavach-id-cards'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.is_staff()
    )
);

-- -----------------------------------------------------------------------------
-- SECTION 7: PREVENT SELF ROLE ESCALATION TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Access Denied: Only administrators can modify roles or approval status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_escalation();

-- -----------------------------------------------------------------------------
-- SECTION 8: SUPER ADMIN PROVISIONING
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    target_email TEXT := 'venkatapavanpadamati1@gmail.com';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id,
            full_name,
            college_email,
            role,
            is_approved,
            department,
            student_id,
            created_at,
            updated_at
        )
        VALUES (
            target_user_id,
            'Super Administrator',
            target_email,
            'SUPER_ADMIN',
            TRUE,
            'Root Administration',
            'SUPER-ADMIN-01',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'SUPER_ADMIN',
            is_approved = TRUE,
            updated_at = NOW();

        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{role}',
            '"SUPER_ADMIN"'
        )
        WHERE id = target_user_id;

        RAISE NOTICE 'Super Admin successfully provisioned for % (UUID: %)', target_email, target_user_id;
    ELSE
        RAISE NOTICE 'Target user % not yet registered in auth.users. Profile will be provisioned upon registration.', target_email;
    END IF;
END $$;

-- =====================================================================================
-- END OF MIGRATION 008
-- =====================================================================================
