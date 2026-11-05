-- =====================================================================================
-- KAVACH CAMPUS: MIGRATION 018 — LEGACY RLS POLICY REMEDIATION & TENANT HARDENING
-- =====================================================================================
-- Target Database: PostgreSQL 17 on Supabase (Local & Production Alignment)
-- Status: FORWARD-ONLY SECURITY REMEDIATION
--
-- RATIONALE:
-- In PostgreSQL, multiple PERMISSIVE policies on the same table combine using logical OR.
-- Historical baseline policies (e.g., "Authorized users view incidents", "Reviewers and
-- student owner read profile") contained broad checks like `is_reviewer()` or `is_admin()`
-- without enforcing `college_id` tenant boundaries. Retaining them alongside newer tenant
-- policies caused an unintended bypass where staff from one college could view incidents,
-- locations, evidence, and ID cards belonging to other institutions.
--
-- This migration idempotently drops all confirmed unsafe historical permissive policies
-- and reinforces tenant scoping across all incident, location, evidence, student profile,
-- staff location, and storage object tables.
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. INCIDENTS TABLE — PURGE HISTORICAL PERMISSIVE POLICIES
-- =====================================================================================
-- The canonical tenant policies are:
--   - "Students view own incidents" (SELECT: auth.uid() = student_id)
--   - "Students insert own incidents" (INSERT: auth.uid() = student_id)
--   - "Staff view same-college incidents" (SELECT: same-college campus staff or SUPER_ADMIN)
--
-- Purge any legacy policy that lacks college_id scoping:
DROP POLICY IF EXISTS "Authorized users view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff can view assigned or unassigned incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff and admin view incidents" ON public.incidents;

-- =====================================================================================
-- 2. INCIDENT LOCATIONS TABLE — PURGE HISTORICAL PERMISSIVE POLICIES
-- =====================================================================================
-- The canonical tenant policies are:
--   - "Students view own incident locations" (SELECT)
--   - "Students insert own incident locations" (INSERT)
--   - "Staff view same-college incident locations" (SELECT)
--
-- Purge historical broad policies:
DROP POLICY IF EXISTS "Authorized users view incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Authorized users insert incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff can view all incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff can view all locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff view locations" ON public.incident_locations;

-- =====================================================================================
-- 3. EVIDENCE TABLE — PURGE HISTORICAL PERMISSIVE POLICIES
-- =====================================================================================
-- The canonical tenant policies are:
--   - "Users view authorized evidence" (SELECT: student owner or same-college staff)
--   - "Users insert authorized evidence" (INSERT: student owner or same-college staff)
--
-- Purge historical broad policies:
DROP POLICY IF EXISTS "Authorized users view incident evidence" ON public.evidence;
DROP POLICY IF EXISTS "Authorized users view evidence" ON public.evidence;
DROP POLICY IF EXISTS "Authorized users upload incident evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff can view all evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff view same-college evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can upload evidence for own incidents" ON public.evidence;
DROP POLICY IF EXISTS "Users upload evidence" ON public.evidence;

-- =====================================================================================
-- 4. STUDENT PROFILES TABLE — PURGE HISTORICAL PERMISSIVE POLICIES
-- =====================================================================================
-- The canonical tenant policies are:
--   - "Students read own private profile" (SELECT: auth.uid() = id)
--   - "Students update own profile" (UPDATE: auth.uid() = id)
--   - "Staff view same-college student profiles" (SELECT: same-college staff or SUPER_ADMIN)
--
-- Purge legacy reviewer policy that lacks college_id scoping:
DROP POLICY IF EXISTS "Reviewers and student owner read profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Authorized users read student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Public student profiles are viewable by everyone" ON public.student_profiles;
DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;

-- =====================================================================================
-- 5. INCIDENT MESSAGES TABLE — PURGE HISTORICAL PERMISSIVE POLICIES
-- =====================================================================================
-- The canonical tenant policies are:
--   - "Users read authorized incident messages" (SELECT: student or same-college staff)
--   - "Users insert authorized incident messages" (INSERT: student or same-college staff)
--
-- Purge legacy broad policies:
DROP POLICY IF EXISTS "Authorized users read incident messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Staff can read all messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Staff read all messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Staff read same-college messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Students can read non-internal messages of own incident" ON public.incident_messages;
DROP POLICY IF EXISTS "Students read non-internal messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Users insert messages" ON public.incident_messages;

-- =====================================================================================
-- 6. STAFF LOCATIONS TABLE — TENANT-SCOPED DISPATCH HARDENING
-- =====================================================================================
-- Harden dispatch read policy so campus security officers only see responders within
-- their own institution:
DROP POLICY IF EXISTS "staff_locations_dispatch_read" ON public.staff_locations;
CREATE POLICY "staff_locations_dispatch_read" ON public.staff_locations
FOR SELECT TO authenticated
USING (
  public.is_security_or_admin()
  AND is_on_duty = true
  AND is_location_sharing_enabled = true
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.staff_locations.staff_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

-- Preserve self-management policy idempotently
DROP POLICY IF EXISTS "staff_locations_self_manage" ON public.staff_locations;
CREATE POLICY "staff_locations_self_manage" ON public.staff_locations
FOR ALL TO authenticated
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- =====================================================================================
-- 7. STORAGE OBJECTS TABLE — PURGE HISTORICAL EVIDENCE & ID CARD POLICIES
-- =====================================================================================
-- The canonical tenant storage policies are:
--   - "Users read authorized evidence objects" (SELECT on kavach-evidence)
--   - "Users upload authorized evidence objects" (INSERT on kavach-evidence)
--   - "Users read authorized ID cards" (SELECT on kavach-id-cards: student or same-college staff)
--   - "Students upload own ID cards" (INSERT on kavach-id-cards)
--   - "Users read own profile photos" (SELECT on kavach-profile-photos)
--
-- Purge historical broad policies that allow cross-college downloads or broad reviewer access:
DROP POLICY IF EXISTS "Authorized users read incident evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users upload incident evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users and reviewers read authorized id card" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own id card" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and same-college staff read evidence" ON storage.objects;

-- =====================================================================================
-- 8. AUDIT RECORD INSERTION
-- =====================================================================================
INSERT INTO public.audit_logs (
    id,
    action,
    entity_type,
    metadata,
    created_at
)
VALUES (
    gen_random_uuid(),
    'SCHEMA_MIGRATION_018',
    'security_rls_remediation',
    jsonb_build_object(
        'description', 'Purged un-scoped historical permissive RLS policies on incidents, locations, evidence, student_profiles, and storage. Objects; hardened staff_locations dispatch read to same-college.',
        'target_version', '018',
        'remediation_phase', 'PHASE_15K'
    ),
    NOW()
);

COMMIT;

