# KAVACH CAMPUS — PHASE 15E: SAFE LOCAL SCHEMA ALIGNMENT PLAN

**Project:** Kavach Campus  
**Workspace:** `D:\kavach-campus`  
**Target Database:** Local Docker Supabase (`127.0.0.1:54322`, Database: `postgres`)  
**Production Status:** STRICTLY EXCLUDED / OUT OF SCOPE  
**Generated At:** 2026-11-04  
**Plan Status:** DRAFT — AWAITING OWNER REVIEW & APPROVAL (DO NOT EXECUTE YET)  

---

## 1. Safety Principles & Zero-Data-Loss Guarantee

This alignment plan is designed to safely elevate the local Supabase container from its current **Baseline 008** schema state up to **Hardened Baseline 014**, preparing it to accept and test pending migrations `015`, `016`, and `017`.

### Core Safety Guarantees:
1. **Zero Data Loss:** All existing records in the local database (7 profiles, 2 student profiles, 2 incidents, 2 incident locations, 8 audit logs) will be preserved without modification to existing primary keys or foreign keys.
2. **No Destructive DDL:** Absolutely NO `DROP TABLE`, `TRUNCATE`, `DROP DATABASE`, or `CASCADE` operations will be used.
3. **Strict Idempotency:** Every DDL operation uses `IF NOT EXISTS`, `OR REPLACE`, or idempotent PL/pgSQL blocks (`DO $$ BEGIN ... EXCEPTION WHEN OTHERS ... END $$;`).
4. **Local Isolation Only:** All operations connect strictly to local Docker PostgreSQL on port `54322`. The production Supabase database (`dvyiclyyvmsfipzrdowu`) is completely untouched.
5. **No Execution Without Approval:** This plan will NOT be executed during Phase 15E. It serves as the formal specification for Phase 15F upon explicit owner approval.

---

## 2. Step-by-Step Alignment Plan (009 → 014)

### Step 1: Execute Migration 009 (`009_student_id_verification_resubmission.sql`)
- **File:** `supabase/migrations/009_student_id_verification_resubmission.sql` (3,124 bytes)
- **Preconditions:** Local database running; `student_profiles` table exists.
- **Operations:**
  1. Updates check constraint `check_verification_status` on `student_profiles` to include `'RESUBMISSION_REQUIRED'`.
  2. Creates `prevent_student_self_verification()` function (`SECURITY DEFINER`).
  3. Creates trigger `trg_prevent_student_self_verification` on `student_profiles`.
  4. Ensures private storage bucket `kavach-id-cards` exists with restricted RLS.
- **Verification Query:**
  ```sql
  SELECT pg_get_constraintdef(c.oid) 
  FROM pg_constraint c 
  WHERE conname = 'check_verification_status';
  ```
  *Expected Result:* Contains `'RESUBMISSION_REQUIRED'`.

---

### Step 2: Execute Migration 010 (`010_service_role_and_audit_alignment.sql`)
- **File:** `supabase/migrations/010_service_role_and_audit_alignment.sql` (2,130 bytes)
- **Preconditions:** Step 1 complete.
- **Operations:**
  1. Ensures `actor_id`, `entity_type`, `entity_id` exist on `audit_logs` (`ADD COLUMN IF NOT EXISTS`).
  2. Updates `is_security_or_admin()` function with hardened `service_role` and JWT claim checks.
  3. Reinforces `prevent_student_self_verification()` with `service_role` exception.
- **Verification Query:**
  ```sql
  SELECT proname, prosrc 
  FROM pg_proc 
  WHERE proname = 'is_security_or_admin';
  ```
  *Expected Result:* Function body contains `auth.role() = 'service_role'`.

---

### Step 3: Execute Migration 011 (`011_staff_live_locations_and_consent.sql`)
- **File:** `supabase/migrations/011_staff_live_locations_and_consent.sql` (2,363 bytes)
- **Preconditions:** Step 2 complete.
- **Operations:**
  1. Creates table `public.staff_locations` (`CREATE TABLE IF NOT EXISTS`).
  2. Creates indexes on `staff_id`, `updated_at`, and `(is_on_duty, is_location_sharing_enabled)`.
  3. Enables RLS on `staff_locations`.
  4. Installs policies `staff_locations_self_manage` and `staff_locations_dispatch_read`.
- **Verification Query:**
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename = 'staff_locations';
  ```
  *Expected Result:* 1 row returned, `rowsecurity = true`.

---

### Step 4: Execute Migration 012 (`012_profiles_college_tenant.sql`)
- **File:** `supabase/migrations/012_profiles_college_tenant.sql` (4,217 bytes)
- **Preconditions:** Step 3 complete.
- **Operations:**
  1. Adds `college_id TEXT` to `public.profiles` (`ADD COLUMN IF NOT EXISTS`).
  2. Maps existing verified email domains (`srkr.edu.in` -> `'srkr-bhimavaram'`, `vishnu.edu.in` -> `'vishnu-bhimavaram'`).
  3. Sets unmapped profiles to `'PENDING_CAMPUS_VERIFICATION'`.
  4. Creates indexes `idx_profiles_college_id` and `idx_profiles_college_role`.
  5. Creates function `get_user_college_id()` (`SECURITY DEFINER`, `STABLE`).
  6. Updates storage bucket `kavach-evidence` (`file_size_limit = 26214400`, adds audio MIME types).
- **Verification Query:**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'college_id';
  ```
  *Expected Result:* 1 row returned (`text`).

---

### Step 5: Execute Migration 013 (`013_cross_college_rls_isolation.sql`)
- **File:** `supabase/migrations/013_cross_college_rls_isolation.sql` (7,105 bytes)
- **Preconditions:** Step 4 complete (`profiles.college_id` and `get_user_college_id()` must exist).
- **Operations:**
  1. Adds `college_id TEXT` to `public.incidents` (`ADD COLUMN IF NOT EXISTS`).
  2. Backfills `incidents.college_id` from reporting student profile.
  3. Creates trigger `trg_assign_incident_college_id` on `public.incidents`.
  4. Purges legacy permissive policies and installs tenant-isolated RLS on `profiles`, `incidents`, `safe_walks`, `escalations`, `evidence`, and `storage.objects`.
- **Verification Query:**
  ```sql
  SELECT policyname, tablename 
  FROM pg_policies 
  WHERE policyname = 'Staff view same-college incidents';
  ```
  *Expected Result:* 1 row returned.

---

### Step 6: Execute Migration 014 (`014_cross_college_rls_hardening.sql`)
- **File:** `supabase/migrations/014_cross_college_rls_hardening.sql` (26,827 bytes)
- **Preconditions:** Step 5 complete.
- **Operations:**
  1. Ensures `evidence.case_id` and `evidence.file_path` exist and are indexed.
  2. Creates trigger function `sync_evidence_incident_reference()` and trigger on `evidence`.
  3. Creates helper function `is_campus_staff()`.
  4. Creates trigger function `prevent_self_role_escalation()` preventing unauthorized profile changes.
  5. Hardens incident college assignment trigger `trg_fn_assign_incident_college_id()`.
  6. Enforces comprehensive hardened multi-tenant RLS across all tables.
- **Verification Query:**
  ```sql
  SELECT proname 
  FROM pg_proc 
  WHERE proname = 'is_campus_staff';
  ```
  *Expected Result:* 1 row returned.

---

## 3. Post-Alignment Schema Verification Checklist

Upon completion of the 6 alignment steps in Phase 15F, the following validation checklist must pass 100%:

| Check | Target Object | Expected State | Pass Criteria |
| :-: | :--- | :--- | :--- |
| 1 | `profiles.college_id` | Exists (`text`) | Column present |
| 2 | `incidents.college_id` | Exists (`text`) | Column present |
| 3 | `staff_locations` | Exists (`table`) | Table present with RLS enabled |
| 4 | `get_user_college_id()` | Exists (`function`) | Callable, returns text |
| 5 | `is_campus_staff()` | Exists (`function`) | Callable, returns boolean |
| 6 | `evidence.case_id` & `file_path` | Exists | Synced via trigger |
| 7 | Storage bucket `kavach-evidence` | Size limit = 25MB | 26,214,400 bytes, audio types supported |
| 8 | Row counts | Unchanged | 7 profiles, 2 student profiles, 2 incidents preserved |

---

## 4. STOP Condition

> [!IMPORTANT]
> **DO NOT EXECUTE THIS SCRIPT OR APPLY THESE MIGRATIONS AUTOMATICALLY.**
> Phase 15E is strictly an audit and planning phase. Execution will take place exclusively in **Phase 15F** following explicit user authorization.

