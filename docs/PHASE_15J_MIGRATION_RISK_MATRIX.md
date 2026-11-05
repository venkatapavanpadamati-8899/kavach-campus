# KAVACH CAMPUS — PHASE 15J MIGRATION RISK MATRIX

**Target Database:** Production Supabase (`dvyiclyyvmsfipzrdowu`)  
**Scope:** Migrations 009 through 017 & Production Environment  
**Audit Executed:** 2026-11-05  
**Review Status:** **`READY FOR OWNER REVIEW`**  

---

## 1. Master Risk Matrix

| Finding ID | Finding Description | Evidence Reference | Risk Level | Production Impact | Recommended Action | Owner Authorization Required? |
| :---: | :--- | :--- | :---: | :--- | :--- | :---: |
| **RISK-01** | **Unpurged Legacy Incident Policy (`"Authorized users view incidents"`):** Migrations 013/014 drop `"Staff view incidents"` but omit `"Authorized users view incidents"`. Because PostgreSQL joins permissive policies with boolean `OR`, any staff user satisfying `public.is_reviewer() = true` can read all incidents across all college tenants. | `013_cross_college_rls_isolation.sql:68`<br/>`014_cross_college_rls_hardening.sql:205`<br/>`kavach_step115_security_hardening_candidate.sql:384` | **CRITICAL** | Total breach of cross-institution incident isolation; SRKR responders can view Vishnu incidents and vice versa. | Add explicit `DROP POLICY IF EXISTS "Authorized users view incidents" ON public.incidents;` before or during migration 014. | **YES** |
| **RISK-02** | **Unpurged Legacy Location Policies (`"Authorized users view incident locations"`):** Migration 014 drops historical location policies but omits `"Authorized users view incident locations"` and `"Authorized users insert incident locations"`. | `014_cross_college_rls_hardening.sql:212-220`<br/>`kavach_step115_security_hardening_candidate.sql:402-423` | **CRITICAL** | Potential cross-college exposure of student real-time emergency GPS coordinates to unauthorized responders. | Add `DROP POLICY IF EXISTS "Authorized users view incident locations"` and `"Authorized users insert incident locations"` on `public.incident_locations`. | **YES** |
| **RISK-03** | **Unpurged Legacy Evidence Policies:** Legacy policies `"Authorized users view incident evidence"` and `"Authorized users read incident evidence files"` not explicitly dropped by migrations 013 or 014. | `014_cross_college_rls_hardening.sql:221-230`<br/>`kavach_step115_security_hardening_candidate.sql:233, 479` | **HIGH** | Potential cross-college evidence metadata or file access for staff members who satisfy legacy reviewer check. | Explicitly drop all `"Authorized users ..."` policies on `public.evidence` and `storage.objects`. | **YES** |
| **RISK-04** | **Audit Log Column Prerequisite Gap:** Migration 009 inserts into `audit_logs` referencing column `entity_type`, which is created in Migration 010. | `009_student_id_verification_resubmission.sql:80`<br/>`010_service_role_and_audit_alignment.sql:8` | **HIGH** | If production `audit_logs` lacks `entity_type`, migration 009 aborts with error `42703` (`column does not exist`). | Run pre-check on production `audit_logs` or apply migration 010 column DDL before running 009 audit insertion. | **YES** |
| **RISK-05** | **Migration 011 Idempotency Flaw:** `CREATE POLICY staff_locations_self_manage` and `staff_locations_dispatch_read` do not include `DROP POLICY IF EXISTS`. | `011_staff_live_locations_and_consent.sql:38, 45` | **MEDIUM** | If migration 011 is partially executed or re-run, execution fails with error `42710` (`policy already exists`). | Precede `CREATE POLICY` with `DROP POLICY IF EXISTS` in execution plan. | **YES** |
| **RISK-06** | **Profile College Domain Backfill Blind Spot:** Migration 012 sets all profiles whose email does not match SRKR or Vishnu domains to `'PENDING_CAMPUS_VERIFICATION'`. | `012_profiles_college_tenant.sql:18-33` | **MEDIUM** | Responders with non-institutional email domains (e.g. Gmail) will temporarily lose incident access until manually reassigned. | Audit all production `profiles.college_email` prior to migration to identify accounts requiring manual mapping. | **YES** |
| **RISK-07** | **Migration 015 Unique Index Collision Risk:** `CREATE UNIQUE INDEX idx_profiles_college_student_id ON profiles(college_id, student_id)` requires zero intra-college duplicate student IDs. | `015_college_scoped_student_id_uniqueness.sql:26-28` | **MEDIUM** | If production data contains duplicate student IDs within the same college, migration 015 aborts with error `23505`. | Execute pre-check query `SELECT college_id, student_id, count(*) FROM profiles GROUP BY college_id, student_id HAVING count(*) > 1;` on production. | **YES** |
| **RISK-08** | **Storage Bucket Ownership in Supabase:** DDL operations on `storage.objects` and `storage.buckets` require appropriate role permissions (`supabase_admin` or `supabase_storage_admin`). | `009:52`, `012:59`, `014:20`, `017:13` | **MEDIUM** | Standard `postgres` user in some Supabase configurations may encounter permission error `42501` on direct storage manipulation. | Execute migrations in the Supabase Cloud Dashboard SQL Editor (which operates with superuser elevation). | **YES** |
| **RISK-09** | **Profile Photo Client Upload Policy Omission:** Migration 017 creates a `FOR SELECT` policy on `storage.objects` for `kavach-profile-photos`, but no `FOR INSERT` policy for authenticated students. | `017_student_college_claims.sql:26-32` | **LOW** | Client-side direct uploads will fail; uploads must route through server-side `adminSupabase` API route. | Document that profile photo uploads are strictly server-brokered, or add an INSERT policy if client upload is needed. | **NO** (System currently uses server-side upload) |
| **RISK-10** | **Unconfirmed Production Backup:** Production database snapshot has not been independently verified as restorable by the repository owner. | Production Supabase Dashboard | **CRITICAL** | In the event of a migration failure, unrecoverable data loss could occur across 40 incidents and 481 audit logs. | Owner must visually inspect the Supabase Dashboard Backups tab and verify PITR availability before applying DDL. | **YES** |

---

## 2. Risk Categorization Summary

```
+-------------------+-------+--------------------------------------------------------+
| Severity Level    | Count | Summary / Action Required                              |
+-------------------+-------+--------------------------------------------------------+
| CRITICAL          |   3   | Immediate release blocker (RLS OR leak, Unverified DB) |
| HIGH              |   3   | Significant operational risk (Prerequisite DDL gaps)   |
| MEDIUM            |   3   | Manageable risk with pre-migration verification queries |
| LOW               |   1   | Architectural constraint handled by application layer  |
+-------------------+-------+--------------------------------------------------------+
| Total Risks       |  10   | 9 require explicit owner review and authorization       |
+-------------------+-------+--------------------------------------------------------+
```

---

## 3. High-Priority Mitigation Strategy

1. **Resolution of CRITICAL Risks (RISK-01, RISK-02, RISK-10):**
   - **Step 1:** Owner logs into Supabase Dashboard and confirms restorable backup point.
   - **Step 2:** Formulate a pre-execution DDL block that explicitly drops all legacy `"Authorized users ..."` policies.
   - **Step 3:** Perform a dry-run policy introspection on production before applying changes.
2. **Resolution of HIGH Risks (RISK-03, RISK-04):**
   - Ensure migration 010 schema additions (columns on `audit_logs`) are present before migration 009 audit log inserts execute.
   - Purge all historical reviewer-level evidence access policies.
