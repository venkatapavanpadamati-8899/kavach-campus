# KAVACH CAMPUS — PHASE 15L OWNER APPROVAL & RELEASE CHECKLIST

**Target Repository:** `https://github.com/venkatapavanpadamati-8899/kavach-campus`  
**Target Database:** Production Supabase (`dvyiclyyvmsfipzrdowu`)  
**Target Hosting:** Vercel Production (`https://kavach-campus.vercel.app`)  
**Audit Status:** **`READY FOR OWNER APPROVAL`**  
**Execution Authority:** **`STRICTLY GATED — ALL ACTIONS REQUIRE EXPLICIT OWNER EXECUTION`**  

---

## Gate 1: Backup & Snapshot Verification (Mandatory Prerequisite)

- [ ] **1.1 Supabase Dashboard Backup Confirmation:**
  - [ ] Log into the Supabase Dashboard: `https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/settings/database`
  - [ ] Navigate to **Database -> Backups**.
  - [ ] Verify that automated backups are active and a restorable snapshot exists within the last 24 hours.
  - [ ] Record the latest backup timestamp: `____________________`
- [ ] **1.2 Data Preservation Agreement:**
  - [ ] Confirm Phase 16 Data Cleanup remains **PERMANENTLY CLOSED**.
  - [ ] Confirm all 40 production incidents, 481 audit logs, 34 OTP records, and 8 Auth accounts will be preserved intact.

---

## Gate 2: Pre-Migration Read-Only Assertions

Run the following queries in the Supabase Cloud SQL Editor to ensure zero prerequisite collisions:

- [ ] **2.1 Check for Duplicate Student IDs (Pre-Migration 015):**
  ```sql
  SELECT college_id, student_id, count(*) AS duplicate_count
  FROM public.profiles
  WHERE student_id IS NOT NULL AND role = 'STUDENT'
  GROUP BY college_id, student_id
  HAVING count(*) > 1;
  ```
  *Requirement:* Must return **0 rows**. (If rows return, resolve duplicates manually before running 015).

- [ ] **2.2 Inspect Non-Institutional Profiles (Pre-Migration 012):**
  ```sql
  SELECT id, full_name, college_email, role
  FROM public.profiles
  WHERE college_email IS NULL 
     OR college_email !~* '^[^@]+@(srkr\.edu\.in|srkrec\.ac\.in|vishnu\.edu\.in|svecw\.edu\.in)$';
  ```
  *Requirement:* Note accounts that will be assigned `'PENDING_CAMPUS_VERIFICATION'` for manual verification.

---

## Gate 3: Hardened Sequential Migration Execution Runbook

When authorized, execute the migrations in the Supabase Cloud SQL Editor in this **exact order**:

- [ ] **Step 3.1:** `010_service_role_and_audit_alignment.sql` *(adds `entity_type` to `audit_logs`)*
- [ ] **Step 3.2:** `009_student_id_verification_resubmission.sql` *(updates verification constraint & ID bucket)*
- [ ] **Step 3.3:** `011_staff_live_locations_and_consent.sql` *(creates `staff_locations` table)*
- [ ] **Step 3.4:** `012_profiles_college_tenant.sql` *(adds `profiles.college_id` & aligns `kavach-evidence`)*
- [ ] **Step 3.5:** `013_cross_college_rls_isolation.sql` *(adds `incidents.college_id` & backfills tenancy)*
- [ ] **Step 3.6:** `014_cross_college_rls_hardening.sql` *(adds `is_campus_staff()` & role escalation triggers)*
- [ ] **Step 3.7:** `015_college_scoped_student_id_uniqueness.sql` *(deploys compound unique index)*
- [ ] **Step 3.8:** `016_safe_box_private_notes.sql` *(creates `safe_box_private_notes` with student RLS)*
- [ ] **Step 3.9:** `017_student_college_claims.sql` *(adds claimed college & photo bucket)*
- [ ] **Step 3.10:** `018_legacy_rls_policy_remediation.sql` *(PURGES ALL HISTORICAL PERMISSIVE OR LEAKS)*

---

## Gate 4: Post-Migration Production Verification Query

Execute immediately after Step 3.10:

```sql
SELECT 
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS public_policies_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Authorized users%') AS legacy_leaks_count;
```

- [ ] **Verification Targets:**
  - `public_tables_count`: 21
  - `public_policies_count`: 32 (plus 5 in storage = 37 total)
  - `legacy_leaks_count`: **0**

---

## Gate 5: GitHub Push & Vercel Production Deployment Sign-Off

- [ ] **5.1 Authorize GitHub Push (Phase 17):**
  - Run only after Gate 4 passes:
    ```bash
    git push origin main
    ```
- [ ] **5.2 Authorize Vercel Deployment (Phase 18):**
  - Verify environment variables in Vercel Dashboard (`ENABLE_DEMO_OTP=false`, `ENABLE_DEMO_SMS=false`).
  - Deploy verified build to `https://kavach-campus.vercel.app`.

