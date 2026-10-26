-- =====================================================================================
-- KAVACH CAMPUS — STEP 113: TARGETED PRODUCTION RLS REMEDIATION
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll, Region: ap-northeast-1)
-- Date: 2026-10-17
-- Target Tables: public.student_profiles, public.evidence
-- Target Scope: Surgically replace ONLY the two confirmed overly broad `is_staff()`
--               SELECT policies with case-isolated, role-restricted policies.
--
-- NOTICE: DO NOT EXECUTE AUTOMATICALLY. This script is strictly for manual owner
--         review and execution in the Supabase Dashboard SQL Editor:
--         https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- =====================================================================================
-- 1. VERIFIED SCHEMA REALITY & COLUMN INVARIANTS
-- =====================================================================================
-- From direct live database inspection:
-- - public.student_profiles:
--     id: UUID (matches public.profiles.id)
--     admission_type: TEXT, admission_year: INTEGER, id_card_url: TEXT
--     medical_conditions: TEXT, hostel_room: TEXT, emergency_contact_phone: TEXT
-- - public.incidents:
--     id: UUID (Primary Key)
--     case_id: TEXT (Human-readable tracking ID, e.g. 'KC-2026-XXXXX')
--     student_id: UUID (Foreign key to public.profiles.id)
--     assigned_to: UUID (Foreign key to public.profiles.id, nullable)
-- - public.evidence:
--     id: TEXT (Primary Key)
--     case_id: TEXT (Can hold incidents.id::text OR incidents.case_id)
--     file_path: TEXT, file_name: TEXT, file_size: INTEGER, mime_type: TEXT
--     uploaded_by: UUID (Foreign key to public.profiles.id)
--
-- PRESERVED EXISTING POLICIES (WILL NOT BE DROPPED OR MODIFIED):
-- - student_profiles: "Students read own private profile" (SELECT, auth.uid() = id)
-- - student_profiles: "Students update own profile" (UPDATE, auth.uid() = id)
-- - evidence: "Users view own evidence" (SELECT, auth.uid() = uploaded_by)
-- - evidence: "Users upload evidence" (INSERT, auth.uid() = uploaded_by)
--
-- DROPPED OVERLY BROAD POLICIES:
-- - student_profiles: "Staff read student profiles" (USING (is_staff()))
-- - evidence: "Staff view evidence" (USING (is_staff()))
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- PRECONDITION CHECK: Verify Helper Functions Exist and are SECURITY DEFINER
-- =====================================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_reviewer' AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_reviewer() function not found or not SECURITY DEFINER.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin' AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'Precondition Failed: is_admin() function not found or not SECURITY DEFINER.';
  END IF;
END $$;

-- =====================================================================================
-- REMEDIATION 1: student_profiles Case & Reviewer Isolation
-- =====================================================================================
-- Problem: The legacy policy "Staff read student profiles" allows ANY staff member
--          (including general teachers or unassigned personnel) to read sensitive
--          medical conditions, hostel room numbers, and government ID card URLs.
-- Fix:     Drop the broad policy and grant SELECT access only to:
--          1. The student owner (auth.uid() = id)
--          2. Approved institutional reviewers (public.is_reviewer() -> ADMIN, SUPER_ADMIN, SECURITY)
--          3. Responders who are actively assigned to that student's incident
-- =====================================================================================

DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;

CREATE POLICY "Authorized users read student profiles"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_reviewer()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.student_id = public.student_profiles.id
      AND i.assigned_to = auth.uid()
  )
);

-- =====================================================================================
-- REMEDIATION 2: evidence Case Isolation
-- =====================================================================================
-- Problem: The legacy policy "Staff view evidence" allows ANY staff member to browse
--          all evidence metadata rows for incidents they have no relation to.
-- Fix:     Drop the broad policy and grant SELECT access only to:
--          1. The uploader (uploaded_by = auth.uid())
--          2. Institutional administrators (public.is_admin())
--          3. The incident's student owner or actively assigned responder
--             (matching evidence.case_id against incidents.id::text OR incidents.case_id)
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
      AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid())
  )
);

COMMIT;

-- =====================================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =====================================================================================
-- Run this query after committing to verify that ONLY the intended policies exist:

SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('student_profiles', 'evidence') 
ORDER BY tablename, policyname;

-- EXPECTED RESULT ON student_profiles:
-- 1. "Authorized users read student profiles" (SELECT, authenticated, case-isolated/reviewer)
-- 2. "Students read own private profile" (SELECT, public, auth.uid() = id)
-- 3. "Students update own profile" (UPDATE, public, auth.uid() = id)

-- EXPECTED RESULT ON evidence:
-- 1. "Authorized users view incident evidence" (SELECT, authenticated, case-isolated/admin)
-- 2. "Users upload evidence" (INSERT, public, auth.uid() = uploaded_by)
-- 3. "Users view own evidence" (SELECT, public, auth.uid() = uploaded_by)

-- =====================================================================================
-- AUTHORIZATION TEST MATRIX FOR VALIDATION
-- =====================================================================================
-- | Test Case                      | student_profiles (SELECT)   | evidence (SELECT)           |
-- | :----------------------------- | :-------------------------- | :-------------------------- |
-- | 1. Student viewing own data    | ALLOW (auth.uid() = id)     | ALLOW (uploaded_by / owner) |
-- | 2. Student viewing other data  | DENY (403 / empty)          | DENY (403 / empty)          |
-- | 3. Assigned responder          | ALLOW (incident assigned)   | ALLOW (incident assigned)   |
-- | 4. Unassigned staff            | DENY (403 / empty)          | DENY (403 / empty)          |
-- | 5. Reviewer / Security Officer | ALLOW (is_reviewer()=true)  | DENY (unless assigned/admin)|
-- | 6. Institutional Admin         | ALLOW (is_reviewer()=true)  | ALLOW (is_admin()=true)     |
-- | 7. Anonymous unauthenticated   | DENY (empty)                | DENY (empty)                |
-- =====================================================================================
