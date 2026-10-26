-- =============================================================================
-- KAVACH CAMPUS — MIGRATION 010: SERVICE ROLE & AUDIT LOG SCHEMA ALIGNMENT (HARDENED)
-- Target: Live Remote Supabase (polbnvszmvblwenfnqll)
-- =============================================================================

-- 1. Ensure public.audit_logs supports both legacy and canonical column formats
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Align is_security_or_admin() to recognize service_role and security/admin profiles
-- CRITICAL SECURITY NOTE: Never check current_user in SECURITY DEFINER function because it evaluates to the owner (postgres).
-- Strictly check auth.role(), JWT role claim, or session_user.
CREATE OR REPLACE FUNCTION public.is_security_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR session_user = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('SECURITY', 'ADMIN', 'SUPER_ADMIN')
    )
  );
$$;

-- 3. Trigger preventing students from self-approving to 'VERIFIED'
CREATE OR REPLACE FUNCTION public.prevent_student_self_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only security officers or administrators (or service role) can approve verification
    IF (NEW.verification_status = 'VERIFIED' AND (OLD.verification_status IS DISTINCT FROM 'VERIFIED')) THEN
        IF NOT public.is_security_or_admin() THEN
            RAISE EXCEPTION 'Access Denied: Only campus security or administrators can approve student ID verification.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_student_self_verification ON public.student_profiles;
CREATE TRIGGER trg_prevent_student_self_verification
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_student_self_verification();
