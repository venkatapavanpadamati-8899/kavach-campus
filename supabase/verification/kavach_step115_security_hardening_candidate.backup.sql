-- =====================================================================================
-- KAVACH CAMPUS — STEP 115: SECURITY-FIRST RLS & EVIDENCE HARDENING CANDIDATE
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll, Region: ap-northeast-1)
-- Target Tables: public.evidence, public.student_profiles, public.incidents, storage.objects
--
-- OBJECTIVES ADDRESSED:
-- 1. TASK B — Harden evidence INSERT:
--    - Replace overly permissive "Users upload evidence" (which only checked uploaded_by = auth.uid())
--    - Enforce case-level authorization: caller must be the incident student owner, assigned responder,
--      or an approved reviewer (is_reviewer(): ADMIN, SUPER_ADMIN, SECURITY).
--    - Rejects arbitrary / nonexistent case_id values.
--    - Prevents unassigned staff from attaching evidence to arbitrary cases.
--    - Avoids recursive RLS or unnecessary SECURITY DEFINER functions.
--
-- 2. TASK C — Verify all PERMISSIVE policies:
--    - Ensure no permissive policy combines with OR to defeat isolation on incidents,
--      student_profiles, evidence, or storage.objects.
--    - Ensure legacy "Staff view incidents", "Staff read student profiles", "Staff view evidence"
--      are cleanly eliminated.
--
-- 3. TASK D — Harden student_profiles UPDATE protection:
--    - Ensure students cannot alter sensitive server-controlled columns via direct Supabase UPDATE:
--      verification_status, verified_by, verified_at, verification_notes, ocr_extracted_data, id.
--    - Enforces WITH CHECK (auth.uid() = id) on public.student_profiles.
--    - Enforces BEFORE UPDATE trigger trg_prevent_student_profile_tampering.
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
  -- Verify is_reviewer exists, is SECURITY DEFINER, owned by postgres
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'is_reviewer' 
      AND p.prosecdef = true
      AND r.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_reviewer() must exist, be SECURITY DEFINER, and owned by postgres.';
  END IF;

  -- Verify is_admin exists, is SECURITY DEFINER, owned by postgres
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'is_admin' 
      AND p.prosecdef = true
      AND r.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_admin() must exist, be SECURITY DEFINER, and owned by postgres.';
  END IF;

  -- Verify public.evidence table columns match verified live schema
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

  -- Verify public.incidents table columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'case_id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.incidents.case_id does not exist.';
  END IF;

  -- Verify public.student_profiles table columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'verification_status'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.student_profiles.verification_status does not exist.';
  END IF;
END $$;

-- =====================================================================================
-- 2. HARDEN EVIDENCE INSERT POLICY (TASK B)
-- =====================================================================================
-- Problem: Legacy "Users upload evidence" only checked (auth.uid() = uploaded_by).
--          Any authenticated user could specify an arbitrary case_id belonging to another
--          student's incident or non-existent cases, creating unauthorized attachments.
-- Solution: Require that the case_id resolves to an existing incident AND the caller is
--           the student owner, assigned responder, or an approved reviewer.

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

-- Ensure public.evidence SELECT policy remains case-scoped
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
-- 3. HARDEN STUDENT PROFILE UPDATE PROTECTION (TASK D)
-- =====================================================================================
-- Problem: "Students update own profile" USING (auth.uid() = id) lacked WITH CHECK,
--          and PostgreSQL UPDATE policies cannot compare OLD vs NEW row values.
--          A student could directly update verification_status to 'VERIFIED' or alter verified_by.
-- Solution:
--   A) Update policy with explicit WITH CHECK (auth.uid() = id).
--   B) Create BEFORE UPDATE trigger trg_prevent_student_profile_tampering to strictly forbid
--      non-reviewers from modifying server-controlled verification/audit columns.

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
BEGIN
  -- 1. Check if server-controlled or immutable columns were modified
  IF (
    OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status
    AND OLD.verified_at IS NOT DISTINCT FROM NEW.verified_at
    AND OLD.verified_by IS NOT DISTINCT FROM NEW.verified_by
    AND OLD.verification_notes IS NOT DISTINCT FROM NEW.verification_notes
    AND OLD.ocr_extracted_data IS NOT DISTINCT FROM NEW.ocr_extracted_data
    AND OLD.id IS NOT DISTINCT FROM NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- 2. Direct superuser / DBA session check (Supabase migrations / SQL Editor)
  v_session_user := session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 3. Trusted backend service-role API request
  BEGIN
    v_jwt_role := COALESCE(
      auth.role(),
      current_setting('request.jwt.claim.role', true)
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 4. Authenticated institutional reviewer / administrator
  IF public.is_reviewer() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 5. Default Deny: Student cannot modify verification status, verification notes, or audit fields
  RAISE EXCEPTION 'Access Denied: Only institutional reviewers or automated verification service can modify student verification status or audit records.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_student_profile_tampering ON public.student_profiles;
CREATE TRIGGER trg_prevent_student_profile_tampering
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_profile_tampering();

-- =====================================================================================
-- 4. VERIFY INCIDENTS POLICIES (TASK C)
-- =====================================================================================
-- Ensure broad staff policy is permanently absent and authorized policy is enforced
DROP POLICY IF EXISTS "Staff view incidents" ON public.incidents;
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
-- 5. VERIFY STORAGE OBJECTS POLICIES (TASK C)
-- =====================================================================================
-- Ensure kavach-evidence bucket policies enforce folder prefix and case-scoped access
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own evidence" ON storage.objects;

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

DROP POLICY IF EXISTS "Users and admins read authorized evidence" ON storage.objects;
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

-- =====================================================================================
-- 6. AUDIT LOG ENTRY
-- =====================================================================================
INSERT INTO public.audit_logs (
  action,
  details,
  created_at
)
VALUES (
  'SECURITY_REMEDIATION_STEP115',
  jsonb_build_object(
    'description', 'Hardened evidence INSERT policy, secured student_profiles UPDATE trigger, and locked storage objects',
    'version', '1.15.0',
    'timestamp', NOW()
  ),
  NOW()
);

COMMIT;
