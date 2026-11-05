# KAVACH CAMPUS — PHASE 15: FINAL SECURITY AUDIT

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Database:** Supabase Cloud (`https://dvyiclyyvmsfipzrdowu.supabase.co`)  
**Scope:** Migration 015, 016, 017 — Read-Only Verification  
**Audit Date:** November 4, 2026  
**Execution Mode:** READ-ONLY VERIFICATION (NO MIGRATION EXECUTED)  
**Overall Readiness Verdict:** **`PARTIALLY VERIFIED — OWNER ACTION REQUIRED (BACKUP & APPROVAL GATE)`**

---

## 1. Executive Summary

A comprehensive, independent security audit of pending migrations 015, 016, and 017 was conducted against the live production Supabase instance and the Next.js application codebase.

### Audit Summary Matrix

| Migration | File | Focus Area | Technical Verdict | Execution Readiness |
|---|---|---|---|---|
| **015** | `015_college_scoped_student_id_uniqueness.sql` | Multi-tenant Registration Uniqueness | **PASS** | Ready for execution upon Owner Approval |
| **016** | `016_safe_box_private_notes.sql` | Safe Box Private Notes & Strict RLS | **PASS** | Ready for execution upon Owner Approval |
| **017** | `017_student_college_claims.sql` | College Claims & Profile Photo Storage | **PARTIALLY VERIFIED** | Policy Gap identified for direct client storage upload; Owner Action Required |
| **RLS** | Multi-Role Authenticated Isolation | Cross-User / Cross-College Separation | **NOT TESTED** | Safely Gated (No synthetic accounts created in prod; requires owner test session) |
| **Backup**| Point-in-Time & Snapshot Verification | Disaster Recovery Assurance | **OWNER ACTION REQUIRED** | Verification in Supabase Dashboard required prior to running DDL |

---

## 2. Pre-Flight Verification

- **Git Branch:** `main`
- **Git HEAD Commit:** `a8e4636 security: complete Phase 13A remediation and final review`
- **Phase 16 Cleanup Status:** **CLOSED — PRESERVATION MANDATED.** Script `scripts/execute_cleanup_after_approval.ts` is permanently locked.
- **Live Database Record Counts (Confirmed Untouched):**
  - `incidents`: **40** (Preserved)
  - `audit_logs`: **481** (Preserved)
  - `user_otp_verifications`: **34** (Preserved)
  - `auth.users`: **8** (Preserved)
  - Total public schema records: **670** (Preserved)

---

## 3. Migration 015 In-Depth Security Audit

**File:** [`supabase/migrations/015_college_scoped_student_id_uniqueness.sql`](file:///d:/kavach-campus/supabase/migrations/015_college_scoped_student_id_uniqueness.sql)

### 3.1 Existing Index and Constraints
- Migration 008 previously defined:
  ```sql
  CREATE UNIQUE INDEX idx_profiles_student_id ON public.profiles(student_id)
  WHERE student_id IS NOT NULL AND role = 'STUDENT';
  ```
- This index enforced *global* uniqueness across all colleges. In a multi-tenant institutional setup, different colleges often assign overlapping student registration IDs (e.g. `24B91A0501`).

### 3.2 Live Database Student Profile Scan
An audit of all 6 profile records in `public.profiles` was performed:
- `bhuvan` (`vsbmanoharpopuri@gmail.com`): `student_id = '2456765789'`, `college_id = 'PENDING_CAMPUS_VERIFICATION'`
- `pavan` (`pavan@gmail.com`): `student_id = '24B91A05P0'`, `college_id = 'srkr'`
- `Keerthi Padamati` (`keerthipadamati1@gmail.com`): `student_id = '24B91W23'`, `college_id = 'PENDING_CAMPUS_VERIFICATION'`
- `nani` (`nani@gmail.com`): `student_id = '24B91A05P3'`, `role = 'STAFF'` (Excluded from partial index via `role = 'STUDENT'`)
- Super Admin & Admin: `role = 'SUPER_ADMIN'` / `ADMIN` (Excluded from partial index)

**Duplicate Check Result:** **ZERO duplicate `(college_id, student_id)` pairs exist.**

### 3.3 Handling of NULL and Pending College IDs
- `idx_profiles_college_student_id ON public.profiles(college_id, student_id) WHERE student_id IS NOT NULL AND role = 'STUDENT'`.
- In PostgreSQL, rows with `college_id = 'PENDING_CAMPUS_VERIFICATION'` are indexed normally.
- If `college_id` is ever strictly `NULL`, PostgreSQL treats `NULL` values as distinct unless `NULLS NOT DISTINCT` is explicitly passed. In Kavach Campus, unverified students are assigned string literal `'PENDING_CAMPUS_VERIFICATION'`, ensuring active index enforcement.

### 3.4 Application Query Impact
- In `src/app/api/auth/register/route.ts` (lines 205–215):
  ```typescript
  const effectiveCollege = assignedCollegeId !== 'PENDING_CAMPUS_VERIFICATION' ? assignedCollegeId : null;
  let query = supabase.from('profiles').select('id').eq('student_id', validatedRegNumber);
  if (effectiveCollege) query = query.eq('college_id', effectiveCollege);
  ```
- When `effectiveCollege` is provided, PostgreSQL will leverage `idx_profiles_college_student_id` directly.
- **Architectural Note:** In `idx_profiles_college_student_id(college_id, student_id)`, `college_id` is the leading column. For queries filtering solely on `student_id` without college context, PostgreSQL will perform a bitmap or filter scan. Because `profiles` is small, this has zero latency penalty.
- **Verdict on Migration 015:** **PASS.** Safe to execute.

---

## 4. Migration 016 In-Depth Security Audit

**File:** [`supabase/migrations/016_safe_box_private_notes.sql`](file:///d:/kavach-campus/supabase/migrations/016_safe_box_private_notes.sql)

### 4.1 Schema & Foreign Key Constraints
```sql
CREATE TABLE IF NOT EXISTS public.safe_box_private_notes (
  evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- **Primary Key:** `evidence_id UUID PRIMARY KEY` (guarantees a 1:1 relationship between an evidence record and its private note).
- **Cascade Behavior:** If an evidence item or a user profile is deleted, its private note is automatically cleaned up via `ON DELETE CASCADE`.

### 4.2 RLS Policy & Zero-Trust Isolation
```sql
CREATE POLICY "Students manage own Safe Box notes"
ON public.safe_box_private_notes
FOR ALL TO authenticated
USING (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
);
```
- **Student Privacy:** A student can only select, insert, update, or delete a note if `owner_id = auth.uid()` AND `evidence.uploaded_by = auth.uid()`.
- **Administrative Denial:** No policy grants `STAFF`, `HOD`, `PRINCIPAL`, `ADMIN`, or `SUPER_ADMIN` access to `safe_box_private_notes`. In PostgreSQL RLS, lack of an affirmative policy results in **strict default deny**. Neither campus staff nor super admins can view private student notes via client queries.
- **Recursion Analysis:** `safe_box_private_notes` queries `public.evidence`. The RLS policies on `public.evidence` query `public.incidents`. Neither `public.evidence` nor `public.incidents` queries `safe_box_private_notes`. **Zero circular dependency; no infinite recursion possible.**

### 4.3 Backend API Alignment
- In `src/app/api/student/safe-box/route.ts`:
  - Fetch query: `.from('safe_box_private_notes').select('evidence_id, private_note').eq('owner_id', user.id).in('evidence_id', ...)`
  - Insert query: `.from('safe_box_private_notes').insert({ evidence_id: record.id, owner_id: user.id, private_note: privateNote })`
  - Table name, column names, and error handling for `42P01` (table missing before migration) are 100% aligned.
- **Verdict on Migration 016:** **PASS.** Safe to execute.

---

## 5. Migration 017 In-Depth Security Audit

**File:** [`supabase/migrations/017_student_college_claims.sql`](file:///d:/kavach-campus/supabase/migrations/017_student_college_claims.sql)

### 5.1 Schema Alterations
- `ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;`
  - Stores self-selected institution during registration without granting tenant permissions.
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;`
  - Stores path of user avatar / ID photo in object storage.
- `CREATE INDEX IF NOT EXISTS idx_student_profiles_claimed_college_status ON public.student_profiles (claimed_college_id, verification_status) WHERE claimed_college_id IS NOT NULL;`
  - Optimizes administrative review queues.

### 5.2 Storage Bucket & Policy Analysis
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kavach-profile-photos', 'kavach-profile-photos', FALSE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = FALSE, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY "Users read own profile photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-profile-photos'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);
```

### 5.3 Storage Security Gap Identified
- **SELECT Policy:** Enforces user folder isolation: `auth.uid()::TEXT = (storage.foldername(name))[1]`. A student cannot read another student's photo.
- **Policy Gap:** Migration 017 provides **ONLY a SELECT policy** on `storage.objects`. It omits `INSERT`, `UPDATE`, and `DELETE` policies for `kavach-profile-photos`.
- **Application Context:**
  - In `src/app/api/student/verify-id/route.ts`, the profile photo is uploaded and committed via `adminSupabase` (server `service_role` key), which bypasses Storage RLS.
  - However, if a client attempts direct client-side photo upload via the frontend Supabase SDK, the upload will be rejected with `403 Access Denied`.
- **Recommendation:** If client-side uploads are planned, add an authenticated `INSERT` policy:
  ```sql
  CREATE POLICY "Users upload own profile photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kavach-profile-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
  ```
- **Verdict on Migration 017:** **PARTIALLY VERIFIED (Service-role uploads functional; direct client insert policy missing).**

---

## 6. Authenticated RLS Test Plan Status

- **Status:** **NOT TESTED (Safely Gated).**
- **Reason:** In accordance with the prompt's explicit mandate: *"If safe test identities are unavailable, mark these tests NOT TESTED. Do not create synthetic users in production."*
- Real user credentials/JWTs are not exposed or used. A complete, mockable test suite is documented in [`docs/PHASE_15_AUTHENTICATED_RLS_TEST_PLAN.md`](file:///d:/kavach-campus/docs/PHASE_15_AUTHENTICATED_RLS_TEST_PLAN.md) for post-deployment or staging verification.

---

## 7. Backup & Rollback Readiness

- **Physical Backup File on Disk:** None exists locally.
- **Supabase Cloud Disaster Recovery:** Point-In-Time-Recovery (PITR) and automated daily snapshots are managed in the Supabase Dashboard (`https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/database/backups`).
- **Owner Action Required:** The institutional owner must verify a recent healthy snapshot exists in the Supabase Dashboard before executing DDL.
- **Rollback Safety Analysis:**
  - 015 Rollback: Re-creates global unique index. Safe if no duplicate cross-college IDs were registered.
  - 016 Rollback: `DROP TABLE safe_box_private_notes CASCADE`. **Caution:** Deletes all private notes created while active.
  - 017 Rollback: `ALTER TABLE ... DROP COLUMN`. **Caution:** Deletes claimed colleges and profile photo paths.

---

## 8. Final Approval Gate

> [!IMPORTANT]
> **NO MIGRATIONS HAVE BEEN EXECUTED.**  
>
> Execution should proceed only after:
> 1. Owner verifies the latest Supabase backup snapshot in the Cloud Dashboard.
> 2. Owner provides explicit approval command:
>    ```text
>    APPROVE PHASE 15 SUPABASE MIGRATIONS
>    ```

