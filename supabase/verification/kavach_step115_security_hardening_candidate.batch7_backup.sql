-- =====================================================================================
-- KAVACH CAMPUS — STEP 115: SECURITY-FIRST RLS & EVIDENCE HARDENING CANDIDATE (REVISED)
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll, Region: ap-northeast-1)
-- Target Tables: public.evidence, public.student_profiles, public.incidents, storage.objects, public.audit_logs
-- Version: 1.15.1 (Revised & Hardened in Batch 5 / Step 121)
--
-- OBJECTIVES ADDRESSED:
-- 1. TASK B — Harden evidence INSERT:
--    - Replace overly permissive "Users upload evidence" (which only checked uploaded_by = auth.uid())
--    - Enforce case-level authorization: caller must be the incident student owner, assigned responder,
--      or an approved reviewer (is_reviewer(): ADMIN, SUPER_ADMIN, SECURITY).
--    - Rejects arbitrary / nonexistent case_id values.
--    - Prevents unassigned staff from attaching evidence to arbitrary cases.
--    - Dual-format safe matching: (i.case_id = evidence.case_id OR i.id::text = evidence.case_id).
--
-- 2. TASK C — Verify all PERMISSIVE policies & eliminate bypasses:
--    - Ensure no permissive policy combines with OR to defeat isolation on incidents,
--      student_profiles, evidence, or storage.objects.
--    - Ensure legacy broad staff policies are cleanly eliminated:
--      "Staff view incidents", "Staff can view assigned or unassigned incidents",
--      "Staff read student profiles", "Staff view evidence", "Users view own evidence".
--
-- 3. TASK D — Harden student_profiles UPDATE protection:
--    - Enforce WITH CHECK (auth.uid() = id) on public.student_profiles.
--    - Create BEFORE UPDATE trigger trg_prevent_student_profile_tampering.
--    - Protects verification_status, verified_by, verified_at, verification_notes, ocr_extracted_data, id.
--    - Enforces ID card re-upload business rule: if student is VERIFIED and changes id_card_url,
--      resets status to PENDING_MANUAL_REVIEW for institutional re-verification.
--
-- 4. TASK F & G — Storage Object Security & Audit Log Schema Parity:
--    - Enforces path prefix isolation on kavach-evidence and kavach-id-cards buckets.
--    - Complies strictly with public.audit_logs schema: uses action, entity_type, metadata.
--
-- SAFETY RULES:
-- - DO NOT EXECUTE AUTOMATICALLY.
-- - Review this script in detail before manual execution in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. PRECONDITION CHECKS (Defensive validation before any mutation)
-- =====================================================================================
DO $$
BEGIN
  -- 1.1 Verify is_reviewer exists, is SECURITY DEFINER, owned by postgres or supabase_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'is_reviewer' 
      AND p.prosecdef = true
      AND r.rolname IN ('postgres', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_reviewer() must exist, be SECURITY DEFINER, and owned by postgres or supabase_admin.';
  END IF;

  -- 1.2 Verify is_admin exists, is SECURITY DEFINER, owned by postgres or supabase_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'is_admin' 
      AND p.prosecdef = true
      AND r.rolname IN ('postgres', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_admin() must exist, be SECURITY DEFINER, and owned by postgres or supabase_admin.';
  END IF;

  -- 1.3 Verify public.evidence table columns match schema reality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'evidence' AND column_name = 'case_id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.evidence.case_id does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'evidence' AND column_name = 'file_path'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.evidence.file_path does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'evidence' AND column_name = 'uploaded_by'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.evidence.uploaded_by does not exist.';
  END IF;

  -- 1.4 Verify public.incidents table columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incidents.id does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'case_id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incidents.case_id does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'student_id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incidents.student_id does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'assigned_to'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incidents.assigned_to does not exist.';
  END IF;

  -- 1.5 Verify public.student_profiles table columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.id does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'verification_status'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.verification_status does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'verified_at'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.verified_at does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'verified_by'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.verified_by does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'verification_notes'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.verification_notes does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'ocr_extracted_data'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.ocr_extracted_data does not exist.';
  END IF;

  -- 1.6 Verify public.audit_logs required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'action'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.audit_logs.action does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_type'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.audit_logs.entity_type does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'metadata'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.audit_logs.metadata does not exist.';
  END IF;
END $$;

-- =====================================================================================
-- 2. HARDEN EVIDENCE POLICIES (TASK B & C)
-- =====================================================================================
-- Drop all historical INSERT policies to eliminate permissive bypasses
DROP POLICY IF EXISTS "Users upload evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users insert evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can upload evidence for own incidents" ON public.evidence;
DROP POLICY IF EXISTS "Authorized users upload incident evidence" ON public.evidence;

CREATE POLICY "Authorized users upload incident evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id)
      AND (
        i.student_id = auth.uid()
        OR i.assigned_to = auth.uid()
        OR public.is_reviewer()
      )
  )
);

-- Drop all historical SELECT policies to eliminate broad staff access
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff can view all evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Authorized users view incident evidence" ON public.evidence;
DROP POLICY IF EXISTS "Authorized users view evidence" ON public.evidence;

CREATE POLICY "Authorized users view incident evidence"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id)
      AND (
        i.student_id = auth.uid()
        OR i.assigned_to = auth.uid()
        OR public.is_reviewer()
      )
  )
);

-- =====================================================================================
-- 3. HARDEN STUDENT PROFILE UPDATE PROTECTION & TRIGGER (TASK D)
-- =====================================================================================
DROP POLICY IF EXISTS "Students update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update own student profile" ON public.student_profiles;

CREATE POLICY "Students update own profile"
ON public.student_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure SELECT on student_profiles remains strictly isolated
DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students read own private profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Public student profiles are viewable by everyone" ON public.student_profiles;
DROP POLICY IF EXISTS "Reviewers and student owner read profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Authorized users read student profiles" ON public.student_profiles;

CREATE POLICY "Reviewers and student owner read profile"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_reviewer()
);

-- Create tamper-proof BEFORE UPDATE trigger function on public.student_profiles
CREATE OR REPLACE FUNCTION public.prevent_student_profile_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_session_user text;
  v_is_privileged boolean := false;
BEGIN
  -- 1. Direct superuser / DBA session check (Supabase migrations / SQL Editor)
  v_session_user := session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') THEN
    v_is_privileged := true;
  END IF;

  -- 2. Trusted backend service-role API request
  IF NOT v_is_privileged THEN
    BEGIN
      v_jwt_role := COALESCE(
        auth.role(),
        current_setting('request.jwt.claim.role', true)
      );
    EXCEPTION WHEN OTHERS THEN
      v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
      v_is_privileged := true;
    END IF;
  END IF;

  -- 3. Authenticated institutional reviewer / administrator
  IF NOT v_is_privileged THEN
    IF public.is_reviewer() OR public.is_admin() THEN
      v_is_privileged := true;
    END IF;
  END IF;

  -- 4. If privileged actor, permit mutation immediately
  IF v_is_privileged THEN
    RETURN NEW;
  END IF;

  -- 5. Non-privileged student checks:
  -- 5.1 Primary Key immutability
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Access Denied: Student profile primary key (id) cannot be modified.';
  END IF;

  -- 5.2 Server-controlled verification and audit columns immutability
  IF (
    OLD.verification_status IS DISTINCT FROM NEW.verification_status
    OR OLD.verified_at IS DISTINCT FROM NEW.verified_at
    OR OLD.verified_by IS DISTINCT FROM NEW.verified_by
    OR OLD.verification_notes IS DISTINCT FROM NEW.verification_notes
    OR OLD.ocr_extracted_data IS DISTINCT FROM NEW.ocr_extracted_data
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only institutional reviewers or automated verification service can modify student verification status or audit records.';
  END IF;

  -- 5.3 Business Rule: ID Card Re-Upload Invalidation
  -- If a student with VERIFIED status uploads a new id_card_url, reset status to PENDING_MANUAL_REVIEW
  IF OLD.verification_status = 'VERIFIED' AND (OLD.id_card_url IS DISTINCT FROM NEW.id_card_url) THEN
    NEW.verification_status := 'PENDING_MANUAL_REVIEW';
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.verification_notes := 'ID card changed by student; status reset to PENDING_MANUAL_REVIEW for institutional verification.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_student_profile_tampering ON public.student_profiles;
CREATE TRIGGER trg_prevent_student_profile_tampering
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_profile_tampering();

-- =====================================================================================
-- 4. HARDEN INCIDENTS POLICIES (TASK C & E)
-- =====================================================================================
-- Purge all historical broad staff policies
DROP POLICY IF EXISTS "Staff view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff can view assigned or unassigned incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff and admin view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authorized users view incidents" ON public.incidents;

CREATE POLICY "Authorized users view incidents"
ON public.incidents
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR assigned_to = auth.uid()
  OR public.is_reviewer()
);

-- =====================================================================================
-- 5. HARDEN STORAGE OBJECTS POLICIES (TASK C & F)
-- =====================================================================================
-- 5.1 kavach-evidence policies
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins read authorized evidence" ON storage.objects;

CREATE POLICY "Authenticated users upload own evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kavach-evidence'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
  )
);

CREATE POLICY "Users and admins read authorized evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kavach-evidence'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
    OR public.is_admin()
  )
);

-- 5.2 kavach-id-cards policies
DROP POLICY IF EXISTS "Authenticated users upload id cards" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read id cards" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload id card" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view id cards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own id card" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized id card" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own ID card" ON storage.objects;
DROP POLICY IF EXISTS "Students read own ID card" ON storage.objects;
DROP POLICY IF EXISTS "Users and reviewers read authorized id card" ON storage.objects;

CREATE POLICY "Authenticated users upload own id card"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kavach-id-cards'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
  )
);

CREATE POLICY "Users and reviewers read authorized id card"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kavach-id-cards'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
    OR public.is_reviewer()
  )
);

-- =====================================================================================
-- 6. AUDIT LOG ENTRY (TASK G — STRICT SCHEMA PARITY)
-- =====================================================================================
INSERT INTO public.audit_logs (
  action,
  entity_type,
  metadata,
  created_at
)
VALUES (
  'SECURITY_REMEDIATION_STEP115',
  'system',
  jsonb_build_object(
    'description', 'Hardened evidence INSERT, secured student_profiles UPDATE trigger, locked storage objects, and purged broad staff policies',
    'version', '1.15.1',
    'timestamp', NOW()
  ),
  NOW()
);

COMMIT;
