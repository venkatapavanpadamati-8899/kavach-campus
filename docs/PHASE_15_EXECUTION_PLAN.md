# Phase 15 — Remote Migration Execution Plan & Step-by-Step Procedure

**Date:** November 4, 2026  
**Lead DBA & DevOps Engineer:** Antigravity AI Agent  
**Supabase SQL Editor URL:** `https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/sql`  
**Execution Gate:** AWAITING EXPLICIT OWNER APPROVAL (`APPROVE PHASE 15 SUPABASE MIGRATIONS`)  

---

## 1. Sequence of Execution

Migrations must be executed **sequentially, one at a time**, with intermediate verification after each step. Never run all three scripts concurrently.

### Step 1: Migration 015 (`015_college_scoped_student_id_uniqueness.sql`)
1. Open Supabase SQL Editor.
2. Paste the SQL script:
   ```sql
   DROP INDEX IF EXISTS public.idx_profiles_student_id;

   CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id
   ON public.profiles(college_id, student_id)
   WHERE student_id IS NOT NULL AND role = 'STUDENT';

   COMMENT ON INDEX public.idx_profiles_college_student_id IS
   'Enforces student_id uniqueness scoped per college tenant to support multi-institution enrollment without ID collision.';
   ```
3. Click **Run**.
4. **Verification Query**:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_college_student_id';
   ```
   *Expected Output*: 1 row showing `idx_profiles_college_student_id`.

---

### Step 2: Migration 016 (`016_safe_box_private_notes.sql`)
1. In a new SQL Editor query window, paste:
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
2. Click **Run**.
3. **Verification Query**:
   ```sql
   SELECT table_name, rowsecurity FROM information_schema.tables t JOIN pg_tables pt ON t.table_name = pt.tablename WHERE table_name = 'safe_box_private_notes';
   ```
   *Expected Output*: `safe_box_private_notes` with `rowsecurity = true`.

---

### Step 3: Migration 017 (`017_student_college_claims.sql`)
1. In a new SQL Editor query window, paste:
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
2. Click **Run**.
3. **Verification Query**:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'claimed_college_id';
   SELECT id, name, public FROM storage.buckets WHERE id = 'kavach-profile-photos';
   ```
   *Expected Output*: Column `claimed_college_id` exists; Bucket `kavach-profile-photos` exists with `public = false`.

---

## 2. Immediate Post-Migration Automated Check
After the owner executes the SQL in the Supabase Dashboard, Antigravity will run:
```bash
npx tsx --env-file=.env.local scripts/verify_database_rls_and_schema.ts
```
Expected output: All 3 migrations will show `APPLIED` with 0 errors.

---

> [!IMPORTANT]
> ### 🛑 STOP — APPROVAL GATE
> **No SQL migrations have been executed.**
> Awaiting owner approval:
> ```
> APPROVE PHASE 15 SUPABASE MIGRATIONS
> ```

