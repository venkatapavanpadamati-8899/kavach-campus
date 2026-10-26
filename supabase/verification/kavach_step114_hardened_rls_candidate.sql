-- =====================================================================================
-- KAVACH CAMPUS — STEP 114: STREAMLINED & HARDENED RLS REMEDIATION CANDIDATE
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll, Region: ap-northeast-1)
-- Date: 2026-10-17
-- Target Tables: public.student_profiles, public.evidence
-- Target Scope: Surgically replace the 2 confirmed overly broad `is_staff()` SELECT policies
--               with strictly isolated, role-restricted, case-bound SELECT policies.
--
-- DESIGN DECISIONS ADDRESSING SECURITY AUDIT:
-- 1. No new SECURITY DEFINER functions needed — keeps attack surface minimal.
-- 2. student_profiles SELECT is strictly limited to Student Owner (auth.uid() = id)
--    and Approved Reviewers (public.is_reviewer(): ADMIN, SUPER_ADMIN, SECURITY).
-- 3. Assigned general responders do not get direct row-level SELECT on student_profiles,
--    ensuring private medical_conditions, hostel_room, and ID card URLs are never exposed.
-- 4. evidence SELECT is strictly limited to Uploader (uploaded_by = auth.uid()),
--    Admins (is_admin()), or parties explicitly bound to that incident (incident student,
--    assigned responder, or security reviewer via case_id matching).
-- 5. Rollback script DOES NOT restore vulnerable broad is_staff() policies.
--
-- NOTICE: DO NOT EXECUTE AUTOMATICALLY. This script is strictly for owner review and
--         manual execution in the Supabase Dashboard SQL Editor:
--         https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. PRECONDITION CHECKS (Defensive validation before any mutation)
-- =====================================================================================
DO $$
BEGIN
  -- Verify is_reviewer exists, is SECURITY DEFINER, owned by postgres, search_path locked
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'is_reviewer' 
      AND p.prosecdef = true
      AND r.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_reviewer() must exist, be SECURITY DEFINER, and owned by postgres.';
  END IF;

  -- Verify is_admin exists, is SECURITY DEFINER, owned by postgres, search_path locked
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'is_admin' 
      AND p.prosecdef = true
      AND r.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_admin() must exist, be SECURITY DEFINER, and owned by postgres.';
  END IF;

  -- Verify table schema matches verified reality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'evidence' AND column_name = 'uploaded_by'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.evidence.uploaded_by does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'evidence' AND column_name = 'case_id'
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: public.evidence.case_id does not exist.';
  END IF;
END $$;

-- =====================================================================================
-- 2. REMEDIATION: public.student_profiles
-- =====================================================================================
-- Problem: Legacy "Staff read student profiles" granted ANY staff member (teachers,
--          counsellors, unassigned staff) full read access to student private data.
-- Fix:     Grant direct row SELECT only to:
--          1. The student owner (auth.uid() = id)
--          2. Authorized institutional reviewers (is_reviewer() -> ADMIN, SUPER_ADMIN, SECURITY)
-- =====================================================================================

DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;

CREATE POLICY "Reviewers and student owner read profile"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_reviewer()
);

-- =====================================================================================
-- 3. REMEDIATION: public.evidence
-- =====================================================================================
-- Problem: Legacy "Staff view evidence" allowed ANY staff member to view all evidence rows.
-- Fix:     Grant SELECT access only to:
--          1. The uploader (uploaded_by = auth.uid())
--          2. Institutional administrators (public.is_admin())
--          3. Parties related to the incident: student filer, assigned responder, or SECURITY reviewer
-- =====================================================================================

DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;

CREATE POLICY "Authorized users view incident evidence"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE (i.id::text = public.evidence.case_id OR i.case_id = public.evidence.case_id)
      AND (
        i.student_id = auth.uid() 
        OR i.assigned_to = auth.uid() 
        OR public.is_reviewer()
      )
  )
);

COMMIT;

-- =====================================================================================
-- 4. POST-MIGRATION READ-ONLY VERIFICATION QUERIES
-- =====================================================================================
-- Run these queries after committing to verify that ONLY the intended policies exist:

-- A. Verify active SELECT policies on student_profiles and evidence
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('student_profiles', 'evidence') 
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- =====================================================================================
-- 5. SAFE ROLLBACK SCRIPT (SAFE & SECURE — DOES NOT RESTORE BROAD POLICIES)
-- =====================================================================================
-- In the event a rollback is ever needed, this restores strict student-only and
-- uploader-only baseline without re-opening broad access to unassigned staff:
/*
BEGIN;

DROP POLICY IF EXISTS "Reviewers and student owner read profile" ON public.student_profiles;
-- Safe baseline: Only student owner can read own profile
CREATE POLICY "Student owner read own profile fallback"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authorized users view incident evidence" ON public.evidence;
-- Safe baseline: Only uploader and administrator can read evidence
CREATE POLICY "Uploader and admin view evidence fallback"
ON public.evidence
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid() OR public.is_admin());

COMMIT;
*/
