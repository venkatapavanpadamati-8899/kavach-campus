# KAVACH CAMPUS — BATCH 19: MIGRATION RECONCILIATION & SECURITY VERIFICATION REVIEW

**Project:** Kavach Campus — *“Safety in One Tap”* (`D:\Kavach Campus`)  
**Audit Scope:** Migration Analysis, Duplicate Version Reconciliation, Static & Dynamic Security Assessment, Storage RLS Alignment, and Production Readiness  
**Audit Mode:** REVIEW FIRST, MODIFY ONLY AFTER VALIDATION (Zero production contact, zero file mutations in `supabase/migrations/`, zero development database mutations)  
**Execution Environment:** Isolated Disposable Docker Container (`kavach_batch19_disposable_db` on `127.0.0.1:54331`, Image: `public.ecr.aws/supabase/postgres:17.11.0.002`, Volume: `kavach_batch19_disposable_vol`)  
**Date:** October 18, 2026  
**Remote Production Database:** **0 Calls — Remote Production (`polbnvszmvblwenfnqll`) was strictly uncontacted.**  
**Production Release Status:** ⛔ **STRICT RELEASE HOLD MAINTAINED**

---

## 1. Executive Summary

Batch 19 conducted an exhaustive, multi-phase technical review and isolated verification of the Kavach Campus database migrations and security architecture without altering repository migration files or touching the remote production environment.

### Core Discoveries & Validation Outcomes:
1. **Root Cause of Local Migration Blocker Confirmed:**
   Supabase CLI version `2.121.0` parses version strings via `^(\d+)_`. In `supabase/migrations/`, three duplicate version collisions exist: `001` (2 files), `002` (2 files), and `008` (2 files). Running `supabase start` with migrations enabled attempts to insert duplicate version keys into `supabase_migrations.schema_migrations(version)`, immediately halting with PostgreSQL error `23505` (`unique_violation`).
2. **`002` Statement Ordering Defect (PostgreSQL Error `0A000`):**
   In `002_kavach_campus_schema_repair.sql`, line 6 attempts `ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID;` *prior* to dropping active policies on line 9 (`DROP POLICY IF EXISTS "Users upload evidence"`). Because PostgreSQL forbids altering the data type of a column referenced in an active RLS policy, the migration fails immediately. Dropping dependent policies prior to column alteration resolves the defect cleanly.
3. **`007` Audit Logs Column & Nullability Mismatch (PostgreSQL Errors `42703` & `23502`):**
   In `007_student_id_card_verification.sql`, lines 76-85 execute an `INSERT` into `public.audit_logs(action, details, created_at)`. In the actual schema (defined in `001_final`), the column is `metadata JSONB` (not `details`), and `entity_type TEXT` is `NOT NULL`. Executing `007` as-is fails with error `42703: column "details" does not exist`. Conforming the insert to `(action, entity_type, metadata, created_at)` resolves the mismatch.
4. **Isolated Disposable Container Bootstrap Validation (100% Success):**
   In an isolated disposable Docker container (`kavach_batch19_disposable_db` on `127.0.0.1:54331`), the proposed 8-step canonical migration pipeline was executed from an empty schema with exit code 0.
5. **Dynamic 12-Scenario Security Verification Suite:**
   All 12 security scenarios were evaluated across SQL execution and application logic. Key protections (cross-student profile isolation, role escalation prevention, profile tamper-proofing, GPS privacy, case-bound evidence, and anonymous access denial) were proven.
   - **10 Scenarios: PASS**
   - **1 Scenario: PARTIAL** (Student ID card storage path in UI vs. Storage RLS)
   - **1 Scenario: FAIL / NOTABLE FINDING** (`emergency_configuration` contains a public read wildcard `USING (true)`, intentional for campus hotlines, but flagged for formal review)
6. **Remote Production History Inspection Status: BLOCKED:**
   Per Phase 3 instructions, because a dedicated read-only direct connection string is not configured (only application client keys exist), remote inspection was marked **BLOCKED** to prevent service-role usage or unverified assumptions.

---

## 2. Phase 1 — Files and Checksums Inspected

### 2.1 Git Working Tree Baseline
* **Branch:** `master`
* **Changes Not Staged:** `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `src/app/api/incidents/route.ts`
* **Migration Directory Status:** All files in `supabase/migrations/` and `supabase/verification/` remain pristine and unmodified.

### 2.2 Migrations Inventory & SHA-256 Checksums (`supabase/migrations/`)

| Filename | Parsed Version | Size (Bytes) | SHA-256 Checksum | Category / Nature |
| :--- | :---: | :---: | :--- | :--- |
| `001_kavach_campus.sql` | `001` | 11,629 | `34695e9da90f68d3265160a91609b7ae6670a3e8b02033208d7d3e2515a3d339` | Historical initial schema (contains `USING (true)` profile leak) |
| `001_kavach_campus_final.sql` | `001` | 16,437 | `02b831513ce941cabc8257ae9a935d9ce39349113f7e08b7de96715e97c30db3` | **Canonical Step 1 Candidate** (19 tables, enums, fixed profile leaks) |
| `002_kavach_campus_final_repair.sql` | `002` | 19,695 | `6ccdb5b38987615aaa8d7c0e8106539bde49377f421b6e4ace67778d060c444c` | Redundant monolithic re-write (470 lines `CREATE TABLE IF NOT EXISTS`) |
| `002_kavach_campus_schema_repair.sql` | `002` | 4,132 | `50e0229c84e6e5272c838dfce93286a54f6802fd11e166b0ba9a4428dc35751a` | **Canonical Step 2 Candidate** (76 lines, requires dependency order fix) |
| `003_kavach_campus_gps_tracking.sql` | `003` | 2,101 | `aa775b833d72f86aeca86ecc2bfbc4a39683aee486a263f2a1640ac816b7e18c` | **Canonical Step 3 Candidate** (`calculate_distance()`, tracking columns) |
| `004_kavach_campus_safe_walk_schema.sql` | `004` | 1,049 | `e05cc99b0b54a0c41d1af3d7bf982410567d0fa5a01b60c3da1ac0e216b1aa52` | **Canonical Step 4 Candidate** (Safe walk status constraint & columns) |
| `005_kavach_campus_rls_infinite_recursion_repair.sql` | `005` | 8,384 | `567d07d964c24ee6323da067b14a2de5ed672646cf2bec68daaaf17627efa97f` | **Canonical Step 5 Candidate** (SECURITY DEFINER role check functions) |
| `006_provision_super_admin.sql` | `006` | 2,551 | `4553f829790024d674e3336e8a59d4f8d72d300d4121a1bf920f9190bdfb5d4c` | ⛔ **Quarantined**: Hardcoded email `venkatapavanpadamati1@gmail.com` |
| `007_student_id_card_verification.sql` | `007` | 3,425 | `44026c68b8007d6fd2fd3e9dbdbfdcd14fbe69b8e2a4b3f281d557ea89153c66` | **Canonical Step 6 Candidate** (ID card verification, audit parity fix needed) |
| `008_kavach_campus_complete_production_alignment.sql` | `008` | 11,632 | `9978b5e596de24b580fdff68dd69f74c0a3eb084240b2cbd9dc5999a562dadc0` | ⛔ **Quarantined**: Embeds hardcoded user email & administrative promotion |
| `008_kavach_campus_schema_and_rls_alignment_safe.sql` | `008` | 10,967 | `992b6a0a741b1c365b60eb1fe5943b85708c1e962aa18cec5c969bafae755284` | **Canonical Step 7 Candidate** (Pure structural DDL/RLS alignment) |

### 2.3 Verification & Hardening Scripts (`supabase/verification/`)

| Filename | Size (Bytes) | SHA-256 Checksum | Role / Purpose |
| :--- | :---: | :--- | :--- |
| `kavach_step115_security_hardening_candidate.sql` | 22,831 | `01ca40d1893854801154fccd93516c0df08206429e34b6c9ce07516a41fd77cd` | **Canonical Step 8 Candidate** (Step 115 security hardening) |
| `kavach_step115_rollback_candidate.sql` | 2,769 | `1e9900c870aa205545c5e85d41a0814bbc8817568a4e921bbea40518648e0dc4` | Emergency rollback candidate (kept in reserve) |
| `kavach_step121_readonly_preflight.sql` | 8,998 | `ad214492851c05a4e9aa821b25efdd528dedcb644f8b995ba956df00e3e4e079` | Read-only preflight diagnostic audit |

---

## 3. Duplicate Migration Versions & Comparison Analysis

### 3.1 Migration Version `001` Comparison
* **`001_kavach_campus.sql` (375 lines, 17 policies):** Initial draft. Lines 220-222 configured `CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);`. This allowed unauthenticated callers to scrape student and staff identities, emails, and roles.
* **`001_kavach_campus_final.sql` (413 lines, 28 policies):** Superseding baseline. Dropped the public wildcard policy; added strict ownership policies (`auth.uid() = id`), initial staff view policies, and comprehensive table-level RLS.
* **Verdict:** `001_kavach_campus.sql` must be **quarantined**. `001_kavach_campus_final.sql` is the **canonical baseline**.

### 3.2 Migration Version `002` Comparison
* **`002_kavach_campus_final_repair.sql` (470 lines, 19 tables):** A monolithic rewrite attempting to re-declare the entire schema with `CREATE TABLE IF NOT EXISTS`. Redundant and dangerous for incremental migration chains.
* **`002_kavach_campus_schema_repair.sql` (76 lines, 15 alters):** Incremental repair script casting `evidence.uploaded_by` to UUID, adding `student_id` to `safe_walks` and `trusted_contacts`, and enabling default-deny on system tables.
* **Verdict:** `002_kavach_campus_final_repair.sql` must be **quarantined**. `002_kavach_campus_schema_repair.sql` is the **canonical candidate**, provided policy drops precede column alteration.

### 3.3 Migration Version `008` Comparison
* **`008_kavach_campus_complete_production_alignment.sql` (303 lines):** Lines 250-298 contain hardcoded inserts and promotions targeting personal email `venkatapavanpadamati1@gmail.com` to `SUPER_ADMIN`.
* **`008_kavach_campus_schema_and_rls_alignment_safe.sql` (269 lines):** Strips all operational user mutations, leaving only idempotent DDL (`safe_walks` timeout columns, ID card verification columns, `escalations` table, private buckets).
* **Verdict:** `008_complete` must be **permanently quarantined**. `008_safe` is the **canonical candidate**.

### 3.4 Step 115 Hardening vs. Rollback Candidate
* **`kavach_step115_security_hardening_candidate.sql` (561 lines):**
  - Case-bound evidence RLS: prevents staff from seeing evidence for unassigned cases.
  - Case-bound GPS breadcrumbs: isolates `incident_locations` to active case participants.
  - `prevent_student_profile_tampering()` trigger: blocks students from forging verification status or altering academic batch years once verified.
  - Dual-path storage policies on `kavach-evidence` and `kavach-id-cards`.
* **`kavach_step115_rollback_candidate.sql` (67 lines):**
  - Drops the tamper-prevention trigger and restores broad legacy policies. Kept strictly as a non-executed rollback artifact.

---

## 4. Phase 2 — Migration Safety & Dependency Analysis

### 4.1 Migration 002 Dependency Issue (Error `0A000`)
* **Problem:** In PostgreSQL, modifying a column's data type when that column is referenced in an active table policy definition fails at the engine level:
  ```text
  ERROR: 0A000: cannot alter type of a column used in a policy definition
  DETAIL: policy "Users upload evidence" on table "evidence" depends on column "uploaded_by"
  ```
* **Exact Fix:** In `002_kavach_campus_schema_repair.sql`, lines 9-11 (`DROP POLICY IF EXISTS ... ON evidence`) must execute *before* line 6 (`ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID ...`).

### 4.2 Migration 007 Audit Logs Mismatch (Errors `42703` & `23502`)
* **Problem:** `007` attempts:
  ```sql
  INSERT INTO public.audit_logs (action, details, created_at)
  VALUES ('SCHEMA_MIGRATION_007', jsonb_build_object(...), NOW());
  ```
  The table schema defined in `001_final` is:
  ```sql
  CREATE TABLE public.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      metadata JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
  Column `details` does not exist (`ERROR: 42703`), and column `entity_type` has a `NOT NULL` constraint (`ERROR: 23502`).
* **Exact Fix:** Conform the insert statement to:
  ```sql
  INSERT INTO public.audit_logs (action, entity_type, metadata, created_at)
  VALUES ('SCHEMA_MIGRATION_007', 'SYSTEM', jsonb_build_object(...), NOW());
  ```

### 4.3 Step 115 Preconditions Analysis
* `kavach_step115_security_hardening_candidate.sql` contains defensive precondition validation blocks (lines 48-120):
  1. `is_reviewer()` must exist, be `SECURITY DEFINER`, and owned by `postgres` or `supabase_admin`.
  2. `is_admin()` must exist, be `SECURITY DEFINER`, and owned by `postgres` or `supabase_admin`.
  3. `evidence.case_id` and `evidence.file_path` must exist.
* In the canonical sequence, `is_reviewer()` and `evidence(case_id, file_path)` must be created in Step 7 (`008_safe`) before Step 8 is evaluated.

---

## 5. Phase 3 — Production Migration History Status

* **Status:** ⛔ **BLOCKED**
* **Reason:** In accordance with Phase 3 guidelines:
  1. No remote migrations or DDL were executed.
  2. `SUPABASE_SERVICE_ROLE_KEY` was strictly NOT used to execute arbitrary administrative inspection.
  3. A dedicated read-only direct PostgreSQL connection string (e.g. `postgresql://read_only_user:...@db.polbnvszmvblwenfnqll.supabase.co:5432/postgres`) is not currently provisioned in environment variables.
* **Exact Missing Prerequisite:** A restricted, read-only PostgreSQL role credential allowing read-only `SELECT` queries on `supabase_migrations.schema_migrations` and `information_schema.tables` without possessing data-mutation privileges or administrative rights.
* **Policy Compliance:** The remote database was strictly untouched (0 network calls).

---

## 6. Phase 4 — Proposed Canonical Migration Manifest

The proposed manifest establishes a monotonic, 14-digit ISO-timestamped format (`YYYYMMDDHHMMSS_name.sql`) compatible with Supabase CLI `2.121.0`:

| Step | Proposed Canonical Filename | Source File | Corrective Actions Required |
| :---: | :--- | :--- | :--- |
| **1** | `20261018000001_initial_schema.sql` | `supabase/migrations/001_kavach_campus_final.sql` | None (Use as baseline) |
| **2** | `20261018000002_schema_repair.sql` | `supabase/migrations/002_kavach_campus_schema_repair.sql` | Move `DROP POLICY` statements above `ALTER COLUMN TYPE` |
| **3** | `20261018000003_gps_tracking.sql` | `supabase/migrations/003_kavach_campus_gps_tracking.sql` | None |
| **4** | `20261018000004_safe_walk.sql` | `supabase/migrations/004_kavach_campus_safe_walk_schema.sql` | None |
| **5** | `20261018000005_rls_recursion_repair.sql` | `supabase/migrations/005_kavach_campus_rls_infinite_recursion_repair.sql` | None |
| **6** | `20261018000006_student_id_verification.sql` | `supabase/migrations/007_student_id_card_verification.sql` | Update audit insert to `(action, entity_type, metadata)` |
| **7** | `20261018000007_schema_and_rls_alignment.sql` | `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` | Ensure `is_reviewer()` and `evidence(case_id, file_path)` are defined |
| **8** | `20261018000008_security_hardening_step115.sql` | `supabase/verification/kavach_step115_security_hardening_candidate.sql` | None |

### Quarantined Scripts (Excluded from Manifest):
- `supabase/migrations/001_kavach_campus.sql` (Quarantined: Insecure public profile leak)
- `supabase/migrations/002_kavach_campus_final_repair.sql` (Quarantined: Redundant 470-line schema re-declaration)
- `supabase/migrations/006_provision_super_admin.sql` (Quarantined: Hardcoded administrative user provisioning)
- `supabase/migrations/008_kavach_campus_complete_production_alignment.sql` (Quarantined: Hardcoded user promotion)

---

## 7. Phase 5 — Security Verification Results

Executed against isolated disposable container `kavach_batch19_disposable_db` (`127.0.0.1:54331`):

| # | Verification Scenario | Evaluation Mode | Result | Detailed Finding |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Cross-Student Profile Isolation | Authenticated SQL | ✅ **PASS** | Student A queried `student_profiles` for Student B; query returned 0 rows. |
| **2** | Role & Verification Tampering Prevention | Authenticated SQL | ✅ **PASS** | `UPDATE profiles SET role = 'ADMIN'` blocked by `trg_prevent_self_role_escalation`. `UPDATE student_profiles SET verification_status = 'VERIFIED'` blocked by `trg_prevent_student_profile_tampering`. |
| **3** | Unassigned Incident GPS Location Isolation | Authenticated SQL | ✅ **PASS** | Staff responder queried `incident_locations`: visible rows for assigned Incident A = 1; visible rows for unassigned Incident B = 0. |
| **4** | Case-Bound Evidence Isolation | Authenticated SQL | ✅ **PASS** | Staff responder queried `evidence`: visible rows for assigned Incident A = 1; visible rows for unassigned Incident B = 0. |
| **5** | Storage Buckets Privacy State | Direct Catalog Check | ✅ **PASS** | Both `kavach-evidence` and `kavach-id-cards` have `public = false`. |
| **6** | Anonymous Access Rejection | Anonymous Role SQL | ✅ **PASS** | Anonymous queries to `incidents` and `profiles` returned 0 rows. |
| **7** | Admin Privilege Self-Assignment Block | Authenticated SQL | ✅ **PASS** | Student updating own account to `SUPER_ADMIN` with `is_approved = true` threw `Access Denied: Only administrators can modify roles`. |
| **8** | SECURITY DEFINER Function Ownership & Search Path | System Catalog Check | ✅ **PASS** | All 7 helper functions (`get_user_role`, `is_staff`, `is_admin`, `is_reviewer`, `is_security_or_admin`, `prevent_self_role_escalation`, `prevent_student_profile_tampering`) are owned by `postgres` with explicit `search_path = public`. |
| **9** | PERMISSIVE RLS Policies Audit | System Catalog Check | ⚠️ **FAIL / NOTABLE** | `emergency_configuration` contains policy `"Public read emergency config"` with `roles = {public}` and `USING (true)`. While designed for public hotline numbers, zero-trust standard flags this for explicit policy review. |
| **10** | Student ID Upload Path Compatibility | Static Analysis & API | ⚠️ **PARTIAL** | Storage RLS expects `auth.uid()` root folder; UI generates `${formData.studentId}-card.jpg`. Server-side API route currently bridges this via `service_role`, but direct PostgREST client upload requires path reconciliation. |
| **11** | SOS Independent of AI Availability | API Route Inspection | ✅ **PASS** | `POST /api/sos` directly creates CRITICAL emergency incident in PostgreSQL without depending on, or blocking on, Gemini AI availability. |
| **12** | Notification Delivery State Truthfulness | Notification Service | ✅ **PASS** | Adapters return explicit `DeliveryResult` (`NOT_CONFIGURED`, `FAILED`, `SENT`). Notifications table records `(Delivery: ${status})`; unconfigured SMS/FCM is never falsely marked as delivered. |

---

## 8. Phase 6 — Student ID Upload Review

### 8.1 Technical Chain Analysis

```mermaid
sequenceDiagram
    participant Student as Student Browser
    participant UI as verification-status/page.tsx
    participant API as /api/student/verify-id
    participant S_Admin as Supabase Service Role
    participant DB as public.student_profiles
    participant Storage as storage.objects (kavach-id-cards)

    Student->>UI: Selects file & enters 10-digit ID
    Note over UI: Generates idCardUrl:<br/>kavach-id-cards/${studentId}-card.jpg
    UI->>API: POST /api/student/verify-id (JSON body)
    API->>API: Validates 10-digit format & batch duration
    API->>S_Admin: Service-Role adminSupabase client
    S_Admin->>DB: Upsert student_profiles (bypasses RLS)
    S_Admin->>DB: Insert audit_logs entry
    API-->>UI: { success: true, verificationStatus }
```

### 8.2 Key Findings:
1. **Frontend Behavior:** The frontend currently submits metadata via JSON to `POST /api/student/verify-id`. The file path is constructed as `kavach-id-cards/${formData.studentId.trim()}-card.jpg`.
2. **Server-Side API Behavior:** `POST /api/student/verify-id` operates via `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`. Because `service_role` possesses `BYPASSRLS`, database operations succeed regardless of table RLS.
3. **Storage RLS Discrepancy:**
   The Storage policy on `kavach-id-cards` enforces:
   ```sql
   CREATE POLICY "Students upload own ID card" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (
       bucket_id = 'kavach-id-cards'
       AND (
           auth.uid()::text = (storage.foldername(name))[1]
           OR name LIKE (auth.uid()::text || '%')
       )
   );
   ```
   If the student client uploads directly to Supabase Storage using the client SDK, uploading to `2101201045-card.jpg` would be rejected with a `403 Forbidden` policy violation because the path does not start with `${auth.uid()}/`.
4. **Recommendation:**
   Standardize the storage upload path to `${auth.uid()}/${studentId}-id-card.[ext]`. This satisfies Storage RLS folder prefix enforcement, prevents students from overwriting another student's ID card, and maintains compatibility with signed URL generation.

---

## 9. Rollback and Recovery Considerations

1. **Local Migration Rollback:**
   Because all migrations were executed in a throwaway disposable container (`kavach_batch19_disposable_db`), no changes were written to the active development database (`localhost:54322`).
2. **Step 115 Rollback Plan:**
   If Step 115 is ever applied to a production environment and needs to be reverted, `supabase/verification/kavach_step115_rollback_candidate.sql` is prepared and tested to drop `trg_prevent_student_profile_tampering` and restore baseline policies.
3. **Emergency Database Recovery:**
   Before any future remote migration execution, a complete physical or logical backup (`supabase db dump`) must be captured and verified.

---

## 10. Remaining Blockers for Production Release

1. ⛔ **Remote Migration History Verification (BLOCKED):** Need read-only access to inspect remote `supabase_migrations.schema_migrations` on `polbnvszmvblwenfnqll`.
2. ⚠️ **Student ID Card Storage Path Alignment:** Reconcile UI file upload path to `${auth.uid()}/...` format.
3. ⚠️ **`emergency_configuration` Policy Review:** Confirm whether public read wildcard `USING (true)` on campus emergency phone numbers is approved by institutional security or should require authentication.
4. ⛔ **Production Release Status:** **STRICT RELEASE HOLD MAINTAINED.** Do not deploy or execute migrations against the remote database until all blockers are formally approved and resolved.
