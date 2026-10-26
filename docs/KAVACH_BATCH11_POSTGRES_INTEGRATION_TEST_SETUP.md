# KAVACH CAMPUS — BATCH 11: ISOLATED POSTGRESQL INTEGRATION TESTING SETUP REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Supabase Reference:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Date:** October 18, 2026  
**Review Type:** Real PostgreSQL Integration Environment Discovery & Test Setup (Batch 11)  
**Review Engine:** Antigravity AI Security & PostgreSQL Compliance Engine  

---

## 1. Executive Summary & Official Verdicts

In strict compliance with the mandatory security constraints:
- **ZERO SQL queries or mutations were executed against the remote Supabase database.**
- **ZERO migrations or rollback scripts were executed against production.**
- **ZERO secrets, API keys, JWT tokens, or credentials were exposed or modified.**
- **ZERO real student information was used.**
- **No user was promoted to ADMIN or SUPER_ADMIN.**
- **No software was installed or system configuration modified without prior explanation and user approval.**
- **No PostgreSQL integration test is claimed to have passed without an actual PostgreSQL engine executing it.**

### Official Batch 11 Verdicts

| Evaluation Target | Batch 11 Verdict | Official Justification |
|---|---|---|
| **Testing Environment** | 🟡 **NEEDS SETUP** | Host diagnostics revealed that Docker Desktop, Docker Engine, Podman, WSL, and `psql` are not available in PATH on this Windows host. Supabase CLI v2.121.0 is installed, but `npx supabase status` exits with code 1 (`docker: command not found (podman also not found)`). An isolated PostgreSQL test container or service must be provisioned. |
| **Real PostgreSQL Integration Tests** | ⚪ **NOT RUN** | True containerized PostgreSQL integration tests could **NOT RUN** due to the absence of a local PostgreSQL/Docker environment. Zero integration tests have been run against a live or containerized PostgreSQL instance. |
| **Step 115 (Security Hardening Candidate SQL)** | 🟢 **READY FOR HUMAN DBA REVIEW** | Candidate SQL (v1.15.2) resolves all architectural findings: dual-path storage authorization, case-bound incident location RLS, student profile verification protection, and strict audit log schema compliance (`entity_type TEXT NOT NULL`, `metadata JSONB`). Precondition checks and atomic transactions verified. Ready for human DBA review in staging; **NOT DEPLOYED**. |
| **Step 121 (Read-Only Preflight SQL)** | 🟢 **VERIFIED READ-ONLY** | Every statement across all 9 sections (201 lines) is a pure `SELECT` query on system catalogs (`pg_class`, `pg_proc`, `pg_trigger`, `pg_policies`, `storage.buckets`) and `information_schema`. 100% safe for human DBA execution. |
| **Kavach Campus Production Release Gate** | 🔴 **HOLD** | Production release remains strictly on **HOLD**. True database-level authorization, RLS enforcement, and trigger behavior have **NOT BEEN VERIFIED** on a live PostgreSQL database. Release cannot occur until a human DBA runs Step 121, executes Step 115 in staging, conducts post-migration live testing, and verifies results. |

---

## 2. Environment Discovery Results (Phase 1)

### 1. Configuration & Dependency Discovery
- `package.json`: Contains Next.js 16.4.0, React 19.3.0, Vitest 5.0.3, Supabase JS 2.117.3, SSR 0.12.7. No direct PostgreSQL driver (such as `pg` or `postgres`) is currently installed in `dependencies` or `devDependencies`.
- `supabase/config.toml`: Not present in project root. Supabase CLI configuration is linked via `.temp` to remote project `polbnvszmvblwenfnqll`.
- `supabase/migrations/`: Contains 11 migration files (`001_kavach_campus_final.sql` through `008_kavach_campus_complete_production_alignment.sql`).
- `supabase/verification/`: Contains Step 115 candidate, Step 115 rollback candidate, Step 121 read-only preflight, and backup baselines.
- `vitest.config.mts`: Configured for Node.js test environment (`environment: 'node'`) with aliases pointing to `@/ -> src/`.
- CI Configuration: No active GitHub Actions or GitLab CI YAML pipelines found in repository.

### 2. Host Tool Probing & Availability
Terminal diagnostics were executed to detect local database and virtualization engines:

| Tool | Probing Command | Exit Code | Host Status | Output / Details |
|---|---|---|---|---|
| **Docker Desktop / Engine** | `docker --version; docker ps` | 1 | ❌ **UNAVAILABLE** | `The term 'docker' is not recognized as the name of a cmdlet` |
| **PostgreSQL CLI (`psql`)** | `psql --version` | 1 | ❌ **UNAVAILABLE** | `The term 'psql' is not recognized as the name of a cmdlet` |
| **Podman** | `podman --version` | 1 | ❌ **UNAVAILABLE** | `The term 'podman' is not recognized as the name of a cmdlet` |
| **Windows Subsystem for Linux** | `wsl --list --verbose` | 1 | ❌ **UNAVAILABLE** | `The Windows Subsystem for Linux is not installed` |
| **Windows Services** | `Get-Service *postgres*, *docker*` | 0 | ❌ **NONE RUNNING** | Zero services matching postgres or docker exist |
| **Supabase CLI** | `npx supabase --version` | 0 | ✅ **AVAILABLE** | Version `2.121.0` is installed |
| **Supabase Local Daemon** | `npx supabase status` | 1 | ❌ **FAILED** | `docker: command not found (podman also not found)` |

---

## 3. Isolated Test Environment Design (Phase 2)

To ensure that integration tests can **NEVER** accidentally mutate or query the remote production Supabase project (`polbnvszmvblwenfnqll`), the test harness is architected with strict physical and network isolation.

### 1. Synthetic Test User Hierarchy (Zero Real Data)
All records in the test database will be synthetic entities created solely for the duration of the test:

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                              SYNTHETIC ACTOR MATRIX                                                   |
+--------------------------+--------------------------------------+------------+-------------+--------------------------+
| Actor Name               | Mock UUID                            | Role       | Approved?   | Purpose                  |
+--------------------------+--------------------------------------+------------+-------------+--------------------------+
| Student A (Owner)        | 11111111-1111-4111-a111-111111111111 | STUDENT    | true        | Legitimate owner/updater |
| Student B (Attacker)     | 22222222-2222-4222-a222-222222222222 | STUDENT    | true        | Cross-tenant attacker    |
| Assigned Responder       | 33333333-3333-4333-a333-333333333333 | SECURITY   | true        | Authorized responder     |
| Unassigned Staff Member  | 44444444-4444-4444-a444-444444444444 | COUNSELLOR | true        | Unassigned observer      |
| Approved Reviewer        | 55555555-5555-4555-a555-555555555555 | ADMIN      | true        | Authorized reviewer      |
+--------------------------+--------------------------------------+------------+-------------+--------------------------+
```

### 2. Synthetic Incident Fixtures
- **Incident A-1 (`KC-2026-SYNTH-01`):**
  - ID: `aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`
  - Created by: `Student A` (`11111111-1111-4111-a111-111111111111`)
  - Assigned to: `Assigned Responder` (`33333333-3333-4333-a333-333333333333`)
  - Status: `INVESTIGATING`
- **Incident B-1 (`KC-2026-SYNTH-02`):**
  - ID: `bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb`
  - Created by: `Student B` (`22222222-2222-4222-a222-222222222222`)
  - Assigned to: `NULL`
  - Status: `REPORTED`

### 3. Detailed Specification of the 12 Integration Test Cases

#### Case 1: Student cannot modify verification_status
- **Target Table:** `public.student_profiles`
- **Context:** Executed as `authenticated` with JWT claim `sub = 11111111-1111-4111-a111-111111111111` (`Student A`).
- **Action:**
  ```sql
  UPDATE public.student_profiles 
  SET verification_status = 'VERIFIED' 
  WHERE id = '11111111-1111-4111-a111-111111111111';
  ```
- **Expected Outcome:** PostgreSQL aborts statement with exception:
  `Access Denied: Only institutional reviewers or automated verification service can modify student verification status or audit records.`

#### Case 2: Student cannot modify verified_by or verified_at
- **Target Table:** `public.student_profiles`
- **Context:** `Student A`.
- **Action:**
  ```sql
  UPDATE public.student_profiles 
  SET verified_by = '11111111-1111-4111-a111-111111111111', verified_at = NOW() 
  WHERE id = '11111111-1111-4111-a111-111111111111';
  ```
- **Expected Outcome:** PostgreSQL aborts statement with exception.

#### Case 3: Student cannot modify OCR verification data
- **Target Table:** `public.student_profiles`
- **Context:** `Student A`.
- **Action:**
  ```sql
  UPDATE public.student_profiles 
  SET ocr_extracted_data = '{"name": "Forged", "valid": true}'::jsonb 
  WHERE id = '11111111-1111-4111-a111-111111111111';
  ```
- **Expected Outcome:** PostgreSQL aborts statement with exception.

#### Case 4: Student can update allowed profile fields
- **Target Table:** `public.student_profiles`
- **Context:** `Student A`.
- **Action:**
  ```sql
  UPDATE public.student_profiles 
  SET blood_group = 'O+', medical_conditions = 'Mild asthma', hostel_room = 'Room 204', course = 'B.Tech IT' 
  WHERE id = '11111111-1111-4111-a111-111111111111';
  ```
- **Expected Outcome:** Statement succeeds; exactly 1 row updated; values persist.

#### Case 5: Unassigned staff cannot read unrelated incident locations
- **Target Table:** `public.incident_locations`
- **Context:** Executed as `authenticated` with JWT claim `sub = 44444444-4444-4444-a444-444444444444` (`Unassigned Staff`).
- **Action:**
  ```sql
  SELECT * FROM public.incident_locations 
  WHERE incident_id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  ```
- **Expected Outcome:** Query returns **0 rows** (blocked by RLS policy `Authorized users view incident locations`).

#### Case 6: Assigned responders can access only authorized incident locations
- **Target Table:** `public.incident_locations`
- **Context:** Executed as `authenticated` with JWT claim `sub = 33333333-3333-4333-a333-333333333333` (`Assigned Responder`).
- **Action:**
  - Query Incident A locations -> Returns location records for Incident A.
  - Query Incident B locations -> Returns **0 rows** (Responder is not assigned to Incident B).
- **Expected Outcome:** Isolation strictly enforced per incident assignment.

#### Case 7: Unauthorized evidence uploads are rejected
- **Target Table:** `public.evidence`
- **Context:** Executed as `Student B` attempting to upload to `Student A`'s incident (`KC-2026-SYNTH-01`).
- **Action:**
  ```sql
  INSERT INTO public.evidence (case_id, file_path, uploaded_by, file_name, file_size, mime_type)
  VALUES ('KC-2026-SYNTH-01', 'KC-2026-SYNTH-01/forged.jpg', '22222222-2222-4222-a222-222222222222', 'forged.jpg', 1024, 'image/jpeg');
  ```
- **Expected Outcome:** PostgreSQL rejects with error: `new row violates row-level security policy for table "evidence"`.

#### Case 8: Unauthorized evidence signed-URL requests are rejected
- **Target Layer:** API & Storage Object Policy.
- **Context:** `Student B` requests signed URL for `Student A`'s evidence file.
- **Action:**
  - API route checks parent incident ownership -> Returns HTTP 403 Forbidden.
  - At database storage layer, `storage.objects` SELECT policy evaluates folder `KC-2026-SYNTH-01` against caller `auth.uid()` -> Returns 0 rows.
- **Expected Outcome:** No unauthorized token issued; no direct object access.

#### Case 9: Reviewer/admin verification follows server-side authorization
- **Target Table:** `public.student_profiles`
- **Context:** `Approved Reviewer` (`55555555-5555-4555-a555-555555555555`).
- **Action:** Direct PostgREST UPDATE `SET verification_status = 'VERIFIED' WHERE id = '11111111-1111-4111-a111-111111111111'` -> Blocked by RLS `USING (auth.uid() = id)` (0 rows affected).
- **Expected Outcome:** Reviewer cannot bypass server-side route; must use `/api/admin/verifications` which executes under `service_role`.

#### Case 10: Audit logging behavior is tested for success and failure
- **Target Table:** `public.audit_logs`
- **Action:**
  - Valid payload (`action = 'TEST'`, `entity_type = 'student_profiles'`, `metadata = '{}'::jsonb`) -> Succeeds.
  - Missing `entity_type` -> Aborts with `null value in column "entity_type" violates not-null constraint`.
- **Expected Outcome:** Schema integrity strictly enforced; partial failures prevented.

#### Case 11: Legacy permissive policies do not bypass restrictions
- **Target Table:** All sensitive core tables (`incidents`, `incident_locations`, `evidence`, `student_profiles`).
- **Action:** Query `pg_policies` to verify that zero permissive policies with `is_staff()` exist.
- **Expected Outcome:** Zero broad staff policies remain.

#### Case 12: Storage paths and incident authorization are consistent
- **Target Table:** `storage.objects`
- **Action:**
  - Upload to `<auth.uid()>/file.jpg` -> Allowed.
  - Upload to `KC-2026-SYNTH-01/file.jpg` by `Student A` -> Allowed.
  - Upload to `KC-2026-SYNTH-01/file.jpg` by `Student B` -> Rejected by Storage RLS.
- **Expected Outcome:** Storage access is 100% case-bound and caller-bound.

---

## 4. Test Environment Setup Requirements (Phase 3)

Because Docker and PostgreSQL are currently unavailable on this host, the following setup options are available to unblock real integration testing:

### Option 1: Docker Desktop for Windows (Recommended)
1. Download and install Docker Desktop for Windows with WSL2 backend.
2. Verify: `docker --version`.
3. Supabase local development daemon can then be started: `npx supabase start`.
4. This spins up an isolated, local PostgreSQL 15/16 instance on `localhost:54322`.

### Option 2: Native PostgreSQL 15/16 Server for Windows
1. Download and install PostgreSQL 15/16 for Windows (from EnterpriseDB).
2. Create an isolated database: `kavach_test_db`.
3. Add `node-postgres` (`pg`) to dev dependencies: `npm install -D pg @types/pg`.
4. Configure test runner script: `scripts/run_real_postgres_tests.ts`.

> [!IMPORTANT]
> In compliance with Strict Safety Rule #7, Antigravity has **NOT** initiated any software installation or system configuration changes. The user must approve and provision either Option 1 or Option 2.

---

## 5. Candidate SQL Pre-Execution Validation (Phase 4)

Step 115 Candidate SQL (`supabase/verification/kavach_step115_security_hardening_candidate.sql`, v1.15.2) was audited against all schema and operational requirements:

1. **Table & Column Integrity:** All referenced tables and columns exist in migrations `001` through `008`.
2. **Permissive Policy Removal:** All known legacy permissive policy variants are dropped prior to creating new case-bound policies, eliminating `OR` bypass risks.
3. **Trigger Logic:** Function `public.prevent_student_profile_tampering()` uses `SECURITY DEFINER` with `SET search_path = public`. Evaluates `session_user IN ('postgres', 'supabase_admin')`, `v_jwt_role = 'service_role'`, and `is_reviewer() OR is_admin()`.
4. **Audit Log Parity:** Inserts record with `entity_type: 'system'` and `metadata: jsonb_build_object(...)`, complying with schema constraints.
5. **Incident Locations Authorization:**
   - SELECT: Only incident student owner, assigned responder, or institutional reviewer.
   - INSERT: Only incident student owner, assigned responder, or institutional reviewer.
   - UPDATE & DELETE: Not granted (defaults to DENY).
6. **Transaction Safety:** Enclosed in `BEGIN; ... COMMIT;`. Any precondition failure rolls back the entire batch.

---

## 6. Local Quality Checks Verification (Phase 6)

All 4 local quality checks were executed and reported with exact exit codes:

```
================================================================================
KAVACH CAMPUS QUALITY CHECK RESULTS: BATCH 11
================================================================================
1. Unit & Regression Tests (npm test):
   Command:   npm test
   Exit Code: 0 (SUCCESS)
   Summary:   22 test files passed, 296 tests passed (100% pass rate)

2. TypeScript Compilation (npx tsc --noEmit):
   Command:   npx tsc --noEmit
   Exit Code: 0 (SUCCESS)
   Summary:   Clean (zero type errors)

3. ESLint Verification (npm run lint):
   Command:   npm run lint
   Exit Code: 0 (SUCCESS)
   Summary:   Clean (zero lint errors, zero warnings)

4. Production Build (npm run build):
   Command:   npm run build
   Exit Code: 0 (SUCCESS)
   Summary:   59/59 static & dynamic routes compiled cleanly in Turbopack
================================================================================
```

---

## 7. Blockers & User Decision Protocol

### Current Blocker
- **PostgreSQL Test Environment:** Unavailable on host (`docker` and `psql` missing).

### User Action Required to Unblock Integration Testing
Please review and select one of the following paths:
- **Path A (Docker Setup):** Install Docker Desktop on Windows. Once installed, Antigravity can use `npx supabase start` to run real PostgreSQL integration tests locally.
- **Path B (Native PostgreSQL):** Install PostgreSQL 15/16 for Windows locally and provide a local connection string (`localhost:54322`).
- **Path C (Human DBA Staging Migration):** If local Docker installation is not desired, provide the Step 121 and Step 115 files directly to the human database administrator to execute in a staging environment.

### Final Production Gate Status
- **Kavach Campus Production Release:** 🔴 **`HOLD`** (Until integration tests run on a real PostgreSQL instance and human DBA verifies deployment).
