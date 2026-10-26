# KAVACH CAMPUS — BATCH 14: FINAL SECURITY VALIDATION & PRODUCTION READINESS AUDIT

**Audit Date:** October 18, 2026  
**Auditor:** Antigravity AI  
**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Scope:** Independent Verification of Local PostgreSQL Integration, RLS Policies, Storage Authorization, and Production Release Posture  
**Final Production Recommendation:** ⛔ **STRICT HOLD (NOT APPROVED FOR PRODUCTION DEPLOYMENT)**  

---

## 1. Executive Summary & Quality Gate Status

| Verification Gate | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Vitest Unit & Integration Suite** | 🟢 **PASS** | 22 test files, 296/296 tests passing (`npm test`, Exit code `0`). |
| **TypeScript Compilation** | 🟢 **PASS** | Zero type errors across entire codebase (`npx tsc --noEmit`, Exit code `0`). |
| **ESLint Static Code Quality** | 🟢 **PASS** | Zero lint warnings or errors (`npm run lint`, Exit code `0`). |
| **Production Build (Turbopack)** | 🟢 **PASS** | 59/59 static & dynamic routes compiled successfully (`npm run build`, Exit code `0`). |
| **Native PostgreSQL Integration** | 🟢 **PASS** | 8/8 tests passing against local container on port `54322` (`npx tsx scripts/run_real_postgres_tests.ts`, Exit code `0`). |
| **Database Connection Isolation** | 🟢 **PASS** | Runner enforces host allowlist, blocks remote targets pre-socket, and validates Docker bridge IPs. |
| **Student Profile Immutability** | 🟢 **PASS** | Trigger `trg_prevent_student_profile_tampering` blocks unauthorized modifications to verification fields. |
| **Incident GPS Isolation** | 🟢 **PASS** | Table RLS restricts GPS tracking to incident reporter, assigned responder, or institutional admins. |
| **Evidence Metadata RLS** | 🟢 **PASS** | Table RLS blocks unauthorized uploads; default-deny blocks unprivileged updates and deletes. |
| **Storage Object Access Controls** | 🟡 **AUDITED** | Storage RLS verified on database; live HTTP object streaming requires remote storage bucket audit. |
| **Latent Policy Recursion (Profiles)** | 🟠 **HIGH FINDING** | Legacy recursive policy from migration `001` causes `42P17` on `UPDATE profiles ... RETURNING`. |
| **Migration Version Collisions** | 🔴 **BLOCKER** | Duplicate versions `001`, `002`, `008` exist in `supabase/migrations/`; blocks remote CLI migrations. |
| **Production Deployment Posture** | ⛔ **HOLD** | Remote database remains untouched; release is on strict **HOLD**. |

---

## 2. Phase 1 — Reproduction of Test Results

All quality gates and test suites were independently executed in sequence. Zero failures or regressions occurred.

### 2.1 Command Execution Evidence

| Command | Working Directory | Exit Code | Observed Output / Summary |
| :--- | :---: | :---: | :--- |
| `git diff --stat` | `D:\Kavach Campus` | `0` | 40 files changed; `supabase/migrations/` untouched; `package.json` devDependencies added. |
| `npm test` | `D:\Kavach Campus` | `0` | `Test Files: 22 passed (22) \| Tests: 296 passed (296) \| Duration: 24.94s` |
| `npx tsc --noEmit` | `D:\Kavach Campus` | `0` | Zero type errors; clean compilation. |
| `npm run lint` | `D:\Kavach Campus` | `0` | Zero ESLint warnings or errors. |
| `npm run build` | `D:\Kavach Campus` | `0` | Next.js 16.4.0 (Turbopack) build succeeded; 59/59 routes generated. |
| `npx tsx scripts/run_real_postgres_tests.ts` | `D:\Kavach Campus` | `0` | Real PostgreSQL Integration Tests: `Total: 8 \| Passed: 8 \| Failed: 0`. |

### 2.2 Live PostgreSQL Test Run Output

```text
Connected to isolated local PostgreSQL test database at: postgresql://postgres:***@localhost:54322/postgres
Database Identity Confirmed: DB=postgres, User=postgres, HostAddr=172.18.0.2

--- 1. Ingesting Reviewed Safe Baseline Schema Migrations ---
Applied baseline migration 001_kavach_campus_final.sql
Applied reviewed safe baseline migration 008_kavach_campus_schema_and_rls_alignment_safe.sql

--- 1b. Ingesting Reviewed Precondition Objects (Step 108 is_reviewer & evidence schema alignment) ---
Applied reviewed precondition objects: is_reviewer() and evidence(case_id, file_path).

--- 2. Applying Candidate Hardening Migration (Step 115) ---
Candidate Step 115 SQL applied successfully.

--- 3. Seeding Synthetic Test Actors & Fixtures ---
Synthetic fixtures seeded (Zero ADMIN / SUPER_ADMIN roles used).

--- 4. Validating Authentication & RLS Context Fidelity ---
Auth context fidelity confirmed: auth.uid()=11111111-1111-4111-a111-111111111111, auth.role()=authenticated

--- 5. Executing Native PostgreSQL Integration Tests ---
[PASS] Test 1: Student cannot modify verification_status via direct SQL (trigger blocked)
[PASS] Test 2: Student cannot modify verified_by or verified_at (trigger blocked)
[PASS] Test 3: Student cannot modify OCR verification data (trigger blocked)
[PASS] Test 4: Student can update permitted ordinary profile fields (blood_group, medical_conditions, hostel_room)
[PASS] Test 5: Unassigned staff cannot read unrelated incident locations (public.incident_locations table RLS)
[PASS] Test 6: Assigned responder can access authorized incident locations and not others (Table-level RLS)
[PASS] Test 7: Unauthorized evidence upload is rejected by public.evidence table RLS WITH CHECK
[PASS] Test 8: Reviewer direct client UPDATE on student_profiles is blocked by least privilege (auth.uid() = id)

======================================================
REAL POSTGRESQL INTEGRATION TEST RESULTS:
Total: 8 | Passed: 8 | Failed: 0
======================================================
```

---

## 3. Phase 2 — Database Connection Isolation Audit

The test runner script (`scripts/run_real_postgres_tests.ts`) was audited line-by-line to verify fail-closed isolation:

1. **Pre-Socket Host Allowlist:**
   - Target URL is parsed by Node `URL` before creating a database client.
   - Hostname must match `ALLOWED_LOCAL_HOSTS` (`localhost`, `127.0.0.1`, `::1`).
   - Any remote host (such as `supabase.co`, `supabase.in`, `pooler.supabase.com`, `amazonaws.com`, `azure`, `gcp`) causes an immediate process exit (`process.exit(1)`).
2. **Production Project Identifier Guard:**
   - Script performs a substring check for the production reference `polbnvszmvblwenfnqll`.
   - If detected, execution halts immediately with `FATAL SAFETY VIOLATION`.
3. **Dedicated Port and Database Allowlist:**
   - Allowed ports: strictly `54322`, `5432`, `54321`.
   - Allowed database names: strictly `postgres`, `kavach_test`, `test`, `kavach_campus_test`.
4. **Post-Connection Runtime Probe:**
   - Executes `SELECT current_database(), current_user, inet_server_addr(), inet_client_addr();`.
   - Server address check:
     - Accepts loopback (`127.0.0.1`, `::1`).
     - Accepts RFC 1918 private Docker container bridge subnets (`172.16.0.0/12`, `10.0.0.0/8`, `192.168.0.0/16`).
     - Rejects any public or non-private IP address.
5. **Credential Masking:**
   - URLs logged to console are redacted (`redactUrl`) to replace passwords with `***`.

---

## 4. Phase 3 — In-Depth Local Schema, RLS, and Trigger Review

### 4.1 `student_profiles` Table
- **SELECT Policy:** `Reviewers and student owner read profile`
  - Expression: `((id = auth.uid()) OR is_reviewer())`
  - Unauthenticated access: Denied (0 rows).
  - Cross-student access: Denied (Student A reading Student B returned 0 rows).
- **UPDATE Policy:** `Students update own profile`
  - Expression: `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`
- **Trigger Protection:** `trg_prevent_student_profile_tampering`
  - BEFORE UPDATE trigger calling `prevent_student_profile_tampering()`.
  - **Ownership:** `postgres`.
  - **Flags:** `SECURITY DEFINER`.
  - **Path Security:** `search_path = public` explicitly set.
  - **DBA Bypass Protection:** Refined to require `auth.uid() IS NULL`, preventing authenticated client sessions from bypassing trigger validation.
  - **Protected Columns:** `id`, `verification_status`, `verified_by`, `verified_at`, `verification_notes`, `ocr_extracted_data`, and verified academic batch credentials (`admission_type`, `admission_year`, `expected_graduation_year`).
  - **Business Invalidation Rule:** If a verified student modifies their `id_card_url`, status is automatically reset to `PENDING_MANUAL_REVIEW`.

### 4.2 `incident_locations` Table (GPS Breadcrumbs)
- **SELECT Policy:** `Authorized users view incident locations`
  - Expression: `EXISTS (SELECT 1 FROM incidents i WHERE i.id = incident_locations.incident_id AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR is_admin()))`
- **INSERT Policy:** `Authorized users insert incident locations`
  - Expression: `EXISTS (SELECT 1 FROM incidents i WHERE i.id = incident_locations.incident_id AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR is_admin()))`
- **Unassigned Staff Denial:**
  - Tested with unassigned counsellor: returned 0 rows.
  - Tested with assigned responder: returned locations for assigned incident; returned 0 rows for unassigned incident.
- **Legacy Policy Purge:** All legacy policies permitting broad staff access (`Staff view locations`, `Staff can view all incident locations`) have been purged.

### 4.3 `evidence` Table
- **SELECT Policy:** `Authorized users view incident evidence`
  - Expression: `uploaded_by = auth.uid() OR is_admin() OR EXISTS (SELECT 1 FROM incidents i WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id) AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR is_reviewer()))`
- **INSERT Policy:** `Authorized users upload incident evidence`
  - Expression: `uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM incidents i WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id) AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR is_reviewer()))`
- **UPDATE & DELETE Policies:**
  - Zero policies defined for UPDATE or DELETE.
  - Under PostgreSQL RLS, default behavior is **DENY ALL**.
  - Probed via direct client query: `DELETE FROM evidence` by student affected 0 rows.

### 4.4 `profiles` Table & Role Escalation Prevention
- **Trigger:** `trg_prevent_self_role_escalation` calling `prevent_self_role_escalation()`.
- **Logic:** If `OLD.role IS DISTINCT FROM NEW.role` or `OLD.is_approved IS DISTINCT FROM NEW.is_approved`, execution verifies `public.is_admin()`. If not admin, raises exception.
- **Latent Infinite Recursion Finding (42P17):**
  - Probing `UPDATE profiles SET role = 'ADMIN' WHERE id = studentAId` uncovered `42P17: infinite recursion detected in policy for relation "profiles"`.
  - **Root Cause:** Migration `001_kavach_campus_final.sql` contains a legacy SELECT policy on `profiles`:
    `CREATE POLICY "Staff can read all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles ...))`
  - When `UPDATE ... RETURNING` or internal role check triggers a SELECT on `profiles`, the policy re-evaluates `profiles`, creating a circular query loop.
  - **Status:** Blocks self-escalation via failure, but is an unhandled recursion defect that must be remediated using migration `005`'s non-recursive pattern (`is_staff()` function).

### 4.5 `SECURITY DEFINER` Function Audit

| Function Name | Owner | Security Definer | Search Path | Authorization Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `public.is_admin()` | `postgres` | `true` | `search_path=public` | Checks role in `('ADMIN', 'SUPER_ADMIN')` |
| `public.is_staff()` | `postgres` | `true` | `search_path=public` | Checks role in `('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')` |
| `public.is_reviewer()` | `postgres` | `true` | `search_path=public` | Checks role in `('ADMIN', 'SUPER_ADMIN', 'SECURITY')` and `is_approved = true` |
| `public.is_security_or_admin()` | `postgres` | `true` | `search_path=public` | Checks role in `('SECURITY', 'ADMIN', 'SUPER_ADMIN')` |
| `public.prevent_student_profile_tampering()` | `postgres` | `true` | `search_path=public` | Enforces column-level immutability for non-privileged users |
| `public.prevent_self_role_escalation()` | `postgres` | `true` | `search_path=public` | Prevents non-admins from changing roles or approval status |

---

## 5. Phase 4 — Storage & Backend Authorization Audit

### 5.1 Storage RLS Policies (`storage.objects`)

| Bucket | Operation | Permitted Roles | Policy Condition Summary |
| :--- | :---: | :---: | :--- |
| `kavach-id-cards` | INSERT | `authenticated` | `auth.uid() = foldername[1]` (Strict user-folder prefix). |
| `kavach-id-cards` | SELECT | `authenticated` | `auth.uid() = foldername[1] OR is_reviewer()` |
| `kavach-evidence` | INSERT | `authenticated` | `auth.uid() = foldername[1] OR (case-bound AND incident participant/reviewer)` |
| `kavach-evidence` | SELECT | `authenticated` | `auth.uid() = foldername[1] OR is_admin() OR (case-bound AND incident participant/reviewer)` |

### 5.2 Backend API Security (`Next.js` Route Handlers)

1. **Evidence Access Route (`/api/incidents/[id]/evidence`):**
   - Requires active user session via `supabase.auth.getUser()`.
   - Validates that the caller is either the incident reporter (`student_id`), the assigned responder (`assigned_to`), or has institutional role (`SECURITY`, `ADMIN`, `SUPER_ADMIN`).
   - Unassigned staff receive `403 Forbidden`.
   - Generates signed URLs with a short 15-minute (900s) expiry.
2. **Reviewer Verification Decision Route (`/api/admin/verifications`):**
   - Enforces role verification: caller must be `ADMIN`, `SUPER_ADMIN`, or `SECURITY`, and must have `is_approved = true`.
   - **Self-Approval Guard:** Explicitly blocks reviewers from approving their own account (`targetStudentId === user.id -> 403 Forbidden`).
   - Decision values strictly validated against `['VERIFIED', 'REJECTED', 'PENDING_MANUAL_REVIEW']`.
   - Writes immutable record to `public.audit_logs`.
3. **Student ID Upload Route (`/api/student/verify-id`):**
   - Validates 10-digit student ID format.
   - Validates academic batch duration (4 years for Regular, 3 years for Lateral).
   - Duplicate ID check prevents account impersonation.

---

## 6. Phase 5 — Test Coverage Matrix

| Security Scenario | PostgreSQL Integration | Vitest Unit / Route | Assessment |
| :--- | :---: | :---: | :---: |
| Student cannot modify verification_status directly | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Student cannot modify verified_by or verified_at | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Student cannot modify OCR extracted data | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Student can update permitted profile fields | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Unassigned staff cannot read incident locations | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Assigned responder can access authorized locations only | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Unauthorized evidence upload is rejected by table RLS | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Reviewer direct client UPDATE blocked by least privilege | ✅ TESTED | ✅ TESTED | **VERIFIED** |
| Student A cannot read Student B sensitive profile | ✅ TESTED (Probe 1) | ✅ TESTED | **VERIFIED** |
| Anonymous user cannot read private profiles | ✅ TESTED (Probe 2) | ✅ TESTED | **VERIFIED** |
| Anonymous user cannot read incident records | ✅ TESTED (Probe 3) | ✅ TESTED | **VERIFIED** |
| Unauthorized evidence DELETE is denied | ✅ TESTED (Probe 4) | ✅ TESTED | **VERIFIED** |
| Self-role escalation to ADMIN is blocked | ⚠️ RECURSION ERROR (Probe 5) | ✅ TESTED | **DEFECT IDENTIFIED** |
| Storage object downloads bound to signed URL expiry | ⚪ NOT TESTED (DB level) | ✅ TESTED | **STORAGE SCOPE** |
| Unauthorized backend API requests fail closed | ⚪ NOT APPLICABLE (DB level) | ✅ TESTED | **ROUTE SCOPE** |

---

## 7. Findings & Risk Classification

### 7.1 HIGH: Latent Infinite Recursion on `public.profiles` (`42P17`)
- **Severity:** 🟠 **HIGH**
- **Description:** Migration `001_kavach_campus_final.sql` created policy `"Staff can read all profiles"` on `profiles` using a subquery that queries `profiles`. When an update or trigger executes `is_admin()` or queries `profiles` within the same transaction, PostgreSQL aborts with `error: infinite recursion detected in policy for relation "profiles"`.
- **Impact:** Prevents clean execution of `UPDATE profiles` statements under authenticated user contexts.
- **Recommended Remediation:** Replace `"Staff can read all profiles"` policy with `CREATE POLICY "Staff can read all profiles" ON public.profiles FOR SELECT USING (public.is_staff());` as originally specified in migration `005`.

### 7.2 MEDIUM: Migration Duplicate Key Conflicts in Migration Directory
- **Severity:** 🟡 **MEDIUM**
- **Description:** `supabase/migrations/` contains conflicting filenames with duplicate prefixes (`001`, `002`, `008`). While resolved for local development via `config.toml`, any standard `supabase db push` or remote CLI migration will fail with `schema_migrations_pkey` duplicate key violation.
- **Recommended Remediation:** Re-index historical migrations with standard timestamps or squash into a single baseline migration before executing remote CLI deployments.

### 7.3 MEDIUM: Storage Bucket Policy Dashboard Parity
- **Severity:** 🟡 **MEDIUM**
- **Description:** Database table RLS for `storage.objects` has been applied and audited. However, remote Supabase Storage requires verification that the physical buckets (`kavach-evidence`, `kavach-id-cards`) exist, are set to `public = false`, and have appropriate CORS configurations.
- **Recommended Remediation:** Inspect bucket configuration in remote Supabase dashboard prior to deployment.

### 7.4 LOW: Semantic Scope of `is_reviewer()`
- **Severity:** 🟢 **LOW**
- **Description:** `is_reviewer()` evaluates to `true` for profiles with role `SECURITY`. While appropriate for verifying physical student ID cards at gates, `is_reviewer()` must not be used on endpoints granting broader access to student location or sensitive medical records.
- **Status:** Already remediated in `incident_locations` by scoping to `is_admin()`.

---

## 8. Final Production Release Recommendation

> [!CAUTION]
> ### FINAL VERDICT: ⛔ HOLD (NOT APPROVED FOR PRODUCTION DEPLOYMENT)
> 
> **Rationale:**
> 1. The local development environment and local database testing have achieved significant maturity (8/8 native PostgreSQL tests passing, 296/296 unit tests passing, clean build).
> 2. However, the latent `42P17` infinite recursion defect on `public.profiles` must be eliminated.
> 3. Historical migration collisions (`001`, `002`, `008`) must be cleanly squashed or timestamped before any remote migration pipeline can run.
> 4. Physical storage buckets on remote Supabase must be independently verified for private access and CORS compliance.
> 
> **Zero modifications have been made to the remote production database (`polbnvszmvblwenfnqll`). It remains in an untouched, stable state.**
