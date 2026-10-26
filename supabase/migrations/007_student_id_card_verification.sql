-- ==============================================================================
-- KAVACH CAMPUS: MIGRATION 007 — STUDENT ID CARD & ACADEMIC BATCH VERIFICATION
-- ==============================================================================
-- 1. Adds academic batch (Regular 4-year, Lateral Entry 3-year) & ID verification columns
-- 2. Enforces unique student_id constraint to prevent duplicate registrations
-- 3. Configures private storage bucket 'kavach-id-cards' and RLS policies
-- ==============================================================================

-- 1. Alter student_profiles table with verification columns
ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS admission_type TEXT DEFAULT 'REGULAR',
    ADD COLUMN IF NOT EXISTS admission_year INT,
    ADD COLUMN IF NOT EXISTS expected_graduation_year INT,
    ADD COLUMN IF NOT EXISTS id_card_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING_UPLOAD',
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB;

-- 2. Add validation constraints if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_admission_type'
    ) THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT check_admission_type
        CHECK (admission_type IN ('REGULAR', 'LATERAL_ENTRY'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_verification_status'
    ) THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT check_verification_status
        CHECK (verification_status IN ('PENDING_UPLOAD', 'PENDING_VERIFICATION', 'PENDING_MANUAL_REVIEW', 'VERIFIED', 'REJECTED'));
    END IF;
END $$;

-- 3. Unique index on student_id to prevent duplicate registrations with same 10-digit ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
ON public.profiles(student_id)
WHERE student_id IS NOT NULL AND role = 'STUDENT';

-- 4. Index for quick filtering of pending verifications
CREATE INDEX IF NOT EXISTS idx_student_profiles_verification_status
ON public.student_profiles(verification_status);

-- 5. Create private storage bucket for student ID cards
INSERT INTO storage.buckets (id, name, public)
VALUES ('kavach-id-cards', 'kavach-id-cards', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 6. Storage RLS Policies for ID Cards (Private)
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
        OR public.is_security_or_admin()
    )
);

-- 7. Audit log event
INSERT INTO public.audit_logs (
    action,
    details,
    created_at
)
VALUES (
    'SCHEMA_MIGRATION_007',
    jsonb_build_object('description', 'Student ID Card Verification and Academic Batch Validation schema applied'),
    NOW()
);
