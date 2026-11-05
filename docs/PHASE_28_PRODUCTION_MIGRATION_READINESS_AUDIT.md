# Kavach Campus — Phase 28 Production Database Migration Readiness Audit

**Project:** Kavach Campus — Campus Safety & Anti-Ragging Ecosystem
**Target Repository:** `D:\kavach-campus`
**Remote Supabase Project Reference:** `dvyiclyyvmsfipzrdowu`
**Migrations Inspected:** `009` through `019`
**Audit Date:** November 5, 2026
**Auditor Mode:** READ-ONLY Static SQL & Schema Policy Audit
**Overall Readiness Verdict:** **READY FOR STAGED EXECUTION (WITH IDENTIFIED ORDERING RECOMMENDATIONS)**

---

## 1. Executive Summary & Scope

This audit evaluates the SQL migration scripts `009` through `019` located in `supabase/migrations/` to establish their production readiness for remote Supabase project `dvyiclyyvmsfipzrdowu`.

### Key Findings Summary:
1. **Zero Destructive Data Operations:** None of the migrations execute destructive `DROP TABLE`, `TRUNCATE`, `DROP COLUMN`, or `DELETE FROM` statements against application data. All `DROP` statements operate strictly on constraints, indexes, triggers, or legacy RLS policies to replace or harden them.
2. **PostgreSQL Permissive Policy Vulnerability Neutralized:** In PostgreSQL, multiple `PERMISSIVE` policies on the same table combine with logical `OR`. Legacy baseline policies (from migrations 001/002) that granted broad access (e.g. `is_staff()`) without checking `college_id` would compromise multi-tenancy. Migration `014` and `018` systematically drop these legacy policies, ensuring strict tenant isolation.
3. **Local Migration State:** The local development Supabase instance (`127.0.0.1:54322`) has migrations `001` through `019` recorded in `supabase_migrations.schema_migrations`.
4. **Remote Migration State:** The local CLI is not linked to remote project `dvyiclyyvmsfipzrdowu`. Per audit constraints, remote state is unverified until the project administrator runs the provided verification queries in the Supabase Dashboard.
5. **Execution Order Nuance:** Migration `009` inserts an audit record into `public.audit_logs(entity_type)`. Migration `010` includes `ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT`. In pristine databases where `audit_logs` was created by `001_kavach_campus.sql`, `entity_type` already exists. However, if running against a database where `entity_type` was omitted, running `010` before `009` or applying both in sequence prevents a potential column-not-found error.

---

## 2. Detailed Inspection of Migrations 009 through 019

---

### Migration 009: `009_student_id_verification_resubmission.sql`

- **Purpose:** Adds `'RESUBMISSION_REQUIRED'` to the student verification status enum constraint, prevents students from escalating their own status to `'VERIFIED'`, and configures the private `'kavach-id-cards'` storage bucket.
- **Dependencies:** `public.student_profiles`, `public.is_security_or_admin()`, `public.is_staff()`, `storage.buckets`, `storage.objects`, `public.audit_logs`.
- **Tables & Objects Affected:**
  - Table: `public.student_profiles` (drops and recreates constraint `check_verification_status`).
  - Function: `public.prevent_student_self_verification()` (SECURITY DEFINER).
  - Trigger: `trg_prevent_student_self_verification` on `public.student_profiles`.
  - Storage: Bucket `'kavach-id-cards'` (`public = false`).
  - Storage Policies: `"Students upload own ID card"`, `"Students read own ID card"`.
  - Table: `public.audit_logs` (inserts migration log).
- **RLS Impact:** Enforces private access on `'kavach-id-cards'`. Students may only insert/read their own folder (`auth.uid() = foldername[1]`), while staff can read for verification.
- **Destructive Operation Risk:** **LOW.** The check constraint is dropped and recreated with an expanded set of valid values. Existing valid rows remain unaffected.
- **Idempotency:** **HIGH.** Uses `DO $$ ... EXCEPTION`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`, `ON CONFLICT (id) DO UPDATE`, and `DROP POLICY IF EXISTS`.
- **Execution Nuance:** Line 80 inserts into `public.audit_logs(entity_type)`. If `entity_type` is absent in an existing database, execute `010`'s column additions first.
- **Verification Query:**
  ```sql
  SELECT conname, pg_get_constraintdef(c.oid)
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'student_profiles' AND c.conname = 'check_verification_status';
  ```
- **Readiness Status:** **`READY`**

---

### Migration 010: `010_service_role_and_audit_alignment.sql`

- **Purpose:** Defensively ensures `public.audit_logs` contains standard telemetry columns (`actor_id`, `entity_type`, `entity_id`). Hardens `public.is_security_or_admin()` to recognize `service_role` and JWT claims without evaluating `current_user` inside `SECURITY DEFINER`. Recreates `prevent_student_self_verification()` to permit `service_role` automated workflows.
- **Dependencies:** `public.audit_logs`, `public.profiles`, `public.student_profiles`.
- **Tables & Objects Affected:**
  - Table: `public.audit_logs` (adds `actor_id UUID`, `entity_type TEXT`, `entity_id UUID`, sets `id` default to `gen_random_uuid()`).
  - Function: `public.is_security_or_admin()` (SECURITY DEFINER, search_path = public).
  - Function: `public.prevent_student_self_verification()`.
  - Trigger: `trg_prevent_student_self_verification` on `public.student_profiles`.
- **RLS Impact:** Directly hardens security function `is_security_or_admin()`, which is used in RLS policies across the platform.
- **Destructive Operation Risk:** **NONE.** All column additions use `IF NOT EXISTS`. Function replaces exist in place.
- **Idempotency:** **HIGH.**
- **Verification Query:**
  ```sql
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'audit_logs'
    AND column_name IN ('actor_id', 'entity_type', 'entity_id');
  ```
- **Readiness Status:** **`READY`**

---

### Migration 011: `011_staff_live_locations_and_consent.sql`

- **Purpose:** Provisions `public.staff_locations` for real-time responder dispatch tracking with explicit privacy consent (`is_location_sharing_enabled`, `consent_recorded_at`, `consent_withdrawn_at`) and on-duty status.
- **Dependencies:** `public.profiles(id)`, `public.is_security_or_admin()`, `uuid-ossp` or `gen_random_uuid()`.
- **Tables & Objects Affected:**
  - Table: `public.staff_locations` (new table).
  - Indexes: `idx_staff_locations_staff_id`, `idx_staff_locations_updated_at`, `idx_staff_locations_duty_consent`.
  - RLS Policies: `staff_locations_self_manage`, `staff_locations_dispatch_read`.
- **RLS Impact:** Staff members can only see and update their own coordinates. Security/Admins can only see responders who are actively on duty (`is_on_duty = TRUE`) and have granted location sharing consent (`is_location_sharing_enabled = TRUE`).
- **Destructive Operation Risk:** **NONE.** Purely additive.
- **Idempotency:** **`NEEDS REVIEW` (PARTIAL IDEMPOTENCY).**
  - Lines 38 and 45 use `CREATE POLICY` without preceding `DROP POLICY IF EXISTS`. If executed against a database where these policies already exist, PostgreSQL throws `policy already exists`.
  - *Mitigation:* Migration `018` explicitly includes `DROP POLICY IF EXISTS` for both policies and reinforces them with tenant isolation.
  - *Recommendation:* Add `DROP POLICY IF EXISTS` before line 38 and line 45, or execute migration 011 inside a guarded block.
- **Verification Query:**
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'staff_locations';
  ```
- **Readiness Status:** **`NEEDS REVIEW`** (Safe to run once, but needs policy drop guard for repeat runs).

---

### Migration 012: `012_profiles_college_tenant.sql`

- **Purpose:** Introduces multi-tenant institution partitioning. Adds `college_id TEXT` to `public.profiles`. Maps verified institutional email domains (`@srkr.edu.in`, `@vishnu.edu.in`). Flags ambiguous or unverified accounts as `'PENDING_CAMPUS_VERIFICATION'` to prevent unauthorized cross-college access. Defines `public.get_user_college_id()` helper. Configures `kavach-evidence` storage bucket for multi-modal evidence (25MB limit, audio/video/pdf MIME types).
- **Dependencies:** `public.profiles`, `storage.buckets`.
- **Tables & Objects Affected:**
  - Table: `public.profiles` (adds `college_id TEXT`, indexes `idx_profiles_college_id`, `idx_profiles_college_role`).
  - Function: `public.get_user_college_id()` (SECURITY DEFINER, stable).
  - Storage: Bucket `'kavach-evidence'` updated with 25MB limit and audio/video MIME types.
- **RLS Impact:** Foundation for all multi-tenant RLS policies.
- **Destructive Operation Risk:** **LOW-MEDIUM.** Does not drop any columns or rows. Existing profiles with `college_id IS NULL` that do not match institutional regex are assigned `'PENDING_CAMPUS_VERIFICATION'`. This restricts them from accessing campus data until reviewed.
- **Idempotency:** **HIGH.** Uses `ADD COLUMN IF NOT EXISTS`, conditional updates, `CREATE INDEX IF NOT EXISTS`, and `CREATE OR REPLACE FUNCTION`.
- **Tenant Isolation & Privacy:** High positive impact — isolates students and staff by institutional domain.
- **Verification Query:**
  ```sql
  SELECT college_id, count(*) FROM public.profiles GROUP BY college_id;
  ```
- **Readiness Status:** **`READY`**

---

### Migration 013: `013_cross_college_rls_isolation.sql`

- **Purpose:** Enforces strict Row Level Security (RLS) partition boundaries across colleges (e.g. SRKR vs Vishnu Institute of Technology) for profiles, incidents, safe walks, escalations, evidence, and storage objects.
- **Dependencies:** Migration `012` (`profiles.college_id`, `public.get_user_college_id()`), `public.is_staff()`, `public.is_security_or_admin()`, `public.get_user_role()`.
- **Tables & Objects Affected:**
  - Table: `public.incidents` (adds `college_id TEXT`, index `idx_incidents_college_id`).
  - Function: `public.trg_fn_assign_incident_college_id()` (trigger function).
  - Trigger: `trg_assign_incident_college_id` on `public.incidents`.
  - RLS Policies Replaced:
    - `public.profiles`: `"Staff view same-college profiles"`
    - `public.incidents`: `"Staff view same-college incidents"`
    - `public.safe_walks`: `"Staff view same-college safe walks"`
    - `public.escalations`: `"Staff view same-college escalations"`
    - `public.evidence`: `"Staff view same-college evidence"`
    - `storage.objects`: `"Users and same-college staff read evidence"`
- **RLS Impact:** Replaces broad `is_staff()` access with strict same-college checks (`college_id = public.get_user_college_id()`). Only `SUPER_ADMIN` can view cross-college records.
- **Destructive Operation Risk:** **LOW.** Drops and replaces RLS policies. Backfills `incidents.college_id` from `profiles`.
- **Idempotency:** **HIGH.** All policies use `DROP POLICY IF EXISTS`.
- **Verification Query:**
  ```sql
  SELECT tablename, policyname FROM pg_policies
  WHERE policyname LIKE '%same-college%';
  ```
- **Readiness Status:** **`READY`**

---

### Migration 014: `014_cross_college_rls_hardening.sql`

- **Purpose:** Hardens and remediates tenant isolation policies introduced in `013`. Aligns `public.evidence` column representations (`case_id` and `file_path` alongside `incident_id` and `storage_path`) with automatic bidirectional sync trigger `sync_evidence_incident_reference()`. Implements `prevent_self_role_escalation()` trigger on `public.profiles` to stop students from modifying their role, active status, or tenant assignment. Purges known historical un-scoped policies from earlier baselines and replaces them with hardened tenant rules.
- **Dependencies:** Migrations `012`, `013`, `public.get_user_role()`, `public.get_user_college_id()`.
- **Tables & Objects Affected:**
  - Table: `public.evidence` (adds `case_id TEXT`, `file_path TEXT`, index `idx_evidence_case_id`).
  - Function: `public.sync_evidence_incident_reference()` (trigger function).
  - Function: `public.is_campus_staff()` (SECURITY DEFINER).
  - Function: `public.prevent_self_role_escalation()` (SECURITY DEFINER).
  - Triggers:
    - `trg_sync_evidence_incident_reference` on `public.evidence`.
    - `trg_assign_incident_college_id` on `public.incidents`.
  - Comprehensive RLS policy recreation on:
    - `profiles`, `student_profiles`, `staff_profiles`, `incidents`, `incident_locations`, `evidence`, `incident_messages`, `safe_walks`, `escalations`, `storage.objects`.
- **RLS Impact:** Maximum security hardening. Prevents `PENDING_CAMPUS_VERIFICATION` users from accessing tenant data. Disallows unauthorized self-updates to roles and college assignment.
- **Destructive Operation Risk:** **LOW.** Replaces policies and synchronizes column data.
- **Idempotency:** **HIGH.** Uses `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`, `CREATE OR REPLACE FUNCTION`.
- **Verification Query:**
  ```sql
  SELECT proname FROM pg_proc
  WHERE proname IN ('sync_evidence_incident_reference', 'is_campus_staff', 'prevent_self_role_escalation');
  ```
- **Readiness Status:** **`READY`**

---

### Migration 015: `015_college_scoped_student_id_uniqueness.sql`

- **Purpose:** Transitions student ID uniqueness from a global partial index to a college-scoped compound index `(college_id, student_id)`.
- **Dependencies:** Migration `012` (`profiles.college_id`).
- **Tables & Objects Affected:**
  - Table: `public.profiles`.
  - Indexes: Drops global `idx_profiles_student_id`, creates college-scoped `idx_profiles_college_student_id`.
- **RLS Impact:** None (index modification only).
- **Destructive Operation Risk:** **LOW.** Drops an existing index and creates a replacement compound index. No table or column data is dropped.
- **Idempotency:** **HIGH.** Uses `DROP INDEX IF EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS`.
- **Multi-Tenancy Impact:** Essential for statewide multi-college operations. Prevents duplicate roll number blocking when two different colleges (e.g. SRKR and JNTUK) issue identical registration numbers (e.g. `21B91A0501`).
- **Verification Query:**
  ```sql
  SELECT indexname, indexdef FROM pg_indexes
  WHERE tablename = 'profiles' AND indexname = 'idx_profiles_college_student_id';
  ```
- **Readiness Status:** **`READY`**

---

### Migration 016: `016_safe_box_private_notes.sql`

- **Purpose:** Provisions `public.safe_box_private_notes` to allow students to attach confidential personal notes to evidence items in their Safe Box.
- **Dependencies:** `public.evidence(id)`, `public.profiles(id)`.
- **Tables & Objects Affected:**
  - Table: `public.safe_box_private_notes` (new table: `evidence_id UUID PK`, `owner_id UUID`, `private_note TEXT`, `created_at TIMESTAMPTZ`).
  - RLS Policy: `"Students manage own Safe Box notes"` (FOR ALL TO authenticated).
- **RLS Impact:** Strict zero-trust privacy. Only the student who owns the note AND uploaded the underlying evidence can select, insert, update, or delete it (`owner_id = auth.uid()`). Invisible to staff and administrators.
- **Destructive Operation Risk:** **NONE.** Purely additive table creation.
- **Idempotency:** **HIGH.** Uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, and `CREATE POLICY`.
- **Student Privacy Impact:** High positive impact — guarantees confidential student reflection notes remain completely private.
- **Verification Query:**
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'safe_box_private_notes';
  ```
- **Readiness Status:** **`READY`**

---

### Migration 017: `017_student_college_claims.sql`

- **Purpose:** Adds `claimed_college_id TEXT` to `public.student_profiles` to record an applicant's chosen institution during signup without granting tenant access prior to staff verification. Adds `profile_photo_path TEXT` to `public.profiles`. Configures private `'kavach-profile-photos'` storage bucket with student-only read policy.
- **Dependencies:** `public.student_profiles`, `public.profiles`, `storage.buckets`, `storage.objects`.
- **Tables & Objects Affected:**
  - Table: `public.student_profiles` (adds `claimed_college_id TEXT`, index `idx_student_profiles_claimed_college_status`).
  - Table: `public.profiles` (adds `profile_photo_path TEXT`).
  - Storage: Bucket `'kavach-profile-photos'` (private, 2MB limit, image types only).
  - Storage Policy: `"Users read own profile photos"` on `storage.objects`.
- **RLS Impact:** Protects tenant boundary integrity by decoupling unverified student claims from authoritative `profiles.college_id`.
- **Destructive Operation Risk:** **NONE.** Additive column and index creation.
- **Idempotency:** **HIGH.** Uses `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT (id) DO UPDATE`, and `DROP POLICY IF EXISTS`.
- **Verification Query:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'student_profiles' AND column_name = 'claimed_college_id';
  ```
- **Readiness Status:** **`READY`**

---

### Migration 018: `018_legacy_rls_policy_remediation.sql`

- **Purpose:** Forward-only security remediation. Specifically resolves PostgreSQL's permissive policy `OR` combination behavior by permanently purging historical, un-scoped policies from earlier schema baselines across `incidents`, `incident_locations`, `evidence`, `student_profiles`, `incident_messages`, `staff_locations`, and `storage.objects`. Hardens `staff_locations` dispatch read policy to same-college responders.
- **Dependencies:** Migrations `011`, `012`, `013`, `014`.
- **Tables & Objects Affected:**
  - Table: `public.incidents` (drops 4 legacy broad policies).
  - Table: `public.incident_locations` (drops 5 legacy broad policies).
  - Table: `public.evidence` (drops 10 legacy broad policies).
  - Table: `public.student_profiles` (drops 4 legacy broad policies).
  - Table: `public.incident_messages` (drops 7 legacy broad policies).
  - Table: `public.staff_locations` (drops and recreates `staff_locations_dispatch_read` with same-college filter; preserves `staff_locations_self_manage`).
  - Table: `storage.objects` (drops 7 legacy broad policies on evidence and id cards).
  - Table: `public.audit_logs` (inserts migration record).
- **RLS Impact:** Critical security remediation. Closes any lingering vulnerability where an old policy (e.g. `"Staff view incidents"`) might allow a staff member of College A to view incidents from College B.
- **Destructive Operation Risk:** **LOW.** Only drops obsolete permissive policies (`DROP POLICY IF EXISTS`). Table structures and data are untouched.
- **Idempotency:** **HIGH.** Wrapped in a transaction `BEGIN; ... COMMIT;`. All statements use `DROP POLICY IF EXISTS`.
- **Verification Query:**
  ```sql
  SELECT tablename, policyname FROM pg_policies
  WHERE tablename IN ('incidents', 'evidence', 'student_profiles')
    AND policyname IN (
      'Authorized users view incidents',
      'Staff can view assigned or unassigned incidents',
      'Authorized users view incident evidence',
      'Staff read student profiles'
    ); -- Must return 0 rows
  ```
- **Readiness Status:** **`READY`**

---

### Migration 019: `019_ap_statewide_colleges_registry.sql`

- **Purpose:** Establishes the statewide institutional catalog for Andhra Pradesh. Creates tables `college_districts`, `colleges`, and `college_onboarding_requests`. Seeds all 26 official gazetted districts (reorganized April 4, 2022) and 54 verified institutions across Engineering, Polytechnic, and Degree categories.
- **Dependencies:** `public.profiles` (for Super Admin check in RLS policies).
- **Tables & Objects Affected:**
  - Table: `public.college_districts` (new table, 26 seeded districts).
  - Table: `public.colleges` (new table, 54 seeded colleges with coordinates, AISHE codes, helplines, geofences).
  - Table: `public.college_onboarding_requests` (new table for applicant colleges).
  - RLS Policies:
    - Public read on active colleges and districts.
    - Super Admin full management.
    - Public insert for onboarding requests.
- **RLS Impact:** Enables public access to the directory for registration dropdowns and emergency numbers, while restricting write access to `SUPER_ADMIN`.
- **Destructive Operation Risk:** **LOW.** Uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT (id) DO UPDATE SET ...`. No existing data is deleted.
- **Idempotency:** **HIGH.** Wrapped in `BEGIN; ... COMMIT;`. All seed inserts use `ON CONFLICT (id) DO UPDATE`.
- **Statewide Expansion Impact:** Foundational requirement for the multi-campus rollout.
- **Verification Query:**
  ```sql
  SELECT count(*) AS total_colleges FROM public.colleges; -- Should be >= 54
  SELECT count(*) AS total_districts FROM public.college_districts; -- Should be 26
  ```
- **Readiness Status:** **`READY`**

---

## 3. Dependency & Recommended Execution Order Matrix

| Execution Step | Migration Script | Dependencies | Reason / Ordering Note |
| :---: | :--- | :--- | :--- |
| **Step 1** | `010_service_role_and_audit_alignment.sql` | Baseline profiles & audit_logs | **Run first.** Defensively ensures `audit_logs` columns (`entity_type`) exist before `009` logs to it. |
| **Step 2** | `009_student_id_verification_resubmission.sql` | `student_profiles`, `audit_logs` | Adds `RESUBMISSION_REQUIRED`, configures ID card storage bucket. |
| **Step 3** | `011_staff_live_locations_and_consent.sql` | `profiles` | Creates `staff_locations` table and consent fields. |
| **Step 4** | `012_profiles_college_tenant.sql` | `profiles`, `storage.buckets` | Adds `college_id` to profiles, creates `get_user_college_id()`. |
| **Step 5** | `013_cross_college_rls_isolation.sql` | Migration 012 | Adds `college_id` to `incidents`, initial tenant RLS scoping. |
| **Step 6** | `014_cross_college_rls_hardening.sql` | Migrations 012, 013 | Synchronizes evidence columns, prevents student role escalation. |
| **Step 7** | `015_college_scoped_student_id_uniqueness.sql` | Migration 012 | Replaces global student ID index with `(college_id, student_id)`. |
| **Step 8** | `016_safe_box_private_notes.sql` | `evidence`, `profiles` | Creates zero-knowledge student private notes table. |
| **Step 9** | `017_student_college_claims.sql` | `student_profiles`, `profiles` | Adds `claimed_college_id` for safe onboarding; creates photo bucket. |
| **Step 10** | `018_legacy_rls_policy_remediation.sql` | Migrations 011–014 | **Purges all legacy permissive policies** to prevent PostgreSQL OR bypass. |
| **Step 11** | `019_ap_statewide_colleges_registry.sql` | `profiles` | Creates and seeds AP 26 districts and 54 statewide colleges. |

> [!NOTE]
> Swapping the execution order of `010` ahead of `009` is strongly recommended to guarantee that `public.audit_logs.entity_type` exists when `009`'s final audit INSERT runs.

---

## 4. Multi-Tenant Isolation & Student Privacy Evaluation

### Cross-College Tenant Boundaries
- **Incident Scoping:** Incidents are stamped with `college_id` derived automatically from the reporting student's profile via `trg_assign_incident_college_id`. Staff can only read incidents where `college_id = public.get_user_college_id()`.
- **Safe Walk & Telemetry:** Safe walks and staff locations are restricted to responders belonging to the same campus tenant.
- **Evidence Storage:** Storage objects in `'kavach-evidence'` are restricted to the incident's student author and same-college staff.
- **Roll Number Scope:** Migration `015` scopes `student_id` uniqueness to `(college_id, student_id)`, allowing different colleges to have identical student registration numbers without collision.

### Student Safety & Privacy
- **Safe Box Notes (`016`):** Private notes are locked to the student creator (`owner_id = auth.uid()`). Even campus staff and administrators cannot view them.
- **Role Escalation Block (`014`):** A student cannot alter their own `role`, `is_approved`, `is_active`, or `college_id` through the API.
- **Self-Approval Block (`009`, `010`):** Students cannot approve their own student ID verification status to `VERIFIED`.

---

## 5. Classification & Production Readiness Summary

| Migration File | Classification | Risk Level | Primary Action Required |
| :--- | :---: | :---: | :--- |
| `009_student_id_verification_resubmission.sql` | **READY** | Low | Run after 010. |
| `010_service_role_and_audit_alignment.sql` | **READY** | None | Run as Step 1. |
| `011_staff_live_locations_and_consent.sql` | **NEEDS REVIEW** | Low | Verify no prior policy exists or add `DROP POLICY IF EXISTS`. |
| `012_profiles_college_tenant.sql` | **READY** | Low | Run to create `college_id` and tenant functions. |
| `013_cross_college_rls_isolation.sql` | **READY** | Low | Run to partition incidents and evidence. |
| `014_cross_college_rls_hardening.sql` | **READY** | Low | Run to synchronize evidence columns and block role escalation. |
| `015_college_scoped_student_id_uniqueness.sql` | **READY** | Low | Run to update roll number uniqueness constraint. |
| `016_safe_box_private_notes.sql` | **READY** | None | Run to create private notes table. |
| `017_student_college_claims.sql` | **READY** | None | Run to add claimed college field and profile photo bucket. |
| `018_legacy_rls_policy_remediation.sql` | **READY** | Low | Run to purge all permissive baseline policies. |
| `019_ap_statewide_colleges_registry.sql` | **READY** | Low | Run to seed 26 districts and 54 AP colleges. |

---

## 6. Overall Production Migration Readiness Decision

### **FINAL VERDICT: READY FOR CONTROLLED STAGED EXECUTION**

**Zero destructive data operations** were identified. All migrations are forward-only schema enhancements, multi-tenant partitioning enforcements, and security policy hardenings.

### **Mandatory Pre-Execution Protocol for Project Administrator:**
1. **Supabase Backup:** Log into the Supabase Dashboard for `dvyiclyyvmsfipzrdowu` -> **Settings** -> **Database** -> **Backups** -> Create a manual snapshot.
2. **Execute in Recommended Sequence (Step 1 to Step 11):** Run the migration scripts in the sequence outlined in Section 3 using the Supabase Dashboard SQL Editor.
3. **Run Post-Migration Verification Queries:** Confirm that tables, constraints, triggers, and the 54 colleges are active.
4. **Git Push & Deployment:** Once the remote database is confirmed aligned, proceed with `git push origin main`.
