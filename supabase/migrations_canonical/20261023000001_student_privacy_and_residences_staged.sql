-- ==============================================================================
-- KAVACH CAMPUS — STAGED ADDITIVE MIGRATION: STUDENT RESIDENTIAL PRIVACY & RLS
-- ==============================================================================
-- Migration Identifier: 20261023000001_student_privacy_and_residences_staged.sql
-- Status: STAGED FOR REVIEW — DO NOT AUTO-APPLY WITHOUT EXPLICIT APPROVAL
-- Purpose:
--   1. Isolates sensitive student residential information (hostel room, PG address, guardian phone)
--      into a dedicated table `public.student_residences` with strict Row-Level Security.
--   2. Enforces Principle of Least Privilege: General academic staff/mentors cannot view
--      residential room numbers or private PG addresses.
--   3. Restricts residential data access exclusively to:
--      - The student themselves (own profile)
--      - Assigned Residential Wardens and College Security within the SAME college
--      - Authorized College Administrators
--   4. Strictly blocks all cross-campus queries (SRKR cannot access Vishnu, and vice versa).
-- ==============================================================================

-- 1. Create dedicated student residences table
CREATE TABLE IF NOT EXISTS public.student_residences (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    college_id TEXT NOT NULL,
    residence_type TEXT NOT NULL CHECK (residence_type IN ('DAY_SCHOLAR', 'COLLEGE_HOSTEL', 'PRIVATE_HOSTEL')),
    hostel_name TEXT,
    room_number TEXT,
    pg_name TEXT,
    pg_address TEXT,
    guardian_contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_residences ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Students read own residential record
CREATE POLICY "student_residences_select_own"
ON public.student_residences
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Policy: Students insert/update own residential record
CREATE POLICY "student_residences_insert_own"
ON public.student_residences
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id
    AND college_id = public.get_user_college_id()
);

CREATE POLICY "student_residences_update_own"
ON public.student_residences
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND college_id = public.get_user_college_id()
);

-- 4. Policy: Only authorized campus wardens, security, and admins of the same college can view residences
CREATE POLICY "student_residences_select_authorized_staff"
ON public.student_residences
FOR SELECT
TO authenticated
USING (
    public.is_campus_staff()
    AND public.get_user_role()::TEXT IN ('WARDEN', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
    AND (
        public.get_user_role()::TEXT = 'SUPER_ADMIN'
        OR (
            college_id = public.get_user_college_id()
            AND college_id <> 'PENDING_CAMPUS_VERIFICATION'
        )
    )
);

-- 5. Explicitly deny access to unauthenticated / anonymous users
-- (Default PostgreSQL behavior under RLS when no public policy exists).

-- ==============================================================================
-- SAFE NON-DESTRUCTIVE ROLLBACK PROTOCOL:
-- ==============================================================================
-- CAUTION: NEVER execute `DROP TABLE ... CASCADE` in production if student records exist.
-- To reverse policies safely without destroying live user records:
--
-- 1. Archive existing residential data prior to table drop:
--    CREATE TABLE IF NOT EXISTS public.student_residences_archive AS 
--    SELECT * FROM public.student_residences;
--
-- 2. Drop RLS policies:
--    DROP POLICY IF EXISTS "student_residences_select_authorized_staff" ON public.student_residences;
--    DROP POLICY IF EXISTS "student_residences_update_own" ON public.student_residences;
--    DROP POLICY IF EXISTS "student_residences_insert_own" ON public.student_residences;
--    DROP POLICY IF EXISTS "student_residences_select_own" ON public.student_residences;
--
-- 3. Only after confirming archive backup, remove table if strictly required:
--    -- DROP TABLE IF EXISTS public.student_residences;
-- ==============================================================================
