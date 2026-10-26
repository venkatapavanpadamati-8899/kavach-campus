-- =====================================================================================
-- KAVACH CAMPUS — STEP 115: SAFE SQL ROLLBACK CANDIDATE
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll, Region: ap-northeast-1)
-- Date: 2026-10-17
--
-- IMPORTANT SAFETY RULE:
-- This rollback script reverts Step 115 changes WITHOUT restoring the vulnerable
-- broad "Staff view evidence" or "Staff read student profiles" policies.
-- It restores the verified baseline state from Step 114.
--
-- TARGET MUTATIONS TO ROLL BACK:
-- 1. Drops trigger trg_prevent_student_profile_tampering from public.student_profiles.
-- 2. Drops function public.prevent_student_profile_tampering().
-- 3. Reverts evidence INSERT policy to "Users upload evidence" (auth.uid() = uploaded_by).
-- 4. Reverts student_profiles UPDATE policy to "Students update own profile" (USING auth.uid() = id).
--
-- DO NOT EXECUTE AUTOMATICALLY. Use only in case of emergency rollback.
-- =====================================================================================

BEGIN;

-- 1. Rollback trigger on student_profiles
DROP TRIGGER IF EXISTS trg_prevent_student_profile_tampering ON public.student_profiles;
DROP FUNCTION IF EXISTS public.prevent_student_profile_tampering();

-- 2. Revert student_profiles UPDATE policy to Step 114 baseline
DROP POLICY IF EXISTS "Students update own profile" ON public.student_profiles;
CREATE POLICY "Students update own profile"
ON public.student_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 3. Revert evidence INSERT policy to Step 114 baseline (does not expose cross-case read)
DROP POLICY IF EXISTS "Authorized users upload incident evidence" ON public.evidence;
CREATE POLICY "Users upload evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- 4. Audit rollback execution
INSERT INTO public.audit_logs (
  action,
  details,
  created_at
)
VALUES (
  'SECURITY_ROLLBACK_STEP115',
  jsonb_build_object(
    'description', 'Reverted Step 115 evidence INSERT and student_profiles UPDATE hardening to Step 114 baseline',
    'timestamp', NOW()
  ),
  NOW()
);

COMMIT;
