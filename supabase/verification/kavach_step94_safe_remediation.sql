-- =====================================================================================
-- KAVACH CAMPUS — STEP 94: STANDALONE SAFE RLS & STORAGE REMEDIATION SCRIPT
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll)
-- Notice: DO NOT EXECUTE AUTOMATICALLY. This script is prepared for manual review
--         and execution in the Supabase Dashboard SQL Editor AFTER reviewing audit findings.
-- URL: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- PURPOSE:
-- Surgical remediation for the 3 confirmed policy vulnerabilities:
-- 1. Tighten public.profiles read access (disallow universal USING (true) exposure).
-- 2. Restrict storage.objects evidence uploads to owning user folder path prefix.
-- 3. Ensure role tampering trigger trg_prevent_self_role_escalation is enforced.
-- =====================================================================================

-- =====================================================================================
-- PRE-CHECK 1: Verify current policies before applying changes
-- =====================================================================================
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

-- =====================================================================================
-- REMEDIATION 1: Profiles Read Scoping (Eliminate Public PII Leakage)
-- =====================================================================================
-- Pre-condition: Drop legacy broad read policies if present
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;

-- Ensure SECURITY DEFINER helper function exists
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

-- Secure Replacement Policy: Users read own profile; authorized staff read student profiles
CREATE POLICY "Users read own profile and staff read student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_staff()
);

-- =====================================================================================
-- REMEDIATION 2: Evidence Storage Path Ownership Enforcement
-- =====================================================================================
-- Pre-condition: Drop legacy loose evidence upload policy
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;

-- Secure Replacement: Enforce auth.uid() folder prefix on uploads
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

-- Secure Replacement: Read restricted to owning student or authorized staff
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
-- REMEDIATION 3: Self-Role Escalation Prevention Trigger
-- =====================================================================================
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

-- =====================================================================================
-- POST-CHECK: Verify updated policies and triggers
-- =====================================================================================
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
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
-- ROLLBACK PLAN (In case application compatibility issues arise)
-- =====================================================================================
-- If student profiles cannot be read by authorized components:
-- DROP POLICY IF EXISTS "Users read own profile and staff read student profiles" ON public.profiles;
-- Revert to own profile only:
-- CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
-- =====================================================================================
