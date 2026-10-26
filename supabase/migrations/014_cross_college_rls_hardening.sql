-- Corrective migration for the tenant-isolation policies introduced in migration 013.
-- Review and verify in staging before applying anywhere. This migration is not a
-- substitute for authenticated SRKR/Vishnu API tests.

-- The evidence API stores case_id/file_path while earlier schema versions only
-- defined incident_id/storage_path. Keep both representations synchronized.
ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS case_id TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_walks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

UPDATE public.evidence e
SET case_id = i.case_id
FROM public.incidents i
WHERE e.incident_id = i.id
  AND e.case_id IS NULL;

UPDATE public.evidence
SET file_path = storage_path
WHERE file_path IS NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_case_id
  ON public.evidence (case_id);

CREATE OR REPLACE FUNCTION public.sync_evidence_incident_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incident_case_id TEXT;
  incident_uuid UUID;
BEGIN
  IF NEW.file_path IS NULL AND NEW.storage_path IS NOT NULL THEN
    NEW.file_path := NEW.storage_path;
  ELSIF NEW.storage_path IS NULL AND NEW.file_path IS NOT NULL THEN
    NEW.storage_path := NEW.file_path;
  ELSIF NEW.file_path IS NOT NULL AND NEW.storage_path IS DISTINCT FROM NEW.file_path THEN
    RAISE EXCEPTION 'Evidence file_path must match storage_path.';
  END IF;

  IF NEW.incident_id IS NULL AND NEW.case_id IS NOT NULL THEN
    SELECT id INTO incident_uuid
    FROM public.incidents
    WHERE case_id = NEW.case_id;

    IF incident_uuid IS NULL THEN
      RAISE EXCEPTION 'Evidence case_id must reference an existing incident.';
    END IF;

    NEW.incident_id := incident_uuid;
  ELSIF NEW.incident_id IS NOT NULL THEN
    SELECT case_id INTO incident_case_id
    FROM public.incidents
    WHERE id = NEW.incident_id;

    IF incident_case_id IS NULL THEN
      RAISE EXCEPTION 'Evidence incident_id must reference an existing incident.';
    END IF;

    IF NEW.case_id IS NOT NULL AND NEW.case_id IS DISTINCT FROM incident_case_id THEN
      RAISE EXCEPTION 'Evidence case_id does not match incident_id.';
    END IF;

    NEW.case_id := incident_case_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_evidence_incident_reference ON public.evidence;
CREATE TRIGGER trg_sync_evidence_incident_reference
  BEFORE INSERT OR UPDATE OF incident_id, case_id ON public.evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_evidence_incident_reference();

-- Do not permit a profile owner to change their tenant, approval, active state,
-- or role through the existing self-update policy.
CREATE OR REPLACE FUNCTION public.is_campus_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.get_user_role()::TEXT IN (
      'STAFF',
      'COUNSELLOR',
      'COUNSELOR',
      'WOMENS_CELL',
      'HOD',
      'SECURITY',
      'PRINCIPAL',
      'ADMIN',
      'SUPER_ADMIN',
      'MENTOR',
      'MANAGEMENT'
    ),
    FALSE
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_campus_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_campus_staff() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    OLD.role IS DISTINCT FROM NEW.role
    OR OLD.is_approved IS DISTINCT FROM NEW.is_approved
    OR OLD.is_active IS DISTINCT FROM NEW.is_active
    OR OLD.student_id IS DISTINCT FROM NEW.student_id
    OR OLD.college_email IS DISTINCT FROM NEW.college_email
  ) AND NOT (public.is_admin() OR COALESCE(auth.role(), '') = 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can modify role or account status.';
  END IF;

  IF OLD.college_id IS DISTINCT FROM NEW.college_id
    AND NOT (
      COALESCE(public.get_user_role()::TEXT, '') = 'SUPER_ADMIN'
      OR COALESCE(auth.role(), '') = 'service_role'
    )
  THEN
    RAISE EXCEPTION 'Unauthorized: only a super administrator can change campus assignment.';
  END IF;

  RETURN NEW;
END;
$$;

-- A caller-supplied incident college_id is never authoritative. Derive it from
-- the reporting student's profile for inserts and updates.
CREATE OR REPLACE FUNCTION public.trg_fn_assign_incident_college_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_college_id TEXT;
BEGIN
  IF NEW.student_id IS NULL THEN
    IF NEW.college_id IS NOT NULL
      AND COALESCE(auth.role(), '') <> 'service_role'
      AND COALESCE(public.get_user_role()::TEXT, '') <> 'SUPER_ADMIN'
    THEN
      RAISE EXCEPTION 'An incident without a student cannot set its own campus.';
    END IF;

    RETURN NEW;
  END IF;

  SELECT p.college_id INTO profile_college_id
  FROM public.profiles p
  WHERE p.id = NEW.student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident student must have a profile.';
  END IF;

  NEW.college_id := COALESCE(profile_college_id, 'PENDING_CAMPUS_VERIFICATION');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_incident_college_id ON public.incidents;
CREATE TRIGGER trg_assign_incident_college_id
  BEFORE INSERT OR UPDATE OF student_id, college_id ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_assign_incident_college_id();

-- Remove known public/global policies from earlier baseline variants. PostgreSQL
-- combines permissive policies with OR, so retaining one of these defeats 013.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

DROP POLICY IF EXISTS "Public student profiles are viewable by everyone" ON public.student_profiles;
DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students read own private profile" ON public.student_profiles;

DROP POLICY IF EXISTS "Public staff profiles are viewable by everyone" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admin read staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Staff read own private profile" ON public.staff_profiles;

DROP POLICY IF EXISTS "Staff can view assigned or unassigned incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff view same-college incidents" ON public.incidents;
DROP POLICY IF EXISTS "Students can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Students view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Students can insert own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Students insert own incidents" ON public.incidents;

DROP POLICY IF EXISTS "Staff can view all incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff can view all locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff view locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Staff view same-college incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students can view own incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students view own locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students can insert own incident locations" ON public.incident_locations;
DROP POLICY IF EXISTS "Students insert own locations" ON public.incident_locations;

DROP POLICY IF EXISTS "Staff can view all evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;
DROP POLICY IF EXISTS "Staff view same-college evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users can upload evidence for own incidents" ON public.evidence;
DROP POLICY IF EXISTS "Users upload evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users view authorized evidence" ON public.evidence;
DROP POLICY IF EXISTS "Users insert authorized evidence" ON public.evidence;

DROP POLICY IF EXISTS "Staff can read all messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Staff read all messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Staff read same-college messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Students can read non-internal messages of own incident" ON public.incident_messages;
DROP POLICY IF EXISTS "Students read non-internal messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Users insert messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Users read authorized incident messages" ON public.incident_messages;
DROP POLICY IF EXISTS "Users insert authorized incident messages" ON public.incident_messages;

DROP POLICY IF EXISTS "Staff view safe walks" ON public.safe_walks;
DROP POLICY IF EXISTS "Staff view same-college safe walks" ON public.safe_walks;
DROP POLICY IF EXISTS "Students can manage own safe walks" ON public.safe_walks;
DROP POLICY IF EXISTS "Students manage own safe walks" ON public.safe_walks;

DROP POLICY IF EXISTS "Staff view escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff and admin view escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff and admin manage escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff view same-college escalations" ON public.escalations;
DROP POLICY IF EXISTS "Authenticated users create escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff update escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff update same-college escalations" ON public.escalations;
DROP POLICY IF EXISTS "Users create authorized escalations" ON public.escalations;

-- Recreate sensitive read/write rules with tenant ownership as the authority.
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff view same-college profiles" ON public.profiles;
CREATE POLICY "Staff view same-college profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR (
      public.get_user_college_id() IS NOT NULL
      AND public.get_user_college_id() <> 'PENDING_CAMPUS_VERIFICATION'
      AND college_id = public.get_user_college_id()
    )
  )
);

CREATE POLICY "Students read own private profile" ON public.student_profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff view same-college student profiles" ON public.student_profiles;
CREATE POLICY "Staff view same-college student profiles" ON public.student_profiles
FOR SELECT TO authenticated
USING (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = public.student_profiles.id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Staff read own private profile" ON public.staff_profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff view same-college staff profiles" ON public.staff_profiles;
CREATE POLICY "Staff view same-college staff profiles" ON public.staff_profiles
FOR SELECT TO authenticated
USING (
  public.get_user_role()::TEXT IN ('ADMIN', 'SUPER_ADMIN')
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = public.staff_profiles.id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Students view own incidents" ON public.incidents
FOR SELECT TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students insert own incidents" ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Staff view same-college incidents" ON public.incidents
FOR SELECT TO authenticated
USING (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = public.incidents.student_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Students view own incident locations" ON public.incident_locations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.incidents i
    WHERE i.id = public.incident_locations.incident_id
      AND i.student_id = auth.uid()
  )
);

CREATE POLICY "Students insert own incident locations" ON public.incident_locations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.incidents i
    WHERE i.id = public.incident_locations.incident_id
      AND i.student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff view same-college incident locations" ON public.incident_locations;
CREATE POLICY "Staff view same-college incident locations" ON public.incident_locations
FOR SELECT TO authenticated
USING (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.incidents i
      JOIN public.profiles p ON p.id = i.student_id
      WHERE i.id = public.incident_locations.incident_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Users view authorized evidence" ON public.evidence
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.incidents i
    LEFT JOIN public.profiles p ON p.id = i.student_id
    WHERE i.case_id = public.evidence.case_id
      AND (
        i.student_id = auth.uid()
        OR (
          public.is_campus_staff()
          AND (
            public.get_user_role()::TEXT = 'SUPER_ADMIN'
            OR (
              p.college_id = public.get_user_college_id()
              AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
            )
          )
        )
      )
  )
);

CREATE POLICY "Users insert authorized evidence" ON public.evidence
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.incidents i
    LEFT JOIN public.profiles p ON p.id = i.student_id
    WHERE i.case_id = public.evidence.case_id
      AND (
        i.student_id = auth.uid()
        OR (
          public.is_campus_staff()
          AND (
            public.get_user_role()::TEXT = 'SUPER_ADMIN'
            OR (
              p.college_id = public.get_user_college_id()
              AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
            )
          )
        )
      )
  )
);

CREATE POLICY "Users read authorized incident messages" ON public.incident_messages
FOR SELECT TO authenticated
USING (
  (
    is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = public.incident_messages.incident_id
        AND i.student_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.incidents i
    JOIN public.profiles p ON p.id = i.student_id
    WHERE i.id = public.incident_messages.incident_id
      AND public.is_campus_staff()
      AND (
        public.get_user_role()::TEXT = 'SUPER_ADMIN'
        OR (
          p.college_id = public.get_user_college_id()
          AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
        )
      )
  )
);

CREATE POLICY "Users insert authorized incident messages" ON public.incident_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.incidents i
    LEFT JOIN public.profiles p ON p.id = i.student_id
    WHERE i.id = public.incident_messages.incident_id
      AND (
        i.student_id = auth.uid()
        OR (
          public.is_campus_staff()
          AND (
            public.get_user_role()::TEXT = 'SUPER_ADMIN'
            OR (
              p.college_id = public.get_user_college_id()
              AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
            )
          )
        )
      )
  )
);

CREATE POLICY "Students manage own safe walks" ON public.safe_walks
FOR ALL TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Staff view same-college safe walks" ON public.safe_walks
FOR SELECT TO authenticated
USING (
  public.is_security_or_admin()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = public.safe_walks.student_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Staff view same-college escalations" ON public.escalations
FOR SELECT TO authenticated
USING (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.incidents i
      JOIN public.profiles p ON p.id = i.student_id
      WHERE i.id = public.escalations.incident_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Staff update same-college escalations" ON public.escalations
FOR UPDATE TO authenticated
USING (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.incidents i
      JOIN public.profiles p ON p.id = i.student_id
      WHERE i.id = public.escalations.incident_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
)
WITH CHECK (
  public.is_campus_staff()
  AND (
    public.get_user_role()::TEXT = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1
      FROM public.incidents i
      JOIN public.profiles p ON p.id = i.student_id
      WHERE i.id = public.escalations.incident_id
        AND p.college_id = public.get_user_college_id()
        AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
    )
  )
);

CREATE POLICY "Users create authorized escalations" ON public.escalations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.incidents i
    LEFT JOIN public.profiles p ON p.id = i.student_id
    WHERE i.id = public.escalations.incident_id
      AND (
        i.student_id = auth.uid()
        OR (
          public.is_campus_staff()
          AND (
            public.get_user_role()::TEXT = 'SUPER_ADMIN'
            OR (
              p.college_id = public.get_user_college_id()
              AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
            )
          )
        )
      )
  )
);

-- Evidence objects use case_id as their first path component; older student-owned
-- objects may use the user's UUID. Keep ID-card access bound to the target profile.
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users and same-college staff read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own ID card" ON storage.objects;
DROP POLICY IF EXISTS "Students read own ID card" ON storage.objects;
DROP POLICY IF EXISTS "Users upload authorized evidence objects" ON storage.objects;
DROP POLICY IF EXISTS "Users read authorized evidence objects" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users read authorized ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Staff view evidence files" ON storage.objects;

CREATE POLICY "Users upload authorized evidence objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kavach-evidence'
  AND EXISTS (
    SELECT 1
    FROM public.incidents i
    LEFT JOIN public.profiles p ON p.id = i.student_id
    WHERE i.case_id = (storage.foldername(name))[1]
      AND (
        i.student_id = auth.uid()
        OR (
          public.is_campus_staff()
          AND (
            public.get_user_role()::TEXT = 'SUPER_ADMIN'
            OR (
              p.college_id = public.get_user_college_id()
              AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
            )
          )
        )
      )
  )
);

CREATE POLICY "Users read authorized evidence objects" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-evidence'
  AND (
    auth.uid()::TEXT = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.incidents i
      LEFT JOIN public.profiles p ON p.id = i.student_id
      WHERE i.case_id = (storage.foldername(name))[1]
        AND (
          i.student_id = auth.uid()
          OR (
            public.is_campus_staff()
            AND (
              public.get_user_role()::TEXT = 'SUPER_ADMIN'
              OR (
                p.college_id = public.get_user_college_id()
                AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
              )
            )
          )
        )
    )
  )
);

CREATE POLICY "Students upload own ID cards" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kavach-id-cards'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "Users read authorized ID cards" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-id-cards'
  AND (
    auth.uid()::TEXT = (storage.foldername(name))[1]
    OR (
      public.is_campus_staff()
      AND (
        public.get_user_role()::TEXT = 'SUPER_ADMIN'
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id::TEXT = (storage.foldername(name))[1]
            AND p.college_id = public.get_user_college_id()
            AND p.college_id <> 'PENDING_CAMPUS_VERIFICATION'
        )
      )
    )
  )
);

SELECT 'Migration 014 candidate installed. Verify effective policies and cross-college behavior using authenticated staging users.' AS status;
