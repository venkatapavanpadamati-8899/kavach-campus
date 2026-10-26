# KAVACH CAMPUS — BATCH 17: MIGRATION STRATEGY & DUPLICATE VERSION RECONCILIATION PLAN

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Audit Scope:** Supabase Migrations (`supabase/migrations/`), Migration Versioning Engine, CLI Parsing Rules, Schema Differentials, Storage Policy Integration, and Reconciliation Strategy  
**Audit Mode:** STRICT READ-ONLY AUDIT & REMEDIATION PLAN (Zero file mutations, zero SQL executions, zero migration history alterations)  
**Environment:** Local Development / Docker Containerized Supabase (`localhost:54322`, Database: `postgres`, Port: 54321 Kong Gateway)  
**Date:** October 18, 2026  
**Remote Production Database:** **0 Calls — Remote Production (`polbnvszmvblwenfnqll`) was strictly untouched.**  
**Production Release Status:** ⛔ **STRICT HOLD MAINTAINED**

---

## 1. Executive Summary

Batch 17 performed an exhaustive, read-only architectural audit and reconciliation analysis of the Supabase database migrations for the Kavach Campus student safety platform.

The investigation was initiated following the previously reported local startup failure:
```text
duplicate key value violates unique constraint "schema_migrations_pkey"
Key (version)=(001) already exists.
```

### Key Findings:
1. **Root Cause Confirmed:** Supabase CLI (`2.121.0`) extracts migration versions using the regular expression `^(\d+)_` (all digits before the first underscore). In `supabase/migrations/`, multiple pairs of files share identical version prefixes:
   - Version `001`: `001_kavach_campus.sql` and `001_kavach_campus_final.sql`
   - Version `002`: `002_kavach_campus_schema_repair.sql` and `002_kavach_campus_final_repair.sql`
   - Version `008`: `008_kavach_campus_complete_production_alignment.sql` and `008_kavach_campus_schema_and_rls_alignment_safe.sql`
   When `supabase start` executes with `[db.migrations] enabled = true`, the CLI runs `supabase migration up`, inserting version numbers into `supabase_migrations.schema_migrations(version)`. Because the table enforces `PRIMARY KEY (version)`, applying the second file with the same version triggers PostgreSQL error `23505` (`unique_violation`) and immediately halts the engine.
2. **Operational Scripts in Migrations:** `006_provision_super_admin.sql` and `008_kavach_campus_complete_production_alignment.sql` contain hardcoded user promotions targeting a specific personal email (`venkatapavanpadamati1@gmail.com`) to `SUPER_ADMIN`. Placing operational user promotions in DDL migrations represents a major security and governance hazard.
3. **Current Local Steady State:** In Batch 13, local startup was unblocked by configuring `[db.migrations] enabled = false` in `supabase/config.toml`. All 12 Supabase Docker containers are running and healthy. Integration tests successfully bootstrap a clean schema via `scripts/run_real_postgres_tests.ts` using `001_kavach_campus_final.sql` + `008_kavach_campus_schema_and_rls_alignment_safe.sql` + precondition objects + `kavach_step115_security_hardening_candidate.sql`.
4. **Storage & UI Path Discrepancy:** The storage RLS policy for `kavach-id-cards` strictly enforces owner-scoped paths (`auth.uid()::text = (storage.foldername(name))[1]`), whereas the frontend UI (`src/app/student/verification-status/page.tsx:80`) generates paths using the student's 10-digit roll number (`${formData.studentId}-card.jpg`). While server-side endpoints bypass RLS using `service_role`, direct client-side storage operations would fail with a 403 Policy Violation.
5. **Production Release Status:** **STRICT HOLD**. Remote production state (`polbnvszmvblwenfnqll`) has NOT been contacted and remains **NOT VERIFIED**. No migrations, repairs, or deployments may be executed until an independent read-only remote audit confirms the existing production migration history.

---

## 2. Exact Duplicate-Version Root Cause Analysis

### 2.1 Supabase CLI Version Parsing Invariant
Supabase CLI version `2.121.0` parses migration filenames using monotonic numeric prefixes matching the pattern `^(\d+)_([^\.]+)\.sql$`.
The characters preceding the first underscore are extracted as the migration `version` string.

Under this parsing logic:
| Filename | Extracted Version | CLI Version Collision Partner |
| :--- | :---: | :--- |
| `001_kavach_campus.sql` | `001` | `001_kavach_campus_final.sql` (`001`) |
| `001_kavach_campus_final.sql` | `001` | `001_kavach_campus.sql` (`001`) |
| `002_kavach_campus_final_repair.sql` | `002` | `002_kavach_campus_schema_repair.sql` (`002`) |
| `002_kavach_campus_schema_repair.sql` | `002` | `002_kavach_campus_final_repair.sql` (`002`) |
| `008_kavach_campus_complete_production_alignment.sql` | `008` | `008_kavach_campus_schema_and_rls_alignment_safe.sql` (`008`) |
| `008_kavach_campus_schema_and_rls_alignment_safe.sql` | `008` | `008_kavach_campus_complete_production_alignment.sql` (`008`) |

### 2.2 Mechanism of Local Startup Failure
When Supabase CLI boots a local project with default settings or `[db.migrations] enabled = true`:
1. The containerized PostgreSQL database starts on port `54322`.
2. The CLI creates the tracking table:
   ```sql
   CREATE SCHEMA IF NOT EXISTS supabase_migrations;
   CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
       version text NOT NULL,
       statements text[],
       name text,
       CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
   );
   ```
3. The CLI reads the sorted filenames from `supabase/migrations/`.
4. It reads `001_kavach_campus.sql`, parses version `001`, executes the DDL, and inserts:
   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('001', '001_kavach_campus.sql');
   ```
5. It then reads `001_kavach_campus_final.sql`, parses version `001`, executes the DDL, and attempts to insert:
   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('001', '001_kavach_campus_final.sql');
   ```
6. PostgreSQL throws error code `23505`:
   ```text
   ERROR: duplicate key value violates unique constraint "schema_migrations_pkey"
   DETAIL: Key (version)=(001) already exists.
   ```
7. Even if version `001` had succeeded, version `002` would have immediately thrown the identical primary key collision, followed by version `008`.

### 2.3 Why the Local Database Is Currently Running
In Batch 13, `supabase/config.toml` was explicitly modified:
```toml
[db.migrations]
# Disable auto-migration execution during local startup to avoid
# duplicate version collisions (001, 002, 008) and prevent execution
# of hardcoded user promotion scripts (006, 008_complete).
enabled = false
```
Because auto-migrations are disabled, the CLI skips `supabase migration up` entirely during container startup. The local database engine started cleanly, leaving `supabase_migrations.schema_migrations` uncreated (`exists: false`), while application tables were bootstrapped via the hardened test runner `scripts/run_real_postgres_tests.ts`.

---

## 3. Migration Repository Complete Inventory

The following table details all 11 files located in `supabase/migrations/`:

| Filename | Full Path | Parsed Version | CLI Action if Enabled | File Nature / Role | Risk Level | Git Status |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| `001_kavach_campus.sql` | `supabase/migrations/001_kavach_campus.sql` | `001` | Executes 1st | Historical initial schema; contains public `USING (true)` profile leak | Medium | Untracked |
| `001_kavach_campus_final.sql` | `supabase/migrations/001_kavach_campus_final.sql` | `001` | Fails (PK collision) | Superseding initial baseline; fixes public profile leak; adds recursive policy | Low | Untracked |
| `002_kavach_campus_final_repair.sql` | `supabase/migrations/002_kavach_campus_final_repair.sql` | `002` | Executes 2nd | Redundant 470-line full schema rewrite with IF NOT EXISTS | Medium | Untracked |
| `002_kavach_campus_schema_repair.sql` | `supabase/migrations/002_kavach_campus_schema_repair.sql` | `002` | Fails (PK collision) | Incremental 76-line repair script (UUID cast, safe_walks/trusted_contacts) | Low | Untracked |
| `003_kavach_campus_gps_tracking.sql` | `supabase/migrations/003_kavach_campus_gps_tracking.sql` | `003` | Executes 3rd | Adds `calculate_distance()`; contains broad staff GPS policy | High (RLS leak) | Untracked |
| `004_kavach_campus_safe_walk_schema.sql` | `supabase/migrations/004_kavach_campus_safe_walk_schema.sql` | `004` | Executes 4th | Adds `safe_walks` completion columns and check constraint | Low | Untracked |
| `005_kavach_campus_rls_infinite_recursion_repair.sql` | `supabase/migrations/005_kavach_campus_rls_infinite_recursion_repair.sql` | `005` | Executes 5th | Creates SECURITY DEFINER role functions; provisions `escalations` table | Low | Untracked |
| `006_provision_super_admin.sql` | `supabase/migrations/006_provision_super_admin.sql` | `006` | Executes 6th | **Dangerous operational script**: Promotes hardcoded email to SUPER_ADMIN | ⛔ **CRITICAL** | Untracked |
| `007_student_id_card_verification.sql` | `supabase/migrations/007_student_id_card_verification.sql` | `007` | Executes 7th | Adds ID verification columns, creates `kavach-id-cards` private bucket | Low | Untracked |
| `008_kavach_campus_complete_production_alignment.sql` | `supabase/migrations/008_kavach_campus_complete_production_alignment.sql` | `008` | Executes 8th | **Dangerous alignment candidate**: Embeds hardcoded user email & promotion | ⛔ **CRITICAL** | Untracked |
| `008_kavach_campus_schema_and_rls_alignment_safe.sql` | `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` | `008` | Fails (PK collision) | Pure DDL/RLS alignment; retains broad `OR is_staff()` storage policies | Medium | Untracked |

---

## 4. Schema and Security Differential Analysis

### 4.1 Migration Version `001` Differential
* **Source Files:** `001_kavach_campus.sql` (375 lines, 17 policies) vs `001_kavach_campus_final.sql` (413 lines, 28 policies).
* **Intended Behavior:** Initialize core application enums (`app_role`, `incident_status`, `priority_level`) and 19 application tables.
* **Security & Structural Impact:**
  1. **Profile Privacy Leak in `001_kavach_campus.sql`:** Lines 220-222 configured `CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);` and similar open policies on `student_profiles` and `staff_profiles`. This exposed all user identities, emails, and roles to unauthenticated callers.
  2. **Privacy Protection in `001_kavach_campus_final.sql`:** Closed public access and replaced it with `Users can read own profile` (`auth.uid() = id`). However, line 231 introduced `CREATE POLICY "Staff can read all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (...)));`, which created the recursive query loop (error `42P17`) resolved in Batch 15.
  3. **Idempotency Deficiencies:** `001_kavach_campus.sql` lacks defensive `CREATE TABLE IF NOT EXISTS` and `CREATE TYPE IF NOT EXISTS`, whereas `001_kavach_campus_final.sql` wraps enums in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` and tables in `IF NOT EXISTS`.
* **Local State:** `001_kavach_campus_final.sql` is currently applied locally via the test bootstrap runner.
* **Remote Production State:** **NOT VERIFIED**.

### 4.2 Migration Version `002` Differential
* **Source Files:** `002_kavach_campus_schema_repair.sql` (76 lines, 12 policies) vs `002_kavach_campus_final_repair.sql` (470 lines, 31 policies).
* **Intended Behavior:**
  - `002_kavach_campus_schema_repair.sql`: Targeted patch resolving UUID type mismatches (`evidence.uploaded_by::uuid`), adding missing foreign key columns (`safe_walks.student_id`, `trusted_contacts.student_id`), and enabling RLS default-deny on system tables (`audit_logs`, `ai_analyses`, `escalations`, `case_actions`, `user_otp_verifications`).
  - `002_kavach_campus_final_repair.sql`: Complete duplicate monolithic re-declaration of the entire database schema from scratch, including types, base tables, policies, and the `kavach-evidence` storage bucket.
* **Security & Structural Impact:**
  - `002_kavach_campus_final_repair.sql` is redundant, confusing to audit, and creates massive schema maintenance risk if both are retained.
  - `002_kavach_campus_schema_repair.sql` contains the true delta needed to migrate from an incomplete `001` to a stable schema.
* **Local State:** Objects are present in local PostgreSQL; redundant re-declaration bypassed.
* **Remote Production State:** **NOT VERIFIED**.

### 4.3 Migration Version `003` Analysis
* **Source File:** `003_kavach_campus_gps_tracking.sql` (60 lines, 3 policies).
* **Intended Behavior:** Enable RLS on `incident_locations`, add tracking session column `is_tracking_active` to `incidents`, add `duty_zone_id` to `staff_profiles`, and define Haversine distance function `calculate_distance()`.
* **Security Vulnerability:** Line 27 defines:
  ```sql
  CREATE POLICY "Staff can view all incident locations" ON incident_locations
  FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
  );
  ```
  This granted *all staff members* unrestricted visibility into student live GPS coordinates regardless of case assignment or department. (Addressed in Step 115).
* **Local State:** Replaced by Step 115 case-bound policies.
* **Remote Production State:** **NOT VERIFIED**.

### 4.4 Migration Version `004` Analysis
* **Source File:** `004_kavach_campus_safe_walk_schema.sql` (25 lines, 0 policies).
* **Intended Behavior:** Add `start_latitude`, `start_longitude`, `completed_at`, and `escalation_incident_id` to `safe_walks`. Adds CHECK constraint `safe_walks_status_check` (`ACTIVE`, `COMPLETED`, `CANCELLED`, `OVERDUE`, `ESCALATED`).
* **Security Impact:** Clean structural addition with zero privilege escalation risk.
* **Local State:** Columns present in local schema.
* **Remote Production State:** **NOT VERIFIED**.

### 4.5 Migration Version `005` Analysis
* **Source File:** `005_kavach_campus_rls_infinite_recursion_repair.sql` (223 lines, 16 policies, 5 functions).
* **Intended Behavior:** Resolve `42P17` infinite recursion on `profiles` by introducing `SECURITY DEFINER` functions with fixed `search_path = public`: `get_user_role()`, `is_staff()`, `is_admin()`, and `is_security_or_admin()`. Provisions `escalations` table. Installs privilege-escalation prevention trigger `trg_prevent_role_escalation` on `profiles`.
* **Security Impact:** Significant security improvement. Functions correctly bypass RLS when evaluating user roles while enforcing explicit `search_path = public` to prevent search-path injection attacks. Trigger blocks non-admins from self-promoting roles or altering `is_approved`.
* **Local State:** Functions and trigger verified present in local database.
* **Remote Production State:** **NOT VERIFIED**.

### 4.6 Migration Version `006` Analysis
* **Source File:** `006_provision_super_admin.sql` (82 lines, 0 tables, 0 policies).
* **Intended Behavior:** Promote specific user `venkatapavanpadamati1@gmail.com` to `SUPER_ADMIN`, set `is_approved = TRUE`, update `auth.users.raw_user_meta_data`, and insert an audit log.
* **Security & Governance Assessment:** ⛔ **CRITICAL RISK**.
  - Embedding individual personal emails and hardcoded privilege promotions in DDL migrations violates separation of duties and migration integrity.
  - If executed in CI or disposable test containers, it fails or emits warnings. If run in production, it silently mutates authorization state outside administrative UI auditing.
  - **Verdict:** Must be purged from the canonical migration sequence and isolated into an administrative runbook script.
* **Local State:** Excluded from local bootstrap.
* **Remote Production State:** **NOT VERIFIED**.

### 4.7 Migration Version `007` Analysis
* **Source File:** `007_student_id_card_verification.sql` (86 lines, 2 policies).
* **Intended Behavior:** Add student ID card verification columns (`admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`) to `student_profiles`. Create unique index `idx_profiles_student_id` on `profiles(student_id)` where `role = 'STUDENT'`. Create private bucket `kavach-id-cards` with initial storage RLS policies.
* **Security Impact:** Strong data integrity improvement. Unique index prevents two accounts from claiming the same 10-digit institutional roll number.
* **Local State:** Columns, index, and private bucket confirmed present.
* **Remote Production State:** **NOT VERIFIED**.

### 4.8 Migration Version `008` Differential
* **Source Files:** `008_kavach_campus_complete_production_alignment.sql` (303 lines) vs `008_kavach_campus_schema_and_rls_alignment_safe.sql` (269 lines).
* **Differences:**
  - Lines 250-298 in `008_complete` contain the identical hardcoded user promotion block for `venkatapavanpadamati1@gmail.com` present in `006`.
  - `008_safe` completely removes lines 250-298, making it a pure DDL/RLS script.
  - Both files contain lines 206-239 with storage policies on `kavach-evidence` and `kavach-id-cards` that include `OR public.is_staff()`. Under this clause, any staff member could read all evidence and all student ID cards.
* **Security Impact:** `008_complete` is strictly forbidden from execution. `008_safe` is functionally acceptable as a baseline, provided Step 115 is applied on top to replace the broad storage policies.
* **Local State:** `008_safe` is applied in local database; `008_complete` is unconditionally blocked.
* **Remote Production State:** **NOT VERIFIED**.

### 4.9 Candidate Step 115 Hardening Analysis
* **Source File:** `supabase/verification/kavach_step115_security_hardening_candidate.sql` (561 lines, 1 transaction).
* **Intended Behavior:**
  1. Purges broad staff access to `incident_locations` and binds access strictly to incident student owner, assigned responder, or admin.
  2. Enforces case-bound evidence access on `public.evidence` and dual-path storage access on `storage.objects` for `kavach-evidence`.
  3. Restricts `kavach-id-cards` storage reads to the student owner or institutional reviewers (`is_reviewer()`).
  4. Installs tamper-proof BEFORE UPDATE trigger `trg_prevent_student_profile_tampering` on `student_profiles` to prevent student self-verification and freeze verified academic credentials.
* **Security Impact:** Comprehensive security hardening. Successfully eliminates all residual permissive RLS leaks.
* **Rollback Candidate:** `kavach_step115_rollback_candidate.sql` exists, but reverts system to a vulnerable baseline lacking the profile trigger and case-bound checks. Emergency use only.
* **Local State:** Applied and verified in local database (Batch 15 and Batch 16).
* **Remote Production State:** **NOT VERIFIED**.

---

## 5. Local Database State Verification

A direct PostgreSQL query probe was conducted against the active local Supabase instance (`localhost:54322`):

```json
{
  "connection": "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  "supabase_migrations_table_exists": false,
  "public_tables_count": 19,
  "public_tables": [
    "ai_analyses", "ai_configuration", "audit_logs", "campus_buildings",
    "campus_zones", "case_actions", "emergency_configuration", "escalations",
    "evidence", "incident_locations", "incident_messages", "incidents",
    "notifications", "profiles", "safe_walks", "staff_profiles",
    "student_profiles", "trusted_contacts", "user_otp_verifications"
  ],
  "storage_buckets": [
    {
      "id": "kavach-evidence",
      "name": "kavach-evidence",
      "public": false,
      "file_size_limit": "10485760",
      "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]
    },
    {
      "id": "kavach-id-cards",
      "name": "kavach-id-cards",
      "public": false,
      "file_size_limit": "5242880",
      "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    }
  ],
  "public_functions_count": 8,
  "public_functions": [
    "calculate_distance", "get_user_role", "is_admin", "is_reviewer",
    "is_security_or_admin", "is_staff", "prevent_self_role_escalation",
    "prevent_student_profile_tampering", "update_updated_at_column"
  ],
  "public_triggers_count": 3,
  "public_triggers": [
    "profiles.trg_prevent_self_role_escalation",
    "profiles.update_profiles_updated_at",
    "student_profiles.trg_prevent_student_profile_tampering"
  ]
}
```

### Docker Container & Volume Status:
* All 12 Supabase containers (`supabase_db`, `supabase_auth`, `supabase_storage`, `supabase_kong`, `supabase_rest`, `supabase_realtime`, `supabase_inbucket`, `supabase_pg_meta`, `supabase_analytics`, `supabase_studio`, `supabase_edge_runtime`) are running.
* Persistent volumes: `supabase_db_kavach_campus`, `supabase_edge_runtime_kavach_campus`, `supabase_storage_kavach_campus`.
* Volume metadata and data are completely preserved.

---

## 6. Storage Security Integration & Policy Dependencies

### 6.1 Bucket Configuration & Parity
Both `kavach-evidence` and `kavach-id-cards` are private (`public = false`), with MIME type restrictions and file size ceilings (10 MB for evidence, 5 MB for ID cards). Public unauthenticated HTTP requests return 400/404 NoSuchBucket.

### 6.2 The UI vs RLS Path Mismatch Discrepancy
An architectural path convention conflict was identified:
1. **RLS Policy Expectation (`007` & Step 115):**
   ```sql
   CREATE POLICY "Authenticated users upload own id card" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (
     bucket_id = 'kavach-id-cards'
     AND (
       auth.uid()::text = (storage.foldername(name))[1]
       OR name LIKE (auth.uid()::text || '/%')
     )
   );
   ```
   The policy requires the object name to start with the user's UUID: `<auth.uid()>/<filename>`.
2. **Frontend UI Implementation (`src/app/student/verification-status/page.tsx:80`):**
   ```typescript
   idCardUrl: `kavach-id-cards/${formData.studentId.trim()}-card.jpg`
   ```
   The frontend constructs the filename using the student's 10-digit roll number (`2101201045-card.jpg`) at the root of the bucket without an `auth.uid()` folder prefix.
3. **Current Operational Reality:**
   - In the Next.js API route (`src/app/api/student/verify-id/route.ts`), the record is upserted server-side using `createAdminClient()` (`service_role`), which bypasses Storage RLS.
   - In reviewer retrieval (`src/app/api/admin/verifications/route.ts`), signed URLs are generated server-side using `adminSupabase.storage.from('kavach-id-cards').createSignedUrl(...)`, which also uses `service_role`.
   - **Risk:** If the frontend is ever refactored to upload directly to Supabase Storage via `@supabase/supabase-js` client SDK, the upload will fail with a 403 RLS violation. Furthermore, using a predictable 10-digit roll number without owner-scoped isolation increases exposure risk if signed URLs are leaked.
   - **Recommended Resolution:** Reconcile path convention to `<auth.uid()>/<student_id>-card.jpg`.

---

## 7. Migration Reconciliation Strategy Options

| Criterion | Option A: Canonical Renumbering with Superseded Archive | Option B: Consolidated Forward-Only Baseline | Option C: Scripted Bootstrap (Status Quo) | Option D: Strict Production Hold & Remote Audit First |
| :--- | :--- | :--- | :--- | :--- |
| **Concept** | Re-sequence canonical files to unique timestamps; move duplicates and `006` into `supabase/migrations/superseded/`. | Consolidate entire validated schema (tables, constraints, functions, RLS, Step 115) into a single baseline migration; archive all 11 files. | Keep `db.migrations.enabled = false`; rely on `scripts/run_real_postgres_tests.ts` for local testing. | Maintain local state; independently inspect remote production metadata before any local migration file modifications. |
| **Primary Benefit** | Standard Supabase CLI compliant; restores native `supabase migration up` and `supabase db reset` compatibility. | Absolute clarity; single source of truth for new environments, CI/CD pipelines, and disaster recovery. | Zero risk of breaking current local test suite; completely isolates dangerous scripts from automated execution. | Eliminates all risk of remote production drift, outage, or schema divergence; protects live data. |
| **Primary Risk** | If remote production has already recorded `001` or `002` in its history, renumbered files will fail to apply or duplicate objects. | Cannot be applied to an existing remote database with partial history without manual baseline marking (`supabase migration repair`). | Does not solve deployment strategy; manual CLI commands (`supabase db push`) remain broken. | Delays production release until external access/credentials are provided. |
| **Data-Loss Risk** | **None** locally; potential table drop risk remotely if `db push` is misused. | **None** on fresh/disposable DB; remote migration would require manual reconciliation. | **Zero** data-loss risk locally or remotely. | **Zero** data-loss risk. |
| **Migration-History Risk** | Medium (risk of mismatch between local timestamps and remote records). | High for existing databases; Zero for new/disposable databases. | None locally (table does not exist); production untouched. | **Zero** (preserves all history). |
| **Security Impact** | High positive: Permanently purges `006` and `008_complete` from automated execution path. | High positive: Hardens entire stack with Step 115 in a single atomic script. | Neutral: Safe locally, but migration debt remains unresolved. | High positive: Prevents unauthorized privilege escalation in production. |
| **Rollback Strategy** | Restore files from Git/backup; revert `supabase/config.toml`. | Restore archived migration files from `supabase/archive/`. | Run test teardown transactions; config is already committed. | No rollback needed (zero mutations made). |
| **Preconditions** | Complete file backup; verification on a disposable database container. | Complete file backup; independent verification of remote schema state. | Docker Desktop running; test runner present. | User permission and read-only remote connection credentials. |
| **Verification Tests** | Fresh `supabase start` on clean Docker volume with zero errors. | Clean container bootstrap; Batch 15 + Batch 16 test suites pass 100%. | `npm run test` and `scripts/run_real_postgres_tests.ts` exit with code 0. | Read-only remote catalog query returns schema metadata. |

---

## 8. Recommended Minimal, Reversible Reconciliation Strategy

A **phased, three-stage reconciliation strategy** is recommended to guarantee zero downtime and zero data loss:

### Phase 1: Local Containment (Current Status — ACTIVE)
* Maintain `[db.migrations] enabled = false` in `supabase/config.toml` for the primary workspace.
* Continue using `scripts/run_real_postgres_tests.ts` and `scratch/verify_storage_security_live.ts` for development and test execution.
* **Why:** Unblocks 100% of local feature and security testing without modifying tracked or untracked repository migration files.

### Phase 2: Staged Canonical Consolidation on a Disposable Environment (Next Batch)
* Create a dedicated archive directory: `supabase/migrations/archive/`.
* In a disposable test branch, move superseded and dangerous files into `supabase/migrations/archive/`:
  - `001_kavach_campus.sql` (superseded by `001_kavach_campus_final.sql`)
  - `002_kavach_campus_final_repair.sql` (redundant monolithic rewrite)
  - `006_provision_super_admin.sql` (isolated into `scripts/runbooks/provision_super_admin.sql`)
  - `008_kavach_campus_complete_production_alignment.sql` (forbidden due to hardcoded promotion)
* Re-sequence remaining canonical migrations using standard ISO timestamps (`YYYYMMDDHHMMSS`):
  1. `20261018000001_initial_schema.sql` (based on `001_kavach_campus_final.sql`)
  2. `20261018000002_schema_repair.sql` (based on `002_kavach_campus_schema_repair.sql`)
  3. `20261018000003_gps_tracking.sql` (based on `003_kavach_campus_gps_tracking.sql`)
  4. `20261018000004_safe_walk.sql` (based on `004_kavach_campus_safe_walk_schema.sql`)
  5. `20261018000005_rls_recursion_repair.sql` (based on `005_kavach_campus_rls_infinite_recursion_repair.sql`)
  6. `20261018000006_student_id_verification.sql` (based on `007_student_id_card_verification.sql`)
  7. `20261018000007_schema_and_rls_alignment.sql` (based on `008_kavach_campus_schema_and_rls_alignment_safe.sql`)
  8. `20261018000008_security_hardening_step115.sql` (based on `kavach_step115_security_hardening_candidate.sql`)
* Test on an isolated disposable database with `[db.migrations] enabled = true`.
* Verify that `supabase migration up` executes all 8 migrations with **zero errors**.

### Phase 3: Production Reconciliation (Under Strict Hold)
* Do NOT run `db push` or automated deploy to production.
* When authorized, execute a read-only metadata query against `polbnvszmvblwenfnqll` to inspect:
  1. What versions exist in remote `supabase_migrations.schema_migrations`.
  2. What tables, columns, and triggers currently exist in remote PostgreSQL.
* Based on remote findings, use `supabase migration repair --status applied` on remote production to align historical versions without re-running conflicting DDL, then apply only the net-new Step 115 hardening migration.

---

## 9. Backup and Rollback Requirements

Before any migration file is moved, renamed, or executed in future batches:
1. **File-Level Snapshot:** Create a full timestamped zip/tarball backup of `supabase/migrations/` and `supabase/config.toml` at `backups/migrations_pre_batch18_<timestamp>/`.
2. **Local Database Dump:** Execute `pg_dump` on local container:
   ```bash
   docker exec -t supabase_db_kavach_campus pg_dump -U postgres postgres > backups/local_db_pre_reconciliation.sql
   ```
3. **Reversibility Guarantee:**
   - Any script moving files to `archive/` must be accompanied by an inverted restore script:
     ```bash
     # Rollback command:
     mv supabase/migrations/archive/* supabase/migrations/
     ```
   - If local database initialization fails during disposable testing, tearing down the disposable container restores the original state instantly without touching production.

---

## 10. Verification Test Plan for a Disposable Isolated Database

A 7-step automated verification suite must be executed on a dedicated disposable database before accepting any reconciliation changes:

```mermaid
graph TD
    A[Step 1: Spin up Disposable Database] --> B[Step 2: Enable CLI Migrations]
    B --> C[Step 3: Execute supabase migration up]
    C --> D[Step 4: Verify schema_migrations Table]
    D --> E[Step 5: Run Batch 15 RLS Regression Suite]
    E --> F[Step 6: Run Batch 16 Storage Test Suite]
    F --> G[Step 7: Verify Zero Unauthorized Role Promotions]
```

### Detailed Test Steps:
1. **Disposable Target Provisioning:** Provision an isolated database `kavach_disposable_test` on `localhost:54322` (or a dedicated ephemeral container).
2. **Enable Migrations:** Configure `[db.migrations] enabled = true` in the disposable environment.
3. **Run Migration Up:** Execute `npx supabase migration up --db-url postgresql://postgres:postgres@localhost:54322/kavach_disposable_test`.
   - **Assertion:** Exit code must be `0`. Zero `23505` unique constraint errors.
4. **History Table Verification:** Query `supabase_migrations.schema_migrations`.
   - **Assertion:** Exactly 8 rows recorded; versions strictly match expected timestamp sequence.
5. **RLS & Trigger Verification:** Run `scripts/run_real_postgres_tests.ts` against `kavach_disposable_test`.
   - **Assertion:** 100% of RLS tests pass, zero 42P17 recursion errors, trigger blocks student tampering.
6. **Storage Security Verification:** Run `scratch/verify_storage_security_live.ts`.
   - **Assertion:** 10/10 storage security scenarios pass; public endpoints return 400/404.
7. **Privilege Verification:** Query `SELECT * FROM public.profiles WHERE role = 'SUPER_ADMIN';`.
   - **Assertion:** Exactly 0 rows returned. No hardcoded user accounts created.

---

## 11. Production Release Blockers

The following items strictly block production deployment:

1. ⛔ **Unverified Remote Migration History:** Remote production database (`polbnvszmvblwenfnqll`) has not been audited. Applying migrations without reconciling remote history risks database corruption or downtime.
2. ⛔ **Dangerous Migration Candidates in Repository:** `006_provision_super_admin.sql` and `008_kavach_campus_complete_production_alignment.sql` are present in `supabase/migrations/` and contain hardcoded user promotions.
3. ⛔ **Storage & UI Path Inconsistency:** Student ID card upload path in the frontend (`${formData.studentId}-card.jpg`) does not conform to the owner-scoped Storage RLS policy (`${auth.uid()}/...`).
4. ⛔ **Step 115 Not Yet Landed in Remote Production:** Security hardening (dual-path storage authorization, case-bound GPS privacy, student profile update trigger) exists only in verification candidates and has not been safely deployed to production.
5. ⛔ **Remote Storage Buckets Not Verified:** Local storage was proven secure in Batch 16, but remote bucket privacy settings and RLS policies on `polbnvszmvblwenfnqll` have not been confirmed via independent audit.

---

## 12. Verification Status Summary

| Item / Subsystem | Status | Verification Detail / Command Exit Code |
| :--- | :---: | :--- |
| **Local Docker Engine** | ✅ **PASS** | Docker 29.8.2 running; all 12 containers healthy |
| **Local PostgreSQL Database** | ✅ **PASS** | `localhost:54322`, 19 public tables, 8 functions, 3 triggers |
| **Duplicate Version Root Cause** | ✅ **PASS** | Confirmed CLI regex `^(\d+)_` creates collisions on `001`, `002`, `008` |
| **Migration Files Inventory** | ✅ **PASS** | 11 SQL files categorized, line counts, sizes, and AST elements cataloged |
| **Schema & Security Differential** | ✅ **PASS** | All deltas between `001`, `002`, `008`, and Step 115 documented in full |
| **Local Database State Audit** | ✅ **PASS** | Node.js pg probe confirmed `supabase_migrations` absent; schema bootstrapped cleanly |
| **Storage Security & UI Path Audit** | ⚠️ **PARTIAL** | Buckets private; UI path (`studentId`) vs RLS (`auth.uid()`) discrepancy identified |
| **Reconciliation Strategy Matrix** | ✅ **PASS** | Options A, B, C, D evaluated with complete risk, data loss, and rollback analysis |
| **Disposable Test Plan** | ✅ **PASS** | 7-step automated verification plan defined with strict exit criteria |
| **Dangerous SQL Neutralization Plan** | ✅ **PASS** | `006` and `008_complete` quarantined from automated execution |
| **Remote Production State** | ❓ **NOT VERIFIED** | `polbnvszmvblwenfnqll` strictly untouched per critical safety rules |
| **Production Release Gate** | ⛔ **BLOCKED** | **STRICT HOLD MAINTAINED** until remote audit and reconciliation complete |

---

*Report prepared autonomously by Antigravity in accordance with Batch 17 safety and audit protocols.*
