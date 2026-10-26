-- =====================================================================================
-- KAVACH CAMPUS: MIGRATION 012 — MULTI-TENANT PROFILES, STORAGE & RLS ALIGNMENT
-- =====================================================================================
-- Target Database: PostgreSQL on Supabase (Staging / Production)
-- Execution Instructions:
-- 1. Review this script thoroughly before executing in the Supabase Dashboard SQL Editor.
-- 2. Run first in your designated staging environment.
-- 3. DO NOT auto-assign unverified accounts. Ambiguous profiles are flagged as
--    'PENDING_CAMPUS_VERIFICATION' for administrative audit rather than guessing.
-- =====================================================================================

-- 1. ADD TENANT IDENTIFIER COLUMN SAFELY
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS college_id TEXT;

-- 2. VERIFIED-ONLY DOMAIN MAPPING (NO GUESSING / NO BLIND DEFAULT)
-- Only maps profiles with verified, official institutional email domains.
UPDATE public.profiles
SET college_id = 'srkr-bhimavaram'
WHERE college_id IS NULL
  AND college_email ~* '^[^@]+@(srkr\.edu\.in|srkrec\.ac\.in)$';

UPDATE public.profiles
SET college_id = 'vishnu-bhimavaram'
WHERE college_id IS NULL
  AND college_email ~* '^[^@]+@(vishnu\.edu\.in|svecw\.edu\.in)$';

-- 3. FLAG ALL AMBIGUOUS PROFILES FOR ADMINISTRATIVE AUDIT
-- Prevents cross-college contamination. Accounts without confirmed institutional domains
-- remain 'PENDING_CAMPUS_VERIFICATION' until verified by campus authority.
UPDATE public.profiles
SET college_id = 'PENDING_CAMPUS_VERIFICATION'
WHERE college_id IS NULL;

-- 4. PERFORMANCE & TENANT ISOLATION INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_college_id
  ON public.profiles (college_id);

CREATE INDEX IF NOT EXISTS idx_profiles_college_role
  ON public.profiles (college_id, role);

-- 5. TENANT ISOLATION HELPER FUNCTION (SECURITY DEFINER)
-- Non-recursive, stable function returning active user's institutional college ID.
CREATE OR REPLACE FUNCTION public.get_user_college_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT college_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_college_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_college_id() TO authenticated, service_role;

-- 6. ALIGN STORAGE BUCKET FOR MULTI-MODAL EVIDENCE (25MB & AUDIO MIME TYPES)
-- Expands kavach-evidence bucket permissions to allow voice recordings and documents.
UPDATE storage.buckets
SET 
  file_size_limit = 26214400, -- 25 MB
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'application/pdf'
  ]
WHERE id = 'kavach-evidence';

-- 7. ADMINISTRATIVE AUDIT QUERY
-- Run this query after migration to inspect any accounts requiring institutional assignment:
-- -------------------------------------------------------------------------------------
-- SELECT id, full_name, college_email, student_id, department, role, college_id
-- FROM public.profiles
-- WHERE college_id = 'PENDING_CAMPUS_VERIFICATION';
-- -------------------------------------------------------------------------------------

-- 8. ROLLBACK CONTINGENCY REFERENCE
-- -------------------------------------------------------------
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS college_id;
-- DROP INDEX IF EXISTS public.idx_profiles_college_id;
-- DROP INDEX IF EXISTS public.idx_profiles_college_role;
-- DROP FUNCTION IF EXISTS public.get_user_college_id();
-- -------------------------------------------------------------

SELECT 'Migration 012 executed: college_id column created, verified domains mapped, ambiguous accounts flagged for review, and storage aligned.' AS status;
