# KAVACH CAMPUS — LOCAL SUPABASE STARTUP & INTEGRATION TEST AUDIT REPORT

**Author:** Antigravity AI  
**Project:** Kavach Campus (Enterprise Student Safety & Rapid Incident Response)  
**Date:** October 18, 2026  
**Status:** Local Integration Verification Completed — Production Deployment on HOLD  
**Document Location:** `docs/KAVACH_LOCAL_SUPABASE_STARTUP_AUDIT.md`  

---

## 1. Executive Summary & Verification Matrix

| Component | Status | Verified Details |
| :--- | :---: | :--- |
| **Docker Desktop Installation** | 🟢 **PASS** | Version 4.95.0 installed and verified on Windows 11. |
| **Docker Engine & Daemon** | 🟢 **PASS** | Version 29.8.2 responsive; `docker info` executed successfully with 8 CPUs, 7.38 GiB RAM. |
| **WSL 2 Backend** | 🟢 **PASS** | `docker-desktop` distro active and in `Running` state (WSL default version 2, Kernel 6.18.54.1). |
| **Supabase CLI** | 🟢 **PASS** | Version 2.121.0 available via `npx supabase`. |
| **`supabase/config.toml`** | 🟢 **PASS** | Created and validated with `[db.migrations] enabled = false`, `[db.seed] enabled = false`. |
| **Local Supabase Startup** | 🟢 **PASS** | 12 containers running healthy; PostgreSQL listening on `localhost:54322`, Kong on `54321`. |
| **Duplicate Migration Conflict** | 🟢 **RESOLVED** | Prevented duplicate version collision (`001`, `002`, `008`) by disabling auto-migrations during bootstrap. |
| **Dependency Verification (`pg`)** | 🟢 **PASS** | Installed `pg` and `@types/pg` (v8.23.1); native driver verified. |
| **Test Runner Safety Audit** | 🟢 **PASS** | `scripts/run_real_postgres_tests.ts` verified; blocks remote targets, production references, and unapproved SQL. |
| **Baseline Schema Ingestion** | 🟢 **PASS** | `001_kavach_campus_final.sql` and `008_kavach_campus_schema_and_rls_alignment_safe.sql` applied cleanly. |
| **Hardening Candidate Ingestion** | 🟢 **PASS** | `supabase/verification/kavach_step115_security_hardening_candidate.sql` applied cleanly after security bugfixes. |
| **Native PostgreSQL RLS Tests** | 🟢 **PASS** | **8 / 8 tests passed** against live PostgreSQL container (Exit code `0`). |
| **Unit & Mock Integration Tests** | 🟢 **PASS** | **22 test files, 296/296 tests passed** via Vitest (`npm test`, Exit code `0`). |
| **TypeScript Compilation** | 🟢 **PASS** | Zero type errors across entire codebase (`npx tsc --noEmit`, Exit code `0`). |
| **ESLint Quality Gate** | 🟢 **PASS** | Zero lint errors or warnings (`npm run lint`, Exit code `0`). |
| **Production Build** | 🟢 **PASS** | 59/59 static and dynamic routes compiled successfully via Turbopack (`npm run build`, Exit code `0`). |
| **Production Deployment** | ⛔ **HOLD** | Maintained on strict **HOLD**; remote database remains untouched. |

---

## 2. Step-by-Step Implementation Record

### Step 1: Configuration Validation & Creation
- **Action:** Validated supported configuration schema for Supabase CLI 2.121.0 using non-destructive scratch testing.
- **File Created:** `supabase/config.toml`
  ```toml
  # Kavach Campus Local Development Configuration
  project_id = "kavach_campus"

  [api]
  enabled = true
  port = 54321
  schemas = ["public", "graphql_public"]
  extra_search_path = ["public", "extensions"]
  max_rows = 1000

  [db]
  port = 54322
  shadow_port = 54320
  health_timeout = "2m"
  major_version = 17

  [db.pooler]
  enabled = false
  port = 54329

  [db.migrations]
  # Disable auto-migration execution during container bootstrap to prevent
  # version 001/002/008 duplicate key crashes and unsafe hardcoded promotions.
  enabled = false

  [db.seed]
  enabled = false
  ```
- **Safety Impact:**
  - Zero migration files deleted, renamed, or modified.
  - Avoided automated execution of `006_provision_super_admin.sql` and `008_kavach_campus_complete_production_alignment.sql` (which contained hardcoded user promotion scripts).
  - Validation executed without contacting any remote service.

### Step 2: Local Database Startup
- **Command Executed:** `npx supabase start`
- **Output & Health Status:**
  - All 12 Supabase services booted and verified healthy:
    - `supabase_db_kavach_campus` (PostgreSQL 17.x, port `54322`)
    - `supabase_kong_kavach_campus` (API Gateway, port `54321`)
    - `supabase_auth_kavach_campus` (GoTrue, port `9999`)
    - `supabase_rest_kavach_campus` (PostgREST, port `3000`)
    - `supabase_storage_kavach_campus` (Storage Engine, port `5000`)
    - `supabase_studio_kavach_campus` (Studio UI, port `54323`)
  - Target URL: `postgresql://postgres:postgres@localhost:54322/postgres`
  - Zero migration collisions occurred because automatic bootstrap migration execution was disabled.

### Step 3: Test Runner Safety Review & Diagnostics
- **Target File:** `scripts/run_real_postgres_tests.ts`
- **Safety Audits Performed:**
  1. **Pre-connection URL Validation:** Confirmed that `assertIsolatedTarget(TEST_DB_URL)` strictly blocks any host other than `localhost`, `127.0.0.1`, or `::1`, and rejects remote hostnames (`supabase.co`, `amazonaws.com`, `azure`, `gcp`) and production ref `polbnvszmvblwenfnqll` before opening any socket.
  2. **Port and Database Whitelist:** Enforced port allowlist (`54322`, `5432`, `54321`) and database allowlist (`postgres`, `test`, `kavach_campus_test`).
  3. **Unsafe Migration Blocking:** Hardcoded set rejects `006_provision_super_admin.sql`, `008_kavach_campus_complete_production_alignment.sql`, and rollback scripts.
  4. **Driver Installation:** Installed `pg` and `@types/pg` (`npm install -D pg @types/pg`).
  5. **Network Binding Guard Update:**
     - In Docker Desktop on Windows/WSL2, PostgreSQL's `inet_server_addr()` reports the internal bridge IP (`172.18.0.2`), not `127.0.0.1`.
     - The guard was refined to allow RFC 1918 private Docker container subnets (`172.16.0.0/12`, `10.0.0.0/8`, `192.168.0.0/16`) while strictly blocking public and non-private IPs.
  6. **Foreign Key Integrity:**
     - `public.profiles(id)` references `auth.users(id)`.
     - Test runner was updated to seed synthetic records into `auth.users` before inserting into `public.profiles`.
  7. **Schema Parity Alignment:**
     - Corrected test runner fixture for `public.incidents`: removed non-existent `title` column and aligned `status` with valid enum values (`'IN_PROGRESS'`, `'RECEIVED'`).

### Step 4: Security Flaw Diagnosis in Candidate Script (Step 115)
During the initial execution against live PostgreSQL, four test failures were observed (4 PASS / 4 FAIL). In accordance with instructions, assertions were NOT weakened; instead, the root causes in `supabase/verification/kavach_step115_security_hardening_candidate.sql` were identified and corrected:

1. **Trigger DBA Bypass Flaw (Tests 1, 2, 3):**
   - *Problem:* In `prevent_student_profile_tampering()`, the check `IF v_session_user IN ('postgres', 'supabase_admin') THEN v_is_privileged := true;` evaluated to `true` whenever the connection was initiated with `postgres` credentials, even after `SET LOCAL ROLE authenticated;`. PostgreSQL's `session_user` does not change under `SET ROLE`.
   - *Fix:* Required `auth.uid() IS NULL` for direct superuser bypass:
     ```sql
     IF v_session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL THEN
       v_is_privileged := true;
     END IF;
     ```
   - *Result:* When an authenticated student executes updates, the trigger enforces strict immutability on `verification_status`, `verified_by`, `verified_at`, and `ocr_extracted_data`.

2. **Unassigned Security Guard GPS Leak Flaw (Test 6):**
   - *Problem:* In `public.incident_locations`, the SELECT policy permitted `public.is_reviewer()`. However, `is_reviewer()` returns `true` for any profile with `role = 'SECURITY'`. This inadvertently allowed any unassigned security guard to view GPS location breadcrumbs for all incidents across campus.
   - *Fix:* Replaced `public.is_reviewer()` with `public.is_admin()` in `public.incident_locations` policies:
     ```sql
     CREATE POLICY "Authorized users view incident locations"
     ON public.incident_locations
     FOR SELECT
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM public.incidents i
         WHERE i.id = incident_locations.incident_id
           AND (
             i.student_id = auth.uid()
             OR i.assigned_to = auth.uid()
             OR public.is_admin()
           )
       )
     );
     ```
   - *Result:* Only the incident reporter (`student_id = auth.uid()`), the actively assigned responder (`assigned_to = auth.uid()`), or institutional administrators (`is_admin()`) can access location breadcrumbs.

---

## 3. Real PostgreSQL Integration Test Results

**Execution Command:** `npx tsx scripts/run_real_postgres_tests.ts`  
**Target:** `postgresql://postgres:***@localhost:54322/postgres`  
**Host Address Verified:** `HostAddr=172.18.0.2` (Docker private bridge interface)  
**Process Exit Code:** `0`  

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

## 4. Key Security Invariants Verified

| Security Invariant | Verification Method | Live Result |
| :--- | :--- | :---: |
| **Student Profile Immutability** | Direct SQL `UPDATE student_profiles SET verification_status='VERIFIED'` as student | 🟢 **PASS** (Trigger `trg_prevent_student_profile_tampering` raised `P0001` Access Denied) |
| **Audit Field Protection** | Direct SQL `UPDATE student_profiles SET verified_by=...` as student | 🟢 **PASS** (Trigger raised `P0001` Access Denied) |
| **OCR Payload Protection** | Direct SQL `UPDATE student_profiles SET ocr_extracted_data=...` as student | 🟢 **PASS** (Trigger raised `P0001` Access Denied) |
| **Permitted Profile Edits** | Direct SQL `UPDATE student_profiles SET blood_group='O+', medical_conditions='Asthma'` as student | 🟢 **PASS** (Permitted update modified 1 row cleanly) |
| **Incident Location Isolation** | Direct SQL `SELECT * FROM incident_locations` as unassigned staff (`COUNSELLOR`) | 🟢 **PASS** (Table RLS returned exactly 0 rows) |
| **Assigned Responder Authorization** | Direct SQL `SELECT` on assigned incident vs unassigned incident as `SECURITY` responder | 🟢 **PASS** (Assigned incident returned rows; unassigned returned 0 rows) |
| **Evidence Upload Authorization** | Direct SQL `INSERT INTO evidence` for unauthorized incident as student B | 🟢 **PASS** (Table RLS `WITH CHECK` raised `42501` RLS violation) |
| **Reviewer Least Privilege** | Direct client PostgREST `UPDATE student_profiles` as institutional `reviewer` | 🟢 **PASS** (Restricted by `USING (auth.uid() = id)` — affected 0 rows) |

---

## 5. Files Changed or Created

1. **`supabase/config.toml`** (Created, local only)
   - Configuration file ensuring local Supabase CLI operates with migrations and seed disabled during bootstrap.
2. **`package.json` & `package-lock.json`** (Updated)
   - Added `pg` and `@types/pg` devDependencies for native PostgreSQL test driver.
3. **`scripts/run_real_postgres_tests.ts`** (Updated)
   - Refined IP check to support RFC 1918 Docker container bridge subnets.
   - Added synthetic actor seeding in `auth.users` to satisfy foreign keys.
   - Corrected fixture columns and enums to match actual schema.
4. **`supabase/verification/kavach_step115_security_hardening_candidate.sql`** (Updated)
   - Fixed `prevent_student_profile_tampering()` DBA bypass condition to require `auth.uid() IS NULL`.
   - Updated `incident_locations` RLS policies from `public.is_reviewer()` to `public.is_admin()` to prevent unauthorized location tracking by unassigned security personnel.
5. **`docs/KAVACH_LOCAL_SUPABASE_STARTUP_AUDIT.md`** (Updated)
   - Complete technical record of local startup, diagnostics, and test results.

---

## 6. Remaining Security Considerations & Production Hold Status

> [!IMPORTANT]
> **Production Status: HOLD**  
> While all 8 native PostgreSQL tests passed cleanly on the local disposable database, the remote production database (`polbnvszmvblwenfnqll`) remains on **HOLD**.

### Remaining Items Before Remote Production Application:
1. **No Remote Execution:** No migrations or DDL have been applied to remote project `polbnvszmvblwenfnqll`.
2. **Migration Cleanup for Remote CLI Deployments:**
   - The historical migration duplicate prefixes (`001`, `002`, `008`) in `supabase/migrations/` still exist.
   - For remote migrations via Supabase CLI, a non-destructive migration squash or timestamp re-indexing strategy will be required in a separate maintenance window.
3. **Storage Bucket Policies on Remote:**
   - Step 115 storage object policies target the `'kavach-evidence'` and `'kavach-id-cards'` buckets. These policies must be validated against production storage configuration before applying remote changes.
4. **Zero Administrative Privilege Injection:**
   - Confirmed that zero test fixtures or migration steps promoted any real or synthetic user to `ADMIN` or `SUPER_ADMIN`.
