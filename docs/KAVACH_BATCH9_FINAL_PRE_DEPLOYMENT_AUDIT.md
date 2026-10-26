# KAVACH CAMPUS — BATCH 9: FINAL PRE-DEPLOYMENT SECURITY AUDIT REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Supabase Reference:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Date:** October 18, 2026  
**Review Type:** Independent Pre-Deployment Security Audit (Batch 9)  
**Review Engine:** Antigravity AI Security & PostgreSQL Compliance Engine  

---

## 1. Executive Summary & Official Verdicts

This independent audit conducts an exhaustive, multi-dimensional verification of all Batch 8 deliverables, candidate SQL scripts, application routes, and test suites prior to any human DBA consideration of deploying Step 115.

### Strict Safety Rules Observed During Audit
- **ZERO SQL queries or mutations were executed against the remote production database.**
- **ZERO migrations or rollback scripts were executed remotely.**
- **ZERO secrets, API keys, JWT tokens, or credentials were requested, printed, or modified.**
- **No user was promoted to ADMIN or SUPER_ADMIN.**
- **No RLS policy was weakened.**
- **No claim of live database verification is made.**
- **Production readiness is NOT claimed merely because automated unit/mock tests pass.**

### Official Batch 9 Verdicts

| Evaluation Target | Batch 9 Verdict | Official Justification |
|---|---|---|
| **Step 115 (Security Hardening Candidate SQL)** | 🟢 **READY FOR HUMAN DBA REVIEW** | Candidate SQL (v1.15.2) resolves all previously identified defects: (1) Reconciles dual-path evidence storage authorization, (2) Purges permissive `is_staff()` policy on `incident_locations` with case-bound rules, (3) Protects `student_profiles` verification fields and verified academic batch credentials, (4) Enforces strict audit log schema parity (`entity_type TEXT NOT NULL`, `metadata JSONB`). Script is wrapped in an atomic transaction block with defensive precondition checks. Safe for human DBA staging review; **NOT DEPLOYED**. |
| **Step 121 (Read-Only Preflight SQL)** | 🟢 **READY FOR HUMAN DBA REVIEW** | 100% read-only catalog queries across all 9 sections; zero mutations (no DDL/DML/DCL); valid catalog columns; expanded to cover `incident_locations`. Completely safe to execute in the Supabase Dashboard SQL Editor. |
| **Kavach Campus Production Release Gate** | 🔴 **HOLD (NOT VERIFIED)** | Production release remains strictly on **HOLD**. True database-level authorization, RLS enforcement, and trigger behavior have **NOT BEEN VERIFIED** on a live PostgreSQL database. Release cannot occur until a human DBA runs Step 121, executes Step 115 in staging, conducts post-migration live testing, and verifies results. |

---

## 2. Multi-Dimensional Security Audit Analysis

### AUDIT A — SQL Consistency & Migration History

#### 1. Comparison with Migration History
The candidate SQL (`supabase/verification/kavach_step115_security_hardening_candidate.sql`, v1.15.2) was cross-referenced against the repository migration baseline:
- `001_kavach_campus_final.sql`: Defines `profiles`, `incidents`, `evidence`, `incident_locations`, `audit_logs`, and base `student_profiles`.
- `005_kavach_campus_rls_infinite_recursion_repair.sql`: Deployed `is_staff()` and legacy `Staff view locations`.
- `007_student_id_card_verification.sql`: Added `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `ocr_extracted_data` to `student_profiles` and created bucket `kavach-id-cards`.
- `008_kavach_campus_complete_production_alignment.sql`: Deployed security definer helper functions (`is_reviewer()`, `is_admin()`, `is_security_or_admin()`).

Every table, column, constraint, and function referenced in Step 115 exists in this confirmed migration lineage.

#### 2. Atomic Transaction Handling & Partial State Prevention
- Step 115 is enclosed within a single atomic block: `BEGIN; ... COMMIT;` (lines 41–560).
- If any precondition fails (lines 46–200) or if any syntax, permission, or constraint error occurs during execution, PostgreSQL initiates a complete transaction rollback.
- **Result:** Zero risk of an insecure partial state.

#### 3. Idempotency & Repeated Execution
- All policy creations are preceded by `DROP POLICY IF EXISTS`.
- The trigger function uses `CREATE OR REPLACE FUNCTION`.
- The trigger definition uses `DROP TRIGGER IF EXISTS` followed by `CREATE TRIGGER`.
- Precondition checks are read-only assertions via `pg_proc` and `information_schema.columns`.
- **Result:** The script can be executed repeatedly without failing or duplicating objects.

#### 4. Permissive Policy Interactions (`OR` Logic)
In PostgreSQL, permissive RLS policies on the same table are combined with logical `OR`. If an old permissive policy is left active, it creates a backdoor bypassing the new policy.
- Step 115 explicitly drops all known historical permissive policies:
  - `public.evidence`: Drops 4 historical INSERT policies and 6 historical SELECT policies before creating singular case-bound policies.
  - `public.incident_locations`: Drops 8 historical policies (including `"Staff view locations"` and `"Staff can view all incident locations"`).
  - `public.incidents`: Drops 4 historical broad staff policies.
  - `public.student_profiles`: Drops 5 historical read policies and 2 historical update policies.
  - `storage.objects`: Drops 12 historical policies across `kavach-evidence` and `kavach-id-cards`.
- **Result:** No accidental `OR` bypasses remain.

---

### AUDIT B — Student Profile Security

#### 1. Tamper-Proof Trigger Semantics
- Trigger: `trg_prevent_student_profile_tampering` (`BEFORE UPDATE ON public.student_profiles`).
- For non-privileged callers (students):
  - Primary Key modification (`OLD.id IS DISTINCT FROM NEW.id`) throws exception: `Access Denied: Student profile primary key (id) cannot be modified.`
  - Verification columns modification (`verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`) throws exception: `Access Denied: Only institutional reviewers or automated verification service can modify student verification status or audit records.`
  - Academic credentials modification (`admission_type`, `admission_year`, `expected_graduation_year`) once verified (`OLD.verification_status = 'VERIFIED'`) throws exception: `Access Denied: Verified academic credentials (...) cannot be modified after verification.`
  - ID card image change: If a verified student changes `id_card_url`, their status is automatically downgraded to `PENDING_MANUAL_REVIEW`, and `verified_at` / `verified_by` are cleared.

#### 2. Trigger Bypass Integrity
The trigger evaluates privileged status through 3 defensive checks (lines 295–323):
1. `session_user IN ('postgres', 'supabase_admin')`: Direct database administrator / migration runner.
2. `auth.role() = 'service_role'` or `request.jwt.claim.role = 'service_role'`: Backend service-role client (`createAdminClient()`). In Supabase, the JWT role claim is signed by the backend JWT secret and cannot be spoofed by a client-side JWT.
3. `public.is_reviewer() OR public.is_admin()`: Evaluated via SECURITY DEFINER function querying `profiles.role` for `auth.uid()`. Because `profiles` is protected by `prevent_self_role_escalation()` trigger, students cannot escalate their own role.

#### 3. Reviewer Update Authorization & Least Privilege
- Direct PostgREST client update on `public.student_profiles` remains restricted to `(auth.uid() = id)`. Reviewers CANNOT issue direct REST `PATCH` calls to student profiles.
- Reviewer verification updates are strictly mediated through the server-side API [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts):
  - Validates session and caller profile (`role IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY')` and `is_approved = true`).
  - Blocks reviewer self-approval (`targetStudentId === user.id`).
  - Enforces valid decisions (`VERIFIED`, `REJECTED`, `PENDING_MANUAL_REVIEW`).
  - Executes updates via `createAdminClient()` (service-role).
  - Writes an immutable record to `public.audit_logs`.

---

### AUDIT C — Evidence & Storage Architecture

#### 1. Upload Flow Trace
```
Client (Multipart File)
       │
       ▼
Next.js Route Handler: POST /api/incidents/[id]/evidence
       │
       ├─► 1. Authenticate session: createClient().auth.getUser()
       ├─► 2. Resolve incident by UUID or case_id
       ├─► 3. Enforce case authorization:
       │      Caller must be student_id, assigned_to, or SECURITY/ADMIN
       ├─► 4. Validate file size (<= 25MB) & MIME type (JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM, PDF)
       ├─► 5. Sanitize file name: replace(/[^a-zA-Z0-9._-]/g, '_')
       ├─► 6. Generate storage path: ${incident.case_id}/${Date.now()}-${uuid}-${cleanFileName}
       ├─► 7. Upload to bucket 'kavach-evidence' with upsert: false
       ├─► 8. Insert metadata into public.evidence (case_id, file_path, uploaded_by, etc.)
       ├─► 9. Insert audit record into public.audit_logs
       └─► 10. Generate short-lived signed URL (15 minutes) and return response
```

#### 2. Storage Policy & API Path Agreement
- The candidate SQL (lines 456–502) deploys a **dual-path** storage policy on `storage.objects`:
  - **Pattern A (User-scoped):** `auth.uid()::text = (storage.foldername(name))[1]`
  - **Pattern B (Case-scoped):** Folder matches `case_id` or `id::text` of an incident where `i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR public.is_reviewer()`.
- This ensures that server-side API uploads and any direct authorized uploads under `${incident.case_id}/...` succeed while unauthorized cross-incident uploads are rejected by Storage RLS.

#### 3. Guessing Protection & Credential Safety
- An attacker guessing a `case_id` cannot obtain or upload evidence files because both the API route and the Storage RLS policy verify caller authorization against the parent incident row in `public.incidents`.
- `SUPABASE_SERVICE_ROLE_KEY` is loaded only in Node.js server memory and is never passed to the browser.
- Bucket `kavach-evidence` is strictly private (`public = false`). Direct public URL access is completely disabled.

---

### AUDIT D — Incident Locations & GPS Privacy

#### 1. Elimination of Broad Staff Leak
In migration `005`, policy `"Staff view locations"` had `USING (public.is_staff())`. This permitted any authenticated staff member (e.g., counsellors, department heads) to read real-time GPS locations and track history for incidents across the entire campus.

#### 2. Hardened Case-Bound Policies
Candidate SQL v1.15.2 (lines 407–437) replaces all broad policies with case-bound rules:
- **SELECT Policy:**
  ```sql
  CREATE POLICY "Authorized users view incident locations"
  ON public.incident_locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_locations.incident_id
        AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR public.is_reviewer())
    )
  );
  ```
- **INSERT Policy:**
  ```sql
  CREATE POLICY "Authorized users insert incident locations"
  ON public.incident_locations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_locations.incident_id
        AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR public.is_reviewer())
    )
  );
  ```
- **UPDATE & DELETE:** No policies defined -> defaults to DENY for all roles. Location tracking records are append-only and immutable.

---

### AUDIT E — Audit Logging Schema Parity

#### 1. Schema & Constraints
From `001_kavach_campus_final.sql` (lines 222–232):
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL`
- `action TEXT NOT NULL`
- `entity_type TEXT NOT NULL`
- `entity_id UUID`
- `metadata JSONB`
- `ip_address TEXT`
- `user_agent TEXT`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

#### 2. Audit Route Verification
Every modified route writing to `public.audit_logs` conforms to this schema:
| Route | Action | entity_type | metadata Format |
|---|---|---|---|
| [src/app/api/student/verify-id/route.ts](file:///d:/Kavach%20Campus/src/app/api/student/verify-id/route.ts#L165-L177) | `STUDENT_ID_VERIFICATION_EVALUATED` | `'student_profiles'` | `{ studentId, admissionType, batchDuration, resultingStatus, reason }` |
| [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts#L212-L223) | `STUDENT_VERIFICATION_DECISION` | `'student_profiles'` | `{ reviewerRole, decision, reason, officialRosterConfirmed }` |
| [src/app/api/admin/users/approve/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/users/approve/route.ts#L93-L99) | `APPROVE_USER_ROLE` | `'profiles'` | `{ approvedRole, approverRole }` |
| [src/app/super-admin/login/page.tsx](file:///d:/Kavach%20Campus/src/app/super-admin/login/page.tsx#L40-L55) | `SUPER_ADMIN_PASSWORD_CHANGE` | `'auth'` | `{ status, message }` |
| [src/app/api/incidents/[id]/evidence/route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/evidence/route.ts#L247-L253) | `EVIDENCE_UPLOADED` | `'evidence'` | `{ case_id, file_name, file_size }` |
| [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql#L543-L558) | `SECURITY_REMEDIATION_STEP115` | `'system'` | `jsonb_build_object('description', ..., 'version', '1.15.2', ...)` |
| [supabase/verification/kavach_step115_rollback_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql#L48-L64) | `SECURITY_ROLLBACK_STEP115` | `'system'` | `jsonb_build_object('description', ..., 'warning', ..., 'version', '1.15.1', ...)` |

---

### AUDIT F — Test Quality & Rigorous Classification

#### Categorization of Repository Test Suites (22 Files, 296 Tests)

| Category | Description | Count | Percentage | Tested Against Real PostgreSQL? |
|---|---|---|---|---|
| **Category 1: Unit Tests** | Pure algorithmic logic, validation routines, adapters with mocked external APIs | 88 tests | 29.7% | ❌ No (Node.js runtime) |
| **Category 2: Route-Handler Tests** | Next.js API route handlers executed with mocked Supabase client | 124 tests | 41.9% | ❌ No (Vitest mock environment) |
| **Category 3: SQL Text / Structure Tests** | Static AST / regex analysis of SQL candidate text to verify syntax, table references, and preconditions | 34 tests | 11.5% | ❌ No (Static text inspection) |
| **Category 4: Simulated Authorization Tests** | In-memory TypeScript simulations of PostgreSQL RLS policies (`USING`/`WITH CHECK`) and triggers (`OLD` vs `NEW`) | 50 tests | 16.9% | ❌ No (Simulated logic) |
| **Category 5: Real PostgreSQL Integration Tests** | Tests executing against a containerized or local PostgreSQL instance | **0 tests** | **0.0%** | N/A |
| **Category 6: Live Production Tests** | Tests executing against the live remote Supabase database | **0 tests** | **0.0%** | N/A |

> [!CRITICAL]
> **Definitive Test Disclosure:** None of the 296 automated tests execute against a real PostgreSQL database. Simulated authorization tests confirm that the mathematical logic of the RLS expressions and trigger functions is sound, but they do NOT substitute for live PostgreSQL RLS and trigger enforcement.

---

### AUDIT G — Read-Only Preflight Verification (Step 121)

Inspection of [supabase/verification/kavach_step121_readonly_preflight.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql) (201 lines):
- **Section 1:** Columns of `public.audit_logs` (`information_schema.columns`).
- **Section 2:** Sensitive core columns across `student_profiles`, `incidents`, `evidence`, `profiles`, and `incident_locations`.
- **Section 3:** RLS enabled/forced flags across all public tables (`pg_class`, `pg_namespace`).
- **Section 4:** Active RLS policies expressions (`pg_policies`).
- **Section 5:** Active user-defined triggers on `student_profiles` and `profiles` (`pg_trigger`, `pg_proc`).
- **Section 6:** Security definer helper functions definition and execution settings (`pg_proc`).
- **Section 7:** Storage buckets privacy (`storage.buckets`) and storage object policies (`pg_policies`).
- **Section 8:** Table grants for `anon`, `authenticated`, `service_role` (`information_schema.role_table_grants`).
- **Section 9:** Public / anonymous policy detector (`pg_policies`).

**Purity Assessment:** 100% READ-ONLY. Zero DDL/DML/DCL. Zero side effects. Ready for human DBA execution.

---

### AUDIT H — Rollback Candidate Safety Analysis

Inspection of [supabase/verification/kavach_step115_rollback_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql) (67 lines):
- **Rollback Scope:**
  1. Drops `trg_prevent_student_profile_tampering` and `prevent_student_profile_tampering()`.
  2. Reverts `student_profiles` UPDATE policy to `USING (auth.uid() = id)` (omitting `WITH CHECK`).
  3. Reverts `evidence` INSERT policy to `WITH CHECK (auth.uid() = uploaded_by)`.
  4. Records `SECURITY_ROLLBACK_STEP115` audit log.
- **Inherent Risk:**
  Reverting `student_profiles` removes the trigger and `WITH CHECK`, restoring the baseline where students can self-verify via direct PostgREST calls.
- **Labeling & Operational Rule:**
  The rollback script is clearly marked:
  ```
  CAUTION: Rolling back restores a VULNERABLE steady state:
  1. Dropping trg_prevent_student_profile_tampering and WITH CHECK leaves student_profiles
     vulnerable to client-side self-verification and audit tampering.
  2. Reverting evidence INSERT policy allows students to upload evidence with arbitrary case_id.
  This script must ONLY be used for emergency operational recovery, NOT as a secure steady-state target.
  ```
  **Rule:** Must NEVER be run as an operational alternative without immediately placing the platform into maintenance mode.

---

## 3. Findings & Residual Risks Matrix

```
+---------------------------------------------------------------------------------------------------------------+
|                                    BATCH 9 PRE-DEPLOYMENT AUDIT FINDINGS                                     |
+----+---------------------------------------------------------------+----------+-------------------------------+
| ID | Title                                                         | Severity | Tested against Live Postgres? |
+----+---------------------------------------------------------------+----------+-------------------------------+
| 01 | Live PostgreSQL Remote Execution Pending (DBA Gate)           | HIGH     | ❌ No (Remote SQL prohibited) |
| 02 | Asynchronous Audit Log Partial Failure Risk in Admin API      | MEDIUM   | ❌ No (Application logic)     |
| 03 | Rollback Script Restores Insecure Baseline (Operational Risk) | MEDIUM   | ❌ No (Emergency-only script) |
| 04 | Zero Real PostgreSQL Integration Tests in Automated Suite     | LOW      | ❌ No (Unit & simulated only) |
| 05 | Signed URL TTL vs Evidence Access Lifetime Trade-off          | LOW      | ❌ No (Configuration setting) |
+----+---------------------------------------------------------------+----------+-------------------------------+
```

### Finding 01: Live PostgreSQL Remote Execution Pending (DBA Gate)
- **Severity:** 🟠 **HIGH (Release Blocker)**
- **Target:** Supabase Live Database (`polbnvszmvblwenfnqll`)
- **Evidence:** The candidate SQL v1.15.2 has been extensively analyzed and simulated locally, but has **NOT** been applied to the remote database due to strict safety rules.
- **Exploit Scenario:** Until Step 115 is deployed by a DBA, the live database currently lacks `trg_prevent_student_profile_tampering` and possesses legacy `USING (public.is_staff())` on `incident_locations`.
- **Required Remediation:** Human DBA must execute Step 121 preflight, review output, apply Step 115 in staging, and verify in production.
- **Tested against real PostgreSQL?:** **No.**

### Finding 02: Asynchronous Audit Log Partial Failure Risk in Admin API
- **Severity:** 🟡 **MEDIUM (Resilience Gap)**
- **Target File:** [src/app/api/admin/verifications/route.ts](file:///d:/Kavach%20Campus/src/app/api/admin/verifications/route.ts#L183-L224)
- **Evidence:** In `POST /api/admin/verifications`, the database update on `student_profiles` (lines 192–200) and the audit log insert on `audit_logs` (lines 212–223) are two distinct HTTP REST calls to Supabase. If the server crashes or network fails between lines 200 and 212, the verification status update will succeed while the audit log record is lost.
- **Exploit Scenario:** Verification decision made without an audit trail if a network partition occurs mid-request.
- **Required Remediation:** In a future sprint, encapsulate the verification status change, profile approval synchronization, and audit log insertion into a single transactional PostgreSQL function (`public.apply_verification_decision(...)`).
- **Tested against real PostgreSQL?:** **No.**

### Finding 03: Rollback Script Restores Insecure Baseline (Operational Risk)
- **Severity:** 🟡 **MEDIUM (Operational Policy)**
- **Target File:** [supabase/verification/kavach_step115_rollback_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql#L8-L23)
- **Evidence:** The rollback script reverts `student_profiles` to a state without trigger validation and without `WITH CHECK`.
- **Exploit Scenario:** If executed in production during an incident, it reopens the student self-verification vulnerability.
- **Required Remediation:** Operational DBA documentation mandates platform maintenance mode if rollback is executed.
- **Tested against real PostgreSQL?:** **No.**

### Finding 04: Zero Real PostgreSQL Integration Tests in Automated Suite
- **Severity:** 🟢 **LOW (Testing Methodology Gap)**
- **Target:** Test Suite Architecture
- **Evidence:** All 296 tests run in Node.js with mocked Supabase or in-memory trigger simulations. Zero tests connect to a Docker or live PostgreSQL instance.
- **Failure Scenario:** Subtleties of PostgreSQL type coercion, function volatility, or role inheritance may behave differently than mocked JavaScript objects.
- **Required Remediation:** Establish a containerized PostgreSQL test pipeline in CI/CD before enterprise general availability.
- **Tested against real PostgreSQL?:** **No.**

### Finding 05: Signed URL TTL vs Evidence Access Lifetime Trade-off
- **Severity:** 🟢 **LOW (Operational Configuration)**
- **Target File:** [src/app/api/incidents/[id]/evidence/route.ts](file:///d:/Kavach%20Campus/src/app/api/incidents/%5Bid%5D/evidence/route.ts#L74)
- **Evidence:** Signed URLs for evidence viewing are issued with a 900-second (15-minute) TTL.
- **Exploit Scenario:** If a student shares a generated signed URL with an unauthorized party, that party can view the evidence file until the 15-minute token expires.
- **Required Remediation:** 15 minutes is an acceptable security balance for loading media in the UI, but can be reduced to 300 seconds (5 minutes) if campus compliance requires ultra-strict token lifetimes.
- **Tested against real PostgreSQL?:** **No.**

---

## 4. Local Quality Gate Verification Results

| Quality Gate | Command | Actual Exit Code | Result | Details |
|---|---|---|---|---|
| **1. Regression Tests** | `npm test` | **0** | ✅ **PASS** | 22 test files passed, 296 tests passed (100% success rate across entire project). |
| **2. TypeScript Compilation** | `npx tsc --noEmit` | **0** | ✅ **PASS** | Zero type errors across all application and test files. |
| **3. ESLint Verification** | `npm run lint` | **0** | ✅ **PASS** | Zero lint errors or warnings. |
| **4. Next.js Production Build** | `npm run build` | **0** | ✅ **PASS** | 59/59 static and dynamic routes compiled successfully in 1168ms. |

---

## 5. Human DBA Execution Playbook (Next Steps)

Because remote execution is strictly prohibited by AI agents, the following sequential playbook must be executed by a human DBA:

### Step 1: Pre-Flight Catalog Audit
1. Open Supabase Dashboard SQL Editor: `https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new`
2. Paste and execute the contents of [supabase/verification/kavach_step121_readonly_preflight.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql).
3. Confirm that Section 1 returns `entity_type` and `metadata` for `public.audit_logs`.
4. Confirm that Section 4 reveals active policies on `incidents`, `student_profiles`, `evidence`, and `incident_locations`.

### Step 2: Staging Application of Step 115
1. In a staging branch or staging instance, execute [supabase/verification/kavach_step115_security_hardening_candidate.sql](file:///d:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql).
2. Confirm the transaction commits successfully with exit message `COMMIT` and audit log entry.

### Step 3: Live Post-Migration Verification
Execute the following verification queries on staging:
```sql
-- 1. Verify trigger exists and is active
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_prevent_student_profile_tampering';

-- 2. Verify case-bound policy on incident_locations
SELECT policyname, qual FROM pg_policies WHERE tablename = 'incident_locations';

-- 3. Verify dual-path policy on storage.objects
SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
```

### Step 4: Production Gate Decision
Only after Steps 1, 2, and 3 have been completed and verified by human engineering leadership may the Production Release Gate be moved from **`HOLD`** to **`APPROVED`**.
