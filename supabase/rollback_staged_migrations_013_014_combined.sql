-- =====================================================================================
-- KAVACH CAMPUS — REVERSE ROLLBACK SCRIPT FOR STAGED MIGRATIONS 013 & 014
-- =====================================================================================
-- Target Database: Supabase Project 'polbnvszmvblwenfnqll' (Staging)
-- SQL Editor URL: https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new
--
-- PURPOSE:
-- Safely reverts the policies, triggers, and functions installed by
-- `staged_migrations_013_014_combined.sql` in case of post-migration issues.
--
-- SAFETY GUARANTEES:
-- 1. Runs inside a single transaction (BEGIN ... COMMIT).
-- 2. Preserves table columns and all user data (NO DROP TABLE, NO DROP COLUMN).
-- 3. Drops the triggers and functions created in 013/014.
-- 4. Reverts RLS policies to standard baseline.
-- =====================================================================================

BEGIN;

-- 1. DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_assign_incident_college_id ON public.incidents;
DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_evidence_incident_reference ON public.evidence;

-- 2. DROP TRIGGER FUNCTIONS
DROP FUNCTION IF EXISTS public.trg_fn_assign_incident_college_id();
DROP FUNCTION IF EXISTS public.prevent_self_role_escalation();
DROP FUNCTION IF EXISTS public.sync_evidence_incident_reference();

-- 3. DROP COMBINED RLS POLICIES (INSTALLED BY 013/014)
-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff view same-college profiles" ON public.profiles;

-- Student Profiles
DROP POLICY IF EXISTS "Students read own private profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Staff view same-college student profiles" ON public.student_profiles;

-- Staff Profiles
DROP POLICY IF EXISTS "Staff read own private profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Staff view same-college staff profiles" ON public.staff_profiles;

-- Incidents
DROP POLICY IF EXISTS "Students view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Students insert own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff view same-college incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff update same-college incidents" ON public.incidents;

-- Incident Locations
DROP POLICY IF EXISTS "Students view own incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students insert own incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff view same-college incident locations" ON public.incident_locations;

-- Evidence
DROP POLICY IF EXISTS "Users view authorized evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users insert authorized evidence" ON public.evidence;

-- Incident Messages
DROP POLICY IF EXISTS "Users read authorized incident messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Users insert authorized incident messages" ON public.incident_messages;

-- Safe Walks
DROP POLICY IF EXISTS "Students manage own safe walks" ON public.safe_walks;
DROP POLICY IF EXISTS "Staff view same-college safe walks" ON public.safe_walks;

-- Escalations
DROP POLICY IF EXISTS "Staff view same-college escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff update same-college escalations" ON public.escalations;
DROP POLICY IF EXISTS "Users create authorized escalations" ON public.escalations;

-- Storage Objects
DROP POLICY IF EXISTS "Users upload evidence objects" ON storage.objects;
DROP POLICY IF EXISTS "Users read authorized evidence objects" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users read authorized ID cards" ON storage.objects;

-- 4. RESTORE BASELINE OPEN READ-OWN / STAFF POLICIES (FALLBACK STATE)
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Students view own incidents" ON public.incidents
FOR SELECT TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students insert own incidents" ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students manage own safe walks" ON public.safe_walks
FOR ALL TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

COMMIT;

SELECT 'Rollback script executed successfully: 013/014 policies and triggers reverted to baseline.' AS status;

