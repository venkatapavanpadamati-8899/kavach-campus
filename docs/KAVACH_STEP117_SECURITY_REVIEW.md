# Kavach Campus — Step 117 Final Security Remediation Review

**Project:** `D:\Kavach Campus`  
**Supabase Project Ref:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Date:** 2026-10-17  
**Review Type:** Deep Security Architecture, RLS Policy, Trigger Logic, & Code Audit  
**Production Release Decision:** **🛑 HOLD** (Pending manual migration review and live authenticated role isolation testing)

---

## 1. Executive Summary & Verification Matrix

This comprehensive security audit assesses the application routes, PostgreSQL Row-Level Security (RLS) policies, database triggers, storage policies, and automated test coverage following the live Supabase query findings.

### Status Classification Matrix
- **PASS**: Verified and strictly confirmed through code inspection and automated testing.
- **PARTIAL**: Architecture implemented and tested locally; awaiting remote live database execution.
- **FAIL**: Defect or security vulnerability identified and unmitigated.
- **BLOCKED**: Blocked by technical dependency or missing prerequisite.
- **NOT VERIFIED**: Requires live authenticated user sessions on remote Supabase infrastructure.

| Evaluation Area | Status | Key Evidence / Rationale |
| :--- | :--- | :--- |
| **Evidence Retrieval API** | ✅ **PASS** | [route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/route.ts) correctly disambiguates UUIDs from human-readable case IDs, queries real schema columns (`case_id`, `file_path`), verifies incident authorization before evidence query, and returns 900s signed URLs without leaking raw storage paths. |
| **Student ID Verification API** | ✅ **PASS** | [verify-id/route.ts](file:///d:/Kavach%20Campus/src/app/api/student/verify-id/route.ts) enforces 10-digit format, batch validation, duplicate ID checks, and executes updates via trusted `service_role`. |
| **Admin Decision API** | ✅ **PASS** | [verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts) restricts ID card verification decisions strictly to approved institutional administrators (`ADMIN`, `SUPER_ADMIN`) with audit logging. |
| **createAdminClient Security** | ✅ **PASS** | [admin.ts](file:///d:/Kavach%20Campus/src/lib/supabase/admin.ts) runs strictly server-side with `autoRefreshToken: false`, `persistSession: false`; never imported in client components. |
| **Evidence INSERT Policy** | 🟡 **PARTIAL** | Hardened case-bound INSERT policy designed in [candidate SQL](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql); pending manual owner execution on live Supabase. |
| **Student Profiles UPDATE Protection** | 🟡 **PARTIAL** | `WITH CHECK (auth.uid() = id)` and tamper-proof `trg_prevent_student_profile_tampering` trigger written; live database currently lacks trigger (`[]`). |
| **Storage Object Privacy** | ✅ **PASS** | `kavach-evidence` and `kavach-id-cards` buckets are private (`public = false`), enforce folder prefix ownership, and restrict direct reads to owner or admin. |
| **Automated Regression Suite** | ✅ **PASS** | **18 test files, 240 tests passed** cleanly across all unit, integration, and security simulation scenarios. |
| **TypeScript & Build Quality** | ✅ **PASS** | `tsc --noEmit` passed with 0 errors; ESLint passed with 0 warnings; Next.js 16.4.0 Turbopack built 55 routes successfully. |
| **Production Dependency Audit** | ✅ **PASS** | `npm audit --omit=dev` reported 0 production vulnerabilities. |
| **Live Authenticated Supabase RLS**| ⚠️ **NOT VERIFIED** | Requires execution of candidate SQL and live multi-role session verification on remote Supabase instance. |
| **Production Release Decision** | 🛑 **HOLD** | Under safety rules, production deployment remains on HOLD until database migration and live multi-user isolation verification are completed. |

> [!WARNING]
> **Mocked Unit Tests vs. Live Database Proof:**
> Passing 240 mocked unit tests proves that application handlers and deterministic policy logic behave correctly in simulation. It does **not** prove that the remote Supabase database enforces RLS isolation until the migration is executed and verified with live authenticated tokens.

---

## 2. Codebase & Application Architecture Audit

### 2.1 Evidence Retrieval and Signed URL Authorization
- **File:** [src/app/api/incidents/[id]/route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/route.ts)
- **Parameter Resolution:**
  ```ts
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { data: incident, error } = await supabase
    .from('incidents')
    .select('*')
    .eq(isUuid ? 'id' : 'case_id', id)
    .single();
  ```
  Explicitly disambiguates UUIDs from `case_id` strings (e.g., `KC-2026-XXXXX`), eliminating PostgreSQL `invalid input syntax for type uuid` query errors.
- **Evidence Access Gate:**
  ```ts
  const isIncidentStudent = incident.student_id === user.id;
  const isAssignedResponder = incident.assigned_to === user.id;
  const isReviewerOrAdmin = !!(userProfile && ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role));
  const canAccessEvidence = isIncidentStudent || isAssignedResponder || isReviewerOrAdmin;
  ```
  Unassigned general staff receive an empty evidence array (`evidence: []`) without executing queries against `public.evidence`.
- **Query & Storage Security:**
  - Queries real schema columns: `select('id, file_name, file_size, mime_type, file_path, case_id, created_at')`.
  - Nonexistent legacy columns (`incident_id`, `storage_path`) are eliminated.
  - Generates short-lived (900 seconds / 15 minutes) signed URLs via `createSignedUrl(cleanPath, 900)`.
  - Raw `file_path` is never exposed as a public URL in the response payload.
  - Safe error handling: database errors return a generic 500 response without leaking internal database or schema details.

### 2.2 Student ID Upload and Verification Route
- **File:** [src/app/api/student/verify-id/route.ts](file:///d:/Kavach%20Campus/src/app/api/student/verify-id/route.ts)
- **Validation:** Enforces 10-digit ID validation, regular vs. lateral entry batch duration checks, and duplicate registration prevention.
- **Privilege Separation:** Uses `createAdminClient()` strictly on the server to update `verification_status` and OCR data.

### 2.3 Admin Verification Decision Route
- **File:** [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts)
- **Access Control:** Authenticates caller profile and verifies role is approved `ADMIN` or `SUPER_ADMIN`.
- **Audit Logging:** Every status change (`VERIFIED`, `REJECTED`) writes an immutable record to `public.audit_logs`.

### 2.4 Student Profile Update & Unconstrained Field Preservation
- **File:** [src/app/student/profile/page.tsx](file:///d:/Kavach%20Campus/src/app/student/profile/page.tsx)
- **Permitted Student Updates:** Students can legitimately update:
  `course`, `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `blood_group`, `medical_conditions`, `hostel_room`.
- **Protected Fields:** Students cannot alter:
  `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`, or `id`.

---

## 3. Live Database Policies & Triggers Inspection

Based on the actual live Supabase queries executed via CLI:

### 3.1 `public.evidence`
- **Live Status:**
  - `Authorized users view incident evidence` (SELECT to authenticated)
  - `Users view own evidence` (SELECT to public, qual `auth.uid() = uploaded_by`)
  - `Users upload evidence` (INSERT to public, `WITH CHECK (auth.uid() = uploaded_by)`)
- **Analysis:**
  - Broad staff policy `is_staff()` is **absent**.
  - SELECT is properly case-scoped.
  - **Live Vulnerability:** INSERT policy only checks uploader identity, allowing arbitrary `case_id` values.
  - **Remediation in Candidate SQL:** Replaces `"Users upload evidence"` with `"Authorized users upload incident evidence"`, binding `evidence.case_id` to an existing incident where the caller is owner, assigned responder, or reviewer.

### 3.2 `public.student_profiles`
- **Live Status:**
  - `Reviewers and student owner read profile` (SELECT to authenticated, `id = auth.uid() OR is_reviewer()`)
  - `Students read own private profile` (SELECT to public, `auth.uid() = id`)
  - `Students update own profile` (UPDATE to public, `USING (auth.uid() = id)`, `with_check: null`)
  - **Live Trigger Query Result:** `[]` (ZERO user-defined triggers).
- **Analysis:**
  - Broad `is_staff()` policy is **absent**.
  - **Live Vulnerability:** Because `with_check` is null and no trigger exists, a student can self-update `verification_status` to `'VERIFIED'`.
  - **Remediation in Candidate SQL:**
    1. Sets `WITH CHECK (auth.uid() = id)` on `"Students update own profile"`.
    2. Drops redundant `"Students read own private profile"`.
    3. Deploys `trg_prevent_student_profile_tampering` to reject non-admin/non-service-role changes to verification fields.

### 3.3 `public.incidents`
- **Live Status:**
  - `Authorized users view incidents` (SELECT to authenticated: `student_id = auth.uid() OR assigned_to = auth.uid() OR is_reviewer()`)
  - `Students view own incidents` (SELECT to public: `auth.uid() = student_id`)
  - `Students insert own incidents` (INSERT to public: `WITH CHECK (auth.uid() = student_id)`)
- **Analysis:**
  - Broad `Staff view incidents` is **absent**.
  - Unassigned staff cannot view other cases.

### 3.4 `public.profiles`
- **Live Status:**
  - `prevent_self_role_escalation()` trigger is active, `SECURITY DEFINER`, with `search_path=public`.
  - Prevents non-admins from self-escalating role or approval status.

### 3.5 `storage.objects`
- **Live Status:**
  - `Authenticated users upload own evidence` (INSERT, bucket `kavach-evidence`, requires `auth.uid()` path prefix).
  - `Users and admins read authorized evidence` (SELECT, bucket `kavach-evidence`, requires path match or admin).
  - `Students upload own ID card` / `Students read own ID card` (bucket `kavach-id-cards`).
- **Analysis:**
  - Buckets are private. Direct unauthenticated or cross-student access is blocked.
  - Responders view evidence exclusively via server-generated signed URLs.

---

## 4. Candidate & Rollback SQL Security Analysis

### 4.1 Candidate SQL ([kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql))
- **Preconditions:** Validates that `is_reviewer()`, `is_admin()`, and required columns (`case_id`, `file_path`, `uploaded_by`, `verification_status`) exist before applying any mutation.
- **Trigger Function Security:**
  - `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public`.
  - Session check: `session_user IN ('postgres', 'supabase_admin')` allowed for migrations.
  - Service-role check: reads `auth.role()` and `request.jwt.claim.role`. Regular students having JWT role `'authenticated'` cannot spoof `'service_role'`.
  - Reviewer/Admin check: uses `public.is_reviewer()` and `public.is_admin()`.
  - Default Deny: raises `Access Denied` exception for unauthorized modifications to protected columns.
- **Unconstrained Student Updates:**
  If none of `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`, or `id` are changed, the trigger returns `NEW` immediately, preserving student self-service editing.

### 4.2 Rollback Script ([kavach_step115_rollback_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql))
- **Behavior:** Drops `trg_prevent_student_profile_tampering` and reverts policies to the Step 114 baseline.
- **Safety Guarantee:** Does **not** restore the vulnerable broad `is_staff()` policies.
- **Limitations:** If rolled back, the gap allowing students to upload evidence with arbitrary case IDs or self-verify is re-opened until remediated.

---

## 5. Automated Verification & Quality Check Results

### 5.1 Test Suite Breakdown
```
Test Files: 18 passed (18)
Tests:      240 passed (240)
Duration:   18.70s
```

All 18 suites passed cleanly:
1. `step115-rls-evidence-hardening.test.ts` (18 tests) — Dedicated Step 115/117 security hardening tests.
2. `severity-classification.test.ts` (12 tests) — AI classification and priority mapping.
3. `sos-location-tracking.test.ts` (11 tests) — Real-time SOS location tracking.
4. `nearby-staff-and-incident-management.test.ts` (14 tests) — Responder routing.
5. `step112-authorization-regression.test.ts` (13 tests) — Authorization regression tests.
6. `step108-remediation-and-functional-verification.test.ts` (21 tests) — Remediation regression.
7. `authenticated-security-verification.test.ts` (15 tests) — Auth security tests.
8. `cron-workflows.test.ts` (7 tests) — Automated escalation crons.
9. `auth-callback.test.ts` (11 tests) — OAuth authentication callbacks.
10. `integration-workflows.test.ts` (11 tests) — E2E workflow integration.
11. `sos-logic.test.ts` (9 tests) — SOS trigger logic.
12. `safe-walk.test.ts` (13 tests) — Safe Walk tracking and timeout.
13. `student-id-verification.test.ts` (34 tests) — Student ID validation and OCR.
14. `notification-adapters.test.ts` (15 tests) — SMS, Email, and Push adapters.
15. `auth-rbac.test.ts` (14 tests) — Role-based access control.
16. `sos-safe-walk-production-e2e.test.ts` (3 tests) — Production E2E tests.
17. `admin-analytics.test.ts` (5 tests) — Administrative analytics.
18. `mentor-routing-assignment.test.ts` (14 tests) — Routing assignments.

### 5.2 Build & Static Analysis Checks
- `npx tsc --noEmit`: **0 errors** (TypeScript strict compilation passed).
- `npm run lint`: **0 warnings, 0 errors** (ESLint passed).
- `npm run build`: **55 routes compiled successfully** with Next.js 16.4.0 (Turbopack).
- `npm audit --omit=dev`: **0 vulnerabilities** found.

---

## 6. Exact Files Changed

1. **[src/app/api/incidents/[id]/route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/route.ts)**
   - Hardened parameter resolution: UUID regex disambiguation vs. `case_id`.
   - Gated evidence access: only student owner, assigned responder, or reviewer/admin can query `evidence`.
   - Real schema query: selects `case_id` and `file_path`.
   - Signed URL generation: 900s expiration, raw path hidden from public payload.
2. **[src/__tests__/step115-rls-evidence-hardening.test.ts](file:///d:/Kavach%20Campus/src/__tests__/step115-rls-evidence-hardening.test.ts)**
   - Expanded from 13 to 18 comprehensive regression tests covering all Task F scenarios.
3. **[supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql)**
   - Refined with explicit drop for duplicate `"Students read own private profile"`.
   - Added defensive drops for legacy storage policies on `storage.objects`.
4. **[supabase/verification/kavach_step115_rollback_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql)**
   - Aligned rollback target roles to `TO authenticated`.

---

## 7. Remaining Pre-Deployment Read-Only SQL Verification Queries

Before and after the candidate migration is manually executed by the project owner in the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new), run these read-only queries to verify the database state:

### Verification Query 1 — Confirm RLS Policies
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('incidents', 'student_profiles', 'evidence')
ORDER BY tablename, cmd, policyname;
```

### Verification Query 2 — Confirm Student Profile Trigger
```sql
SELECT t.tgname, pg_get_triggerdef(t.oid) AS trigger_definition, p.proname 
FROM pg_trigger t 
JOIN pg_class c ON c.oid = t.tgrelid 
JOIN pg_namespace n ON n.oid = c.relnamespace 
JOIN pg_proc p ON p.oid = t.tgfoid 
WHERE n.nspname = 'public' 
  AND c.relname = 'student_profiles' 
  AND NOT t.tgisinternal;
```

### Verification Query 3 — Confirm Storage Policies
```sql
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND (qual LIKE '%kavach-evidence%' OR with_check LIKE '%kavach-evidence%')
ORDER BY cmd, policyname;
```

---

## 8. Final Decision: Production Status **HOLD**

The application code, API handlers, static analysis, and automated test suite are **100% verified locally**. However, because the candidate SQL migration has not yet been executed in the live database, and multi-role authenticated session isolation has not yet been verified on live Supabase infrastructure, the production release remains strictly on **HOLD**.
