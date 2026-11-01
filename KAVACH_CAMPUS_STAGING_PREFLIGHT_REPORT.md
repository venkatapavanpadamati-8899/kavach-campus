# KAVACH CAMPUS — STAGING DATABASE PREFLIGHT & MIGRATION SAFETY REPORT

**Date:** October 31, 2026  
**Auditor:** Senior Database Architect & Application Security Engineer  
**Workspace:** `D:\Kavach Campus`  
**Target Staging Supabase Reference:** `polbnvszmvblwenfnqll`  
**Target URL:** `https://polbnvszmvblwenfnqll.supabase.co`  
**Migration Bundle:** `supabase/staged_migrations_013_014_combined.sql`  
**Status:** **PREFLIGHT AUDIT COMPLETE — HOLD FOR OPERATOR BACKUP & EXECUTION** 🛡️  

---

## 1. Files Reviewed

1. **`supabase/verification/kavach_step121_readonly_preflight.sql`** (200 lines):
   - 100% read-only catalog queries across `information_schema.columns`, `pg_class`, `pg_policies`, `pg_trigger`, `pg_proc`, `pg_roles`, `storage.buckets`, and `role_table_grants`.
2. **`supabase/staged_migrations_013_014_combined.sql`** (813 lines):
   - Reconciled transactional migration bundle for tenancy isolation, evidence synchronization, anti-spoofing triggers, and hardened RLS policies.
3. **`supabase/verification/kavach_cross_college_policy_preflight.sql`** (84 lines):
   - Read-only inspection of RLS enablement, policy expressions, unconditional grants, and aggregate profile/incident counts.
4. **`scripts/test_live_cross_college_isolation.ts`** (320 lines):
   - Automated synthetic multi-tenant security verification test (SRKR vs. Vishnu colleges) with safety gating (`KAVACH_ALLOW_LIVE_RLS_TESTS=true` required).

---

## 2. Staging Project Identity Verification & Read-Only Live Probe

- **Target Staging Host:** `polbnvszmvblwenfnqll.supabase.co`
- **Project Reference:** `polbnvszmvblwenfnqll` (Verified via `.env.local`).
- **Live Read-Only Schema Probe Execution (Executed via safe `HEAD`/`SELECT` counts):**
  - `public.profiles`: **REACHABLE** (Row count: 11)
  - `public.incidents`: **REACHABLE** (Row count: 40)
  - `public.student_profiles`: **REACHABLE** (Row count: 4)
  - `public.staff_profiles`: **REACHABLE** (Row count: 0)
  - `public.incident_locations`: **REACHABLE** (Row count: 10)
  - `public.evidence`: **REACHABLE** (Row count: 0)
  - `public.incident_messages`: **REACHABLE** (Row count: 0)
  - `public.safe_walks`: **REACHABLE** (Row count: 0)
  - `public.escalations`: **REACHABLE** (Row count: 29)
  - `public.notifications`: **REACHABLE**
  - `public.audit_logs`: **REACHABLE**
  - `public.user_otp_verifications`: **REACHABLE**
  - **Storage Buckets:**
    - `kavach-id-cards`: Private (`public = false`)
    - `kavach-evidence`: Private (`public = false`)
- **Anonymous Access Probe:**
  - Anonymous query against `public.profiles`: **DENIED** (0 rows returned — RLS active).

---

## 3. Preflight Safety Assessment (Read-Only Verification)

A statement-by-statement syntactic audit was performed on `supabase/verification/kavach_step121_readonly_preflight.sql` and `supabase/verification/kavach_cross_college_policy_preflight.sql`:

| Script | Queries | Systems Inspected | Mutation Risk |
| :--- | :---: | :--- | :---: |
| **`kavach_step121_readonly_preflight.sql`** | 10 | `information_schema.columns`, `pg_class`, `pg_policies`, `pg_trigger`, `pg_proc`, `storage.buckets`, `role_table_grants` | **ZERO (100% Read-Only)** |
| **`kavach_cross_college_policy_preflight.sql`** | 5 | `pg_class`, `pg_policies`, aggregate `COUNT(*)` of profiles and incidents | **ZERO (100% Read-Only)** |

**Safety Guarantee:** Neither preflight script contains `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `GRANT`, `REVOKE`, or `TRUNCATE`. Both can be safely executed in the Supabase Dashboard SQL Editor at any time without side effects.

---

## 4. Migration Risks & Corrections Applied

### Risk 1: Missing Columns on `public.evidence` in Staging (CRITICAL DEFECT RESOLVED)
- **Finding:** Live read-only inspection of the staging schema revealed that `public.evidence` currently has columns: `id`, `case_id`, `file_path`, `file_name`, `file_size`, `mime_type`, `uploaded_by`, `created_at`.
- **Defect in Original Migration:** The original migration attempted:
  ```sql
  UPDATE public.evidence e SET case_id = i.case_id FROM public.incidents i WHERE e.incident_id = i.id;
  UPDATE public.evidence SET file_path = storage_path WHERE file_path IS NULL;
  ```
  Because `incident_id` and `storage_path` were not in the table, executing this SQL on staging would have thrown:
  `ERROR: column e.incident_id does not exist` and aborted the entire transaction!
- **Correction Applied in `supabase/staged_migrations_013_014_combined.sql`:**
  Added `incident_id UUID` and `storage_path TEXT` via `ADD COLUMN IF NOT EXISTS`, and guarded the update statements:
  ```sql
  ALTER TABLE public.evidence
    ADD COLUMN IF NOT EXISTS case_id TEXT,
    ADD COLUMN IF NOT EXISTS file_path TEXT,
    ADD COLUMN IF NOT EXISTS incident_id UUID,
    ADD COLUMN IF NOT EXISTS storage_path TEXT;

  UPDATE public.evidence e
  SET case_id = i.case_id
  FROM public.incidents i
  WHERE e.incident_id = i.id
    AND e.case_id IS NULL;

  UPDATE public.evidence
  SET file_path = storage_path
  WHERE file_path IS NULL
    AND storage_path IS NOT NULL;

  UPDATE public.evidence
  SET storage_path = file_path
  WHERE storage_path IS NULL
    AND file_path IS NOT NULL;
  ```

### Risk 2: Test Script Schema Mismatch in `scripts/test_live_cross_college_isolation.ts` (RESOLVED)
- **Finding:** Staging `incidents` table uses `description`, `category`, `severity`, `urgency`, `status`, and does not have `title` or `priority`.
- **Correction Applied:** Updated `scripts/test_live_cross_college_isolation.ts` to insert incidents using valid column names (`description`, `severity`, `urgency`) so that when live isolation tests are executed post-migration, they succeed without column-not-found errors.

### Risk 3: Legacy Permissive Policies Permitting Cross-Tenant Leaks
- **Finding:** PostgreSQL RLS combines multiple permissive policies with `OR` logic. If obsolete broad policies (such as `"Staff can view all incident locations"`) remain, the new restrictive policies would be bypassed.
- **Resolution:** Section 4 of the migration explicitly executes `DROP POLICY IF EXISTS` on 28 legacy policies before installing the 18 strict tenant-scoped policies.

### Risk 4: `SECURITY DEFINER` Search-Path Hijacking
- **Verification:** All 7 `SECURITY DEFINER` functions in the migration explicitly set `SET search_path = public`:
  1. `public.sync_evidence_incident_reference()`
  2. `public.get_user_role()`
  3. `public.is_admin()`
  4. `public.get_user_college_id()`
  5. `public.is_campus_staff()`
  6. `public.prevent_self_role_escalation()`
  7. `public.trg_fn_assign_incident_college_id()`
- **Public Execution Revocation:** All internal helper functions have `REVOKE EXECUTE ... FROM PUBLIC` and grant execution strictly to `authenticated` and `service_role`.

### Risk 5: Transaction Atomicity & Table Locking
- **Safety:** The entire migration runs inside a single `BEGIN ... COMMIT` block.
- **Locking Impact:** `ADD COLUMN IF NOT EXISTS` is metadata-only without default rewrites. Estimated lock duration on staging is `< 15ms`.

---

## 5. RLS Policy Coverage Matrix

| Table / Storage Bucket | RLS Status | Tenant Isolation Filter | Policy Enforcement |
| :--- | :---: | :--- | :--- |
| `public.profiles` | **ENABLED** | `college_id = public.get_user_college_id()` | Users read own record; staff view same-college; anti-escalation trigger blocks self-role elevation. |
| `public.student_profiles` | **ENABLED** | `p.college_id = public.get_user_college_id()` | Students read own profile; staff view same-college student profiles only. |
| `public.staff_profiles` | **ENABLED** | `p.college_id = public.get_user_college_id()` | Staff read own profile; campus admins view same-college staff profiles only. |
| `public.incidents` | **ENABLED** | `college_id = public.get_user_college_id()` | Students view/insert own incidents; staff view/update same-college incidents only. Anti-spoofing trigger auto-assigns campus. |
| `public.incident_locations` | **ENABLED** | Scoped via incident student profile | Students view/insert own locations; staff view same-college incident locations only. |
| `public.evidence` | **ENABLED** | Scoped via incident `case_id` / `incident_id` | Incident owner and same-college staff view/insert authorized evidence only. |
| `public.incident_messages` | **ENABLED** | Internal flag + college scoping | Students view non-internal messages; same-college staff view all incident messages. |
| `public.safe_walks` | **ENABLED** | Scoped via student profile `college_id` | Students manage own walks; same-college staff monitor active walks. |
| `public.escalations` | **ENABLED** | Scoped via incident `college_id` | Same-college staff view/update escalations; authorized users create escalations. |
| `storage.objects` (`kavach-evidence`) | **ENABLED** | Folder prefix matches `auth.uid()` or `case_id` | Downloads/uploads restricted to incident owner and same-college staff. |
| `storage.objects` (`kavach-id-cards`) | **ENABLED** | Folder prefix matches `auth.uid()` | Students upload/read own ID cards; same-college staff review ID cards. |

---

## 6. Backup Confirmation Status

> [!IMPORTANT]
> **Status: AWAITING OPERATOR CONFIRMATION**  
> In accordance with safety rules, no remote database modification has been or will be executed by Antigravity. The operator must confirm an active database backup snapshot exists in the Supabase Dashboard before running the migration.

### Operator Instructions for Backup:
1. Open the [Supabase Staging Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll).
2. Navigate to **Database ➔ Backups**.
3. Confirm that a recent backup exists, or click **"Create Backup"** to trigger a manual snapshot.

---

## 7. Exact Next Steps

1. **Step 1 (Operator):** Confirm the backup in the Supabase Dashboard.
2. **Step 2 (Operator):** Open the Supabase **SQL Editor** at `https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new`.
3. **Step 3 (Operator):** Copy and run `supabase/verification/kavach_step121_readonly_preflight.sql` to inspect current catalog state.
4. **Step 4 (Operator):** Copy and run `supabase/staged_migrations_013_014_combined.sql` (hardened bundle) to apply tenant isolation.
5. **Step 5 (Operator):** Copy and run `supabase/verification/kavach_cross_college_policy_preflight.sql` to verify active policies.
6. **Step 6 (Antigravity):** Once the operator confirms completion, Antigravity will run `scripts/test_live_cross_college_isolation.ts` to verify all 7 multi-tenant security assertions against staging.
