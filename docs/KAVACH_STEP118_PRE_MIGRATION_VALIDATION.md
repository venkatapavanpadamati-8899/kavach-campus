# KAVACH CAMPUS — STEP 118: FINAL PRE-MIGRATION SECURITY VALIDATION REPORT

**Date:** 2026-10-17  
**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Supabase Reference:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Final Release Decision:** 🛑 **HOLD** (Candidate SQL validated locally; live database migration pending manual administrator execution)

---

## 1. Executive Summary & Verification Matrix

| Component | Status | Detailed Finding |
|---|---|---|
| **Candidate Hardening SQL** | ✅ **VALIDATED** | `kavach_step115_security_hardening_candidate.sql` verified. Precondition checks, case-bound evidence INSERT, tamper-proof trigger, and policy consolidation are intact. |
| **Candidate Rollback SQL** | ✅ **VALIDATED** | `kavach_step115_rollback_candidate.sql` verified. Safely reverts Step 115 trigger and policies to Step 114 baseline without restoring vulnerable broad staff policies. |
| **Evidence Retrieval API** | ✅ **PASS** | `src/app/api/incidents/[id]/route.ts` queries real schema (`case_id`, `file_path`), masks GPS coordinates, enforces caller authorization, and issues 15-minute signed URLs. |
| **Student Verification API** | ✅ **PASS** | `src/app/api/student/verify-id/route.ts` runs server-side validation and executes via `createAdminClient()` (`service_role`). |
| **Admin Verification API** | ✅ **PASS** | `src/app/api/admin/verifications/route.ts` requires approved reviewer credentials, generates 5-minute signed URLs, and logs decisions to `audit_logs`. |
| **Student Profile Protection** | 🟡 **PARTIAL (Awaiting SQL)** | Trigger code and WITH CHECK policy validated in candidate SQL. Not yet executed on live Supabase production database. |
| **Evidence INSERT Security** | 🟡 **PARTIAL (Awaiting SQL)** | Case-bound INSERT policy validated in candidate SQL. Live database currently enforces `auth.uid() = uploaded_by` without case verification. |
| **Automated Test Suite** | ✅ **PASS** | 18 test files, 240 tests passed (18.24s). |
| **TypeScript Compilation** | ✅ **PASS** | `npx tsc --noEmit` exited with 0 errors. |
| **ESLint Static Analysis** | ✅ **PASS** | `npm run lint` exited with 0 errors / 0 warnings. |
| **Production Build** | ✅ **PASS** | `npm run build` generated 55 routes cleanly with Next.js 16.4.0 (Turbopack). |
| **Live Supabase RLS** | ⚠️ **NOT VERIFIED** | Direct client execution on live database not tested with real user JWTs to avoid mutation. |
| **Production Release** | 🛑 **HOLD** | Candidate SQL must be reviewed and manually executed by institutional DBA before release. |

---

## 2. In-Depth DDL & Candidate SQL Statement Audit

### A. Candidate Script: `supabase/verification/kavach_step115_security_hardening_candidate.sql`

1. **Precondition Validation Block (`DO $$` lines 39–100):**
   - Asserts `is_reviewer()` and `is_admin()` exist as `SECURITY DEFINER` owned by `postgres`.
   - Validates existence of columns `case_id`, `file_path`, and `uploaded_by` on `public.evidence`.
   - Validates existence of `case_id` on `public.incidents` and `verification_status` on `public.student_profiles`.
   - **Finding:** Aborts transaction cleanly with `RAISE EXCEPTION` if live schema deviates.

2. **Evidence INSERT Policy Hardening (lines 111–130):**
   - Drops legacy `"Users upload evidence"`, `"Users insert evidence"`, `"Authorized users upload incident evidence"`.
   - Creates `"Authorized users upload incident evidence"`:
     ```sql
     WITH CHECK (
       uploaded_by = auth.uid()
       AND EXISTS (
         SELECT 1 FROM public.incidents i
         WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id)
           AND (
             i.student_id = auth.uid()
             OR i.assigned_to = auth.uid()
             OR public.is_reviewer()
           )
       )
     );
     ```
   - **Finding:** Enforces incident authorization before evidence can be attached. Rejects invalid or arbitrary `case_id` values. Allows assigned responders, incident owner, or reviewers.

3. **Evidence SELECT Policy Consolidation (lines 133–154):**
   - Drops broad staff policies (`"Staff view evidence"`).
   - Enforces case authorization matching: owner, assigned responder, or approved reviewer.

4. **Student Profile UPDATE & Tamper-Proof Trigger (lines 157–248):**
   - Enforces `WITH CHECK (auth.uid() = id)`.
   - Function `public.prevent_student_profile_tampering()`:
     - Configured with `SECURITY DEFINER` and `SET search_path = public`.
     - Checks if sensitive columns were altered:
       `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`, `id`.
     - If none were altered, allows update immediately (ordinary profile edits like `course`, `batch`, `blood_group`, `medical_conditions` proceed).
     - If altered, permits only:
       - Session users: `'postgres'`, `'supabase_admin'`.
       - JWT claim: `'service_role'`.
       - Institutional roles: `public.is_reviewer()` or `public.is_admin()`.
     - Otherwise raises `Access Denied` exception.
   - Attaches `trg_prevent_student_profile_tampering` as `BEFORE UPDATE ON public.student_profiles`.

5. **Storage Object Policies (lines 267–305):**
   - Drops overly permissive storage policies on `storage.objects`.
   - Enforces user-prefix folder isolation (`auth.uid()::text = (storage.foldername(name))[1]`) for `kavach-evidence` uploads and reads.

---

### B. Rollback Script: `supabase/verification/kavach_step115_rollback_candidate.sql`

1. Drops trigger `trg_prevent_student_profile_tampering` and function `public.prevent_student_profile_tampering()`.
2. Reverts `public.student_profiles` UPDATE policy to Step 114 baseline (`USING (auth.uid() = id)`).
3. Reverts `public.evidence` INSERT policy to Step 114 baseline (`WITH CHECK (auth.uid() = uploaded_by)`).
4. **Safety Verification:** Does **NOT** reintroduce legacy `is_staff()` policies on `incidents`, `evidence`, or `student_profiles`.

---

## 3. Comparison with Verified Live Database Ground Truth

| Table / Object | Live Ground Truth in Supabase | Candidate SQL Change | Risk Assessment |
|---|---|---|---|
| `public.evidence` (INSERT) | Only checks `auth.uid() = uploaded_by`. Allows arbitrary `case_id`. | Adds incident student/responder/reviewer existence check. | **Critical Fix** — Eliminates cross-case attachment vulnerability. |
| `public.evidence` (SELECT) | Case-scoped policy exists, but legacy names must be cleaned up. | Defensive drops for `"Staff view evidence"` and intermediate names. | **Clean** — Prevents permissive `OR` bypass. |
| `public.student_profiles` (Triggers) | Currently **0 triggers** in production database (`[]`). | Installs `trg_prevent_student_profile_tampering`. | **Critical Fix** — Eliminates client-side self-verification. |
| `public.student_profiles` (UPDATE) | `with_check` is currently `null`. | Enforces `WITH CHECK (auth.uid() = id)`. | **Hardened** — Prevents ID mutation. |
| `public.student_profiles` (SELECT) | Only owner and `is_reviewer()` allowed. | Reaffirms policy and drops any legacy `"Staff read student profiles"`. | **Clean** — Prevents cross-student profile inspection. |
| `storage.objects` | Private buckets (`kavach-evidence`, `kavach-id-cards`). | Reaffirms user-folder prefix enforcement. | **Safe** — Compatible with 15-minute signed URL flow. |

---

## 4. Application Implementation Verification

1. **`src/app/api/incidents/[id]/route.ts`:**
   - Parameter handling handles UUID vs human-readable `case_id` dynamically.
   - Prevents unassigned staff from accessing cases assigned to other responders.
   - Masks GPS coordinates (`latitude`, `longitude`, `location_accuracy`) for non-authorized personnel.
   - Fetches evidence only if authorized (`canAccessEvidence`), queries real columns (`case_id`, `file_path`), and creates 15-minute signed URLs.

2. **`src/app/api/student/verify-id/route.ts`:**
   - Enforces 10-digit ID pattern and academic batch duration constraints.
   - Verifies duplicate student ID does not belong to another account.
   - Uses `createAdminClient()` (`service_role`) to upsert `student_profiles` and write immutable audit log records.

3. **`src/app/api/admin/verifications/route.ts`:**
   - Restricts access to approved `ADMIN`, `SUPER_ADMIN`, or `SECURITY`.
   - Prevents self-approval (`targetStudentId === user.id`).
   - Generates 5-minute signed URLs for ID card preview.
   - Syncs `profiles.is_approved` with verification decision.

4. **`src/app/student/profile/page.tsx`:**
   - User profile interface for emergency medical info and basic data.

---

## 5. Read-Only Verification SQL Queries for Live Database

When ready to inspect live configuration in the Supabase Dashboard SQL Editor, run these read-only queries:

### Query 1: Verify Active Policies on Sensitive Tables
```sql
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('evidence', 'student_profiles', 'incidents')
ORDER BY tablename, cmd, policyname;
```

### Query 2: Verify Triggers on `student_profiles`
```sql
SELECT 
  tgname AS trigger_name,
  proname AS function_name,
  tgtype,
  tgenabled
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'public.student_profiles'::regclass;
```

### Query 3: Verify Storage Policies on `kavach-evidence`
```sql
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;
```

---

## 6. Pre-Migration and Rollback Review Checklist

Before executing `supabase/verification/kavach_step115_security_hardening_candidate.sql` in the Supabase SQL Editor:
- [ ] Database backup / snapshot taken in Supabase Dashboard.
- [ ] Read-only Query 1, 2, and 3 executed to capture pre-migration policy state.
- [ ] Ensure no active emergency SOS or incident reporting is occurring during the 10-second maintenance window.
- [ ] Execute `kavach_step115_security_hardening_candidate.sql` inside a single transaction block (`BEGIN; ... COMMIT;`).
- [ ] Re-run Read-Only Queries 1, 2, and 3 to verify that `trg_prevent_student_profile_tampering` is active and `Authorized users upload incident evidence` is the only active INSERT policy on `public.evidence`.
- [ ] In case of unexpected issues, execute `kavach_step115_rollback_candidate.sql`.

---

## 7. Final Security Verdict

**Current Decision: 🛑 HOLD — PRODUCTION RELEASE BLOCKED**

- **Local Validation:** All automated tests, TypeScript, ESLint, and production build checks **PASS**.
- **Candidate SQL:** Fully validated and ready for manual review.
- **Production Status:** Live RLS and trigger enforcement remain **PARTIAL / NOT VERIFIED** until manual SQL execution and authenticated multi-user verification are performed by the database administrator.
