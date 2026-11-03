# KAVACH CAMPUS — PHASE 4 DATABASE MIGRATION PREFLIGHT REPORT

**Project Location:** `D:\Kavach Campus`  
**Audit Type:** Deep Schema Preflight & Dependency Analysis  
**Date:** 2026-11-03  
**Status:** `CODE VERIFIED ONLY` (Live Execution: `BLOCKED` / `OWNER ACTION REQUIRED`)

---

## 1. Executive Summary

This preflight report evaluates the three unapplied database migrations:
1. `supabase/migrations/015_college_scoped_student_id_uniqueness.sql`
2. `supabase/migrations/016_safe_box_private_notes.sql`
3. `supabase/migrations/017_student_college_claims.sql` (resequenced from duplicate 015)

In accordance with strict safety rules:
* **Zero SQL scripts were executed against live production or remote Supabase.**
* Migrations were audited for idempotency, foreign key integrity, index coverage, RLS dependencies, destructive operations, and rollback limitations.
* A forward-only execution strategy is established for staging validation before any production deployment.

---

## 2. Migration Preflight Matrix

| Migration | Primary Purpose | Destructive Ops | Idempotency | Foreign Keys | RLS / Storage Policy | Staging Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `015_college_scoped_student_id_uniqueness.sql` | Replaces global partial unique index on `student_id` with compound unique index on `(college_id, student_id)`. | Index Drop Only (No data loss) | Verified (`IF NOT EXISTS`, `IF EXISTS`) | None | None | `READY FOR STAGING` |
| `016_safe_box_private_notes.sql` | Provisions `safe_box_private_notes` table for confidential student evidence annotations. | None (`CREATE TABLE IF NOT EXISTS`) | Verified (`DROP POLICY IF EXISTS ... CREATE`) | FK `evidence.id` (CASCADE), FK `profiles.id` (CASCADE) | Owner-only RLS (`auth.uid() = owner_id`) | `READY FOR STAGING` |
| `017_student_college_claims.sql` | Adds `claimed_college_id` to student profiles, `profile_photo_path` to profiles, and provisions private storage bucket `kavach-profile-photos`. | None (`ADD COLUMN IF NOT EXISTS`) | Verified (`ON CONFLICT (id) DO UPDATE`) | None | Storage object RLS (`auth.uid() = foldername[1]`) | `READY FOR STAGING` |

---

## 3. Detailed Per-Migration Analysis

### A. Migration 015: College-Scoped Student ID Uniqueness
* **File:** `supabase/migrations/015_college_scoped_student_id_uniqueness.sql`
* **Schema Changes:**
  ```sql
  DROP INDEX IF EXISTS public.idx_profiles_student_id;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id
  ON public.profiles(college_id, student_id)
  WHERE student_id IS NOT NULL AND role = 'STUDENT';
  ```
* **Dependencies:**
  - Table `public.profiles` must exist.
  - Columns `college_id`, `student_id`, and `role` must exist in `public.profiles`.
* **Destructive Operations:**
  - Drops the legacy partial index `idx_profiles_student_id`. No table or column data is dropped.
* **Idempotency Assessment:**
  - `DROP INDEX IF EXISTS` guarantees no failure if the legacy index was already removed.
  - `CREATE UNIQUE INDEX IF NOT EXISTS` guarantees safe re-runs.
* **Rollback Limitations:**
  - If distinct colleges register students with identical registration numbers while 015 is active, attempting to roll back by re-creating the global unique index (`idx_profiles_student_id`) will fail with a duplicate key constraint violation.

### B. Migration 016: Safe Box Private Notes
* **File:** `supabase/migrations/016_safe_box_private_notes.sql`
* **Schema Changes:**
  - Creates table `public.safe_box_private_notes` with primary key `evidence_id`, foreign key `owner_id`, and private note body capped at 2,000 characters.
  - Enables Row Level Security on `public.safe_box_private_notes`.
  - Grants `SELECT, INSERT, UPDATE, DELETE` to authenticated users.
* **Dependencies:**
  - Table `public.evidence` must exist.
  - Table `public.profiles` must exist.
* **Destructive Operations:** None.
* **Idempotency Assessment:**
  - `CREATE TABLE IF NOT EXISTS`
  - `DROP POLICY IF EXISTS "Students manage own Safe Box notes" ON public.safe_box_private_notes;`
  - `CREATE POLICY "Students manage own Safe Box notes" ...`
* **RLS Security Assessment:**
  - The policy strictly mandates that `owner_id = auth.uid()` AND verifies that the associated record in `public.evidence` was uploaded by `auth.uid()`.
* **Rollback Limitations:**
  - Dropping the table removes all student private notes stored within it.

### C. Migration 017: Student College Claims & Private Profile Photos
* **File:** `supabase/migrations/017_student_college_claims.sql`
* **Schema Changes:**
  - Adds `claimed_college_id TEXT` to `public.student_profiles`.
  - Adds `profile_photo_path TEXT` to `public.profiles`.
  - Creates index `idx_student_profiles_claimed_college_status` on `(claimed_college_id, verification_status)`.
  - Upserts private bucket `kavach-profile-photos` in `storage.buckets` (2MB limit, JPEG/PNG/WebP).
  - Creates owner-only SELECT policy on `storage.objects` for `kavach-profile-photos`.
* **Dependencies:**
  - Table `public.student_profiles` must exist.
  - Table `public.profiles` must exist.
  - Schema `storage` and table `storage.objects` must exist.
* **Destructive Operations:** None.
* **Idempotency Assessment:**
  - `ADD COLUMN IF NOT EXISTS`
  - `CREATE INDEX IF NOT EXISTS`
  - `ON CONFLICT (id) DO UPDATE`
  - `DROP POLICY IF EXISTS ... CREATE POLICY`

---

## 4. Staging Execution Recommendation

1. **Do NOT run directly on Production.**
2. Provision an isolated Staging Supabase project.
3. In the Staging SQL Editor, apply the migrations in strict forward sequence:
   * First: `015_college_scoped_student_id_uniqueness.sql`
   * Second: `016_safe_box_private_notes.sql`
   * Third: `017_student_college_claims.sql`
4. Confirm successful execution by querying:
   ```sql
   SELECT indexname FROM pg_indexes WHERE indexname = 'idx_profiles_college_student_id';
   SELECT table_name FROM information_schema.tables WHERE table_name = 'safe_box_private_notes';
   SELECT id, public FROM storage.buckets WHERE id = 'kavach-profile-photos';
   ```
