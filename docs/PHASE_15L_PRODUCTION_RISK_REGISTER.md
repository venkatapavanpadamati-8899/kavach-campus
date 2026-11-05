# KAVACH CAMPUS — PHASE 15L PRODUCTION RISK REGISTER

**Target Database:** Production Supabase (`dvyiclyyvmsfipzrdowu`)  
**Assessment Date:** 2026-11-05  
**Review Status:** **`READY FOR OWNER REVIEW`**  

---

## 1. Migration-by-Migration Risk Classification

| Migration File | Classification | Core Risk Factors | Pre-Migration Verification Query | Mitigation / Strategy |
| :--- | :---: | :--- | :--- | :--- |
| **`010_service_role_and_audit_alignment.sql`** | **LOW** | Adds non-destructive columns to `audit_logs`; aligns `is_security_or_admin()`. | `SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs';` | Safe to execute first; establishes `entity_type` column. |
| **`009_student_id_verification_resubmission.sql`** | **MEDIUM** | Inserts into `audit_logs(entity_type)` and updates `check_verification_status`. | `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'check_verification_status';` | Execute AFTER migration 010 to satisfy column dependency. |
| **`011_staff_live_locations_and_consent.sql`** | **LOW** | Creates new table `staff_locations` and spatial indexes. | `SELECT table_name FROM information_schema.tables WHERE table_name = 'staff_locations';` | Completely isolated new table; zero impact on existing tables. |
| **`012_profiles_college_tenant.sql`** | **HIGH** | Maps institutional emails to `srkr` and `vishnu`; sets unmapped emails to `PENDING_CAMPUS_VERIFICATION`. | `SELECT college_email, count(*) FROM public.profiles WHERE college_email NOT LIKE '%srkr%' AND college_email NOT LIKE '%vishnu%' GROUP BY college_email;` | Review all non-institutional email profiles to plan manual institutional assignment. |
| **`013_cross_college_rls_isolation.sql`** | **MEDIUM** | Adds `incidents.college_id` and backfills tenancy from `profiles.college_id`. | `SELECT id, college_id FROM public.profiles WHERE role = 'STUDENT' AND college_id IS NULL;` | Ensure migration 012 ran first so profiles have `college_id` populated. |
| **`014_cross_college_rls_hardening.sql`** | **HIGH** | Installs role escalation prevention triggers and tenant-scoped policies. | `SELECT proname FROM pg_proc WHERE proname = 'prevent_self_role_escalation';` | Owner review of trigger logic to ensure admin APIs function properly. |
| **`015_college_scoped_student_id_uniqueness.sql`** | **HIGH** | Creates compound partial unique index on `(college_id, student_id)`. Aborts if duplicates exist. | `SELECT college_id, student_id, count(*) FROM public.profiles WHERE student_id IS NOT NULL AND role = 'STUDENT' GROUP BY college_id, student_id HAVING count(*) > 1;` | **CRITICAL PRE-CHECK:** Must return 0 rows before applying index. |
| **`016_safe_box_private_notes.sql`** | **LOW** | Creates isolated `safe_box_private_notes` table with 2000-char check. | `SELECT table_name FROM information_schema.tables WHERE table_name = 'safe_box_private_notes';` | Non-destructive; creates new table with student-only RLS. |
| **`017_student_college_claims.sql`** | **LOW** | Adds `claimed_college_id`, `profile_photo_path`, and `kavach-profile-photos` bucket. | `SELECT id FROM storage.buckets WHERE id = 'kavach-profile-photos';` | Non-destructive column and storage additions. |
| **`018_legacy_rls_policy_remediation.sql`** | **HIGH** | Drops 9 historical un-scoped permissive policies across 5 tables; hardens dispatch. | `SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Authorized users%';` | Required to seal the cross-college incident and evidence visibility leaks. |

---

## 2. Risk Classification Summary

```
+-------------------+-------+--------------------------------------------------------+
| Classification    | Count | Meaning / Action Required                              |
+-------------------+-------+--------------------------------------------------------+
| LOW               |   4   | Limited and well-understood risk; execute normally.    |
| MEDIUM            |   2   | Requires pre-migration query check and execution order.|
| HIGH              |   4   | Requires explicit owner review and backup confirmation.|
| BLOCKED           |   0   | No unresolved dependencies or unpatched security flaws.|
+-------------------+-------+--------------------------------------------------------+
| Total Migrations  |  10   | 009 through 018 (re-ordered for dependency safety).   |
+-------------------+-------+--------------------------------------------------------+
```

---

## 3. High-Priority Pre-Migration Inspection Queries (For Owner Review)

The repository owner should run the following read-only queries in the Supabase Cloud SQL Editor before approving migration execution:

```sql
-- 1. Check for duplicate student IDs within the same college (Pre-check for 015)
SELECT college_id, student_id, count(*) AS duplicate_count
FROM public.profiles
WHERE student_id IS NOT NULL AND role = 'STUDENT'
GROUP BY college_id, student_id
HAVING count(*) > 1;

-- 2. Inspect profiles that will be flagged as PENDING_CAMPUS_VERIFICATION (Pre-check for 012)
SELECT id, full_name, role, college_email
FROM public.profiles
WHERE college_email IS NULL 
   OR college_email !~* '^[^@]+@(srkr\.edu\.in|srkrec\.ac\.in|vishnu\.edu\.in|svecw\.edu\.in)$';

-- 3. Check existing active policies on incidents and evidence (Pre-check for 018)
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('incidents', 'incident_locations', 'evidence', 'student_profiles')
ORDER BY tablename, policyname;
```

