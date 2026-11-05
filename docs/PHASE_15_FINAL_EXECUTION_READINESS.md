# KAVACH CAMPUS — PHASE 15: FINAL EXECUTION READINESS & SAFETY MANUAL

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Scope:** Pre-Execution Safety Protocols for Migrations 015, 016, and 017  
**Audit Date:** November 4, 2026  
**Execution Order:** **`015` → `016` → `017`**  
**Overall Readiness:** **`PARTIALLY VERIFIED — OWNER ACTION REQUIRED (BACKUP VERIFICATION)`**

---

## 1. Classification & Status Dashboard

| Item / Domain | Technical Assessment | Readiness Status | Action / Governance Dependency |
|---|---|---|---|
| **Pre-Flight Checks** | Git `main` at `a8e4636`, Phase 16 locked | **PASS** | Completed |
| **Migration 015 Safety** | Scoped unique index on `(college_id, student_id)` | **PASS** | Ready for execution upon Owner Approval |
| **Migration 016 Safety** | Safe Box private notes & strict zero-trust RLS | **PASS** | Ready for execution upon Owner Approval |
| **Migration 017 Safety** | Server-mediated profile photo upload architecture | **PASS** | Ready for execution upon Owner Approval |
| **Direct Client Storage RLS**| Optional client-side INSERT policy | **PARTIALLY VERIFIED** | Not required for current server-mediated upload pipeline |
| **Authenticated RLS Tests** | Multi-role & tenant isolation specifications | **NOT TESTED** | Safely Gated (No synthetic accounts created in prod) |
| **Cloud Backup Verification**| Restorable snapshot confirmation | **OWNER ACTION REQUIRED** | Owner must confirm dashboard backup via Checklist |
| **Demo Infrastructure** | Mobile Demo OTP `123456` & demo flags | **PASS (100% PRESERVED)** | Protected |
| **Production Data** | 40 incidents, 481 audit logs, 34 OTPs, 8 users | **PASS (100% PRESERVED)** | Preservation mandated |

---

## 2. Granular Migration Safety Protocols

### 2.1 MIGRATION 015: College-Scoped student_id Uniqueness
**File:** `supabase/migrations/015_college_scoped_student_id_uniqueness.sql`

- **Pre-Execution Check:**
  ```sql
  -- Verify no duplicate student IDs exist within the same college:
  SELECT college_id, student_id, COUNT(*) 
  FROM public.profiles 
  WHERE student_id IS NOT NULL AND role = 'STUDENT' 
  GROUP BY college_id, student_id 
  HAVING COUNT(*) > 1;
  -- Result must be 0 rows. (Verified: 0 duplicate rows exist).
  ```
- **Exact Schema Changes:**
  - `DROP INDEX IF EXISTS public.idx_profiles_student_id;`
  - `CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id ON public.profiles(college_id, student_id) WHERE student_id IS NOT NULL AND role = 'STUDENT';`
- **Post-Execution Verification Query:**
  ```sql
  SELECT indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename = 'profiles' AND indexname = 'idx_profiles_college_student_id';
  -- Confirms index presence and partial WHERE clause.
  ```
- **Failure Handling:** If the index creation encounters a lock timeout or conflict, the transaction aborts with zero table mutation.
- **Rollback Risks & Data Loss:**
  - *Data Loss Risk:* **NONE.** Modifying indexes does not alter table data.
  - *Rollback Risk:* If rolled back to the old global index `idx_profiles_student_id`, and two students with identical IDs from different colleges enrolled in the interim, the rollback will fail until duplicate cross-college IDs are resolved.

---

### 2.2 MIGRATION 016: Safe Box Private Notes
**File:** `supabase/migrations/016_safe_box_private_notes.sql`

- **Pre-Execution Check:**
  ```sql
  -- Confirm evidence table exists and has RLS enabled:
  SELECT relname, relrowsecurity 
  FROM pg_class 
  WHERE relname = 'evidence';
  ```
- **Exact Schema Changes:**
  - `CREATE TABLE IF NOT EXISTS public.safe_box_private_notes (...)`
  - `ALTER TABLE public.safe_box_private_notes ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "Students manage own Safe Box notes" ON public.safe_box_private_notes ...`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_box_private_notes TO authenticated;`
- **Post-Execution Verification Query:**
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename = 'safe_box_private_notes';

  SELECT policyname, permissive, roles, cmd, qual 
  FROM pg_policies 
  WHERE tablename = 'safe_box_private_notes';
  ```
- **Failure Handling:** If table creation fails, foreign key references are not established. Existing tables (`evidence`, `profiles`) are unaffected.
- **Rollback Risks & Data Loss:**
  - *Data Loss Risk:* **HIGH IF EXECUTED CARELESSLY.** Running `DROP TABLE safe_box_private_notes;` will permanently destroy all private notes created by students. A rollback must export notes to JSON before dropping.
  - *Rollback Risk:* Low schema impact; child tables do not depend on `safe_box_private_notes`.

---

### 2.3 MIGRATION 017: Student College Claims & Storage Bucket
**File:** `supabase/migrations/017_student_college_claims.sql`

- **Pre-Execution Check:**
  ```sql
  -- Confirm storage.buckets table exists:
  SELECT COUNT(*) FROM storage.buckets;
  ```
- **Exact Schema Changes:**
  - `ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;`
  - `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;`
  - `CREATE INDEX IF NOT EXISTS idx_student_profiles_claimed_college_status ON public.student_profiles (claimed_college_id, verification_status) WHERE claimed_college_id IS NOT NULL;`
  - `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('kavach-profile-photos', ...) ON CONFLICT DO UPDATE ...;`
  - `CREATE POLICY "Users read own profile photos" ON storage.objects ...;`
- **Post-Execution Verification Query:**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'student_profiles' AND column_name = 'claimed_college_id';

  SELECT id, public, file_size_limit 
  FROM storage.buckets 
  WHERE id = 'kavach-profile-photos';

  SELECT policyname FROM pg_policies 
  WHERE tablename = 'objects' AND policyname = 'Users read own profile photos';
  ```
- **Failure Handling:** Handled gracefully via `IF NOT EXISTS` and `ON CONFLICT DO UPDATE`.
- **Rollback Risks & Data Loss:**
  - *Data Loss Risk:* **MEDIUM.** Dropping columns `claimed_college_id` or `profile_photo_path` permanently destroys student claims and avatar pointers.
  - *Storage Bucket Deletion:* Deleting bucket `kavach-profile-photos` destroys all student profile photos.

---

## 3. Strict Absolute Protections

Throughout all pre-flight and readiness assessments, the following protections remain **100% ENFORCED**:
- Mobile Demo OTP `123456`: PRESERVED.
- Email OTP verification: PRESERVED.
- `ENABLE_DEMO_OTP=true` & `ENABLE_DEMO_SMS=true`: PRESERVED.
- All 40 incidents, 481 audit logs, 34 OTP records, 8 Auth accounts: PRESERVED.
- All 5 storage folders in `kavach-id-cards`: PRESERVED.
- Phase 16 cleanup script: PERMANENTLY LOCKED.
- Phase 17 (GitHub Push) and Phase 18 (Vercel Deployment): SAFELY PAUSED.

---

## 4. Final Approval Gate

> [!IMPORTANT]
> **NO MIGRATIONS WILL BE EXECUTED AUTOMATICALLY.**  
>
> Execution requires:
> 1. Owner review and completion of [**`docs/PHASE_15_BACKUP_OWNER_CHECKLIST.md`**](file:///d:/kavach-campus/docs/PHASE_15_BACKUP_OWNER_CHECKLIST.md).
> 2. Explicit owner approval command:
>    ```text
>    APPROVE PHASE 15 SUPABASE MIGRATIONS
>    ```
