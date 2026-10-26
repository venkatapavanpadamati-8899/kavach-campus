# KAVACH CAMPUS — STEP 18: MIGRATION 008 PRE-EXECUTION SAFETY VERIFICATION
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 11, 2026  
**Audit Target Files:**
1. `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` (253 lines)
2. `supabase/migrations/008_kavach_campus_complete_production_alignment.sql` (303 lines)
3. `supabase/migrations/005_kavach_campus_rls_infinite_recursion_repair.sql` (223 lines)
4. `supabase/migrations/006_provision_super_admin.sql` (82 lines)
5. `supabase/migrations/007_student_id_card_verification.sql` (86 lines)

---

## 1. Executive Summary & Comparison Overview

To ensure that the remote database is protected against privilege escalation, data corruption, recursion locks, or breaking schema changes, we conducted an exhaustive cross-comparison between:
- The **Original Migration 008** (`008_kavach_campus_complete_production_alignment.sql`)
- The **Safe Decoupled Migration 008** (`008_kavach_campus_schema_and_rls_alignment_safe.sql`)
- Existing historical migrations (`005`, `006`, `007`)
- The live Next.js application API queries in `src/app/api/`

### Primary Finding
- **Original Migration 008 contains a critical anti-pattern:** Lines 265–298 attempt to execute DDL (schema alters) and DML (hardcoded user role elevation to `SUPER_ADMIN` for a specific email address) in the same script. This is **UNSAFE** for standard schema migrations.
- **Safe Decoupled Migration 008 resolves this completely:** All user promotion logic was excised, moving user administration to permission-gated admin workflows, leaving purely structural, non-destructive, idempotent DDL and RLS statements.

---

## 2. Detailed Verification Against Criteria A through M

### A. No Hard-Coded Account Receives Elevated Privileges
- **Evaluation Status:** **PASS** (for Safe 008) | **FAIL** (for Original 008)
- **SQL Section Evidence:**
  - *Original 008 (Lines 265–298):* `target_email TEXT := 'venkatapavanpadamati1@gmail.com'; ... role = 'SUPER_ADMIN';` -> **High Risk Violation**.
  - *Safe 008 (Lines 18–19 & Section 7):* Explicitly removed all user email references and replaced them with `prevent_self_role_escalation()` trigger enforcing that only active administrators can alter user roles.
  - *Migration 006:* Contains hardcoded email, but is kept strictly isolated as a one-off setup script rather than an automated schema migration.
- **Risk Severity:** HIGH in Original 008 | NONE in Safe 008.
- **Correction Required:** Use `008_kavach_campus_schema_and_rls_alignment_safe.sql` exclusively.
- **Manual Approval Required:** Yes.

---

### B. No Existing Data is Deleted or Overwritten
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - `008_kavach_campus_schema_and_rls_alignment_safe.sql` contains **zero** `DROP TABLE`, `TRUNCATE`, `DROP COLUMN`, or `DELETE FROM` statements.
  - Storage bucket handling uses:
    ```sql
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('kavach-evidence', 'kavach-evidence', false), ('kavach-id-cards', 'kavach-id-cards', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
    ```
    This updates only the `public` visibility flag to `false` and does not delete existing bucket objects.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### C. ADD COLUMN Statements Use Compatible Types and Defaults
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Section 3 (`safe_walks`):
    - `expires_at TIMESTAMPTZ` (nullable)
    - `auto_sos_enabled BOOLEAN DEFAULT TRUE` (compatible with boolean queries)
    - `auto_sos_timeout_mins INT DEFAULT 5`
    - `start_latitude DOUBLE PRECISION`, `start_longitude DOUBLE PRECISION`
    - `last_latitude DOUBLE PRECISION`, `last_longitude DOUBLE PRECISION`
    - `escalation_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL`
  - Section 4 (`student_profiles`):
    - `admission_type TEXT DEFAULT 'REGULAR'`
    - `admission_year INT`, `expected_graduation_year INT`
    - `verification_status TEXT DEFAULT 'PENDING_UPLOAD'`
    - `verified_by UUID REFERENCES public.profiles(id)`
    - `ocr_extracted_data JSONB`
- **Application Compatibility:** These types match 1:1 with TypeScript interfaces in `src/types/database.ts` and API routes (`src/app/api/safe-walk/start/route.ts`, `src/app/api/student/verify-id/route.ts`).
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### D. Existing Rows Remain Valid After Schema Changes
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Check constraints in Safe 008:
    - `safe_walks_status_check`: `CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE', 'ESCALATED'))`
    - `check_admission_type`: `CHECK (admission_type IN ('REGULAR', 'LATERAL_ENTRY'))`
    - `check_verification_status`: `CHECK (verification_status IN ('PENDING_UPLOAD', 'PENDING_VERIFICATION', 'PENDING_MANUAL_REVIEW', 'VERIFIED', 'REJECTED'))`
  - Since new columns supply defaults (`'REGULAR'`, `'PENDING_UPLOAD'`), all existing rows in `student_profiles` automatically satisfy these constraints upon addition.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### E. Unique Indexes Will Not Fail Because of Duplicate Records
- **Evaluation Status:** **PARTIAL / CONDITIONAL PASS**
- **SQL Section Evidence:**
  - Line 144:
    ```sql
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
    ON public.profiles(student_id)
    WHERE student_id IS NOT NULL AND role = 'STUDENT';
    ```
- **Risk Assessment:**
  - The index is a partial unique index, meaning multiple `NULL` student IDs (e.g. for staff, administrators, or unassigned accounts) will NOT collide.
  - However, if the existing remote database *already* contains two distinct student accounts with the exact same non-null `student_id`, PostgreSQL will halt with error code `23505 (unique_violation)`.
- **Required Pre-Flight Check:**
  Before running this index, run this pre-flight deduplication query in the Supabase SQL editor:
  ```sql
  SELECT student_id, COUNT(*) 
  FROM public.profiles 
  WHERE student_id IS NOT NULL AND role = 'STUDENT' 
  GROUP BY student_id 
  HAVING COUNT(*) > 1;
  ```
  If this returns 0 rows, the index creation is guaranteed to succeed.
- **Risk Severity:** MEDIUM (potential migration halt if dirty test data exists).
- **Manual Approval Required:** Yes.

---

### F. CREATE POLICY Statements are Rerunnable or Safely Reconciled
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Section 5 (Lines 168–177):
    ```sql
    DROP POLICY IF EXISTS "Staff and admin view escalations" ON public.escalations;
    CREATE POLICY "Staff and admin view escalations" ON public.escalations ...
    DROP POLICY IF EXISTS "Staff and admin manage escalations" ON public.escalations;
    CREATE POLICY "Staff and admin manage escalations" ON public.escalations ...
    ```
  - Section 6 (Lines 189–223):
    - All 4 storage policies drop existing policy instances prior to recreation.
- **Risk Severity:** NONE (100% idempotent and rerunnable).
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### G. SECURITY DEFINER Functions Have Appropriate Grants and Hardened search_path
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Functions: `public.get_user_role()`, `public.is_staff()`, `public.is_admin()`, `public.is_security_or_admin()`, `public.prevent_self_role_escalation()`.
  - Every single function explicitly includes:
    ```sql
    SECURITY DEFINER
    SET search_path = public
    ```
  - This prevents search_path hijacking where malicious actors inject objects into a user-controlled schema.
  - Volatility is set to `STABLE`, ensuring high query caching performance without infinite recursion loops (resolving error `42P17`).
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### H. RLS Policies Do Not Expose Another Student's Profile, Evidence, or Location
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Section 6 Storage policies:
    ```sql
    -- Evidence Read Policy
    USING (
        bucket_id = 'kavach-evidence'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR public.is_staff()
        )
    );

    -- ID Card Read Policy
    USING (
        bucket_id = 'kavach-id-cards'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR public.is_staff()
        )
    );
    ```
  - Cross-student access is strictly denied. A student with `auth.uid() = A` can only access files in folder `A/`. Only verified staff (`public.is_staff() = true`) can inspect evidence files for active case handling.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### I. Storage Buckets Remain Private
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Lines 182–186:
    ```sql
    INSERT INTO storage.buckets (id, name, public)
    VALUES 
        ('kavach-evidence', 'kavach-evidence', false),
        ('kavach-id-cards', 'kavach-id-cards', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
    ```
  - Both buckets are explicitly created with `public = false`.
  - Direct unauthenticated URL access without signed tokens or session cookies returns HTTP 400/403.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### J. Storage Policies Enforce Owner / Case-Based Authorization
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - Both `kavach-evidence` and `kavach-id-cards` enforce path isolation:
    `auth.uid()::text = (storage.foldername(name))[1]`
  - Students cannot read or overwrite another student's uploads.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### K. No Anonymous User Can Upload or Read Sensitive Evidence
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - All storage insert and select policies explicitly declare `TO authenticated`.
  - The PostgreSQL `anon` role has zero privileges on `storage.objects` for both buckets.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### L. Existing API Code Matches the Resulting Database Schema
- **Evaluation Status:** **PASS**
- **SQL Section Evidence:**
  - `src/app/api/safe-walk/start/route.ts` selects/inserts: `expires_at`, `start_latitude`, `start_longitude` -> MATCHES Section 3.
  - `src/app/api/safe-walk/end/route.ts` updates: `completed_at` -> MATCHES Section 3.
  - `src/app/api/cron/safe-walk-timeout/route.ts` selects: `auto_sos_enabled`, `auto_sos_timeout_mins` -> MATCHES Section 3.
  - `src/app/api/student/verify-id/route.ts` updates: `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `verification_status` -> MATCHES Section 4.
  - `src/app/api/sos/route.ts` & `src/app/api/cron/escalate/route.ts` inserts into `escalations`: `incident_id`, `from_level`, `to_level`, `reason` -> MATCHES Section 5.
- **Risk Severity:** NONE.
- **Correction Required:** None.
- **Manual Approval Required:** No.

---

### M. No Migration Silently Changes Production User Roles
- **Evaluation Status:** **PASS** (for Safe 008) | **FAIL** (for Original 008)
- **SQL Section Evidence:**
  - *Original 008:* Contained an implicit `UPDATE public.profiles SET role = 'SUPER_ADMIN'` targeting a specific email.
  - *Safe 008:* Completely removed all role assignment statements.
  - *Self-Role Escalation Prevention:* Safe 008 installs trigger `trg_prevent_self_role_escalation` on `public.profiles` (Section 7), ensuring that any attempt by a non-admin to update `role` or `is_approved` throws an exception (`'Access Denied: Only administrators can modify roles or approval status.'`).
- **Risk Severity:** NONE in Safe 008.
- **Correction Required:** Use Safe 008.
- **Manual Approval Required:** No.

---

## 3. Final Comparison Matrix: Original 008 vs Safe 008

| Verification Item | Original 008 (`complete_production_alignment.sql`) | Safe 008 (`schema_and_rls_alignment_safe.sql`) |
| :--- | :---: | :---: |
| Hardcoded User Email / Role Promotion | ❌ **FAIL** (High Coupling Risk) | ✅ **PASS** (100% Decoupled) |
| Non-Destructive DDL (No Drops/Truncates) | ✅ **PASS** | ✅ **PASS** |
| Column Types & API Match | ✅ **PASS** | ✅ **PASS** |
| Idempotent Policy Creation | ✅ **PASS** | ✅ **PASS** |
| Hardened SECURITY DEFINER search_path | ✅ **PASS** | ✅ **PASS** |
| Storage Bucket Privacy (`public = false`) | ✅ **PASS** | ✅ **PASS** |
| Self-Role Escalation Prevention Trigger | ❌ Missing (in original) | ✅ **PASS** (Installed) |

---

## 4. Pre-Flight Verification Query (For Supabase SQL Editor)

Before executing Safe 008, copy and run this read-only safety check in the **Supabase Dashboard SQL Editor**:
```sql
-- KAVACH CAMPUS PRE-FLIGHT CHECK: Ensure no duplicate student IDs exist
SELECT 
    student_id, 
    COUNT(*) AS count 
FROM public.profiles 
WHERE student_id IS NOT NULL 
  AND role = 'STUDENT' 
GROUP BY student_id 
HAVING COUNT(*) > 1;
```
- If the result is **0 rows**, the partial unique index will apply cleanly without conflicts.

---

## 5. Final Recommendation

Based on the line-by-line inspection of all SQL statements against the live codebase:

```
================================================================================
FINAL RECOMMENDATION:
SAFE TO CONSIDER FOR MANUAL EXECUTION
(Using file: supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql)
================================================================================
```

### Guidance for User:
1. **DO NOT** execute `008_kavach_campus_complete_production_alignment.sql` (due to hardcoded role promotion).
2. **DO** execute **`supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql`** manually via the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new) after verifying that the pre-flight check returns 0 duplicate student IDs.
