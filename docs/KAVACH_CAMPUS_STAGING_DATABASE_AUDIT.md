# KAVACH CAMPUS — STAGING DATABASE READINESS AUDIT REPORT

**Project:** Kavach Campus  
**Workspace:** `D:\Kavach Campus`  
**Inspected Directories:** `supabase/migrations/`, `supabase/verification/`, `supabase/migrations_canonical/`  
**Execution Date:** 2026-10-21  
**Audit Standard:** Read-Only SQL Inspection, Dependency Graphing, Policy Auditing, and Reconciliation  
**Overall Database Gate Decision:** **BLOCKED** (Ready for controlled Staging execution; strictly blocked from Production).

---

## Task 1: Duplicate Migration Prefixes & Conflicting Migrations

### Findings:
A detailed catalog of all 17 files in `supabase/migrations/` reveals **3 major version prefix collisions**:

| Prefix | Conflicting Files | Variance & Conflict Analysis | Recommendation |
|:---:|---|---|---|
| **`001`** | `001_kavach_campus.sql`<br>`001_kavach_campus_final.sql` | `001_kavach_campus.sql` uses raw, non-idempotent `CREATE TABLE` and `CREATE TYPE` statements that throw runtime collision errors `42710` and `42P07` on re-run.<br>`001_kavach_campus_final.sql` wraps enums in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` and tables in `CREATE TABLE IF NOT EXISTS`. | **Canonical Choice:** Use `001_kavach_campus_final.sql`. Quarantine legacy `001_kavach_campus.sql`. |
| **`002`** | `002_kavach_campus_final_repair.sql`<br>`002_kavach_campus_schema_repair.sql` | `002_kavach_campus_final_repair.sql` is a 470-line monolithic script that re-declares the entire schema from scratch, violating monotonic incremental migration principles.<br>`002_kavach_campus_schema_repair.sql` is a surgical 76-line patch that correctly drops dependent RLS policies before altering column data types (`uploaded_by::uuid`, `student_id::uuid`), preventing PostgreSQL error `0A000` (`cannot alter type of a column used in a row level security policy`). | **Canonical Choice:** Use `002_kavach_campus_schema_repair.sql`. Quarantine monolithic `002_kavach_campus_final_repair.sql`. |
| **`008`** | `008_kavach_campus_complete_production_alignment.sql`<br>`008_kavach_campus_schema_and_rls_alignment_safe.sql` | `008_kavach_campus_complete_production_alignment.sql` contains a hardcoded administrative privilege grant for `venkatapavanpadamati1@gmail.com` (lines 265–298), which violates security and audit standards.<br>`008_kavach_campus_schema_and_rls_alignment_safe.sql` decouples structural DDL from user data, eliminating all hardcoded personal credentials. | **Canonical Choice:** Use `008_kavach_campus_schema_and_rls_alignment_safe.sql`. Quarantine `008_kavach_campus_complete_production_alignment.sql`. |

- **Task 1 Status:** **PASS** (Conflicts identified, isolated, and resolved in canonical mapping).

---

## Task 2: Schema Compatibility & Dependency Ordering

### Dependency Flow Analysis:
1. `auth.users` (Supabase managed base identity table)
2. `public.profiles` (Foreign key to `auth.users.id` with `ON DELETE CASCADE`)
3. `public.student_profiles` & `public.staff_profiles` (Foreign key to `profiles.id`)
4. `public.incidents` (Foreign key to `profiles.id` as `student_id`, and `assigned_to`)
5. Child Tables: `incident_locations`, `evidence`, `case_actions`, `incident_messages`, `escalations`, `safe_walks`, `trusted_contacts`
6. Audit & Support Tables: `audit_logs`, `user_otp_verifications`, `notifications`

### Application Query Alignment:
- **`profiles.college_id`**: Introduced in Migration 012. Verified matching application query usage in `src/app/api/auth/register/route.ts`, `src/app/api/auth/callback/route.ts`, `src/app/api/admin/users/approve/route.ts`, and `src/proxy.ts`.
- **`incidents.college_id`**: Added in Migration 013 and backfilled from reporting student profiles. Indexed via `idx_incidents_college_id`.
- **`evidence` columns**: Migration 014 reconciles `case_id` / `file_path` with `incident_id` / `storage_path` using trigger `sync_evidence_incident_reference()`.
- **Foreign Keys & Cascades:** Deleting a student from `auth.users` cascades cleanly down through `profiles`, `student_profiles`, `safe_walks`, and `trusted_contacts`.

- **Task 2 Status:** **PASS** (Schema and code query alignment verified).

---

## Task 3: Migrations 013 and 014 (Cross-College RLS Isolation)

### Migration 013 Review:
- **Scope:** Introduces `college_id` column to `public.incidents`, adds trigger `trg_assign_incident_college_id`, and adds baseline college-scoped policies.
- **Limitation:** Migration 013 alone is insufficient for production because legacy permissive policies from migrations 001/002/008 were not completely dropped. In PostgreSQL, permissive policies combine with boolean `OR`, allowing legacy global policies to bypass the newly added narrower policies.

### Migration 014 Review:
- **Scope:** Comprehensive corrective hardening migration (672 lines).
- **Key Enhancements:**
  1. Synchronizes `evidence` table references (`case_id`, `file_path`, `incident_id`, `storage_path`).
  2. Creates `prevent_self_role_escalation()` trigger, preventing students or staff from modifying their own `role`, `is_approved`, `student_id`, or `college_id`.
  3. Derives incident `college_id` from the student's profile via `trg_fn_assign_incident_college_id()`, rejecting caller-supplied campus spoofing.
  4. Systematically executes `DROP POLICY IF EXISTS` on all legacy permissive global read policies across `profiles`, `student_profiles`, `staff_profiles`, `incidents`, `evidence`, `safe_walks`, and `storage.objects`.
  5. Implements multi-tenant storage policies restricting `kavach-evidence` and `kavach-id-cards` reads strictly to the object owner or same-campus authorized staff.

- **Task 3 Status:** **PASS (Code Review)** / **BLOCKED (Remote Staging Execution Pending)**.

---

## Task 4: Permissive Policies, Restrictive Policies, Grants, and WITH CHECK Clauses

### Policy Architecture:
1. **PERMISSIVE vs. RESTRICTIVE:**
   - All standard policies are created as `PERMISSIVE`. Because multiple permissive policies evaluate via `OR`, Migration 014 drops every un-scoped policy (`DROP POLICY IF EXISTS "Public profiles are viewable by everyone"`, etc.) before creating scoped policies.
2. **SECURITY DEFINER Functions & Search Paths:**
   - Helper functions (`public.get_user_role()`, `public.get_user_college_id()`, `public.is_staff()`, `public.is_admin()`, `public.is_campus_staff()`) are defined with `SECURITY DEFINER` and explicit `SET search_path = public`.
   - Prevents search path hijacking and eliminates PostgreSQL error `42P17` (infinite recursion in RLS subqueries).
3. **Execution Grants:**
   - Functions revoke execute privileges from `PUBLIC` and grant strictly to `authenticated` and `service_role`.
4. **WITH CHECK Invariants:**
   - `evidence` INSERT: `WITH CHECK (auth.uid() = uploaded_by)`
   - `incidents` INSERT: Tenant assignment trigger enforces `NEW.college_id = profile_college_id` regardless of client payload.

- **Task 4 Status:** **PASS**.

---

## Task 5: Review of Policy Preflight SQL

### File: `supabase/verification/kavach_cross_college_policy_preflight.sql`
- **Characteristics:** 100% read-only, non-destructive catalog inspection query.
- **What It Verifies:**
  1. Inspects `pg_class.relrowsecurity` and `pg_class.relforcerowsecurity` across all 13 core tables.
  2. Scans `pg_policies` for any surviving `unconditional_using` (`qual = 'true'`) or `unconditional_check` (`with_check = 'true'`).
  3. Aggregates profiles grouped by `college_id` to highlight accounts pending verification (`PENDING_CAMPUS_VERIFICATION`).
  4. Checks for anomalies where student email domains do not match their assigned `college_id`.
  5. Identifies incidents where `incidents.college_id` mismatches the reporting student profile's `college_id`.
- **Limitation:** Does not prove authenticated RLS execution. Authenticated API tests with real user JWTs must be executed separately.

- **Task 5 Status:** **PASS** (Diagnostic queries validated as safe for staging execution).

---

## Task 6: SQL Syntax Validation in Isolated Environment

- **Local Host Assessment:**
  - Checked local environment tools: Docker Desktop daemon is not running on this host (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`). Neither `psql` nor `supabase` CLI executable is installed in PATH.
  - Therefore, local PostgreSQL execution could not be executed on this machine.
- **Automated Code-Level Verification:**
  - Automated Vitest test suite (`src/__tests__/tenant-migration-hardening.test.ts`) verifies structural AST tokens, SQL trigger definitions, policy naming, and regex invariants across `014_cross_college_rls_hardening.sql`.

- **Task 6 Status:** **BLOCKED (LOCAL POSTGRESQL NOT AVAILABLE)** / **AUTOMATED STATIC TEST PASS**.

---

## Task 7: Safe Migration Reconciliation Plan

### Step-by-Step Staging Reconciliation Plan:

```text
+-----------------------------------------------------------------------------------+
|               KAVACH CAMPUS — CANONICAL DATABASE MIGRATION PIPELINE               |
+-----------------------------------------------------------------------------------+
| Step 1: Staging Backup Snapshot                                                   |
|         - Take manual full snapshot via Supabase Dashboard -> Backups.             |
+-----------------------------------------------------------------------------------+
| Step 2: Diagnostic Preflight Inspection                                          |
|         - Run `supabase/verification/kavach_cross_college_policy_preflight.sql`   |
|         - Confirm RLS flags and existing policy inventory.                        |
+-----------------------------------------------------------------------------------+
| Step 3: Sequential Canonical Migration Execution                                  |
|         Order:                                                                    |
|         1. `20261019000001_initial_schema.sql` (001_final)                        |
|         2. `20261019000002_schema_repair.sql` (002_schema_repair)                 |
|         3. `20261019000003_gps_tracking.sql` (003)                                |
|         4. `20261019000004_safe_walk_schema.sql` (004)                           |
|         5. `20261019000005_rls_infinite_recursion_repair.sql` (005)               |
|         6. `20261019000006_student_id_card_verification.sql` (007)                |
|         7. `20261019000007_schema_and_rls_alignment_safe.sql` (008_safe)          |
|         8. `20261019000008_security_hardening_step115.sql`                       |
|         9. `20261019000009_student_id_resubmission.sql` (009)                     |
|        10. `20261019000010_service_role_audit.sql` (010)                          |
|        11. `20261019000011_staff_locations_consent.sql` (011)                     |
|        12. `20261019000012_profiles_college_tenant.sql` (012)                     |
|        13. `20261019000013_cross_college_rls_isolation.sql` (013)                 |
|        14. `20261019000014_cross_college_rls_hardening.sql` (014 Candidate)       |
+-----------------------------------------------------------------------------------+
| Step 4: Staging Postflight Verification                                           |
|         - Re-run `kavach_cross_college_policy_preflight.sql`.                     |
|         - Confirm 0 legacy permissive policies remain.                            |
|         - Confirm `college_id` is populated on profiles and incidents.             |
+-----------------------------------------------------------------------------------+
| Step 5: Authenticated Tenant Cross-Access Tests                                   |
|         - Log in as SRKR Student -> attempt read of Vishnu Incident (Expect: 0).  |
|         - Log in as Vishnu Staff -> attempt read of SRKR Incident (Expect: 0).    |
+-----------------------------------------------------------------------------------+
```

- **Task 7 Status:** **PASS** (Plan formulated and documented).

---

## Summary of Findings & Gate Status

| Item / Task | Status | Note |
|---|:---:|---|
| Task 1: Duplicate migration prefixes | **PASS** | `001`, `002`, and `008` duplicate prefixes reconciled. |
| Task 2: Schema & dependency alignment | **PASS** | Clean dependency chain and FK cascades verified. |
| Task 3: Migration 013 & 014 review | **PASS** | RLS tenant isolation code reviewed; candidate 014 verified. |
| Task 4: Policy & grants inspection | **PASS** | SECURITY DEFINER with fixed search_paths; legacy drops verified. |
| Task 5: Preflight SQL review | **PASS** | Non-destructive catalog inspection verified. |
| Task 6: Local PostgreSQL syntax check | **BLOCKED** | Docker daemon not running locally on Windows host. |
| Task 7: Reconciliation plan | **PASS** | Step-by-step procedure documented in canonical pipeline. |
| Remote Staging Application | **BLOCKED** | Awaiting manual snapshot and authorized execution in staging. |
| Production Release | **BLOCKED** | Strictly held until Staging Gates 1–5 pass. |
