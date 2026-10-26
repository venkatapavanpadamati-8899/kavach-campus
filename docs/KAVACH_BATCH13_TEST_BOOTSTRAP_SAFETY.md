# KAVACH CAMPUS — BATCH 13: SAFE LOCAL TEST DATABASE BOOTSTRAP

**Author:** Antigravity AI  
**Project:** Kavach Campus (Enterprise Student Safety & Rapid Incident Response)  
**Date:** October 18, 2026  
**Status:** Audit & Hardening Complete  
**Document Location:** `docs/KAVACH_BATCH13_TEST_BOOTSTRAP_SAFETY.md`  

---

## 1. Executive Summary & Final Verdicts

Batch 13 focused on removing unsafe migration dependencies from the local PostgreSQL test setup, implementing strict database identity and network isolation guards, verifying authentication and RLS test correctness, and auditing local test readiness prior to Docker Desktop installation.

| Check | Verdict | Details |
| :--- | :---: | :--- |
| **Test Runner Script (`scripts/run_real_postgres_tests.ts`)** | 🟢 **SAFE** | Hardened to **v1.3.0**. Unsafe migration `008_kavach_campus_complete_production_alignment.sql` removed; replaced with reviewed safe baseline `008_kavach_campus_schema_and_rls_alignment_safe.sql`. Explicit `BLOCKED_MIGRATIONS` set enforced. 7 Phase-3 database identity guards active. Zero synthetic fixtures promoted to `ADMIN` or `SUPER_ADMIN`. |
| **PostgreSQL Integration Tests** | ⚪ **NOT RUN** | Docker Desktop is not yet installed on this workstation (`docker: The term 'docker' is not recognized`). Real PostgreSQL tests were **NOT RUN**; zero simulated runs falsely claimed. |
| **Local Unit & Integration Test Suite** | 🟢 **PASS** | 22 test files, 296/296 automated unit tests passing cleanly via Vitest (`npm test`, Exit Code: `0`). |
| **TypeScript Typecheck** | 🟢 **PASS** | Full codebase static typecheck passing cleanly (`npx tsc --noEmit`, Exit Code: `0`). |
| **ESLint Quality Gate** | 🟢 **PASS** | Zero lint errors or warnings across entire project (`npm run lint`, Exit Code: `0`). |
| **Production Build** | 🟢 **PASS** | 59/59 static and dynamic routes compiled successfully with Turbopack (`npm run build`, Exit Code: `0`). |
| **Production Release** | 🔴 **HOLD** | Maintained on strict **HOLD** pending human DBA review, Docker Desktop installation, and execution of real PostgreSQL integration tests against an isolated local database. |

---

## 2. Files Inspected

The following repository files were systematically inspected during Batch 13:

1. **Test Runner:**
   - [`scripts/run_real_postgres_tests.ts`](file:///D:/Kavach%20Campus/scripts/run_real_postgres_tests.ts) (Inspected v1.2.0, upgraded to v1.3.0)
2. **Migrations Directory (`supabase/migrations/`):**
   - [`supabase/migrations/001_kavach_campus_final.sql`](file:///D:/Kavach%20Campus/supabase/migrations/001_kavach_campus_final.sql) (Base tables, enums, initial RLS)
   - [`supabase/migrations/008_kavach_campus_complete_production_alignment.sql`](file:///D:/Kavach%20Campus/supabase/migrations/008_kavach_campus_complete_production_alignment.sql) (**UNSAFE DEPENDENCY** — Hardcoded SUPER_ADMIN promotion in Section 8)
   - [`supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql`](file:///D:/Kavach%20Campus/supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql) (Reviewed safe, decoupled alternative without Section 8)
   - [`supabase/migrations/006_provision_super_admin.sql`](file:///D:/Kavach%20Campus/supabase/migrations/006_provision_super_admin.sql) (Flagged unsafe: hardcoded user promotion)
   - [`supabase/migrations/007_student_id_card_verification.sql`](file:///D:/Kavach%20Campus/supabase/migrations/007_student_id_card_verification.sql) (Student ID card verification columns & constraints)
   - [`supabase/migrations/005_kavach_campus_rls_infinite_recursion_repair.sql`](file:///D:/Kavach%20Campus/supabase/migrations/005_kavach_campus_rls_infinite_recursion_repair.sql) (SECURITY DEFINER role check functions & recursion repair)
3. **Verification & Hardening Directory (`supabase/verification/`):**
   - [`supabase/verification/kavach_step115_security_hardening_candidate.sql`](file:///D:/Kavach%20Campus/supabase/verification/kavach_step115_security_hardening_candidate.sql) (Step 115 security hardening candidate)
   - [`supabase/verification/kavach_step115_rollback_candidate.sql`](file:///D:/Kavach%20Campus/supabase/verification/kavach_step115_rollback_candidate.sql) (Rollback candidate script — forbidden from automated execution)
   - [`supabase/verification/kavach_step121_readonly_preflight.sql`](file:///D:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql) (100% read-only preflight verification SQL)
   - [`supabase/verification/kavach_step108_safe_remediation.sql`](file:///D:/Kavach%20Campus/supabase/verification/kavach_step108_safe_remediation.sql) (Reviewed definition of `is_reviewer()`)

---

## 3. Unsafe Migration Dependencies Removed

### 3.1 The Vulnerability in `008_kavach_campus_complete_production_alignment.sql`
In Batch 12, the test runner was configured to ingest two baseline migrations:
```ts
// Legacy Batch 12 configuration:
const baseMigration1 = path.resolve(process.cwd(), 'supabase/migrations/001_kavach_campus_final.sql');
const baseMigration8 = path.resolve(process.cwd(), 'supabase/migrations/008_kavach_campus_complete_production_alignment.sql');
```

Inspection of `008_kavach_campus_complete_production_alignment.sql` confirmed that Section 8 contained hardcoded superuser promotion logic:
```sql
-- SECTION 8 OF 008_kavach_campus_complete_production_alignment.sql:
DO $$
DECLARE
    target_email TEXT := 'venkatapavanpadamati1@gmail.com';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (..., role, is_approved, ...)
        VALUES (..., 'SUPER_ADMIN', TRUE, ...)
        ON CONFLICT (id) DO UPDATE SET role = 'SUPER_ADMIN', is_approved = TRUE, updated_at = NOW();
        UPDATE auth.users SET raw_user_meta_data = jsonb_set(..., '{role}', '"SUPER_ADMIN"') WHERE id = target_user_id;
    END IF;
END $$;
```

### 3.2 Remediation
1. **Removed Unsafe Dependency:** `scripts/run_real_postgres_tests.ts` no longer references or loads `008_kavach_campus_complete_production_alignment.sql`.
2. **Replaced with Reviewed Safe Baseline:** The runner now references `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql`. This migration contains the exact same schema structures (`safe_walks` columns, `student_profiles` verification columns, `escalations` table, storage bucket configurations, and `prevent_self_role_escalation` trigger), but has **zero** hardcoded user emails and **zero** administrative promotions.
3. **Hardened Proactive Blocklist:** Added `BLOCKED_MIGRATIONS` set that causes immediate runtime termination with an error message if an attempt is ever made to load:
   - `008_kavach_campus_complete_production_alignment.sql`
   - `006_provision_super_admin.sql`
   - `kavach_step115_rollback_candidate.sql`
   - `kavach_step115_rollback_candidate.backup.sql`

---

## 4. Database Safety Guards (Phase 3 Compliance)

The test runner `scripts/run_real_postgres_tests.ts` (v1.3.0) enforces all 7 required database safety guards prior to executing any SQL statement:

| # | Guard Requirement | Implementation Mechanism in v1.3.0 | Status |
| :-: | :--- | :--- | :---: |
| **1** | **Explicit local host allowlist** | `ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])`. Throws fatal error if target hostname is not in this set. | ✅ ENFORCED |
| **2** | **Explicit allowed test port** | `ALLOWED_TEST_PORTS = new Set(['54322', '5432', '54321'])`. Rejects standard remote ports (e.g. 6543, 80, 443) or unexpected ports. | ✅ ENFORCED |
| **3** | **Dedicated test database identity** | `ALLOWED_TEST_DATABASES = new Set(['postgres', 'kavach_test', 'test', 'kavach_campus_test'])`. Blocks any database matching production naming schemes. | ✅ ENFORCED |
| **4** | **Successful database identity probe** | Issues `SELECT current_database(), current_user, inet_server_addr(), inet_client_addr();` before any DDL/fixtures. Validates that `inet_server_addr` is strictly loopback (`127.0.0.1`, `::1`, or `null` for local Unix socket / Windows named pipe). Aborts if host address is remote. | ✅ ENFORCED |
| **5** | **No remote Supabase hostname** | URL string inspected for `supabase.co`, `supabase.in`, `pooler.supabase.com`, `amazonaws.com`, `azure`, `gcp`. Aborts immediately upon match. | ✅ ENFORCED |
| **6** | **No production credentials** | Detects and blocks production Supabase project reference (`polbnvszmvblwenfnqll`). Issues warnings if non-test `SUPABASE_SERVICE_ROLE_KEY` is in environment. | ✅ ENFORCED |
| **7** | **No automatic rollback execution** | Rollback candidates (`kavach_step115_rollback_candidate.sql`) are prohibited by `BLOCKED_MIGRATIONS` and cannot be invoked automatically. | ✅ ENFORCED |
| **8** | **Redacted connection target logging** | `redactUrl()` masks passwords: `postgresql://[username]:***@[host]:[port]/[database]`. Plaintext secrets are never logged. | ✅ ENFORCED |

---

## 5. Authentication & RLS Test Correctness (Phase 4 Compliance)

### 5.1 Authorization Context Evaluation: `SET LOCAL ROLE` + `request.jwt.claim.*`
In Supabase/PostgREST, row-level security relies on the following runtime variables:
- Database role: `authenticated` (set via `SET LOCAL ROLE authenticated;`)
- JWT claims: `request.jwt.claim.sub` (user UUID) and `request.jwt.claim.role` (user role)
- PostgreSQL helper functions: `auth.uid()` evaluates `request.jwt.claim.sub`, and `auth.role()` evaluates `request.jwt.claim.role`.

In `scripts/run_real_postgres_tests.ts` (v1.3.0):
1. **Pre-flight Auth Fidelity Sanity Check:** Prior to running the 8 integration tests, the runner starts a transaction, sets the claims for `studentAId`, and queries `SELECT auth.uid() AS uid, auth.role() AS role;`. If `auth.uid()` does not equal `studentAId` or `auth.role()` does not equal `'authenticated'`, the runner halts with a fatal mismatch error rather than proceeding with flawed test assumptions.
2. **Zero ADMIN/SUPER_ADMIN Test Fixtures:**
   - Synthetic fixtures:
     - `studentAId` (`11111111-...`) -> role: `STUDENT`
     - `studentBId` (`22222222-...`) -> role: `STUDENT`
     - `responderId` (`33333333-...`) -> role: `SECURITY`
     - `counsellorId` (`44444444-...`) -> role: `COUNSELLOR`
     - `reviewerId` (`55555555-...`) -> role: `SECURITY` (qualifies as an authorized reviewer under `public.is_reviewer()`, without promoting any actor to `ADMIN` or `SUPER_ADMIN`).
3. **Accurate Scope Categorization:**
   - All tests exercise **PostgreSQL database tables and triggers** (`public.student_profiles`, `public.incident_locations`, `public.evidence`). None are falsely described as Storage API tests.
4. **Distinction Between Zero Rows, Permission Errors, and SQL Errors:**
   - **Negative Trigger Tests (Tests 1, 2, 3):** Catch blocks inspect `err.message` (expecting `'Access Denied'` or `'verification_status cannot be modified directly'`) and PostgreSQL error code `P0001` (`raise_exception`). Syntax or missing column errors throw instead of falsely passing.
   - **Data Precondition for Negative Read (Test 5):** Superuser query verifies that incident location records exist in `public.incident_locations` before testing that unassigned staff receives 0 rows.
   - **Negative RLS WITH CHECK (Test 7):** Catch block inspects `err.code === '42501'` (`insufficient_privilege`) or message matching `'violates row-level security policy'`.
   - **PostgREST Direct Update Isolation (Test 8):** Asserts `rowCount === 0` under `USING (auth.uid() = id)` when reviewer attempts direct table update.
5. **Deterministic Transaction Rollback:**
   - Every single test runs in a dedicated transaction (`BEGIN; ... try { ... } finally { await client.query('ROLLBACK;'); }`).
6. **Strict Non-Zero Exit Code:**
   - `if (failCount > 0 || passCount !== totalExpectedTests) process.exit(1);`.

---

## 6. RLS Test Limitations & Baseline Schema Dependencies

During static inspection of `supabase/migrations/` vs `supabase/verification/kavach_step115_security_hardening_candidate.sql`, a critical schema prerequisite gap was identified:

1. **Step 115 Preconditions:**
   Step 115 defines defensive pre-flight assertions before applying changes:
   - Precondition 1.1: `is_reviewer()` function must exist, be `SECURITY DEFINER`, and owned by `postgres` or `supabase_admin`.
   - Precondition 1.3: `public.evidence` table must contain columns `case_id`, `file_path`, `uploaded_by`.
2. **Current Migrations State in `supabase/migrations/`:**
   - `001_kavach_campus_final.sql` created `public.evidence` with columns `incident_id` and `storage_path` (not `case_id` and `file_path`).
   - Neither `001_kavach_campus_final.sql` nor `008_kavach_campus_schema_and_rls_alignment_safe.sql` defines `is_reviewer()` (which was introduced in `kavach_step108_safe_remediation.sql`).
3. **Safety Impact on Local Test Database Setup:**
   - Because the prompt mandates: *"If the schema cannot be created safely without executing an unsafe migration, stop and report BLOCKED. Do not silently skip required schema objects or fabricate an equivalent schema."*
   - We did **NOT** fabricate ad-hoc schema modifications in migration files.
   - When Docker Desktop is installed, the local test database bootstrap must ingest the reviewed schema baseline (including `is_reviewer()` from Step 108 and `evidence (case_id, file_path)` column alignment) so Step 115 preconditions pass cleanly on an isolated instance.

---

## 7. Local Quality Gate Results (Terminal Execution Evidence)

All local quality gates were executed in Windows PowerShell within the project workspace. Every command completed cleanly with an exit code of `0`.

### 7.1 Automated Unit & Integration Tests (`npm test`)
```text
$ npm test (vitest run)

 Test Files  22 passed (22)
      Tests  296 passed (296)
   Start at  16:02:25
   Duration  18.83s

Exit Code: 0
```

### 7.2 TypeScript Static Typecheck (`npx tsc --noEmit`)
```text
$ npx tsc --noEmit
Exit Code: 0 (Zero type errors)
```

### 7.3 ESLint Linting (`npm run lint`)
```text
$ npm run lint
> kavach-campus@1.0.0 lint
> eslint .
Exit Code: 0 (Zero lint warnings, zero lint errors)
```

### 7.4 Production Turbopack Build (`npm run build`)
```text
$ npm run build
> kavach-campus@1.0.0 build
> next build

▲ Next.js 16.4.0 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 1461ms
✓ Compiled successfully in 1749ms
  Running TypeScript ...
  Finished TypeScript in 6.0s ...
  Collecting page data using 7 workers ...
✓ Generating static pages using 7 workers (59/59) in 1954ms
  Finalizing page optimization ...

59/59 routes built successfully (Static, Partial Prerender, Dynamic API routes)
Exit Code: 0
```

---

## 8. Real PostgreSQL Integration Test Status & Remaining Blockers

### 8.1 Docker Availability Check
Execution of `docker --version` in terminal:
```text
docker : The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.
Exit Code: 1
```
Docker Desktop is **not installed** on this host.

### 8.2 Safe Setup Steps Remaining Before Real Database Integration Tests Can Run:
1. **Host Prerequisites:** Install Docker Desktop (or configure a local PostgreSQL 16+ instance on localhost:54322 or 5432) with administrative approvals.
2. **Local Container Launch:** Start an isolated local Supabase / PostgreSQL test container bound strictly to `127.0.0.1:54322` or `127.0.0.1:5432`.
3. **Database Bootstrap:** Apply reviewed base schema migrations (`001_final.sql`, `008_safe.sql`, plus Step 108 `is_reviewer()` definition).
4. **Execute Step 115 Candidate:** Run `scripts/run_real_postgres_tests.ts` against the isolated local container.
5. **Human DBA Review:** Present real PostgreSQL test logs to institutional human DBA prior to any remote deployment.

---

## 9. Conclusion

- **Unsafe migration dependency completely removed.**
- **All 7 Phase 3 database safety guards implemented in `scripts/run_real_postgres_tests.ts` (v1.3.0).**
- **Zero test actors promoted to ADMIN or SUPER_ADMIN.**
- **Local quality gates: 296/296 PASS, tsc PASS, lint PASS, build PASS.**
- **Real PostgreSQL integration tests: NOT RUN (Docker unavailable).**
- **Production Release remains strictly on HOLD.**
