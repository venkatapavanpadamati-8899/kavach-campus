-- =====================================================================================
-- KAVACH CAMPUS — STEP 115: SECURITY-FIRST RLS & EVIDENCE HARDENING CANDIDATE (BATCH 8)
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll, Region: ap-northeast-1)
-- Target Tables: public.evidence, public.student_profiles, public.incidents,
--                public.incident_locations, storage.objects, public.audit_logs
-- Version: 1.15.2 (Hardened & Reconciled in Batch 8)
--
-- OBJECTIVES ADDRESSED:
-- 1. TASK 1 — Dual-Path Storage Path Authorization:
--    - Reconcile storage path model with both user-scoped (<auth.uid()>/...) and
--      case-scoped (<case_id>/...) upload patterns.
--    - Verify caller authorization against parent incident for case-scoped uploads.
--    - Protects private bucket 'kavach-evidence' without leaking access to unassigned staff.
--
-- 2. TASK 2 — Harden incident_locations RLS:
--    - Purge legacy broad "Staff view locations" / "Staff can view all incident locations" policies.
--    - Case-bound SELECT: only incident student owner, actively assigned responder, or reviewer.
--    - Case-bound INSERT: only authorized incident participants can submit location breadcrumbs.
--    - Zero unassigned staff access to student GPS tracking data.
--
-- 3. TASK 3 & 4 — Student Profile Immutability & Reviewer Authorization:
--    - Enforce WITH CHECK (auth.uid() = id) on public.student_profiles.
--    - Tamper-proof BEFORE UPDATE trigger trg_prevent_student_profile_tampering.
--    - Strictly protect: id, verification_status, verified_at, verified_by, verification_notes,
--      ocr_extracted_data, and verified academic batch credentials (admission_type, admission_year, expected_graduation_year).
--    - ID card re-upload resets VERIFIED status to PENDING_MANUAL_REVIEW.
--    - Reviewer verification updates are mediated through authorized server-side API with service_role;
--      direct client PostgREST updates by reviewers remain blocked by (auth.uid() = id) for least privilege.
--
-- 4. TASK 5 — Audit Logs Schema Compliance:
--    - Strictly conforms to actual schema: action, entity_type, metadata, created_at.
--    - Satisfies NOT NULL constraint on entity_type ('system').
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

  -- 1.6 Verify public.incident_locations table columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incident_locations' AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incident_locations.id does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incident_locations' AND column_name = 'incident_id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incident_locations.incident_id does not exist.';
  END IF;

  -- 1.7 Verify public.audit_logs required columns
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
-- 2. HARDEN EVIDENCE POLICIES (TASK 1 & TASK B)
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
-- 3. HARDEN STUDENT PROFILE UPDATE PROTECTION & TRIGGER (TASK 3 & 4)
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
  -- 1. Direct superuser / DBA session check (Supabase migrations / SQL Editor without an active user context)
  v_session_user := session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL THEN
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

  -- 5.3 Verified Academic Credentials Immutability
  -- Verified students cannot modify their admission batch credentials
  IF OLD.verification_status = 'VERIFIED' AND (
    OLD.admission_type IS DISTINCT FROM NEW.admission_type
    OR OLD.admission_year IS DISTINCT FROM NEW.admission_year
    OR OLD.expected_graduation_year IS DISTINCT FROM NEW.expected_graduation_year
  ) THEN
    RAISE EXCEPTION 'Access Denied: Verified academic credentials (admission_type, admission_year, expected_graduation_year) cannot be modified after verification.';
  END IF;

  -- 5.4 Business Rule: ID Card Re-Upload Invalidation
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
-- 5. HARDEN INCIDENT LOCATIONS POLICIES (TASK 2 — GPS PRIVACY HARDENING)
-- =====================================================================================
-- Purge all historical broad policies on incident_locations
DROP POLICY IF EXISTS "Staff view locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff can view all incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students view own locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students can view own incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Authorized users view incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students insert own locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students can insert own incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Authorized users insert incident locations" ON public.incident_locations;

CREATE POLICY "Authorized users view incident locations"
ON public.incident_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_locations.incident_id
      AND (
        i.student_id = auth.uid()
        OR i.assigned_to = auth.uid()
        OR public.is_admin()
      )
  )
);

CREATE POLICY "Authorized users insert incident locations"
ON public.incident_locations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_locations.incident_id
      AND (
        i.student_id = auth.uid()
        OR i.assigned_to = auth.uid()
        OR public.is_admin()
      )
  )
);

-- =====================================================================================
-- 6. HARDEN STORAGE OBJECTS POLICIES (TASK 1 — DUAL-PATH AUTHORIZATION)
-- =====================================================================================
-- 6.1 kavach-evidence policies (Dual-path: user UUID folder prefix OR incident case_id prefix)
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
DROP POLICY IF EXISTS "Authorized users upload incident evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users read incident evidence files" ON storage.objects;

CREATE POLICY "Authorized users upload incident evidence files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kavach-evidence'
  AND (
    -- Pattern A: User-scoped path (<auth.uid()>/...)
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
    -- Pattern B: Case-scoped path (<case_id>/...) bound to an authorized incident
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE (i.case_id = (storage.foldername(name))[1] OR i.id::text = (storage.foldername(name))[1])
        AND (
          i.student_id = auth.uid()
          OR i.assigned_to = auth.uid()
          OR public.is_reviewer()
        )
    )
  )
);

CREATE POLICY "Authorized users read incident evidence files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kavach-evidence'
  AND (
    -- Pattern A: User-scoped path (<auth.uid()>/...)
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
    -- Pattern B: Institutional admin oversight
    OR public.is_admin()
    -- Pattern C: Case-scoped path (<case_id>/...) bound to an authorized incident
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE (i.case_id = (storage.foldername(name))[1] OR i.id::text = (storage.foldername(name))[1])
        AND (
          i.student_id = auth.uid()
          OR i.assigned_to = auth.uid()
          OR public.is_reviewer()
        )
    )
  )
);

-- 6.2 kavach-id-cards policies (Strict user folder prefix isolation)
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
-- 7. AUDIT LOG ENTRY (TASK 5 — STRICT SCHEMA PARITY)
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
    'description', 'Hardened evidence INSERT, secured student_profiles UPDATE trigger, locked storage objects, isolated incident_locations, and purged broad staff policies',
    'version', '1.15.2',
    'timestamp', NOW()
  ),
  NOW()
);

COMMIT;
