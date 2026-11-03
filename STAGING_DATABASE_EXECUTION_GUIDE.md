# KAVACH CAMPUS — STAGING DATABASE MIGRATION EXECUTION GUIDE

**Project Location:** `D:\Kavach Campus`  
**Target Database:** Supabase PostgreSQL Database  
**Author:** Database Security Engineer  
**Audit Timestamp:** 2026-11-03T18:00:30+05:30  
**Execution Permission:** **PENDING OPERATOR APPROVAL (DO NOT RUN AUTOMATICALLY)**  

---

## 1. Migration Ledger & Status

| Migration File | Description | Codebase Status | Live Database Status |
| :--- | :--- | :---: | :---: |
| `001_kavach_campus.sql` through `014_cross_college_rls_hardening.sql` | Core schema, multi-tenant college tables, RLS isolation policies | Verified | **APPLIED** |
| `015_student_college_claims.sql` | Student onboarding college claims & private profile photo storage bucket | **READY** | **PENDING EXECUTION** |
| `016_safe_box_private_notes.sql` | Private notes vault for student evidence with strict owner-only RLS | **READY** | **PENDING EXECUTION** |

---

## 2. Technical Inspection & Verification of Migrations 015 & 016

### A. Migration 015: `supabase/migrations/015_student_college_claims.sql`
* **Purpose:** Separates student registration claims from verified college tenant assignment. Adds support for private profile photos in Supabase Storage.
* **SQL Actions:**
  1. `ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;`
  2. `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;`
  3. `CREATE INDEX IF NOT EXISTS idx_student_profiles_claimed_college_status ON public.student_profiles (claimed_college_id, verification_status) WHERE claimed_college_id IS NOT NULL;`
  4. Inserts/Updates storage bucket `kavach-profile-photos` with `public = FALSE`, `file_size_limit = 2097152` (2MB), and allowed MIME types `['image/jpeg', 'image/png', 'image/webp']`.
  5. Drops and recreates RLS policy `"Users read own profile photos"` on `storage.objects` ensuring `auth.uid()::TEXT = (storage.foldername(name))[1]`.
* **Idempotency:** 100% idempotent via `IF NOT EXISTS` and `ON CONFLICT (id) DO UPDATE`.
* **Rollback Script (if needed):**
  ```sql
  DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
  DROP INDEX IF EXISTS idx_student_profiles_claimed_college_status;
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_photo_path;
  ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS claimed_college_id;
  DELETE FROM storage.buckets WHERE id = 'kavach-profile-photos';
  ```

---

### B. Migration 016: `supabase/migrations/016_safe_box_private_notes.sql`
* **Purpose:** Provides encrypted/private notes attached to Safe Box evidence that only the verified creator can view or modify.
* **SQL Actions:**
  1. Creates table `public.safe_box_private_notes`:
     * `evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE`
     * `owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
     * `private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000)`
     * `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  2. Enables Row-Level Security: `ALTER TABLE public.safe_box_private_notes ENABLE ROW LEVEL SECURITY;`
  3. Drops and creates policy `"Students manage own Safe Box notes"` for `ALL` operations:
     * Enforces `owner_id = auth.uid()`
     * Enforces cross-table ownership check: `EXISTS (SELECT 1 FROM public.evidence WHERE evidence.id = safe_box_private_notes.evidence_id AND evidence.uploaded_by = auth.uid())`
  4. Grants `SELECT, INSERT, UPDATE, DELETE` to role `authenticated`.
* **Idempotency:** Idempotent via `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS`.
* **Rollback Script (if needed):**
  ```sql
  DROP TABLE IF EXISTS public.safe_box_private_notes CASCADE;
  ```

---

## 3. Step-by-Step Operator Execution Checklist

When ready to apply migrations to Staging or Production:

1. [ ] Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. [ ] Select your Kavach Campus project.
3. [ ] Navigate to the **SQL Editor** tab on the left navigation bar.
4. [ ] Click **"New Query"**.
5. [ ] Copy and paste the entire contents of `supabase/migrations/015_student_college_claims.sql` and click **"Run"**.
   * *Expected output:* `Success. No rows returned.`
6. [ ] Click **"New Query"**.
7. [ ] Copy and paste the entire contents of `supabase/migrations/016_safe_box_private_notes.sql` and click **"Run"**.
   * *Expected output:* `Success. No rows returned.`
8. [ ] Verify table presence in **Table Editor**:
   * Confirm `student_profiles` has column `claimed_college_id`.
   * Confirm `safe_box_private_notes` table is created and has RLS enabled (shield icon active).
