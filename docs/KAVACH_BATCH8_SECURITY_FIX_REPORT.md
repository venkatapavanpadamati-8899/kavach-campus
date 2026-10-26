# KAVACH CAMPUS — BATCH 8: SECURITY FIX & REGRESSION AUDIT REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Supabase Reference:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Date:** October 18, 2026  
**Review Type:** Deep Security Remediation, Schema Parity, & Regression Verification (Batch 8)  
**Review Engine:** Antigravity AI Security & PostgreSQL Compliance Engine  

---

## 1. Executive Summary & Verdicts

In strict compliance with the mandatory Batch 8 security rules:
- **ZERO SQL queries or mutations were executed against the remote production database.**
- **ZERO migrations or rollback scripts were executed remotely.**
- **ZERO secrets, API keys, JWT tokens, or credentials were exposed or modified.**
- **No user was promoted to ADMIN or SUPER_ADMIN.**
- **No RLS policy was weakened to make tests pass.**
- **Existing application functionality was strictly preserved across all 59 Next.js routes.**
- **Quality gates verified with 100% exit code 0: 296/296 tests pass, zero TypeScript errors, zero ESLint errors, clean production build.**

### Official Batch 8 Verdicts

| Evaluation Target | Batch 8 Verdict | Key Justification |
|---|---|---|
| **Step 115 (Security Hardening Candidate SQL)** | 🟢 **READY FOR HUMAN DBA REVIEW** | Candidate SQL updated to v1.15.2 with: (1) `incident_locations` case-bound RLS dropping insecure `is_staff()` policy, (2) Dual-path evidence storage policy (`case_id` and `auth.uid()`), (3) Extended academic field immutability in `prevent_student_profile_tampering()`, (4) Complete schema parity on audit log INSERTs (`entity_type TEXT NOT NULL`, `metadata JSONB`). Backed up before modification. Ready for human DBA review in staging/production. |
| **Step 121 (Read-Only Preflight SQL)** | 🟢 **READY FOR HUMAN DBA REVIEW** | 100% read-only catalog inspection script expanded to include `incident_locations` table and policies in Sections 2, 4, 8, and 9. Zero DDL/DML. |
| **Kavach Campus Production Release Gate** | 🔴 **HOLD** | Production release remains strictly on **HOLD** pending human DBA review, staging execution, manual verification, and authorized production migration. Code and SQL are review-ready, but remote production deployment has NOT occurred. |

---

## 2. Comprehensive Resolution Matrix for Batch 7 Findings

| Finding ID | Finding Title | Batch 7 Severity | Batch 8 Resolution Status | Primary Files & Location |
|---|---|---|---|---|
| **F-01** | Audit Log Schema Mismatch (`entity_type NOT NULL`) | 🚨 **CRITICAL** | **RESOLVED** | [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L540-L557)<br>[src/app/api/student/verify-id/route.ts](file:///d:/Kavach%20Campus/src/app/api/student/verify-id/route.ts#L105-L125)<br>[src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts#L210-L230)<br>[src/app/api/admin/users/approve/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/users/approve/route.ts#L65-L80)<br>[src/app/super-admin/login/page.tsx](file:///d:/Kavach%20Campus/src/app/super-admin/login/page.tsx#L40-L55) |
| **F-02** | Live DB Student Profile Self-Verification | 🚨 **CRITICAL** | **RESOLVED (Candidate Ready)** | [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L250-L370)<br>[src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts#L36-L160) |
| **F-03** | Storage Path vs Policy Prefix Mismatch (`case_id` vs `auth.uid()`) | 🟠 **HIGH** | **RESOLVED** | [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L465-L535)<br>[src/app/api/incidents/[id]/evidence/route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/evidence/route.ts#L1-L280)<br>[src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts#L275-L365) |
| **F-04** | Unassigned Staff Exposure on `incident_locations` | 🟠 **HIGH** | **RESOLVED** | [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L100-L245)<br>[supabase/verification/kavach_step121_readonly_preflight.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql#L45-L215)<br>[src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts#L165-L270) |
| **F-05** | Rollback Script Vulnerable Baseline Restored | 🟠 **HIGH** | **RESOLVED (Operational Guidance)** | [supabase/verification/kavach_step115_rollback_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql#L1-L70) |
| **F-06** | Admin Direct PostgREST UPDATE Blocked by Student Policy | 🟡 **MEDIUM** | **RESOLVED (Architectural Boundary)** | [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts#L120-L235)<br>[src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts#L370-L450) |
| **F-07** | ID Card Re-Upload Privilege Invalidation | 🟡 **MEDIUM** | **VERIFIED** | [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L335-L345) |
| **F-08** | Unprotected Academic Batch Fields in Trigger Scope | 🟢 **LOW** | **RESOLVED** | [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L330-L340)<br>[src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts#L115-L155) |
| **F-09** | Read-Only Purity of Step 121 Diagnostic Suite | 🟢 **LOW (OK)** | **ENHANCED & VERIFIED** | [supabase/verification/kavach_step121_readonly_preflight.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql#L1-L225) |

---

## 3. Deep Technical Analysis & Root Causes

### Task 1 — Storage Path Authorization (Finding 03)

#### Root Cause
In `src/app/api/incidents/[id]/evidence/route.ts` (line 190), files are uploaded to bucket `kavach-evidence` with path:
```typescript
const storagePath = `${incident.case_id}/${Date.now()}-${crypto.randomUUID().substring(0, 8)}-${cleanFileName}`;
```
However, the initial candidate SQL policy enforced:
```sql
bucket_id = 'kavach-evidence' AND (auth.uid()::text = (storage.foldername(name))[1])
```
Because the top-level folder is the incident's `case_id` (e.g., `KC-2026-00123`), not the student's `auth.uid()`, direct client uploads or fallbacks were rejected by Storage RLS.

#### Security Architecture & Remediation
1. **Private Bucket Enforcement:** Bucket `kavach-evidence` remains strictly private (`public = false`). Direct public URL access is completely disabled.
2. **Dual-Path Case-Bound RLS Policy:**
   Candidate SQL v1.15.2 deploys a hardened storage policy that allows uploads under **either**:
   - `auth.uid()` user folder, OR
   - Case-bound folder matching `case_id` or `id::text` of an incident where the authenticated user is the student owner (`student_id = auth.uid()`), the assigned responder (`assigned_to = auth.uid()`), or an institutional reviewer (`is_reviewer()`).
3. **Server-Side Authorization Boundary:**
   The route [src/app/api/incidents/[id]/evidence/route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/evidence/route.ts) implements multi-tier server-side authorization:
   - Verifies session token with Supabase Auth.
   - Looks up user role from `profiles`.
   - Fetches the targeted incident by `id` or `case_id`.
   - Checks authorization: `incident.student_id === user.id || incident.assigned_to === user.id || ['ADMIN', 'SUPER_ADMIN', 'SECURITY', 'COUNSELLOR', 'WOMENS_CELL', 'PRINCIPAL', 'HOD'].includes(role)`.
   - Signs URLs with a strict **5-minute TTL** (`300` seconds).
   - Never exposes `SUPABASE_SERVICE_ROLE_KEY` to the browser.
4. **Regression Tested:** Tests 6 & 7 in [src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts).

---

### Task 2 — Incident Locations RLS (Finding 04)

#### Root Cause
In migration `005_kavach_campus_rls_infinite_recursion_repair.sql`, policy `"Staff view locations"` on `public.incident_locations` was created with `USING (public.is_staff())`. Because PostgreSQL permissive policies combine with `OR`, any authenticated staff member (e.g., academic counsellors or department heads) could read real-time GPS locations and track history for incidents to which they were never assigned.

#### Remediation in Candidate SQL
Candidate SQL v1.15.2 adds Section 2: `HARDEN PUBLIC.INCIDENT_LOCATIONS RLS`:
1. **Precondition Checks:** Validates existence of `public.incident_locations` table and required columns (`id`, `incident_id`, `latitude`, `longitude`, `created_at`).
2. **Drops Permissive Policies:** Drops `"Staff view locations"`, `"Staff can view all incident locations"`, `"Students view own incident locations"`, and any existing legacy variants.
3. **Deploys Case-Bound SELECT Policy:**
   ```sql
   CREATE POLICY "Authorized users view incident locations"
   ON public.incident_locations
   FOR SELECT TO authenticated
   USING (
     EXISTS (
       SELECT 1 FROM public.incidents i
       WHERE i.id = incident_locations.incident_id
         AND (
           i.student_id = auth.uid()
           OR i.assigned_to = auth.uid()
           OR public.is_reviewer()
         )
     )
   );
   ```
4. **Deploys Strict INSERT Policy:**
   ```sql
   CREATE POLICY "Authorized users insert incident locations"
   ON public.incident_locations
   FOR INSERT TO authenticated
   WITH CHECK (
     EXISTS (
       SELECT 1 FROM public.incidents i
       WHERE i.id = incident_locations.incident_id
         AND (
           i.student_id = auth.uid()
           OR i.assigned_to = auth.uid()
           OR public.is_reviewer()
         )
     )
   );
   ```
5. **Regression Tested:** Tests 4 & 5 in [src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts).

---

### Task 3 — Student Profile Protection (Findings 02 & 08)

#### Root Cause
On the live database, `student_profiles` has zero triggers and an UPDATE policy with `WITH CHECK: null`. Any student could execute a direct PostgREST `PATCH /rest/v1/student_profiles?id=eq.<uid>` setting `verification_status = 'VERIFIED'`. Furthermore, academic batch fields (`admission_type`, `admission_year`, `expected_graduation_year`) were not guarded by the initial trigger design.

#### Remediation in Candidate SQL
Candidate SQL v1.15.2 deploys function `public.prevent_student_profile_tampering()` and trigger `trg_prevent_student_profile_tampering`:
1. **Role Identification:** Determines if caller is privileged via `service_role` JWT, PostgreSQL superuser, or `is_reviewer() || is_admin()`.
2. **Id Immutability:** `OLD.id IS DISTINCT FROM NEW.id` is unconditionally rejected.
3. **Protected Verification Fields Blocked for Students:**
   - `verification_status`
   - `verified_at`
   - `verified_by`
   - `verification_notes`
   - `ocr_extracted_data`
4. **Academic Credentials Protected Once Verified (Finding 08):**
   ```sql
   IF OLD.verification_status = 'VERIFIED' THEN
     IF (OLD.admission_type IS DISTINCT FROM NEW.admission_type)
        OR (OLD.admission_year IS DISTINCT FROM NEW.admission_year)
        OR (OLD.expected_graduation_year IS DISTINCT FROM NEW.expected_graduation_year) THEN
       RAISE EXCEPTION 'Cannot modify verified academic credentials. Contact campus administration.';
     END IF;
   END IF;
   ```
5. **ID Card Change Revocation:** If a verified student changes `id_card_url`, status is automatically reset to `PENDING_MANUAL_REVIEW`, and `verified_at` / `verified_by` are cleared.
6. **Legitimate Updates Preserved:** Students can freely update `blood_group`, `medical_conditions`, `hostel_room`, and unverified batch fields.
7. **Regression Tested:** Tests 1, 2, 3, & 10 in [src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts).

---

### Task 4 — Reviewer Update Authorization (Finding 06)

#### Analysis
In the candidate SQL, `student_profiles` UPDATE RLS is:
```sql
CREATE POLICY "Students update own profile"
ON public.student_profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```
If reviewers were granted broad direct PostgREST `UPDATE` on `student_profiles`, any compromised reviewer account could bypass application validation.

#### Security Architecture Decision
1. **Least-Privilege Boundary:** Direct client PostgREST UPDATE on `student_profiles` remains strictly restricted to `(auth.uid() = id)`.
2. **Dedicated Server-Side Workflow:**
   Reviewers/Admins perform verification updates exclusively via [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts):
   - Authenticates reviewer session via `createClient()`.
   - Validates that caller's profile has `role IN ('ADMIN', 'SUPER_ADMIN')` and `is_approved = true`.
   - Enforces valid decision (`VERIFIED`, `REJECTED`, `FLAGGED`, `PENDING_MANUAL_REVIEW`).
   - Requires non-empty reason (`min(5)` characters).
   - If verifying, requires `officialRosterConfirmed = true`.
   - Executes update using `createAdminClient()` (`service_role`), which is validated by the database trigger.
   - Logs decision to `public.audit_logs`.
3. **Regression Tested:** Test 8 in [src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts).

---

### Task 5 — Audit Log Schema Parity (Finding 01)

#### Root Cause
`public.audit_logs` table requires:
- `action TEXT NOT NULL`
- `entity_type TEXT NOT NULL`
- `entity_id UUID`
- `metadata JSONB`

Several application routes were writing legacy column names (`details`, `target_id`) or omitting `entity_type`, which violates the `NOT NULL` constraint and risks silent logging failures.

#### Files Remediated
1. [src/app/api/student/verify-id/route.ts](file:///d:/Kavach%20Campus/src/app/api/student/verify-id/route.ts): Remediated audit payload to provide `entity_type: 'student_profiles'`, `entity_id: user.id`, `metadata: { ... }`.
2. [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts): Replaced `target_id` and `details` with `entity_type: 'student_profiles'`, `entity_id: targetStudentId`, `metadata: { ... }`.
3. [src/app/api/admin/users/approve/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/users/approve/route.ts): Replaced `target_id` and `details` with `entity_type: 'profiles'`, `entity_id: targetUserId`, `metadata: { ... }`.
4. [src/app/super-admin/login/page.tsx](file:///d:/Kavach%20Campus/src/app/super-admin/login/page.tsx): Replaced `details` with `entity_type: 'auth'`, `metadata: { ... }`.
5. [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql): Remediated migration completion audit record to provide `entity_type: 'system'`, `metadata: jsonb_build_object('version', '1.15.2', ...)`.
6. **Regression Tested:** Test 9 in [src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts).

---

## 4. Test Architecture & Regression Verification (Task 6)

A dedicated test suite was created in [src/__tests__/batch8-security-fixes-and-regression.test.ts](file:///d:/Kavach%20Campus/src/__tests__/batch8-security-fixes-and-regression.test.ts).

### Testing Methodology Disclosure
- **Category A: Unit & Route Handler Tests (Node.js runtime with mocked Supabase):**
  Tests 6, 7, 8, 10 execute actual Next.js route handlers (`evidence`, `admin/verifications`, `student/profile`).
- **Category B: SQL Text & Structural AST Tests:**
  Tests analyze candidate SQL text for table references, policy definitions, precondition guards, and constraint satisfaction.
- **Category C: In-Memory PL/pgSQL Trigger & RLS Logic Simulation Tests:**
  Tests 1, 2, 3, 4, 5, 9 simulate exact PostgreSQL row-level security and trigger semantics (`OLD` vs `NEW`, `IS DISTINCT FROM`, `EXISTS` subqueries, constraint enforcement).
- **CRITICAL DISTINCTION:** None of these tests represent live remote PostgreSQL execution. True remote RLS behavior must be validated on an actual PostgreSQL instance after DBA application.

### Batch 8 Test Results Summary (10/10 PASS)

| Test # | Test Title | Category | Result |
|---|---|---|---|
| **01** | Student cannot self-verify via direct update | Trigger Simulation / PLpgSQL | ✅ **PASS** |
| **02** | Student cannot alter `verified_at` or `verified_by` | Trigger Simulation / PLpgSQL | ✅ **PASS** |
| **03** | Student cannot replace protected OCR verification data | Trigger Simulation / PLpgSQL | ✅ **PASS** |
| **04** | Assigned responder can access authorized incident locations | RLS Logic Simulation | ✅ **PASS** |
| **05** | Unassigned staff cannot access another incident's location history | RLS Logic Simulation | ✅ **PASS** |
| **06** | Evidence upload cannot attach a file to an unauthorized incident | Unit / Route Handler (`POST`) | ✅ **PASS** |
| **07** | Cross-incident signed URL requests are rejected (403 Forbidden) | Unit / Route Handler (`GET`) | ✅ **PASS** |
| **08** | Authorized reviewers can complete verification via service-role API | Unit / Route Handler (`POST`) | ✅ **PASS** |
| **09** | Invalid audit log INSERTs are detected and rejected | Schema Validation / Unit | ✅ **PASS** |
| **10** | Existing student profile editing remains functional for health/room | Unit / Route Handler (`PUT`) | ✅ **PASS** |

---

## 5. Candidate SQL Script Integrity (Task 7)

### Backup Verification
Before making changes in Batch 8, the previous candidate was backed up:
- Backup path: [supabase/verification/kavach_step115_security_hardening_candidate.batch7_backup.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.batch7_backup.sql) (SHA-256 verified).

### Updated Candidate SQL Specifications
- File path: [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql)
- Version: `1.15.2` (Hardened)
- Lines: 566 lines
- Characteristics:
  1. Wrapped in atomic `BEGIN; ... COMMIT;` transaction block.
  2. Precondition check blocks for all target tables (`public.incidents`, `public.incident_locations`, `public.evidence`, `public.student_profiles`, `public.audit_logs`).
  3. Uses live schema confirmed names (`student_profiles`, `audit_logs`).
  4. Drops permissive `is_staff()` policy on `incident_locations` and deploys case-bound `Authorized users view incident locations`.
  5. Dual-path evidence storage policy supports both `auth.uid()` and incident `case_id`.
  6. Immutability checks cover `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`, `id`, plus verified `admission_type`, `admission_year`, `expected_graduation_year`.
  7. Audit log insert conforms to schema with `entity_type: 'system'` and `metadata: jsonb_build_object(...)`.
  8. Status: **NOT DEPLOYED**.

---

## 6. Full Quality Gate Verification Results (Task 8)

| Gate | Command | Actual Exit Code | Result | Details |
|---|---|---|---|---|
| **1. Unit & Regression Tests** | `npm test` | **0** | ✅ **PASS** | 22 test files passed, 296 tests passed (100% success rate across entire project). |
| **2. TypeScript Compilation** | `npx tsc --noEmit` | **0** | ✅ **PASS** | Zero type errors across all application and test files. |
| **3. ESLint Verification** | `npm run lint` | **0** | ✅ **PASS** | Zero lint errors or warnings. |
| **4. Next.js Production Build** | `npm run build` | **0** | ✅ **PASS** | 59/59 static and dynamic routes compiled successfully in 1061ms. |

---

## 7. Remaining Gaps & Security Pre-Flight Instructions

1. **Remote Database Untouched:** Step 115 has NOT been applied to the live database (`polbnvszmvblwenfnqll`).
2. **Preflight Step 121 Execution:**
   A human DBA with direct access to Supabase SQL Editor must execute:
   [supabase/verification/kavach_step121_readonly_preflight.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql)
   to verify catalog definitions and existing policy names prior to migration.
3. **Staging Environment Migration:**
   Execute [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql) first in a staging branch or staging instance.
4. **Post-Migration Live Authorization Verification:**
   Verify actual PostgreSQL response to:
   - Direct PostgREST PATCH to `student_profiles` as an unverified student.
   - Direct PostgREST SELECT to `incident_locations` as unassigned staff.
   - Storage upload to `kavach-evidence` with valid case ID folder.
5. **Production Release Gate:**
   Remains strictly **`HOLD`** until the human DBA completes the steps above.
