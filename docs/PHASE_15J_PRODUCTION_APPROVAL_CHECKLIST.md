# KAVACH CAMPUS — PHASE 15J PRODUCTION APPROVAL CHECKLIST

**Target Repository:** `https://github.com/venkatapavanpadamati-8899/kavach-campus`  
**Production Supabase Project:** `dvyiclyyvmsfipzrdowu`  
**Review Status:** **`READY FOR OWNER REVIEW`**  
**Execution Clearance:** **`GATED — ALL GATES REQUIRE INDEPENDENT OWNER SIGN-OFF`**  

---

## Gate 1: Cloud Backup & Data Preservation Gate

> [!CAUTION]
> Do NOT execute any SQL statements against the production database until Gate 1 is 100% completed and confirmed.

- [ ] **1.1 Point-in-Time Recovery (PITR) / Snapshot Verification:**
  - [ ] Log into the Supabase Dashboard: `https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/settings/database`
  - [ ] Navigate to **Database -> Backups**.
  - [ ] Verify that a valid backup snapshot exists within the last 24 hours.
  - [ ] Confirm restore capability is enabled.
- [ ] **1.2 Data Preservation Confirmation (Phase 16 Closed):**
  - [ ] Reconfirm that Phase 16 Data Cleanup remains **PERMANENTLY CLOSED**.
  - [ ] Confirm all 40 production incidents, 481 audit logs, 34 OTP records, and candidate accounts will be preserved intact.

---

## Gate 2: Pre-Migration Production Schema & Policy Inventory

Run the following **READ-ONLY** discovery queries in the Supabase Cloud SQL Editor to inspect the actual live state:

- [ ] **2.1 Discover Active RLS Policies on `incidents` and `evidence`:**
  ```sql
  -- Run in Supabase SQL Editor (Read-Only)
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('incidents', 'incident_locations', 'evidence', 'student_profiles')
  ORDER BY tablename, policyname;
  ```
  *Check:* Does `"Authorized users view incidents"` exist? If YES, it must be purged during migration.

- [ ] **2.2 Inspect Columns on `audit_logs`:**
  ```sql
  -- Run in Supabase SQL Editor (Read-Only)
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'audit_logs';
  ```
  *Check:* Does `entity_type` exist? If NO, migration 010 must precede migration 009's audit insertion.

- [ ] **2.3 Check for Duplicate Student IDs per College (Pre-Migration 015 Check):**
  ```sql
  -- Run in Supabase SQL Editor (Read-Only)
  SELECT college_id, student_id, count(*) AS duplicate_count
  FROM public.profiles
  WHERE student_id IS NOT NULL AND role = 'STUDENT'
  GROUP BY college_id, student_id
  HAVING count(*) > 1;
  ```
  *Expected:* 0 rows returned.

- [ ] **2.4 Inspect Storage Buckets & Policies:**
  ```sql
  -- Run in Supabase SQL Editor (Read-Only)
  SELECT id, name, public, file_size_limit, allowed_mime_types
  FROM storage.buckets;
  ```
  *Expected:* `kavach-evidence` exists; verify whether `kavach-id-cards` or `kavach-profile-photos` are already present.

---

## Gate 3: Legacy Policy Remediation Review (DDL Patch)

Before running migrations 009–017, the owner must review and approve the drop of legacy permissive policies that violate tenant isolation:

- [ ] **3.1 Review Proposed Remediation SQL Block:**
  ```sql
  -- PROPOSED REMEDIATION DDL (Owner Review Required)
  DROP POLICY IF EXISTS "Authorized users view incidents" ON public.incidents;
  DROP POLICY IF EXISTS "Authorized users view incident locations" ON public.incident_locations;
  DROP POLICY IF EXISTS "Authorized users insert incident locations" ON public.incident_locations;
  DROP POLICY IF EXISTS "Authorized users read student profiles" ON public.student_profiles;
  DROP POLICY IF EXISTS "Authorized users view incident evidence" ON public.evidence;
  DROP POLICY IF EXISTS "Authorized users view evidence" ON public.evidence;
  DROP POLICY IF EXISTS "Authorized users upload incident evidence" ON public.evidence;
  DROP POLICY IF EXISTS "Authorized users read incident messages" ON public.incident_messages;
  DROP POLICY IF EXISTS "Authorized users read incident evidence files" ON storage.objects;
  DROP POLICY IF EXISTS "Authorized users upload incident evidence files" ON storage.objects;
  ```
  - [ ] Owner confirms understanding that dropping these policies eliminates cross-college incident visibility.
  - [ ] Owner confirms that same-college access is preserved by `"Staff view same-college incidents"`.

---

## Gate 4: Sequential Migration Execution Runbook

When authorized by the owner, execute the following operations in exact sequence in the Supabase SQL Editor:

- [ ] **Step 4.1:** Execute `010_service_role_and_audit_alignment.sql` (adds columns to `audit_logs`).
- [ ] **Step 4.2:** Execute `009_student_id_verification_resubmission.sql` (applies status constraint, trigger, ID card bucket).
- [ ] **Step 4.3:** Execute `011_staff_live_locations_and_consent.sql` (creates `staff_locations` table).
- [ ] **Step 4.4:** Execute `012_profiles_college_tenant.sql` (adds `college_id`, maps domains, aligns `kavach-evidence` bucket).
- [ ] **Step 4.5:** Execute `013_cross_college_rls_isolation.sql` (adds `incidents.college_id`, backfills tenancy).
- [ ] **Step 4.6:** Execute Gate 3 Remediation SQL Block (purges `"Authorized users ..."` legacy policies).
- [ ] **Step 4.7:** Execute `014_cross_college_rls_hardening.sql` (installs `is_campus_staff()`, tenant-scoped RLS).
- [ ] **Step 4.8:** Execute `015_college_scoped_student_id_uniqueness.sql` (deploys compound unique index).
- [ ] **Step 4.9:** Execute `016_safe_box_private_notes.sql` (creates `safe_box_private_notes` with RLS).
- [ ] **Step 4.10:** Execute `017_student_college_claims.sql` (adds claimed college, photo bucket, and policy).

---

## Gate 5: Post-Migration Production Verification

Run the following verification queries in the Supabase SQL Editor immediately following execution:

- [ ] **5.1 Verify Table and Policy Counts:**
  ```sql
  SELECT
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables_count,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS public_policies_count;
  ```
  *Expected:* 21 public tables, 37 active policies.

- [ ] **5.2 Verify Absence of Permissive OR Leak:**
  ```sql
  SELECT policyname, tablename
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE 'Authorized users%';
  ```
  *Expected:* 0 rows returned.

- [ ] **5.3 Verify Storage Buckets:**
  ```sql
  SELECT id, public, file_size_limit
  FROM storage.buckets
  WHERE id IN ('kavach-evidence', 'kavach-id-cards', 'kavach-profile-photos');
  ```
  *Expected:* 3 rows returned, all `public = false`.

---

## Gate 6: Rollback Contingency Procedures

In the event of an unrecoverable migration failure, follow the documented rollback procedures:

1. **Table-Level DDL Rollback:**
   ```sql
   DROP TABLE IF EXISTS public.safe_box_private_notes CASCADE;
   DROP TABLE IF EXISTS public.staff_locations CASCADE;
   DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
   CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id) WHERE student_id IS NOT NULL AND role = 'STUDENT';
   ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS claimed_college_id;
   ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_photo_path;
   ```
2. **Full Database Restoration:**
   If schema inconsistency occurs, restore the snapshot verified in Gate 1 via the Supabase Dashboard.
