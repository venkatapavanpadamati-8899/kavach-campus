-- =====================================================================================
-- KAVACH CAMPUS — STEP 108: REVIEWED & HARDENED SAFE REMEDIATION SCRIPT
-- =====================================================================================
-- Project: Kavach Campus (Ref: polbnvszmvblwenfnqll)
-- Notice: DO NOT EXECUTE AUTOMATICALLY. This script is prepared for manual review
--         and execution in the Supabase Dashboard SQL Editor by the institutional owner.
-- URL: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- MAJOR HARDENING IMPROVEMENTS OVER STEP 96:
-- 1. Eliminates blanket `is_staff()` read access to student government ID cards.
--    ID card access is restricted strictly to `is_reviewer()` (ADMIN, SUPER_ADMIN, SECURITY).
-- 2. Eliminates blanket `is_staff()` read access to `storage.objects` evidence files.
--    Storage read is restricted to the owning student and administrators.
--    Assigned responders access evidence via backend-authenticated signed URLs.
-- 3. Fixes trigger deadlock in `prevent_self_role_escalation`:
--    Safely permits service-role API handlers (`auth.role() = 'service_role'`) and
--    DBA sessions (`session_user IN ('postgres', 'supabase_admin')`) while strictly
--    blocking any untrusted client self-escalations.
-- 4. Remediates table-level `public.evidence` policy to enforce case assignment isolation.
-- 5. Remediates table-level `public.incident_messages` policy to enforce case assignment isolation
--    and protect internal staff notes from student visibility.
-- =====================================================================================
BEGIN;

-- =====================================================================================
-- SECTION 1: SECURITY DEFINER Helper Functions with Pinned search_path
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
      AND is_approved = true
  );
$$;

-- Dedicated Reviewer function for ID Cards & Background Verifications
CREATE OR REPLACE FUNCTION public.is_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY')
      AND is_approved = true
  );
$$;

-- Revoke execute from public to guarantee role isolation
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_security_or_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_reviewer() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_security_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reviewer() TO authenticated;

-- =====================================================================================
-- SECTION 2: Profiles Read Scoping (Eliminate Universal Exposure)
-- =====================================================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile and staff read student profiles" ON public.profiles;

CREATE POLICY "Users read own profile and staff read student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_staff()
);

-- =====================================================================================
-- SECTION 2B: Student Profiles Isolation (Eliminate Universal Staff Browsing)
-- =====================================================================================
DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students read own private profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Authorized users read student profiles" ON public.student_profiles;

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
-- SECTION 3: Storage Objects ID Card Protection (kavach-id-cards)
-- =====================================================================================
DROP POLICY IF EXISTS "Authenticated users upload id cards" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read id cards" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload id card" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view id cards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own id card" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized id card" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own ID card" ON storage.objects;
DROP POLICY IF EXISTS "Students read own ID card" ON storage.objects;

-- Enforce auth.uid() folder prefix on ID card uploads
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

-- Read restricted to owning student or approved institutional reviewers
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
-- SECTION 4: Storage Objects Evidence Protection (kavach-evidence)
-- =====================================================================================
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read authorized evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;

-- Enforce auth.uid() folder prefix on evidence uploads
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

-- Read restricted to owning student or administrator (Responders use backend signed URLs)
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
-- SECTION 5: Table-Level Evidence Case Isolation (public.evidence)
-- =====================================================================================
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users insert evidence" ON public.evidence;
DROP POLICY IF EXISTS "Authorized users view evidence" ON public.evidence;

CREATE POLICY "Authorized users view evidence"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  uploader_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_id
      AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users insert evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_id
      AND i.student_id = auth.uid()
  )
);

-- =====================================================================================
-- SECTION 6: Table-Level Message Case Isolation & Privacy (public.incident_messages)
-- =====================================================================================
DROP POLICY IF EXISTS "Staff read all messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Students read non-internal messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Users insert messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Authorized users read incident messages" ON public.incident_messages;

CREATE POLICY "Authorized users read incident messages"
ON public.incident_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_id
      AND (
        (i.student_id = auth.uid() AND incident_messages.is_internal = false)
        OR (i.assigned_to = auth.uid())
      )
  )
);

CREATE POLICY "Users insert messages"
ON public.incident_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_id
      AND (
        i.student_id = auth.uid()
        OR i.assigned_to = auth.uid()
        OR public.is_admin()
      )
  )
);

-- =====================================================================================
-- SECTION 7: Self-Role Escalation Prevention Trigger (Deadlock-Free & Secure)
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_session_user text;
BEGIN
  -- 1. If neither role nor approval status is modified, permit immediately
  IF (OLD.role IS NOT DISTINCT FROM NEW.role AND OLD.is_approved IS NOT DISTINCT FROM NEW.is_approved) THEN
    RETURN NEW;
  END IF;

  -- 2. Direct superuser / DBA session check (Supabase SQL Editor / migrations)
  v_session_user := session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 3. Trusted backend service-role API request
  -- PostgREST sets request.jwt.claim.role to 'service_role' for service-role calls
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

  -- 4. Authenticated institutional administrator
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 5. Default Deny: All untrusted modifications are rejected
  RAISE EXCEPTION 'Access Denied: Only institutional administrators can modify account roles or approval status.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

COMMIT;

-- =====================================================================================
-- SECTION 8: POST-CHECK AUDIT
-- =====================================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND tablename IN ('profiles', 'student_profiles', 'evidence', 'incident_messages', 'objects')
ORDER BY schemaname, tablename, policyname;

SELECT tgname, relname, proname
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'profiles' AND t.tgname = 'trg_prevent_self_role_escalation';
