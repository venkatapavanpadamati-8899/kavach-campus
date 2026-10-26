# KAVACH CAMPUS — STEP 107: CRITICAL PRODUCTION SQL SAFETY REVIEW
**Target Script:** [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql)  
**Workspace Directory:** `D:\Kavach Campus`  
**Supabase Instance:** `polbnvszmvblwenfnqll` (ap-south-1)  
**Review Date:** 2026-10-17  
**Auditor:** Application Security & Database Architecture Reviewer (Antigravity AI)  
**Safety Verdict:** **REQUIRES CORRECTIONS BEFORE DEPLOYMENT (OPTION B)**

---

## 1. EXECUTIVE ASSESSMENT

The standalone remediation script [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql) was developed to surgically address RLS infinite recursion, student ID card upload scoping, and role escalation vulnerabilities.

However, an exhaustive line-by-line safety inspection reveals that **this script is NOT yet safe to execute in the Supabase production database**. It contains:
1. **Administrative Deadlock Risk:** The role escalation trigger blocks service-role administrative operations (e.g., student ID verification, staff onboarding approval) because `public.is_admin()` returns `false` when called by backend service-role API clients without an end-user JWT.
2. **Critical Trigger Context Semantics (`SECURITY DEFINER` Pitfall):** Inside a `SECURITY DEFINER` function, PostgreSQL changes `current_user` to the function's owner (`postgres`). Any attempt to bypass the trigger using `IF current_user IN ('service_role', 'postgres', ...) THEN RETURN NEW;` would create a **catastrophic security hole**, bypassing role protection for all callers (including untrusted students).
3. **Over-Privileged ID Card Access:** Storage read policies permit all staff roles (`OR public.is_staff()`) to view any student's government/institutional ID card, violating the privacy principle restricting access to designated reviewers (`ADMIN`, `SUPER_ADMIN`, `SECURITY`).
4. **Over-Privileged Evidence Storage Access:** Storage read policies allow any authenticated staff member (`OR public.is_staff()`) to download all evidence files, rather than restricting access to staff assigned to the specific case.
5. **Incomplete Scope:** The script addresses only `public.profiles` and `storage.objects`, leaving `public.evidence` and `public.incident_messages` governed by legacy migration 005 policies (`"Staff view evidence"` and `"Staff read all messages"`).

---

## 2. DETAILED 16-POINT SAFETY INSPECTION

### Area 1: DROP POLICY Statements
- **File & Lines:** Lines 68–73, 89–97, 129–136
- **Existing Behavior:** Drops specified legacy policy names on `public.profiles` and `storage.objects` using `IF EXISTS`.
- **Status:** **PASS**
- **Evidence:** Using `IF EXISTS` ensures idempotency without throwing errors if a policy does not exist.
- **Recommended Correction:** Maintain this drop pattern, but ensure that policies on `public.evidence` and `public.incident_messages` are also included in comprehensive remediation.

---

### Area 2: CREATE POLICY Statements & Expressions
- **File & Lines:** Lines 76–83, 100–110, 113–124, 139–149, 152–163
- **Existing Behavior:** Recreates policies on `profiles` and `storage.objects`.
- **Status:** **FAIL**
- **Risk:**
  - Storage Evidence policy (Line 122) includes `OR public.is_staff()`.
  - Storage ID Cards policy (Line 161) includes `OR public.is_staff()`.
- **Evidence:** Any authenticated staff user can read every student's uploaded ID card and case evidence files across the entire institution.
- **Recommended Correction:** Restrict ID card reads to `public.is_reviewer()` (`ADMIN`, `SUPER_ADMIN`, `SECURITY`), and restrict evidence reads to assigned responders or institutional admins.

---

### Area 3: Duplicate PERMISSIVE Policy Bypass
- **File & Lines:** Lines 21–29, 65–165
- **Existing Behavior:** Drops known legacy names before creating replacement policies.
- **Status:** **PARTIAL**
- **Risk:** In PostgreSQL, multiple `PERMISSIVE` policies combine with `OR`. If the remote database has an active policy not included in the drop list (e.g. from early prototype migrations), that policy will continue to grant broad access.
- **Evidence:** Remote pre-check query in lines 21–29 confirms active policies, but execution must be verified before and after.
- **Recommended Correction:** Ensure the remote pre-check output confirms all unexpected legacy policies are dropped.

---

### Area 4: Student Ownership Verification
- **File & Lines:** Lines 107–109, 146–148
- **Existing Behavior:** Uses `auth.uid()::text = (storage.foldername(name))[1] OR name LIKE (auth.uid()::text || '/%')`.
- **Status:** **PASS**
- **Evidence:** Enforces that a student can only insert and read files within their own UUID-prefixed directory in the storage bucket.
- **Required Regression Tests:** Tests verifying that Student A cannot upload into Student B's folder path.

---

### Area 5: Staff Access to Assigned Incidents
- **File & Lines:** Lines 113–124
- **Existing Behavior:** Allows any user where `public.is_staff() = true` to read all evidence in `kavach-evidence`.
- **Status:** **FAIL**
- **Risk:** Violation of case-level isolation. A faculty member or lab assistant with staff role can browse evidence of sensitive harassment or ragging cases.
- **Recommended Correction:** Enforce case assignment checks at the application/API layer when signing storage URLs, or query incident assignment in database RLS.

---

### Area 6: Evidence Access Verification Against Parent Incident
- **File & Lines:** Lines 113–124
- **Existing Behavior:** `storage.objects` policy does not join to `public.evidence` or `public.incidents`.
- **Status:** **PARTIAL**
- **Risk:** Storage policies cannot easily join complex application tables without performance degradation.
- **Recommended Correction:** Keep storage buckets strictly private (`public = false`) and route evidence access through authenticated API endpoints (`/api/incidents/[id]/evidence`) that verify incident assignment before generating time-limited signed download URLs.

---

### Area 7: Evidence Upload Path Isolation
- **File & Lines:** Lines 100–110
- **Existing Behavior:** Enforces `(storage.foldername(name))[1] = auth.uid()::text`.
- **Status:** **PASS**
- **Evidence:** Prevents cross-student upload collisions and folder spoofing.

---

### Area 8: ID-Card Access Restricted to Reviewers (ADMIN, SUPER_ADMIN, SECURITY)
- **File & Lines:** Line 161
- **Existing Behavior:** `OR public.is_staff()`
- **Status:** **FAIL**
- **Risk:** Over-exposure of sensitive student identity cards to all staff.
- **Evidence:** Line 161 calls `public.is_staff()`, which includes `STAFF`, `COUNSELLOR`, `WOMENS_CELL`, `HOD`, `PRINCIPAL`.
- **Recommended Correction:** Replace with a dedicated helper:
  ```sql
  CREATE OR REPLACE FUNCTION public.is_reviewer()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY')
        AND is_approved = true
    );
  $$;
  ```
  Update storage policy to use `OR public.is_reviewer()`.

---

### Area 9: Student Profile & Internal Message Privacy
- **File & Lines:** Lines 76–83
- **Existing Behavior:** Replaces profile read policy with `auth.uid() = id OR public.is_staff()`. Does not remediate `incident_messages`.
- **Status:** **PARTIAL**
- **Risk:** All staff can view all user profiles. Internal notes in `incident_messages` remain accessible to all staff via migration 005.
- **Recommended Correction:** Add policy updates for `public.incident_messages` restricting internal messages to assigned staff and admins.

---

### Area 10: SECURITY DEFINER Helper Function Safety
- **File & Lines:** Lines 34–62
- **Existing Behavior:** `is_staff()` and `is_admin()` explicitly declare `SET search_path = public`.
- **Status:** **PASS**
- **Evidence:** Prevents search-path hijacking attacks where malicious schemas shadow core tables.

---

### Area 11 & 12: Role Escalation Trigger & Execution Context Analysis
- **File & Lines:** Lines 168–189
- **Existing Behavior:**
  ```sql
  CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only institutional administrators can modify account roles or approval status.';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;
  ```
- **Status:** **FAIL (HIGH CRITICALITY)**
- **Technical Analysis & Execution Context:**
  1. **The Service-Role Deadlock:** When administrative backend APIs (e.g. `src/app/api/admin/verifications/route.ts`) approve an ID card or approve a staff account, they use the `supabase_service_role_key`. In PostgREST, this sets `role = 'service_role'` and `auth.uid() = NULL`. Because `auth.uid()` is null, `public.is_admin()` returns `FALSE`. The trigger throws `Access Denied`, causing administrative approvals to fail!
  2. **The `current_user` Flaw in `SECURITY DEFINER`:** In PostgreSQL, a `SECURITY DEFINER` function executes under the authority of the function's creator (`postgres`). Therefore, `current_user` inside this function is **ALWAYS `'postgres'`**, regardless of who initiated the query. If a developer attempts to fix the service-role deadlock by writing:
     ```sql
     -- DANGEROUS ATTEMPT (DO NOT USE)
     IF current_user IN ('postgres', 'service_role') THEN RETURN NEW; END IF;
     ```
     This check will evaluate to `TRUE` for **EVERY CALLER**, including an untrusted student updating their own profile via the client SDK! The trigger would be completely neutralized!
  3. **The Correct Supabase Role Check:** Supabase sets request context in JWT session settings. The reliable and secure method to detect service-role callers in Supabase is:
     ```sql
     -- SECURE IMPLEMENTATION
     IF (auth.role() = 'service_role') THEN
       RETURN NEW;
     END IF;

     IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
       IF NOT public.is_admin() THEN
         RAISE EXCEPTION 'Access Denied: Only institutional administrators can modify account roles or approval status.';
       END IF;
     END IF;
     RETURN NEW;
     ```
- **Evidence:** Verified against PostgreSQL `SECURITY DEFINER` documentation and Supabase `auth.role()` environment behavior.

---

### Area 13: Storage Bucket Metadata & Configuration
- **File & Lines:** General script structure
- **Existing Behavior:** The script does not touch `storage.buckets`. It operates exclusively on `storage.objects` RLS policies.
- **Status:** **PASS**
- **Evidence:** Does not alter existing bucket privacy flags or size limit constraints.

---

### Area 14: Compatibility with Production Schema
- **File & Lines:** Full script
- **Existing Behavior:** References `public.profiles` (`id`, `role`, `is_approved`), `storage.objects` (`bucket_id`, `name`).
- **Status:** **PASS**
- **Evidence:** Compatible with existing database schema definitions.

---

### Area 15: Idempotency & Safe Rollback Plan
- **File & Lines:** Lines 18–30, 193–220
- **Existing Behavior:** Contains pre-check and post-check queries. Includes commented rollback SQL.
- **Status:** **PARTIAL**
- **Risk:** Rollback SQL (lines 208–220) would revert to legacy policies that had known recursion and broad-access issues.
- **Recommended Correction:** Revise rollback SQL to define safe fallback states.

---

### Area 16: Impact on Existing Legitimate Workflows
- **File & Lines:** Lines 175–179
- **Existing Behavior:** Will break server-side staff approval and student verification APIs due to Area 11/12 service-role deadlock.
- **Status:** **FAIL**
- **Recommended Correction:** Implement the `auth.role() = 'service_role'` bypass before executing in production.

---

## 3. SUMMARY OF AUDIT FINDINGS

| Area | Topic | Status | Impact / Requirement |
| :---: | :--- | :---: | :--- |
| **1** | DROP POLICY statements | **PASS** | Safe and idempotent. |
| **2** | CREATE POLICY conditions | **FAIL** | Over-privileged `is_staff()` on ID cards and evidence. |
| **3** | Duplicate permissive policies | **PARTIAL** | Pre-check required to ensure all legacy policies are dropped. |
| **4** | Student ownership verification | **PASS** | Folder isolation correctly enforced. |
| **5** | Staff case assignment scoping | **FAIL** | Evidence reads not scoped to assigned cases. |
| **6** | Parent incident verification | **PARTIAL** | Requires application signed URL pattern. |
| **7** | Evidence upload path isolation | **PASS** | Enforces `auth.uid()` path prefix. |
| **8** | Reviewer-only ID card access | **FAIL** | Must replace `is_staff()` with `is_reviewer()`. |
| **9** | Profile & message privacy | **PARTIAL** | Needs policy updates for `incident_messages`. |
| **10**| Helper function search_path | **PASS** | `SET search_path = public` correctly declared. |
| **11**| Trigger safety | **FAIL** | Causes administrative approval deadlock. |
| **12**| Trigger execution context | **FAIL** | Naive `current_user` check is invalid in `SECURITY DEFINER`; must use `auth.role() = 'service_role'`. |
| **13**| Bucket configurations | **PASS** | Leaves buckets untouched. |
| **14**| Production schema compatibility | **PASS** | Valid column and table references. |
| **15**| Rollback plan | **PARTIAL** | Rollback statements need refinement. |
| **16**| Legitimate workflow preservation| **FAIL** | Breaks administrative onboarding and ID approvals. |

---

## 4. FINAL SAFETY RECOMMENDATION

### **B. REQUIRES CORRECTIONS BEFORE DEPLOYMENT**

The script `supabase/verification/kavach_step96_safe_remediation.sql` **MUST NOT be executed in production in its current state**.

### Mandatory Corrections Required Before Owner Execution:
1. **Fix Trigger Service-Role Bypass:** Update `prevent_self_role_escalation()` to check `IF (auth.role() = 'service_role') THEN RETURN NEW; END IF;`.
2. **Restrict ID Card Storage Access:** Replace `OR public.is_staff()` with `OR public.is_reviewer()` (scoped to `ADMIN`, `SUPER_ADMIN`, `SECURITY`).
3. **Restrict Storage Evidence Access:** Remove blanket `OR public.is_staff()` from `storage.objects` evidence read policy, relying on backend-verified signed URLs for assigned responders.
4. **Scope `public.evidence` and `public.incident_messages`:** Include drops and replacements for table-level policies in `public.evidence` and `public.incident_messages`.
5. **Prepare Corrected Script:** Assemble a clean, corrected `kavach_step107_safe_remediation.sql` and verify it against local regression tests before providing it for owner approval.
