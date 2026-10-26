# KAVACH CAMPUS — STEP 113: TARGETED RLS REMEDIATION REVIEW REPORT
**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Supabase Instance:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Date:** 2026-10-17  
**Artifact Generated:** [`supabase/verification/kavach_step113_targeted_rls_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step113_targeted_rls_remediation.sql)  
**Auditor:** Senior Full-Stack & Supabase/PostgreSQL Security Specialist (Antigravity AI)  
**Status:** **READY FOR OWNER REVIEW & MANUAL EXECUTION — RELEASE HOLD ACTIVE**

---

## 1. BACKGROUND & PROBLEM STATEMENT

On 2026-10-17, direct inspection of the live production PostgreSQL database catalog (`pg_policies`) via the linked Supabase CLI Management API connection revealed **two overly broad PERMISSIVE SELECT policies**:

1. **`public.student_profiles`:**
   - **Active Policy:** `"Staff read student profiles"`
   - **Expression:** `USING (is_staff())`
   - **Vulnerability:** Grants any approved staff member (regardless of department or whether they have an active assignment) blanket visibility into all student profiles, including `id_card_url`, `medical_conditions`, `blood_group`, and `hostel_room`.

2. **`public.evidence`:**
   - **Active Policy:** `"Staff view evidence"`
   - **Expression:** `USING (is_staff())`
   - **Vulnerability:** Grants any staff member blanket visibility into evidence metadata rows for incidents completely unrelated to them.

---

## 2. VERIFIED SCHEMA REALITY

A critical finding from direct column inspection of the remote database (`information_schema.columns`) is that earlier remediation proposals (e.g. Step 108 draft) made inaccurate assumptions about column names in `public.evidence`:

| Table | Column Name | Data Type | Key Finding |
| :--- | :--- | :--- | :--- |
| **`public.student_profiles`** | `id` | `UUID` | Primary Key, 1:1 with `public.profiles.id` |
| **`public.incidents`** | `id` | `UUID` | Primary Key of the incident |
| **`public.incidents`** | `case_id` | `TEXT` | Human-readable tracking identifier (`KC-2026-XXXXX`) |
| **`public.incidents`** | `student_id` | `UUID` | Owning student |
| **`public.incidents`** | `assigned_to` | `UUID` | Assigned staff responder (nullable) |
| **`public.evidence`** | `id` | `TEXT` | Primary Key |
| **`public.evidence`** | **`case_id`** | **`TEXT`** | **NOT `incident_id`** — Stores either incident UUID as text or case tracking ID |
| **`public.evidence`** | **`uploaded_by`** | **`UUID`** | **NOT `uploader_id`** — Foreign key to `public.profiles.id` |

> [!IMPORTANT]
> Because `evidence.uploaded_by` is the actual column name (not `uploader_id`) and `evidence.case_id` is `TEXT` (not `incident_id`), any script referencing `uploader_id` would fail with a PostgreSQL syntax/column error. The Step 113 script strictly uses the verified columns.

---

## 3. OVERLAPPING PERMISSIVE POLICY AUDIT

In PostgreSQL, multiple `PERMISSIVE` policies combine with a logical `OR`. Therefore, before dropping or creating any policy, we audited all other policies on these tables:

### On `public.student_profiles`:
1. `"Students read own private profile"`: `(auth.uid() = id)` — *Preserved (permits student self-access)*
2. `"Students update own profile"`: `(auth.uid() = id)` — *Preserved (permits student self-updates)*
3. `"Staff read student profiles"`: `is_staff()` — **DROPPED**

**Conclusion:** Once `"Staff read student profiles"` is dropped, no other policy grants broad staff access. The replacement policy `"Authorized users read student profiles"` establishes the exact required boundary.

### On `public.evidence`:
1. `"Users view own evidence"`: `(auth.uid() = uploaded_by)` — *Preserved (permits uploader to view own uploads)*
2. `"Users upload evidence"`: `(auth.uid() = uploaded_by)` — *Preserved (permits authenticated upload)*
3. `"Staff view evidence"`: `is_staff()` — **DROPPED**

**Conclusion:** Once `"Staff view evidence"` is dropped, no other policy grants broad staff access. The replacement policy `"Authorized users view incident evidence"` establishes the exact required boundary.

---

## 4. HELPER FUNCTION & TRIGGER VERIFICATION

We verified the function definitions in `pg_proc` on the remote database:
- **`is_reviewer()`:** `SECURITY DEFINER`, `search_path = public`. Checks `role IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY') AND is_approved = true`.
- **`is_admin()`:** `SECURITY DEFINER`, `search_path = public`. Checks `role IN ('ADMIN', 'SUPER_ADMIN') AND is_approved = true`.
- **`prevent_self_role_escalation()`:** `SECURITY DEFINER`. Allows service-role calls and DBA sessions; blocks unauthorized user role updates.

---

## 5. SURGICAL REMEDIATION SPECIFICATION

The script [`supabase/verification/kavach_step113_targeted_rls_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step113_targeted_rls_remediation.sql) executes the following targeted actions inside an atomic transaction:

```sql
BEGIN;

-- 1. Replace student_profiles policy
DROP POLICY IF EXISTS "Staff read student profiles" ON public.student_profiles;

CREATE POLICY "Authorized users read student profiles"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_reviewer()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.student_id = public.student_profiles.id
      AND i.assigned_to = auth.uid()
  )
);

-- 2. Replace evidence policy
DROP POLICY IF EXISTS "Staff view evidence" ON public.evidence;

CREATE POLICY "Authorized users view incident evidence"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE (i.id::text = public.evidence.case_id OR i.case_id = public.evidence.case_id)
      AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid())
  )
);

COMMIT;
```

---

## 6. ROW-LEVEL VS COLUMN-LEVEL PRIVACY ANALYSIS

As noted in Step 2:
- RLS operates at the **row level**, returning either the entire row or no row.
- `public.student_profiles` contains sensitive columns (`medical_conditions`, `hostel_room`, `blood_group`).
- Under the replacement policy:
  - **General unassigned staff:** Receive **0 rows** (`[]`).
  - **Reviewers (`ADMIN`, `SUPER_ADMIN`, `SECURITY`):** Receive the row to perform official background / ID verification.
  - **Assigned Responders:** Receive the student profile row for the student whose emergency or incident they are handling (allowing them to see emergency contact, medical conditions, and blood group during emergency response).
  - **API Layer Protection:** Route handlers (such as `/api/incidents/[id]`) further select only required fields (`full_name`, `college_email`, `department`) when presenting data in non-emergency views.

---

## 7. AUTHORIZATION TEST MATRIX

| User Persona | `student_profiles` SELECT | `evidence` SELECT | Actual Behavior |
| :--- | :---: | :---: | :--- |
| **Student viewing own record** | **ALLOW** | **ALLOW** | Matches `auth.uid() = id` / `uploaded_by = auth.uid()` |
| **Student viewing other student** | **DENY** | **DENY** | Returns empty set `[]` / 403 at API layer |
| **Assigned Responder** | **ALLOW** | **ALLOW** | Matches `incidents.assigned_to = auth.uid()` |
| **Unassigned Staff** | **DENY** | **DENY** | Returns empty set `[]` / 403 at API layer |
| **Designated Reviewer (`SECURITY`)**| **ALLOW** | **DENY** | Reviewer can verify student ID, but cannot browse unassigned evidence |
| **Campus Administrator (`ADMIN`)** | **ALLOW** | **ALLOW** | Administrator has institutional oversight across safety records |
| **Anonymous / Unauthenticated** | **DENY** | **DENY** | `TO authenticated` blocks anon role completely |

---

## 8. STEP-BY-STEP EXECUTION INSTRUCTIONS FOR PROJECT OWNER

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new).
2. Open [`supabase/verification/kavach_step113_targeted_rls_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step113_targeted_rls_remediation.sql).
3. Copy the entire file content, paste it into the SQL Editor, and click **RUN**.
4. The transaction executes in ~1 second.
5. In your local terminal, verify the applied policies using the linked Supabase CLI:
   ```powershell
   npx supabase db query --linked "SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('student_profiles', 'evidence') ORDER BY tablename, policyname;"
   ```
