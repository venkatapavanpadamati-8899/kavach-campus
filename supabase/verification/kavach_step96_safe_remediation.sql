-- =====================================================================================
-- KAVACH CAMPUS — STEP 96: STANDALONE SAFE RLS & STORAGE REMEDIATION SCRIPT
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll)
-- Notice: DO NOT EXECUTE AUTOMATICALLY. This script is prepared for manual review
--         and execution in the Supabase Dashboard SQL Editor AFTER reviewing audit findings.
-- URL: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- PURPOSE:
-- Surgical remediation for potential policy vulnerabilities identified during the audit:
-- 1. Tighten public.profiles read access (disallow universal USING (true) exposure).
-- 2. Restrict storage.objects evidence uploads and reads to owning user folder path prefix.
-- 3. Restrict storage.objects ID-card uploads and reads to owning user folder path prefix.
-- 4. Enforce role tampering prevention trigger trg_prevent_self_role_escalation on profiles.
-- 5. Pin search_path = public on all SECURITY DEFINER functions.
-- =====================================================================================

-- =====================================================================================
-- PRE-CHECK: Inspect active policies before applying remediation
-- =====================================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'student_profiles')
ORDER BY tablename, policyname;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================================================
-- REMEDIATION 1: SECURITY DEFINER Helper Functions with Pinned search_path
-- =====================================================================================
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
      AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'PRINCIPAL')
      AND is_approved = true
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
      AND is_approved = true
  );
$$;

-- =====================================================================================
-- REMEDIATION 2: Profiles Read Scoping (Eliminate Universal Public Read Leakage)
-- =====================================================================================
-- Pre-condition: Drop legacy broad read policies if present
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile and staff read student profiles" ON public.profiles;

-- Secure Replacement Policy: Authenticated users read own profile; approved staff read profiles for duties
CREATE POLICY "Users read own profile and staff read student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_staff()
);

-- =====================================================================================
-- REMEDIATION 3: Storage Objects Evidence Protection (kavach-evidence)
-- =====================================================================================
-- Pre-condition: Drop legacy loose evidence upload/read policies
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;

-- Secure Replacement: Enforce auth.uid() folder prefix on evidence uploads
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

-- Secure Replacement: Read restricted to owning student or approved staff
CREATE POLICY "Users and staff read authorized evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kavach-evidence'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
    OR public.is_staff()
  )
);

-- =====================================================================================
-- REMEDIATION 4: Storage Objects ID Card Protection (kavach-id-cards)
-- =====================================================================================
DROP POLICY IF EXISTS "Authenticated users upload id cards" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read id cards" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload id card" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view id cards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own id card" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized id card" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own ID card" ON storage.objects;
DROP POLICY IF EXISTS "Students read own ID card" ON storage.objects;

-- Secure Replacement: Enforce auth.uid() folder prefix on ID card uploads
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

-- Secure Replacement: Read restricted to owning student or approved reviewers (admin/security/staff)
CREATE POLICY "Users and staff read authorized id card"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kavach-id-cards'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
    OR public.is_staff()
  )
);

-- =====================================================================================
-- REMEDIATION 5: Self-Role Escalation Prevention Trigger
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access Denied: Only institutional administrators can modify account roles or approval status.';
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

-- =====================================================================================
-- POST-CHECK: Verify updated policies and triggers
-- =====================================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename = 'profiles')
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY tablename, policyname;

SELECT tgname, relname, proname
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'profiles' AND t.tgname = 'trg_prevent_self_role_escalation';

-- =====================================================================================
-- ROLLBACK PLAN (If unexpected side-effects occur)
-- =====================================================================================
-- To revert profiles read policy:
-- DROP POLICY IF EXISTS "Users read own profile and staff read student profiles" ON public.profiles;
-- CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
--
-- To revert storage policies:
-- DROP POLICY IF EXISTS "Authenticated users upload own evidence" ON storage.objects;
-- DROP POLICY IF EXISTS "Users and staff read authorized evidence" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users upload own id card" ON storage.objects;
-- DROP POLICY IF EXISTS "Users and staff read authorized id card" ON storage.objects;
--
-- To revert trigger:
-- DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
