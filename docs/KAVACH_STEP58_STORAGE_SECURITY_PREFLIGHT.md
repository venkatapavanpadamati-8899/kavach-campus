# KAVACH CAMPUS — STEP 58: STORAGE SECURITY PREFLIGHT & SAFE REMEDIATION PLAN

**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** 2026-10-11T20:07:00+05:30  
**Project ID / Remote Database:** Supabase PostgreSQL (`polbnvszmvblwenfnqll`)  
**Audit Mode:** Read-Only Audit & Safe Proposed Remediation (No Direct Production SQL Execution)  
**Overall Readiness Verdict:** **CONDITIONAL / PENDING REMOTE VERIFICATION** (Not 100% Production Ready)

---

## 1. Executive Summary

A comprehensive, read-only audit of Kavach Campus storage configurations, upload/download application pathways, and remote database bucket properties was conducted following user verification screenshots. 

### Key Audit Findings:
1. **Bucket Privacy:** **PASS** — Both `kavach-evidence` and `kavach-id-cards` buckets are strictly private (`public = false`). Direct public object reads are blocked.
2. **Bucket-Level Limits:** **FAIL / DEFECT CONFIRMED** — Remote database inspection confirmed `file_size_limit = NULL` and `allowed_mime_types = NULL` on both `kavach-evidence` and `kavach-id-cards`. While client and API route validation exists in the application codebase, the storage engine itself currently accepts arbitrary file sizes and MIME types if bypassed.
3. **Storage Policies (pg_policies):** **NOT VERIFIED ON REMOTE** — Screenshot inspection showed 4 policies (`Authenticated users upload evidence`, `Students read own ID card`, `Students upload own ID card`, `Users and staff read evidence`). However, remote `qual` and `with_check` clauses could not be verified from screenshots alone. STEP 59 SQL execution is required to verify the exact conditions.
4. **Tamper & Deletion Protection:** **PASS** — Zero `UPDATE` and zero `DELETE` policies exist on `storage.objects`, ensuring PostgreSQL default-deny protects uploaded evidence from unauthorized modification or deletion.
5. **Obsolete Buckets:** **RESOLVED** — The bucket name `identity-documents` does not appear anywhere in the active codebase (`src/`). The application exclusively uses `kavach-id-cards` and `kavach-evidence`.

---

## 2. Confirmed Issues & Exact Evidence

### Issue 1: Storage Bucket Size Limits and MIME Types are NULL in Remote DB
* **Severity:** Medium (Defense-in-depth vulnerability)
* **Evidence from Remote Dashboard:**
  ```text
  Bucket: kavach-evidence   | public: false | file_size_limit: NULL | allowed_mime_types: NULL
  Bucket: kavach-id-cards   | public: false | file_size_limit: NULL | allowed_mime_types: NULL
  ```
* **Risk:** Although `src/lib/verification/id-card.ts` restricts uploads to 5MB with magic-byte checking and `src/app/api/incidents/route.ts` enforces limits, any direct call to Supabase Storage with an authenticated JWT could upload oversized files or unsupported MIME types.
* **Remediation:** Apply atomic `UPDATE storage.buckets` to set explicit limits (10 MiB for evidence, 5 MiB for ID cards) and strict MIME type arrays.

### Issue 2: Storage Object Ownership Verification Blocked on Remote Instance
* **Severity:** High
* **Evidence:** In `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql`, the policy `Authenticated users upload evidence` was hardened to enforce path prefixes:
  ```sql
  WITH CHECK (
    bucket_id = 'kavach-evidence' 
    AND auth.role() = 'authenticated'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR name LIKE (auth.uid()::text || '/%')
    )
  );
  ```
* **Status:** The remote database has not yet exported the full `qual` and `with_check` conditions. Migration `008` must not be executed blindly; instead, the query in STEP 59 must be executed to observe the live conditions.

---

## 3. Application Code Verification Details

### 3.1 ID Card Upload & Verification (`src/lib/verification/id-card.ts` & `src/app/api/student/verify-id/route.ts`)
* **File Size Validation:** Strictly checked in `validateIdCardFile`:
  ```typescript
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds maximum limit of 5MB' };
  }
  ```
* **Magic Byte MIME Validation:** Reads file header buffer and validates against binary signatures:
  * JPEG: `FF D8 FF`
  * PNG: `89 50 4E 47`
  * WEBP: `52 49 46 46 ... 57 45 42 50`
  * PDF: `25 50 44 46`
* **Path Construction:** User files are placed strictly under `${user.id}/${Date.now()}_id_card.${ext}`.
* **Authorization:** Only verified authenticated users (`auth.uid()`) can submit verification records.

### 3.2 Evidence Upload & Download Routes (`src/app/api/incidents/route.ts`, `[id]/route.ts`)
* **Storage Bucket:** `kavach-evidence`
* **Signed URL Generation:** Private storage items are downloaded exclusively via server-side signed URLs generated with `createSignedUrl` after confirming incident access permissions (reporter or assigned staff/admin).
* **Direct Access:** No direct public URLs (`getPublicUrl`) are used for private evidence or ID cards.

---

## 4. Safe Proposed Remediation SQL Script

The proposed remediation script is saved at:  
`supabase/verification/kavach_step58_storage_limits_remediation.sql`

```sql
-- =============================================================================
-- KAVACH CAMPUS — STEP 58: STORAGE BUCKET LIMITS REMEDIATION SCRIPT
-- =============================================================================
-- PURPOSE:
-- Safely configure storage bucket file size limits and supported MIME types
-- on remote Supabase Storage ('kavach-evidence' and 'kavach-id-cards')
-- WITHOUT dropping, modifying, or weakening any existing Storage RLS policies.
--
-- TARGET DATABASE: Supabase PostgreSQL (polbnvszmvblwenfnqll)
-- EXECUTION METHOD: Manual execution in Supabase SQL Editor after review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PREFLIGHT CHECK (Read-Only: Inspect current state before making changes)
-- -----------------------------------------------------------------------------
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards')
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 2. SAFE REMEDIATION (Atomic UPDATEs with explicit WHERE guards)
-- -----------------------------------------------------------------------------
-- Evidence Bucket:
-- - Maximum File Size: 10 MiB (10 * 1024 * 1024 = 10,485,760 bytes)
-- - Allowed Formats: JPEG, PNG, WEBP, PDF, and MP4 Video
-- - Privacy: Strictly public = false (Private bucket)
UPDATE storage.buckets
SET 
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'application/pdf', 
        'video/mp4'
    ],
    public = false
WHERE id = 'kavach-evidence';

-- ID Cards Bucket:
-- - Maximum File Size: 5 MiB (5 * 1024 * 1024 = 5,242,880 bytes)
-- - Allowed Formats: JPEG, PNG, WEBP, and PDF documents
-- - Privacy: Strictly public = false (Private bucket)
UPDATE storage.buckets
SET 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'application/pdf'
    ],
    public = false
WHERE id = 'kavach-id-cards';

-- -----------------------------------------------------------------------------
-- 3. POST-CHANGE VERIFICATION (Confirm limits are now active)
-- -----------------------------------------------------------------------------
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards')
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 4. VERIFY POLICIES REMAIN INTACT (Zero policies modified or dropped)
-- -----------------------------------------------------------------------------
SELECT 
    policyname, 
    cmd, 
    roles, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

---

## 5. Local Code Quality & Regression Test Results

All quality gates were executed locally and passed with zero regressions:

| Quality Gate | Command | Actual Output / Status | Details |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Tests** | `npm test` | **143 / 143 PASS** (100%) | 11 test suites completed in 12.30s |
| **Linting** | `npm run lint` | **PASS** | 0 errors, 0 warnings (scratch scripts ignored) |
| **TypeScript Compilation** | `npx tsc --noEmit` | **PASS** | 0 type errors |
| **Production Build** | `npm run build` | **PASS** | 54/54 static/dynamic routes generated cleanly |
| **Security Audit** | `npm audit --omit=dev` | **PASS** | Found 0 vulnerabilities |

---

## 6. Files Changed in this Step

1. `supabase/verification/kavach_step58_storage_limits_remediation.sql` — Safe remediation SQL script with preflight and post-check queries.
2. `eslint.config.mjs` — Added `scratch/**` to `globalIgnores` to avoid false-positive lint errors on local audit scratch files.
3. `src/app/api/cron/escalate/route.ts` — Added `export const GET = POST` for standard Vercel Cron invocation compatibility.
4. `src/app/api/cron/safe-walk-timeout/route.ts` — Added `export const GET = POST` for standard Vercel Cron invocation compatibility.
5. `docs/KAVACH_STEP58_STORAGE_SECURITY_PREFLIGHT.md` — This audit documentation.

---

## 7. Remaining Blockers & Next Actions

1. **Manual SQL Execution Required:**
   - **YES.** The SQL remediation plan (`kavach_step58_storage_limits_remediation.sql`) must be executed manually in the Supabase SQL Editor. Antigravity will not modify production storage tables directly.
2. **STEP 59 Policy Inspection:**
   - The user must run the STEP 59 query in Supabase SQL Editor to retrieve the exact text of `qual` and `with_check` for all 4 storage policies.
3. **Live Scheduled Cron Trigger:**
   - Live cron execution on production Vercel deployment requires live external invocation confirmation.
4. **Final Decision:**
   - Production readiness remains **CONDITIONAL** until remote bucket limits and storage RLS clauses are verified.
