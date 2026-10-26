-- =====================================================================================
-- KAVACH CAMPUS: MIGRATION 013 — CROSS-COLLEGE TENANT RLS ISOLATION & DATA PARTITIONING
-- =====================================================================================
-- Target Database: PostgreSQL on Supabase (Staging / Production)
-- Purpose:
-- Enforces strict Row Level Security (RLS) data isolation between institutions
-- (e.g., SRKR Engineering College and Vishnu Institute of Technology).
-- Prevents cross-college data leaks across profiles, incidents, safe walks, escalations,
-- evidence, and storage objects.
-- =====================================================================================

-- 1. EXTEND INCIDENTS TABLE WITH TENANT IDENTIFIER
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS college_id TEXT;

CREATE INDEX IF NOT EXISTS idx_incidents_college_id
  ON public.incidents (college_id);

-- 2. BACKFILL INCIDENT TENANCY FROM REPORTING STUDENT PROFILES
UPDATE public.incidents i
SET college_id = p.college_id
FROM public.profiles p
WHERE i.student_id = p.id
  AND i.college_id IS NULL
  AND p.college_id IS NOT NULL;

-- 3. AUTO-ASSIGN COLLEGE_ID ON INCIDENT CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.trg_fn_assign_incident_college_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.college_id IS NULL AND NEW.student_id IS NOT NULL THEN
    SELECT college_id INTO NEW.college_id
    FROM public.profiles
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_incident_college_id ON public.incidents;
CREATE TRIGGER trg_assign_incident_college_id
  BEFORE INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_assign_incident_college_id();

-- 4. REINFORCE PROFILES TABLE RLS (CROSS-COLLEGE STAFF ACCESS ISOLATION)
-- Students only view their own profile.
-- Staff can ONLY view profiles belonging to their own college tenant (Super Admin sees all).
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff view same-college profiles" ON public.profiles;

CREATE POLICY "Staff view same-college profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.is_staff() AND (
    public.get_user_role() = 'SUPER_ADMIN'
    OR college_id = public.get_user_college_id()
  )
);

-- 5. REINFORCE INCIDENTS TABLE RLS (CROSS-COLLEGE INCIDENT ISOLATION)
-- Students see only their own incidents.
-- Staff see only incidents originating from their own college tenant.
DROP POLICY IF EXISTS "Staff view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff view same-college incidents" ON public.incidents;

CREATE POLICY "Staff view same-college incidents" ON public.incidents
FOR SELECT TO authenticated
USING (
  public.is_staff() AND (
    public.get_user_role() = 'SUPER_ADMIN'
    OR college_id = public.get_user_college_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.incidents.student_id
        AND p.college_id = public.get_user_college_id()
    )
  )
);

-- 6. REINFORCE SAFE WALKS TABLE RLS (CROSS-COLLEGE TELEMETRY ISOLATION)
DROP POLICY IF EXISTS "Staff view safe walks" ON public.safe_walks;
DROP POLICY IF EXISTS "Staff view same-college safe walks" ON public.safe_walks;

CREATE POLICY "Staff view same-college safe walks" ON public.safe_walks
FOR SELECT TO authenticated
USING (
  public.is_security_or_admin() AND (
    public.get_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.safe_walks.student_id
        AND p.college_id = public.get_user_college_id()
    )
  )
);

-- 7. REINFORCE ESCALATIONS TABLE RLS (CROSS-COLLEGE ESCALATION ISOLATION)
DROP POLICY IF EXISTS "Staff view escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff and admin view escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff view same-college escalations" ON public.escalations;

CREATE POLICY "Staff view same-college escalations" ON public.escalations
FOR SELECT TO authenticated
USING (
  public.is_staff() AND (
    public.get_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = public.escalations.incident_id
        AND (
          i.college_id = public.get_user_college_id()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = i.student_id
              AND p.college_id = public.get_user_college_id()
          )
        )
    )
  )
);

-- 8. REINFORCE EVIDENCE TABLE RLS (CROSS-COLLEGE EVIDENCE ISOLATION)
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff view same-college evidence" ON public.evidence;

CREATE POLICY "Staff view same-college evidence" ON public.evidence
FOR SELECT TO authenticated
USING (
  public.is_staff() AND (
    public.get_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = public.evidence.incident_id
        AND (
          i.college_id = public.get_user_college_id()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = i.student_id
              AND p.college_id = public.get_user_college_id()
          )
        )
    )
  )
);

-- 9. REINFORCE STORAGE OBJECTS RLS (CROSS-COLLEGE EVIDENCE STORAGE ISOLATION)
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and same-college staff read evidence" ON storage.objects;

CREATE POLICY "Users and same-college staff read evidence" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-evidence' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      public.is_staff() AND (
        public.get_user_role() = 'SUPER_ADMIN'
        OR EXISTS (
          SELECT 1 FROM public.incidents i
          JOIN public.profiles p ON i.student_id = p.id
          WHERE (i.case_id = (storage.foldername(name))[1] OR i.id::text = (storage.foldername(name))[1])
            AND p.college_id = public.get_user_college_id()
        )
      )
    )
  )
);

-- 10. VERIFICATION STATUS OUTPUT
SELECT 'Migration 013 executed: Cross-college RLS isolation policies applied for profiles, incidents, safe_walks, escalations, evidence, and storage.' AS status;
