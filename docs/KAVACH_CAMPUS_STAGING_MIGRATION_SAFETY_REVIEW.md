# KAVACH CAMPUS — SUPABASE STAGING MIGRATION SAFETY REVIEW

**Date:** 2026-10-21  
**Target Database:** PostgreSQL 15 on Supabase Staging (`polbnvszmvblwenfnqll`)  
**Scope:** Strict Static Security & Policy Audit of:
1. `supabase/migrations/013_cross_college_rls_isolation.sql`
2. `supabase/migrations/014_cross_college_rls_hardening.sql`
3. `supabase/staged_migrations_013_014_combined.sql`
4. Safety inspection of `scripts/test_live_cross_college_isolation.ts`

---

## 1. Executive Summary

| Category | Finding / Verdict | Risk Level | Details |
| :--- | :---: | :---: | :--- |
| **Monolithic Combined Script** | Reconciled & Hardened | **APPROVED FOR STAGING** | Fixes 2 critical omissions present in raw migration 014 (`trg_prevent_self_role_escalation` attachment & incident `UPDATE` policy). |
| **Transaction Integrity** | Fully Atomic | **LOW** | Wrapped in explicit `BEGIN ... COMMIT` block. Rolls back automatically on any DDL/DML error. |
| **Role Escalation Defense** | Trigger + Function Verified | **PASS** | Prevents authenticated users from altering `role`, `is_approved`, `is_active`, `college_id`, or `college_email`. |
| **College ID Anti-Spoofing** | Verified Trigger | **PASS** | `trg_assign_incident_college_id` overrides any client-supplied `college_id` using the reporter's profile in `profiles`. |
| **Incident Access Policies** | Strict Tenant Scoping | **PASS** | Students view only their own incidents. Staff view only incidents from their college tenant. Cross-college access is blocked. |
| **Safe Walk & Live Location** | Least Privilege Enforced | **PASS** | Restricted to active walker, Security staff, and Admins. Unrelated staff (mentors, counsellors) cannot access live GPS telemetry. |
| **Storage Object Access** | Path-Isolated | **PASS** | Bucket `kavach-evidence` is scoped by `case_id` / `auth.uid()`, strictly isolated by tenant college ID. |

---

## 2. In-Depth Comparative Analysis (013 vs. 014 vs. Combined Script)

### 2.1 Critical Omissions Identified in Standalone Migration 014
1. **Critical Defect `[C-01]` (Missing Escalation Trigger in 014):**
   - In `014_cross_college_rls_hardening.sql` (lines 119–147), the security function `public.prevent_self_role_escalation()` is created, but the author **omitted** the `CREATE TRIGGER` statement. Without the trigger, the function never executes during `UPDATE profiles`, allowing privilege escalation.
   - **Resolution in Combined Script:** Lines 171–175 of `supabase/staged_migrations_013_014_combined.sql` correctly attach `trg_prevent_self_role_escalation` on `public.profiles` for `BEFORE UPDATE OF role, is_approved, is_active, student_id, college_email, college_id`.
2. **High Defect `[H-01]` (Missing Incident UPDATE Policy in 014):**
   - Migration 014 dropped existing incident policies and created `SELECT` and `INSERT` policies, but omitted an `UPDATE` policy for staff case management. If migration 014 were executed alone, staff attempting triage would receive PostgreSQL error `42501 permission denied for table incidents`.
   - **Resolution in Combined Script:** Lines 419–438 of `staged_migrations_013_014_combined.sql` implement `"Staff update same-college incidents"` with matching `USING` and `WITH CHECK` clauses.
3. **High Defect `[H-02]` (Storage Upload Path Discrepancy in 014):**
   - Migration 014 required that the incident already exist before uploading evidence to `storage.objects`. However, in the reporting UI, files are often attached prior to incident insert.
   - **Resolution in Combined Script:** Lines 644–670 support both `(storage.foldername(name))[1] = auth.uid()::text` and case ID scoping.

---

## 3. Table-by-Table Policy Audit

### 3.1 `public.profiles`
- **RLS Enabled:** Yes.
- **Policies Dropped:** 3 legacy permissive policies (`"Public profiles are viewable by everyone"`, `"Staff can read all profiles"`, `"Users can read own profile"`).
- **Hardened Policies:**
  - `"Users read own profile"`: `auth.uid() = id`.
  - `"Staff view same-college profiles"`: `is_campus_staff()` AND (`get_user_role() = 'SUPER_ADMIN'` OR `college_id = get_user_college_id()`).
  - `"Users update own profile"`: Restricted by trigger `trg_prevent_self_role_escalation`.

### 3.2 `public.incidents`
- **RLS Enabled:** Yes.
- **Tenancy Column:** `college_id TEXT` indexed via `idx_incidents_college_id`.
- **Anti-Spoofing Trigger:** `trg_assign_incident_college_id` executes `BEFORE INSERT OR UPDATE`. Even if a malicious request injects `college_id: 'vishnu-bhimavaram'`, the trigger overwrites it with the authenticated student's profile `college_id`.
- **Hardened Policies:**
  - `"Students view own incidents"`: `auth.uid() = student_id`.
  - `"Students insert own incidents"`: `auth.uid() = student_id` AND `college_id = get_user_college_id()`.
  - `"Staff view same-college incidents"`: `is_campus_staff()` AND (`college_id = get_user_college_id()` AND `college_id <> 'PENDING_CAMPUS_VERIFICATION'`).
  - `"Staff update same-college incidents"`: Enforces matching college tenancy for case triage and status updates.

### 3.3 `public.safe_walks` & `public.incident_locations`
- **Least Privilege Review:**
  - Live GPS breadcrumbs in `public.safe_walks` are restricted to:
    1. The student performing the safe walk (`auth.uid() = student_id`).
    2. Dedicated campus security (`is_security_or_admin()`) belonging to the **same college**.
  - **Crucial Privacy Guarantee:** Academic counsellors, general faculty, and mentors have `is_campus_staff() = true` but `is_security_or_admin() = false`. They **CANNOT** view real-time Safe Walk GPS locations.

### 3.4 `storage.objects` (`kavach-evidence` Bucket)
- **Bucket RLS Enabled:** Yes.
- **Read Access (`SELECT`):**
  - Owner student can read their own uploads (`(storage.foldername(name))[1] = auth.uid()::text`).
  - Same-college staff can read evidence only when linked to an incident belonging to their college tenant.
- **Write Access (`INSERT`):**
  - Authenticated students can upload only into folders named with their `auth.uid()` or an active incident case ID.

---

## 4. Safety Audit of `scripts/test_live_cross_college_isolation.ts`

The test script was inspected against all 10 safety requirements:

| # | Requirement | Implementation Evidence | Verdict |
| :-: | :--- | :--- | :---: |
| **1** | Explicitly requires `KAVACH_ALLOW_LIVE_RLS_TESTS=true` | Line 28: `const allowLiveRun = process.env.KAVACH_ALLOW_LIVE_RLS_TESTS === 'true';` Checked at Line 46. | **PASS** |
| **2** | Confirms intended staging project reference | Lines 27 & 46: Compares `getProjectRef(supabaseUrl)` against `process.env.KAVACH_STAGING_PROJECT_REF`. | **PASS** |
| **3** | Refuses to run against production | Fails safely if project ref does not match staging ref (`polbnvszmvblwenfnqll`). | **PASS** |
| **4** | Creates only synthetic test users and fixtures | Lines 71–74: Generates timestamped emails (`srkr.student.${timestamp}@srkr.edu.in`, `vishnu.student...`). | **PASS** |
| **5** | Cross-college assertions use authenticated user JWTs | Lines 165–188: Authenticates independent clients (`vishnuStudentClient`, `vishnuStaffClient`, `srkrStaffClient`) via `signInWithPassword`. | **PASS** |
| **6** | Service-role credentials not used for normal access | Admin client is used exclusively for test fixture seeding and teardown; all assertions execute via user JWTs. | **PASS** |
| **7** | Cleanup deletes only records created by the test | Lines 299–313: Tracks `createdUserIds`, `createdIncidentId`, and `createdEvidencePath` and purges only these IDs. | **PASS** |
| **8** | Storage tests use actual configured evidence bucket | Lines 269, 278, 287: Explicitly queries `kavach-evidence` bucket. | **PASS** |
| **9** | Every failure produces a nonzero exit code | Line 315: `if (executionError || testsFailed > 0) process.exitCode = 1;` | **PASS** |
| **10** | Missing environment variables fail safely | Lines 39–59: Exits with code 2 if variables are missing or contain placeholder values. | **PASS** |

---

## 5. Pre-Migration Verification Queries (Run in Supabase SQL Editor Before Applying)

To verify the existing staging state before running the combined script:

```sql
-- 1. Verify existence of tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'incidents', 'evidence', 'safe_walks', 'escalations');

-- 2. Check if incidents.college_id already exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'incidents' 
  AND column_name = 'college_id';

-- 3. Check current policy count on incidents
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'incidents';
```

---

## 6. Post-Migration Verification Queries (Run After Combined Script Finishes)

```sql
-- 1. Confirm column and index exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'incidents' 
  AND column_name = 'college_id';

-- 2. Confirm both critical triggers are attached and active
SELECT tgname, relname, proname 
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('trg_assign_incident_college_id', 'trg_prevent_self_role_escalation');

-- 3. Confirm legacy permissive policies are gone and hardened policies exist
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'incidents';
```

---

## 7. Rollback & Recovery Considerations

1. **Transactional Rollback:** The combined migration is encapsulated within `BEGIN; ... COMMIT;`. Any syntax, type, or constraint error automatically aborts the transaction, leaving the staging database unchanged.
2. **Pre-Migration Snapshot:** Before executing, navigate to **Project Settings ➔ Database ➔ Backups** in the Supabase Dashboard and verify that a point-in-time recovery point exists.
3. **Emergency Rollback Script:** `supabase/verification/kavach_step115_rollback_candidate.sql` is present in the repository to restore prior baseline policies if required.
