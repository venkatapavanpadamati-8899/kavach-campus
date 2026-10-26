-- ==============================================================================
-- Migration: 015_college_scoped_student_id_uniqueness.sql
-- Description: Enforce uniqueness of student_id within each college tenant scope
-- Status: PROPOSED — PENDING ADMINISTRATOR REVIEW & APPROVAL
-- DO NOT EXECUTE AUTOMATICALLY AGAINST REMOTE SUPABASE INSTANCE
-- ==============================================================================
-- 
-- RATIONALE:
-- Previously, migration 008 created a global partial unique index:
--   CREATE UNIQUE INDEX idx_profiles_student_id ON public.profiles(student_id)
--   WHERE student_id IS NOT NULL AND role = 'STUDENT';
-- 
-- In a multi-tenant institutional architecture with distinct colleges (e.g., SRKR,
-- Vishnu/VIT, DNR, AUCE, VRSEC), different institutions frequently issue overlapping
-- registration number sequences (e.g. '2101201045' or '21B91A0501').
-- 
-- This migration updates the unique index constraint to be compound on (college_id, student_id),
-- ensuring that each student registration number is unique within their respective college,
-- while preventing cross-college registration blocking.
-- ==============================================================================

-- Step 1: Drop previous global unique index if exists
DROP INDEX IF EXISTS public.idx_profiles_student_id;

-- Step 2: Create college-scoped partial unique index on profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id
ON public.profiles(college_id, student_id)
WHERE student_id IS NOT NULL AND role = 'STUDENT';

-- Step 3: Add comment explaining index purpose
COMMENT ON INDEX public.idx_profiles_college_student_id IS
'Enforces student_id uniqueness scoped per college tenant to support multi-institution enrollment without ID collision.';

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS:
-- In the event of a rollback, execute the following SQL in Supabase SQL Editor:
--
-- DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
-- ON public.profiles(student_id)
-- WHERE student_id IS NOT NULL AND role = 'STUDENT';
-- ==============================================================================
