-- =====================================================================================
-- KAVACH CAMPUS: MIGRATION 009 — STUDENT ID VERIFICATION & RESUBMISSION ENHANCEMENT
-- =====================================================================================
-- 1. Updates verification_status constraint to include 'RESUBMISSION_REQUIRED'
-- 2. Enforces trigger preventing student self-approval to 'VERIFIED' status
-- 3. Ensures private storage bucket 'kavach-id-cards' exists with strict RLS
-- =====================================================================================

-- 1. Update verification_status check constraint
DO $$ BEGIN
    ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS check_verification_status;
    ALTER TABLE public.student_profiles
    ADD CONSTRAINT check_verification_status
    CHECK (verification_status IN (
        'PENDING_UPLOAD',
        'PENDING_VERIFICATION',
        'PENDING_MANUAL_REVIEW',
        'VERIFIED',
        'REJECTED',
        'RESUBMISSION_REQUIRED'
    ));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update failed or already applied: %', SQLERRM;
END $$;

-- 2. Trigger preventing students from self-approving to 'VERIFIED'
CREATE OR REPLACE FUNCTION public.prevent_student_self_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only security officers or administrators can approve verification
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

-- 3. Ensure private storage bucket 'kavach-id-cards' is configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('kavach-id-cards', 'kavach-id-cards', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 4. Storage RLS Policies for ID Cards (Private)
DROP POLICY IF EXISTS "Students upload own ID card" ON storage.objects;
CREATE POLICY "Students upload own ID card" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'kavach-id-cards'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Students read own ID card" ON storage.objects;
CREATE POLICY "Students read own ID card" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'kavach-id-cards'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.is_staff()
    )
);

-- 5. Audit record (entity_type column as per migration 010 schema alignment)
INSERT INTO public.audit_logs (
    id,
    action,
    entity_type,
    metadata,
    created_at
)
VALUES (
    gen_random_uuid(),
    'SCHEMA_MIGRATION_009',
    'student_profiles',
    jsonb_build_object('description', 'Student ID verification resubmission status and self-approval prevention trigger applied'),
    NOW()
);
