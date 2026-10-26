-- =====================================================================================
-- KAVACH CAMPUS: RLS INFINITE RECURSION REPAIR & ESCALATIONS TABLE PROVISIONING
-- =====================================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- This script:
-- 1. Creates SECURITY DEFINER role check functions (breaks circular RLS loop on profiles).
-- 2. Provisions the missing `escalations` table with RLS enabled.
-- 3. Replaces recursive policies with high-performance, non-recursive SECURITY DEFINER policies.
-- 4. Installs a privilege-escalation prevention trigger on profiles.
-- 5. Fixes recursive storage object policy on storage.objects.
-- =====================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SECURITY DEFINER HELPER FUNCTIONS (Breaks 42P17 Infinite Recursion)
-- Explicitly specifies search_path = public to prevent search path hijacking.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

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
  );
$$;

-- 3. PRIVILEGE ESCALATION PREVENTION TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent non-admins from changing their own role or approval status
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify roles or approval status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 4. PROVISION MISSING ESCALATIONS TABLE
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_escalations_incident_id ON public.escalations(incident_id);

-- Ensure incidents table has type column for backwards-compatible category mapping
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS type TEXT;

-- Restrict function execution to authenticated and service_role only
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_security_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_security_or_admin() TO authenticated, service_role;

-- Complete RLS policies for escalations
DROP POLICY IF EXISTS "Staff view escalations" ON public.escalations;
CREATE POLICY "Staff view escalations" ON public.escalations
FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Authenticated users create escalations" ON public.escalations;
CREATE POLICY "Authenticated users create escalations" ON public.escalations
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM public.incidents 
            WHERE public.incidents.id = incident_id 
              AND public.incidents.student_id = auth.uid()
        ) OR
        public.is_staff()
    )
);

DROP POLICY IF EXISTS "Staff update escalations" ON public.escalations;
CREATE POLICY "Staff update escalations" ON public.escalations
FOR UPDATE USING (public.is_staff());

-- 5. REPAIR RECURSIVE POLICIES ON PROFILES
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
CREATE POLICY "Staff can read all profiles" ON public.profiles
FOR SELECT USING (public.is_staff());

-- 6. REPAIR RECURSIVE POLICIES ON STUDENT PROFILES
DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;
CREATE POLICY "Staff read student profiles" ON public.student_profiles
FOR SELECT USING (public.is_staff());

-- 7. REPAIR RECURSIVE POLICIES ON STAFF PROFILES
DROP POLICY IF EXISTS "Admin read staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin read staff profiles" ON public.staff_profiles
FOR SELECT USING (public.is_admin());

-- 8. REPAIR RECURSIVE POLICIES ON INCIDENTS
DROP POLICY IF EXISTS "Staff view incidents" ON public.incidents;
CREATE POLICY "Staff view incidents" ON public.incidents
FOR SELECT USING (public.is_staff());

-- 9. REPAIR RECURSIVE POLICIES ON INCIDENT LOCATIONS
DROP POLICY IF EXISTS "Staff view locations" ON public.incident_locations;
CREATE POLICY "Staff view locations" ON public.incident_locations
FOR SELECT USING (public.is_staff());

-- 10. REPAIR RECURSIVE POLICIES ON EVIDENCE
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;
CREATE POLICY "Staff view evidence" ON public.evidence
FOR SELECT USING (public.is_staff());

-- 11. REPAIR RECURSIVE POLICIES ON INCIDENT MESSAGES
DROP POLICY IF EXISTS "Staff read all messages" ON public.incident_messages;
CREATE POLICY "Staff read all messages" ON public.incident_messages
FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Users insert messages" ON public.incident_messages;
CREATE POLICY "Users insert messages" ON public.incident_messages
FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    (
        EXISTS (SELECT 1 FROM public.incidents WHERE public.incidents.id = incident_id AND public.incidents.student_id = auth.uid()) OR
        public.is_staff()
    )
);

-- 12. REPAIR RECURSIVE POLICIES ON SAFE WALKS
DROP POLICY IF EXISTS "Staff view safe walks" ON public.safe_walks;
CREATE POLICY "Staff view safe walks" ON public.safe_walks
FOR SELECT USING (public.is_security_or_admin());

-- 13. REPAIR RECURSIVE POLICIES ON AI CONFIGURATION
DROP POLICY IF EXISTS "Admin modify ai config" ON public.ai_configuration;
CREATE POLICY "Admin modify ai config" ON public.ai_configuration
FOR ALL USING (public.is_admin());

-- 14. REPAIR POLICIES ON EMERGENCY CONFIGURATION (Ensure Public Read works cleanly)
DROP POLICY IF EXISTS "Public read emergency config" ON public.emergency_configuration;
DROP POLICY IF EXISTS "Admin modify emergency config" ON public.emergency_configuration;

CREATE POLICY "Public read emergency config" ON public.emergency_configuration
FOR SELECT USING (true);

CREATE POLICY "Admin modify emergency config" ON public.emergency_configuration
FOR ALL USING (public.is_admin());

-- 15. REPAIR RECURSIVE POLICIES ON STORAGE OBJECTS
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;
CREATE POLICY "Staff view evidence files" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'kavach-evidence' AND public.is_staff()
);

-- 16. VERIFY REPAIR COMPLETION
SELECT 'Kavach Campus RLS, Privilege Escalation Prevention & Storage Repair applied successfully' AS status;
