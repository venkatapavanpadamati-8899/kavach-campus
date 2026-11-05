# KAVACH CAMPUS — PHASE 15K PRODUCTION REMEDIATION REVIEW & RUNBOOK

**Target System:** Remote Supabase Production (`dvyiclyyvmsfipzrdowu`)  
**Prepared On:** 2026-11-05  
**Review Status:** **`READY FOR OWNER REVIEW`**  
**Execution Authority:** **`STRICTLY GATED — OWNER AUTHORIZATION REQUIRED`**  

---

## 1. Executive Context

In Phase 15J and 15K, it was established that executing migrations 009–017 without purging historical permissive policies creates a critical multi-tenant data leak. Migration `018_legacy_rls_policy_remediation.sql` was authored, locally applied, and verified with 32/32 passing authenticated RLS tests.

This document compiles the **production remediation review package** for the repository owner. **Do not execute this sequence until cloud backup verification and prerequisite checks are satisfied.**

---

## 2. Hardened Production Migration Sequence

Due to the schema dependency between `009` (audit insertion) and `010` (column addition), and the necessity of purging un-scoped policies in `018`, the recommended execution order in the Supabase Dashboard SQL Editor is:

```
Step 1:  010_service_role_and_audit_alignment.sql     (Adds entity_type to audit_logs)
Step 2:  009_student_id_verification_resubmission.sql (Adds verification status & ID card bucket)
Step 3:  011_staff_live_locations_and_consent.sql     (Creates staff_locations table)
Step 4:  012_profiles_college_tenant.sql              (Adds profiles.college_id, domain mapping)
Step 5:  013_cross_college_rls_isolation.sql          (Adds incidents.college_id, tenant triggers)
Step 6:  014_cross_college_rls_hardening.sql          (Adds is_campus_staff(), escalation guards)
Step 7:  015_college_scoped_student_id_uniqueness.sql (Compound unique index on college_id, student_id)
Step 8:  016_safe_box_private_notes.sql               (Creates safe_box_private_notes table & RLS)
Step 9:  017_student_college_claims.sql               (Adds claimed_college_id & photo bucket)
Step 10: 018_legacy_rls_policy_remediation.sql       (PURGES ALL HISTORICAL PERMISSIVE OR LEAKS)
```

---

## 3. Mandatory Owner Pre-Migration Gates

Before executing any script:

1. **Verify Backup:** Confirm in the Supabase Dashboard (`Database -> Backups`) that a fresh, restorable PITR backup is active.
2. **Verify No Intra-College Duplicate Student IDs:**
   ```sql
   SELECT college_id, student_id, count(*)
   FROM public.profiles
   WHERE student_id IS NOT NULL AND role = 'STUDENT'
   GROUP BY college_id, student_id
   HAVING count(*) > 1;
   ```
   *Must return 0 rows before running migration 015.*

---

## 4. Post-Migration Verification Query

Immediately after running Step 10 (Migration 018), run this assertion query in the SQL Editor:

```sql
SELECT 
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS public_policies_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Authorized users%') AS legacy_policies_count;
```

*Expected Outputs:*
* `public_tables_count`: 21
* `public_policies_count`: 32 (plus 5 in `storage` = 37 total)
* `legacy_policies_count`: **0** (All permissive leaks purged).

---

> [!CAUTION]
> **Safety Directive:** Antigravity has performed local execution and validation only. Remote Supabase database, GitHub `origin/main`, and Vercel cloud remain 100% untouched.

