# KAVACH CAMPUS — PHASE 15B: MIGRATION SCRIPT VALIDATION REPORT

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Scope:** Technical Verification of Migrations 015, 016, and 017  
**Audit Date:** November 4, 2026  
**Execution Order:** **`015` → `016` → `017`**  
**Production Status:** **UNAPPLIED (STRICT READ-ONLY INSPECTION)**

---

## 1. Migration 015: College-Scoped student_id Uniqueness

**File:** [`supabase/migrations/015_college_scoped_student_id_uniqueness.sql`](file:///d:/kavach-campus/supabase/migrations/015_college_scoped_student_id_uniqueness.sql)

```sql
-- Step 1: Drop previous global unique index if exists
DROP INDEX IF EXISTS public.idx_profiles_student_id;

-- Step 2: Create college-scoped partial unique index on profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id
ON public.profiles(college_id, student_id)
WHERE student_id IS NOT NULL AND role = 'STUDENT';

-- Step 3: Add comment explaining index purpose
COMMENT ON INDEX public.idx_profiles_college_student_id IS
'Enforces student_id uniqueness scoped per college tenant to support multi-institution enrollment without ID collision.';
```

### 1.1 Technical Verification Checklist
- **Idempotency:** **PASS.** Uses `DROP INDEX IF EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS`. Can be re-executed safely without throwing `index already exists` errors.
- **Existing Schema Dependencies:** Depends on `public.profiles` having columns `college_id`, `student_id`, and `role`. Verified present in live database.
- **Index Definition & Partial Filtering:** Filter `WHERE student_id IS NOT NULL AND role = 'STUDENT'` ensures staff, admins, and unassigned accounts are never blocked by this index.
- **Existing Live Data Compatibility:** Complete scan of all 6 profile records in production confirmed **zero duplicate `(college_id, student_id)` pairs**.
- **Rollback Behavior & Data Loss:**
  - *Data Loss:* **ZERO.** Index drop/create does not alter table rows.
  - *Rollback SQL:*
    ```sql
    DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
    ON public.profiles(student_id)
    WHERE student_id IS NOT NULL AND role = 'STUDENT';
    ```
  - *Rollback Risk:* If rolled back after multiple colleges enroll students with identical IDs (e.g. `24B91A0501`), recreating the global index will fail with duplicate key violation until cross-college conflicts are resolved.

---

## 2. Migration 016: Safe Box Private Notes Table & RLS

**File:** [`supabase/migrations/016_safe_box_private_notes.sql`](file:///d:/kavach-campus/supabase/migrations/016_safe_box_private_notes.sql)

```sql
CREATE TABLE IF NOT EXISTS public.safe_box_private_notes (
  evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.safe_box_private_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own Safe Box notes" ON public.safe_box_private_notes;
CREATE POLICY "Students manage own Safe Box notes"
ON public.safe_box_private_notes
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.safe_box_private_notes
TO authenticated;
```

### 2.1 Technical Verification Checklist
- **Idempotency:** **PASS.** Uses `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS`. Can be run repeatedly without error.
- **Foreign-Key Behavior:**
  - `evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE`
  - `owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
  - Enforces exact 1:1 relationship with parent evidence item. If evidence is deleted, notes are automatically cleaned up without leaving orphaned rows.
- **RLS Enablement & Policy Scope:**
  - `ENABLE ROW LEVEL SECURITY;` is explicit.
  - Single unified policy `"Students manage own Safe Box notes"` for command `ALL` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
  - Strict ownership check: `owner_id = auth.uid()` AND `evidence.uploaded_by = auth.uid()`.
  - Administrative denial: No policies exist for staff or admins. Enforces strict zero-trust default deny.
- **Backend API Alignment:** Verified exact match with `src/app/api/student/safe-box/route.ts` (lines 62, 291).
- **Rollback Behavior & Data Loss:**
  - *Data Loss Risk:* **HIGH IF CARELESS.** Executing `DROP TABLE public.safe_box_private_notes CASCADE;` permanently deletes all student private notes stored while active. An administrative JSON export must precede any rollback.

---

## 3. Migration 017: Student Claims & Storage Bucket

**File:** [`supabase/migrations/017_student_college_claims.sql`](file:///d:/kavach-campus/supabase/migrations/017_student_college_claims.sql)

```sql
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;

CREATE INDEX IF NOT EXISTS idx_student_profiles_claimed_college_status
  ON public.student_profiles (claimed_college_id, verification_status)
  WHERE claimed_college_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kavach-profile-photos',
  'kavach-profile-photos',
  FALSE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
CREATE POLICY "Users read own profile photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-profile-photos'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);
```

### 3.1 Technical Verification Checklist
- **Idempotency:** **PASS.** Uses `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT (id) DO UPDATE`, and `DROP POLICY IF EXISTS`. Fully idempotent.
- **Schema Alterations:**
  - `claimed_college_id TEXT` on `student_profiles` safely isolates applicant institution choice from tenant permissions.
  - `profile_photo_path TEXT` on `profiles` stores avatar path.
- **Index Optimization:** Compound index on `(claimed_college_id, verification_status)` optimizes campus administrator review queues.
- **Storage Bucket Configuration:**
  - ID: `kavach-profile-photos`
  - `public: FALSE` (Private)
  - `file_size_limit: 2097152` (2 MB)
  - `allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']`
- **Storage Policy:**
  - `FOR SELECT TO authenticated USING (bucket_id = 'kavach-profile-photos' AND auth.uid()::TEXT = (storage.foldername(name))[1])`.
  - Enforces folder-level ownership isolation.
  - Direct browser client `INSERT` is omitted by design because uploads are 100% mediated server-side in `/api/student/verify-id` using the service role.
- **Rollback Behavior & Data Loss:**
  - *Data Loss Risk:* **MEDIUM.** Dropping columns `claimed_college_id` or `profile_photo_path` permanently destroys stored claims and avatar references.

---

## 4. Sequential Execution Order & Verification Queries

When authorized, execute in exact sequence: **`015` → `016` → `017`**.

```sql
-- Sequence 1: Migration 015
\i supabase/migrations/015_college_scoped_student_id_uniqueness.sql
-- Verify 015:
SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_profiles_college_student_id';

-- Sequence 2: Migration 016
\i supabase/migrations/016_safe_box_private_notes.sql
-- Verify 016:
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'safe_box_private_notes';
SELECT policyname FROM pg_policies WHERE tablename = 'safe_box_private_notes';

-- Sequence 3: Migration 017
\i supabase/migrations/017_student_college_claims.sql
-- Verify 017:
SELECT column_name FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'claimed_college_id';
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'kavach-profile-photos';
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users read own profile photos';
```

---

## 5. Migration Validation Summary

All three migration scripts have been validated for:
1. Complete idempotency (can be run repeatedly without failure).
2. Clean foreign key cascade bindings.
3. Zero-trust RLS policies with default-deny behavior for unauthorized roles.
4. Non-breaking application endpoint alignment.

