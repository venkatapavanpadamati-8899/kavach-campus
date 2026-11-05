# KAVACH CAMPUS — DATABASE MIGRATION REVIEW & IMPACT ASSESSMENT

**Repository**: [`https://github.com/venkatapavanpadamati-8899/kavach-campus`](https://github.com/venkatapavanpadamati-8899/kavach-campus)  
**Workspace Root**: `D:\kavach-campus`  
**Review Date**: November 4, 2026  
**Status**: **PROPOSED — STRICTLY PENDING MANUAL OWNER APPROVAL & EXECUTION**  
**Execution Guard**: **NO MIGRATIONS HAVE BEEN OR WILL BE EXECUTED AUTOMATICALLY**  

---

## 1. MIGRATION 015: COLLEGE-SCOPED STUDENT ID UNIQUENESS

* **File**: [`supabase/migrations/015_college_scoped_student_id_uniqueness.sql`](file:///d:/kavach-campus/supabase/migrations/015_college_scoped_student_id_uniqueness.sql)
* **What It Changes**:
  * Drops the legacy global unique index `idx_profiles_student_id` on `profiles(student_id)`.
  * Creates a compound partial unique index `idx_profiles_college_student_id` on `profiles(college_id, student_id)` where `student_id IS NOT NULL AND role = 'STUDENT'`.
* **Why It Is Required**:
  * Different institutions (e.g. SRKR Engineering College, Vishnu Institute of Technology, DNR College) frequently issue the exact same registration numbers (e.g., `2101201045` or `21B91A0501`).
  * A global index blocks students of College B if a student with the same registration number enrolled in College A. The compound index scopes uniqueness per college tenant.
* **Tables & Columns Affected**:
  * Table: `public.profiles`
  * Columns: `college_id`, `student_id`
* **Potential Data Impact**: **Zero Data Loss**. It only alters an index constraint. Existing rows remain completely unaffected.
* **Security Impact**: Positive. Enforces strict multi-tenant student ID boundaries.
* **Execution Safety Assessment**: **SAFE TO EXECUTE**.
* **Rollback Plan Included**:
  ```sql
  DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
  ON public.profiles(student_id)
  WHERE student_id IS NOT NULL AND role = 'STUDENT';
  ```

---

## 2. MIGRATION 016: SAFE BOX PRIVATE CONFIDENTIAL NOTES

* **File**: [`supabase/migrations/016_safe_box_private_notes.sql`](file:///d:/kavach-campus/supabase/migrations/016_safe_box_private_notes.sql)
* **What It Changes**:
  * Creates table `public.safe_box_private_notes` with columns:
    * `evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE`
    * `owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
    * `private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000)`
    * `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  * Enables Row Level Security (RLS) on `safe_box_private_notes`.
  * Adds RLS policy: `"Students manage own Safe Box notes"` strictly matching `owner_id = auth.uid()` and verified ownership in `public.evidence`.
* **Why It Is Required**:
  * Allows students to attach private personal notes (up to 2,000 characters) to their confidential uploaded evidence without exposing those personal notes to general campus staff responders.
* **Tables & Columns Affected**:
  * New Table: `public.safe_box_private_notes`
  * Existing Tables Linked: `public.evidence`, `public.profiles` (via foreign keys with `ON DELETE CASCADE`)
* **Potential Data Impact**: **Zero Data Loss**. Creates a new dedicated table.
* **Security Impact**: High Positive. Confidential notes are guarded by strict RLS and are never readable by unauthorized users or staff without explicit student assignment.
* **Execution Safety Assessment**: **SAFE TO EXECUTE**.
* **Rollback Plan**:
  ```sql
  DROP TABLE IF EXISTS public.safe_box_private_notes CASCADE;
  ```

---

## 3. MIGRATION 017: STUDENT COLLEGE CLAIMS & PROFILE PHOTOS

* **File**: [`supabase/migrations/017_student_college_claims.sql`](file:///d:/kavach-campus/supabase/migrations/017_student_college_claims.sql)
* **What It Changes**:
  * Adds column `claimed_college_id TEXT` to `public.student_profiles`.
  * Adds column `profile_photo_path TEXT` to `public.profiles`.
  * Adds partial index `idx_student_profiles_claimed_college_status` on `student_profiles(claimed_college_id, verification_status)`.
  * Creates private Storage Bucket `kavach-profile-photos` with a 2MB size limit and allowed MIME types (`image/jpeg`, `image/png`, `image/webp`).
  * Adds RLS policy `"Users read own profile photos"` on `storage.objects` for `kavach-profile-photos`.
* **Why It Is Required**:
  * When an applicant registers using a personal email (e.g. Gmail), they claim an institution for review (`claimed_college_id`) without being immediately granted full tenant privileges before admin review.
  * Provides secure, private storage for student identification photos.
* **Tables & Columns Affected**:
  * Table: `public.student_profiles` -> `claimed_college_id TEXT`
  * Table: `public.profiles` -> `profile_photo_path TEXT`
  * Storage Bucket: `kavach-profile-photos`
* **Potential Data Impact**: **Zero Data Loss**. Uses `ADD COLUMN IF NOT EXISTS`.
* **Security Impact**: High Positive. Prevents premature tenant membership before ID verification.
* **Execution Safety Assessment**: **SAFE TO EXECUTE**.
* **Rollback Plan**:
  ```sql
  ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS claimed_college_id;
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_photo_path;
  DROP INDEX IF EXISTS public.idx_student_profiles_claimed_college_status;
  DELETE FROM storage.buckets WHERE id = 'kavach-profile-photos';
  ```

---

## 4. HOW TO EXECUTE (OWNER ACTION INSTRUCTIONS)

1. Open your Supabase Dashboard: [`https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql`](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql)
2. Copy and paste the contents of each file in order:
   - First: `015_college_scoped_student_id_uniqueness.sql`
   - Second: `016_safe_box_private_notes.sql`
   - Third: `017_student_college_claims.sql`
3. Click **"Run"** in the Supabase SQL editor.

