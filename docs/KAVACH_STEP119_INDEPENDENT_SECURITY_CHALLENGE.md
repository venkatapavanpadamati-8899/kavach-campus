# KAVACH CAMPUS — STEP 119: INDEPENDENT SQL SECURITY CHALLENGE REVIEW

**Date:** 2026-10-17  
**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Supabase Reference:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Evaluator:** Antigravity Autonomous Security Subsystem  
**Release Decision:** 🛑 **HOLD — PRODUCTION RELEASE BLOCKED**

---

## 1. Executive Summary & Challenge Matrix

This document independently challenges, stress-tests, and verifies the security conclusions drawn in Step 118 and the candidate migration scripts (`kavach_step115_security_hardening_candidate.sql` and `kavach_step115_rollback_candidate.sql`).

| Challenge Area | Evaluated Status | Static Code Review | Mocked Test Suite | Live Database Evidence | Final Risk Classification |
|---|---|---|---|---|---|
| **Student Profile Trigger** | 🟡 **PARTIAL** | ✅ **PASS** | ✅ **PASS (Tests 11, 14, 15, 19, 20)** | ⚠️ **NOT APPLIED** (Live has 0 triggers) | **Low Implementation Risk; High Migration Priority** |
| **Evidence INSERT Policy** | 🟡 **PARTIAL** | ✅ **PASS** | ✅ **PASS (Tests 8, 9, 18, 21, 22)** | ⚠️ **NOT APPLIED** (Live permits any case_id) | **High Fix Value; Case isolation critical** |
| **Permissive OR Bypass** | ✅ **HARDENED** | ✅ **PASS** | ✅ **PASS (Tests 17, 24)** | ⚠️ **NOT APPLIED** (Must drop all variants) | **Defensively mitigated in candidate SQL** |
| **Storage Architecture** | ✅ **PASS** | ✅ **PASS** | ✅ **PASS (Tests 13, 23)** | ✅ **CONFIRMED** (Buckets are private) | **Low Risk** (Signed URL flow enforced) |
| **Rollback Safety** | 🟡 **CONDITIONAL** | ✅ **PASS** | ✅ **PASS** | ⚠️ **RESTORES VULNERABLE BASELINE** | **Emergency use only; not a safe steady state** |
| **Automated Tests** | ✅ **PASS** | N/A | **246 tests passed (18 files)** | N/A | **Verified locally** |
| **TypeScript & Lint** | ✅ **PASS** | 0 errors / 0 warnings | N/A | N/A | **Verified locally** |
| **Production Release** | 🛑 **HOLD** | Blocked | Blocked | Awaiting manual DBA migration & auth tests | **HOLD** |

---

## 2. Challenge A: Student Profile Protection & Trigger Architecture

### 2.1 Complete Trigger Function Inspection
The candidate trigger function `public.prevent_student_profile_tampering()` enforces column immutability before `UPDATE`:

```sql
CREATE OR REPLACE FUNCTION public.prevent_student_profile_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_session_user text;
BEGIN
  -- 1. Check if server-controlled or immutable columns were modified
  IF (
    OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status
    AND OLD.verified_at IS NOT DISTINCT FROM NEW.verified_at
    AND OLD.verified_by IS NOT DISTINCT FROM NEW.verified_by
    AND OLD.verification_notes IS NOT DISTINCT FROM NEW.verification_notes
    AND OLD.ocr_extracted_data IS NOT DISTINCT FROM NEW.ocr_extracted_data
    AND OLD.id IS NOT DISTINCT FROM NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- 2. Direct superuser / DBA session check (Supabase migrations / SQL Editor)
  v_session_user := session_user;
  IF v_session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 3. Trusted backend service-role API request
  BEGIN
    v_jwt_role := COALESCE(
      auth.role(),
      current_setting('request.jwt.claim.role', true)
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 4. Authenticated institutional reviewer / administrator
  IF public.is_reviewer() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 5. Default Deny
  RAISE EXCEPTION 'Access Denied: Only institutional reviewers or automated verification service can modify student verification status or audit records.';
END;
$$;
```

### 2.2 Live Column Verification
Comparing protected columns against the actual live schema of `public.student_profiles` (confirmed via live information schema):

| Live Column Name | Data Type | Protected by Trigger? | Permitted to Edit by Student? | Security Rationale |
|---|---|---|---|---|
| `id` | `uuid` | ✅ **YES** | ❌ NO | Primary key identity bound to `auth.uid()`. Tampering blocked. |
| `verification_status` | `text` | ✅ **YES** | ❌ NO | Server-controlled status (`VERIFIED`, `REJECTED`, `PENDING_UPLOAD`). |
| `verified_by` | `uuid` | ✅ **YES** | ❌ NO | Audit trail pointing to reviewer administrator account. |
| `verified_at` | `timestamptz` | ✅ **YES** | ❌ NO | Audit timestamp of approval. |
| `verification_notes` | `text` | ✅ **YES** | ❌ NO | Official notes or rejection rationale from reviewer. |
| `ocr_extracted_data` | `jsonb` | ✅ **YES** | ❌ NO | Raw OCR parsing result from server verification workflow. |
| `course` | `text` | ❌ NO | ✅ **YES** | Student academic details editable via profile form. |
| `admission_type` | `text` | ❌ NO | ✅ **YES** | Regular vs Lateral entry selection. |
| `admission_year` | `integer` | ❌ NO | ✅ **YES** | Student enrollment year. |
| `expected_graduation_year` | `integer` | ❌ NO | ✅ **YES** | Student graduation year. |
| `id_card_url` | `text` | ❌ NO | ✅ **YES** | Storage path uploaded by student for reviewer inspection. |
| `blood_group` | `text` | ❌ NO | ✅ **YES** | Emergency medical information. |
| `medical_conditions` | `text` | ❌ NO | ✅ **YES** | Emergency allergy/medical notes. |
| `hostel_room` | `text` | ❌ NO | ✅ **YES** | Campus residential locator. |

### 2.3 JWT Spoofing & Role Manipulation Challenge
- **Can a client manipulate `request.jwt.claim.role` to spoof `service_role`?**  
  **Finding:** **NO.** In PostgREST, `current_setting('request.jwt.claim.role', true)` and `auth.role()` are populated strictly from the claims decoded after cryptographically verifying the HMAC-SHA256 signature using Supabase's `JWT_SECRET`. An untrusted client sending custom HTTP headers or forged claims will receive a `401 Unauthorized` response before any SQL query executes.
- **Can a student execute SQL to set session variables?**  
  **Finding:** **NO.** In PostgREST, SQL injection is prevented by parameterized prepared statements. Clients do not have arbitrary `SET` execution permissions.
- **Trigger behavior for INSERT vs UPDATE:**  
  - The trigger is declared as `BEFORE UPDATE ON public.student_profiles`.
  - Can a student bypass the trigger by performing an `INSERT` with `verification_status = 'VERIFIED'`?
  - **Finding:** **NO.** Row-Level Security on `public.student_profiles` has **NO INSERT policy** for role `authenticated` or `public`. The only allowed operation for clients is `UPDATE` (governed by `"Students update own profile"`). All initial row creation is executed exclusively by `supabaseAdmin` (`service_role`) inside `src/app/api/auth/callback/route.ts` upon initial Google/OTP login. Therefore, direct student `INSERT` fails closed with RLS violation.

### 2.4 Unresolved Edge Case Identified
- **Post-Verification Mutation Risk:** If a student profile is already marked `VERIFIED`, the current trigger prevents modifying `verification_status`, but permits updating `id_card_url` or `admission_year`. While this does not escalate privileges, an updated ID card should ideally reset `verification_status` to `PENDING_MANUAL_REVIEW`.
- **Recommended Future Hardening:** In Step 120, add logic to `prevent_student_profile_tampering`:
  ```sql
  IF OLD.verification_status = 'VERIFIED' AND (OLD.id_card_url IS DISTINCT FROM NEW.id_card_url) THEN
    NEW.verification_status := 'PENDING_MANUAL_REVIEW';
  END IF;
  ```

---

## 3. Challenge B: Evidence INSERT Policy Challenge

### 3.1 Trace of `evidence.case_id` to `incidents`
In the verified database schema:
- `public.evidence`: `case_id text NOT NULL`, `uploaded_by uuid NOT NULL`, `file_path text NOT NULL`.
- `public.incidents`: `id uuid PRIMARY KEY`, `case_id text UNIQUE`, `student_id uuid NOT NULL`, `assigned_to uuid`.

### 3.2 Evaluation of the Candidate Policy
```sql
CREATE POLICY "Authorized users upload incident evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id)
      AND (
        i.student_id = auth.uid()
        OR i.assigned_to = auth.uid()
        OR public.is_reviewer()
      )
  )
);
```

### 3.3 Logical Truth Table Evaluation

| Case Scenario | `evidence.case_id` Format | Caller Identity | `EXISTS` Evaluation | Policy Result | Security Impact |
|---|---|---|---|---|---|
| **Student's own incident** | `KC-2026-OWN01` (Human) | Student owner | `i.student_id = auth.uid()` is **TRUE** | ✅ **ALLOWED** | Expected authorized upload |
| **Student's own incident** | `d9b2d61b-...` (UUID) | Student owner | `i.id::text = evidence.case_id` is **TRUE** | ✅ **ALLOWED** | Dual format support verified |
| **Assigned responder** | `KC-2026-ASSIGNED` | Assigned staff | `i.assigned_to = auth.uid()` is **TRUE** | ✅ **ALLOWED** | First responder attaches proof |
| **Unassigned staff member** | `KC-2026-UNASSIGNED` | General staff | Neither owner nor assigned; `is_reviewer()` = **FALSE** | ❌ **DENIED** | **Blocked** (no cross-case tampering) |
| **Another student's incident** | `KC-2026-VICTIM` | Attacker student | `i.student_id != auth.uid()` | ❌ **DENIED** | **Blocked** (no unauthorized evidence injection) |
| **Nonexistent case_id** | `KC-NONEXISTENT` | Any user | No matching row in `public.incidents` | ❌ **DENIED** | **Blocked** (fails closed) |
| **Null or empty case_id** | `NULL` or `''` | Any user | No match | ❌ **DENIED** | **Blocked** (fails closed) |
| **Reviewer / Security officer** | `KC-2026-ANY` | Security admin | `public.is_reviewer()` is **TRUE** | ✅ **ALLOWED** | Authorized officer attachment |

### 3.4 Permissive Policy OR-Combination Challenge
In PostgreSQL, `PERMISSIVE` policies combine via boolean `OR`. If any broad legacy policy co-exists, the restrictive check is completely bypassed!

**Independent Audit Finding:**
In previous repair scripts, the following policy names were defined on `public.evidence`:
1. `"Users upload evidence"` (`with_check: auth.uid() = uploaded_by`)
2. `"Users insert evidence"`
3. `"Users can upload evidence for own incidents"` (from original `001_kavach_campus.sql`)

**Action Taken in Step 119:**  
`supabase/verification/kavach_step115_security_hardening_candidate.sql` has been updated to explicitly execute `DROP POLICY IF EXISTS` on **all historical names**, including `"Users can upload evidence for own incidents"`, `"Staff can view all evidence"`, and `"Users can view own evidence"`. This guarantees zero legacy policy remnants.

---

## 4. Challenge C: Storage Security Architecture

### 4.1 Storage Policies vs Incident Authorization
- **Is storage folder prefix isolation sufficient by itself?**  
  **Finding:** **NO.** In `storage.objects`:
  - `bucket_id = 'kavach-evidence'`
  - Folder path: `<uploaded_by_uid>/<file-name>.png`
  - The storage table has **no knowledge of `case_id`** or incident relationships.
- **Architecture Evaluation:**
  - **Direct Storage Client Access:** A user can ONLY upload to and read from their own folder prefix (`auth.uid()::text = (storage.foldername(name))[1]`). They cannot directly read other users' evidence files.
  - **Cross-User Incident Access (Assigned Responders & Reviewers):**  
    How does an assigned responder or counsellor view evidence uploaded by a student?  
    **Answer:** Cross-user viewing is mediated strictly by the backend server API route `src/app/api/incidents/[id]/route.ts`.
    1. The API route verifies caller authorization (`student_id`, `assigned_to`, or reviewer role).
    2. If authorized, it calls `createAdminClient().storage.from('kavach-evidence').createSignedUrl(cleanPath, 900)`.
    3. The 15-minute signed URL is returned; the raw bucket path is masked.
    4. If unauthorized, unassigned staff receive `evidence: []` and 403 Forbidden.
  - **Verdict:** This dual-layer defense (client storage prefix + API-mediated signed URLs) is secure and follows defense-in-depth principles.

---

## 5. Challenge D: Rollback Safety Challenge

### 5.1 Review of `kavach_step115_rollback_candidate.sql`
```sql
BEGIN;

-- 1. Rollback trigger on student_profiles
DROP TRIGGER IF EXISTS trg_prevent_student_profile_tampering ON public.student_profiles;
DROP FUNCTION IF EXISTS public.prevent_student_profile_tampering();

-- 2. Revert student_profiles UPDATE policy to Step 114 baseline
DROP POLICY IF EXISTS "Students update own profile" ON public.student_profiles;
CREATE POLICY "Students update own profile"
ON public.student_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 3. Revert evidence INSERT policy to Step 114 baseline
DROP POLICY IF EXISTS "Authorized users upload incident evidence" ON public.evidence;
CREATE POLICY "Users upload evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- 4. Audit rollback execution
...
COMMIT;
```

### 5.2 Rollback Findings
1. **Syntactic Safety:** ✅ **PASS**. It drops the trigger and restores Step 114 baseline policies cleanly without syntax errors or table locks.
2. **Policy Contamination:** ✅ **PASS**. It does **NOT** restore broad `is_staff()` policies on `incidents`, `evidence`, or `student_profiles`.
3. **Security State after Rollback:** ⚠️ **VULNERABLE BASELINE RESTORED**. If rolled back, `student_profiles` once again lacks client update protection on `verification_status`, and `evidence` once again permits uploads with arbitrary `case_id`.
4. **Classification:** Rollback is an **emergency recovery tool for service disruption**, not a secure steady-state configuration.

---

## 6. Challenge E: Local Regression Test Suite Expansion

To independently verify all Step 119 challenges, the regression test suite (`src/__tests__/step115-rls-evidence-hardening.test.ts`) was expanded to **24 comprehensive unit tests**:

- **Test 19:** Trigger simulation: Student cannot alter `verification_notes` or `ocr_extracted_data`.
- **Test 20:** Trigger simulation: Student cannot modify primary key `id`.
- **Test 21:** Evidence INSERT fails closed on `NULL`, empty string, whitespace, or nonexistent `case_id`.
- **Test 22:** Evidence INSERT seamlessly handles both UUID and human-readable `case_id`.
- **Test 23:** Storage direct-access isolation: Users cannot directly read files outside their folder prefix.
- **Test 24:** Defensive drop verification: All historical evidence and student profile policy variants are accounted for.

### Test Execution Results
- **`npm test`**: **18 test files, 246 tests passed** (18.48s).
- **`npx tsc --noEmit`**: **0 errors**.
- **`npm run lint`**: **0 errors / 0 warnings**.
- **`npm run build`**: **55 routes compiled cleanly** with Turbopack.

---

## 7. Challenge F: Live Database Evidence vs Assumptions

| Claim | Evidence Source | Live Ground Truth Status | Verified? |
|---|---|---|---|
| `public.evidence` columns are `case_id`, `file_path`, `uploaded_by` | Live `information_schema` query | Confirmed present in production | ✅ **YES** |
| `public.incidents` columns are `id`, `case_id`, `student_id`, `assigned_to` | Live `information_schema` query | Confirmed present in production | ✅ **YES** |
| `public.student_profiles` has no triggers | Live `pg_trigger` query | Confirmed **0 triggers** in production | ✅ **YES** |
| `public.evidence` INSERT checks case authorization | Static SQL review only | Currently only checks `uploaded_by = auth.uid()` | ❌ **NOT IN PROD** |
| `prevent_student_profile_tampering` trigger is active | Static SQL review only | Not yet created in production | ❌ **NOT IN PROD** |
| Storage buckets are private | Live storage audit | Confirmed `public = false` | ✅ **YES** |

---

## 8. Read-Only Supabase Queries Required for Step 120

Execute these 3 read-only queries in the Supabase SQL Editor before and after applying the candidate migration:

### Query 1: Active RLS Policies
```sql
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('evidence', 'student_profiles', 'incidents')
ORDER BY tablename, cmd, policyname;
```

### Query 2: Active User Triggers
```sql
SELECT 
  tgname AS trigger_name,
  proname AS function_name,
  tgenabled
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid IN (
  'public.student_profiles'::regclass,
  'public.evidence'::regclass
);
```

### Query 3: Storage Bucket & Object Policies
```sql
SELECT 
  id, 
  name, 
  public 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards');

SELECT 
  policyname, 
  permissive, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
```

---

## 9. Final Production Release Verdict

**Current Decision: 🛑 HOLD — PRODUCTION RELEASE BLOCKED**

1. **Local Engineering:** **PASS** (246/246 tests, 0 TypeScript errors, 0 ESLint warnings, 55 routes built).
2. **Candidate SQL Readiness:** **VALIDATED & DEFENSIVELY HARDENED** with historical legacy drops.
3. **Blocker for Release:** Live database policy mutations and trigger installation have **not been applied** to the production database (`polbnvszmvblwenfnqll`).
4. **Next Step:** Manual DBA review of candidate SQL, execution within a single transaction, followed by authenticated multi-user isolation verification.
