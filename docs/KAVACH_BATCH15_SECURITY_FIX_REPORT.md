# KAVACH CAMPUS — BATCH 15: TARGETED SECURITY FIX & REGRESSION REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Target:** Local PostgreSQL Test Database (`localhost:54322`, Database: `postgres`, User: `postgres`)  
**Date:** October 18, 2026  
**Execution Environment:** Isolated Local Docker PostgreSQL (`supabase_db_kavach_campus`, bridge `172.18.0.2`)  
**Production Status:** **STRICT RELEASE HOLD MAINTAINED**  
**Remote Supabase Access:** **0 Calls — Remote Production (`polbnvszmvblwenfnqll`) was strictly untouched.**

---

## 1. Executive Summary

In Batch 15, the confirmed high-severity policy recursion defect (`SQLSTATE: 42P17: infinite recursion detected in policy for relation "profiles"`) on `public.profiles` was reproduced, surgically isolated, and permanently resolved in the local PostgreSQL test suite.

A comprehensive regression suite of **14 native PostgreSQL integration tests** was designed and executed against the live local containerized PostgreSQL engine. All 14 tests passed with zero failures. Following this, the complete application regression suite was executed across unit testing, TypeScript compilation, ESLint, and Next.js 16 production build.

All gates passed with exit code 0.

---

## 2. Phase 1 — Defect Reproduction and Inventory

### 2.1 Table and RLS Inventory
* **Table:** `public.profiles`
* **RLS Status:** `relrowsecurity: true`, `relforcerowsecurity: false`
* **Triggers:**
  * `update_profiles_updated_at` (`BEFORE UPDATE FOR EACH ROW`)
  * `trg_prevent_self_role_escalation` (`BEFORE UPDATE FOR EACH ROW`)
* **Active Policies (Pre-Fix):**
  1. `"Users can read own profile"` (`FOR SELECT USING (auth.uid() = id)`)
  2. `"Users can update own profile"` (`FOR UPDATE USING (auth.uid() = id)`)
  3. `"Staff can read all profiles"` (`FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')))`

### 2.2 Exact Query & Reproduction of Error 42P17
When an authenticated user (`Student A`, id `11111111-1111-4111-a111-111111111111`) executed an `UPDATE` on `profiles`:
```sql
UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = '11111111-1111-4111-a111-111111111111'
RETURNING *;
```

**Observed Result (Before Fix):**
* **SQLSTATE:** `42P17`
* **Message:** `infinite recursion detected in policy for relation "profiles"`
* **Location:** PostgreSQL Query Rewriter (`fireRIRrules` in `rewriteHandler.c:2262`)
* **Mechanism:**
  1. `UPDATE ... RETURNING` evaluates a `SELECT` projection on `public.profiles`.
  2. The query rewriter expands the `SELECT` policy `"Staff can read all profiles"`.
  3. That policy contains an inline subquery: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() ...)`.
  4. Evaluating `SELECT` on `profiles` again requires expanding `"Staff can read all profiles"`, creating an unbounded recursive rewrite loop that exhausts recursion depth and triggers `42P17`.

---

## 3. Phase 2 — Root Cause Analysis and Minimal Safe Fix

### 3.1 Root Cause
1. **Inline Self-Referencing Subquery:** The policy `"Staff can read all profiles"` defined in `001_kavach_campus_final.sql` directly queried `public.profiles` without bypassing RLS.
2. **Missing `is_approved` Guard:** The inline subquery also omitted `is_approved = true`, which would have permitted unapproved staff accounts to read student profiles.

### 3.2 Designed Resolution
1. **Encapsulate Check in `public.is_staff()`:**
   * Declared as `SECURITY DEFINER`
   * Set `search_path = public`
   * Owned by `postgres` (which possesses PostgreSQL superuser `BYPASSRLS`)
   * Requires `role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN') AND is_approved = true`
2. **Policy Reconstruction:**
   * Drop the recursive inline subquery policy `"Staff can read all profiles"`.
   * Recreate `"Staff can read all profiles"` on `public.profiles` using `FOR SELECT TO authenticated USING (public.is_staff())`.
3. **Why This Breaks the Loop:**
   * When `is_staff()` executes `SELECT 1 FROM public.profiles WHERE id = auth.uid() ...`, PostgreSQL runs the query with the privileges of its owner (`postgres`).
   * Because `postgres` has `BYPASSRLS`, RLS policies are **not evaluated** on the subquery.
   * The function evaluates in a single step and returns a boolean value without triggering query rewriter recursion.
   * Restricting the policy `TO authenticated` prevents anonymous evaluation.

### 3.3 Proposed SQL Diff
```diff
- DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;
- CREATE POLICY "Staff can read all profiles" ON profiles FOR SELECT USING (
-     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'))
- );

+ CREATE OR REPLACE FUNCTION public.is_staff()
+ RETURNS boolean
+ LANGUAGE sql
+ STABLE
+ SECURITY DEFINER
+ SET search_path = public
+ AS $$
+   SELECT EXISTS (
+     SELECT 1 FROM public.profiles
+     WHERE id = auth.uid()
+       AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
+       AND is_approved = true
+   );
+ $$;
+ ALTER FUNCTION public.is_staff() OWNER TO postgres;
+ REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
+ GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
+ 
+ DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
+ CREATE POLICY "Staff can read all profiles"
+   ON public.profiles
+   FOR SELECT
+   TO authenticated
+   USING (public.is_staff());
```

### 3.4 Security Analysis
* **Student Self-Access:** Preserved via `"Users can read own profile"` (`auth.uid() = id`) and `"Users can update own profile"` (`auth.uid() = id`).
* **Staff Access:** Strictly gated by `is_approved = true`. Unapproved staff cannot read other user profiles.
* **Role Tampering:** Prevented by `trg_prevent_self_role_escalation`. Direct student attempts to elevate role throw `P0001: Access Denied: Only administrators can modify roles or approval status.` instead of crashing with `42P17`.
* **Anonymous Access:** Denied. Anonymous users receive 0 rows from `profiles` and `student_profiles`.

---

## 4. Phase 3 — Local Database Verification Results

### 4.1 Before vs. After Evidence
| Test Vector | Before Fix (Batch 14) | After Fix (Batch 15) | Resolution Status |
| :--- | :--- | :--- | :--- |
| Student Self-Role Escalation (`role = 'ADMIN'`) | `ERROR: 42P17: infinite recursion detected in policy for relation "profiles"` | `ERROR: P0001: Access Denied: Only administrators can modify roles or approval status.` | ✅ **RESOLVED** (No recursion, clean trigger denial) |
| Ordinary Profile Update (`full_name`) | `ERROR: 42P17` on `RETURNING` projection | `1 row affected` (`full_name` updated cleanly) | ✅ **RESOLVED** |
| Staff Read All Profiles | Failed with `42P17` | `5+ rows returned` for approved staff | ✅ **RESOLVED** |
| Unapproved Staff Read Profiles | Blocked by recursion failure | `0 rows returned` (Cleanly isolated) | ✅ **RESOLVED** |

### 4.2 Complete 14-Test Integration Matrix
All 14 tests were executed against the isolated local containerized PostgreSQL test instance via `npx tsx scripts/run_real_postgres_tests.ts`.

| # | Test Title | Expected Behavior | Observed Result | Status |
| :-: | :--- | :--- | :--- | :-: |
| 1 | Student cannot modify `verification_status` | Trigger `trg_prevent_student_profile_tampering` raises `P0001` | Caught `P0001: Access Denied` | ✅ **PASS** |
| 2 | Student cannot modify `verified_by` or `verified_at` | Trigger raises `P0001` | Caught `P0001: Access Denied` | ✅ **PASS** |
| 3 | Student cannot modify OCR verification data | Trigger raises `P0001` | Caught `P0001: Access Denied` | ✅ **PASS** |
| 4 | Student can update permitted ordinary profile fields | `blood_group`, `medical_conditions`, `hostel_room` update | 1 row updated | ✅ **PASS** |
| 5 | Unassigned staff cannot read unrelated incident locations | Table RLS filters unrelated incident coordinates | 0 rows returned | ✅ **PASS** |
| 6 | Assigned responder can access authorized locations | Table RLS returns only assigned incident coordinates | Exactly 1 authorized location returned | ✅ **PASS** |
| 7 | Unauthorized evidence upload is rejected | Table RLS `WITH CHECK` raises `42501` | Caught `42501` RLS violation | ✅ **PASS** |
| 8 | Reviewer direct client update on `student_profiles` blocked | Least privilege `auth.uid() = id` blocks cross-user updates | 0 rows affected | ✅ **PASS** |
| 9 | Student self-role escalation blocked without recursion | Trigger raises `P0001`, SQLSTATE is NOT `42P17` | Caught `P0001`, zero recursion | ✅ **PASS** |
| 10 | Permitted ordinary profile update on `public.profiles` | Legitimate profile updates succeed | 1 row updated, field verified | ✅ **PASS** |
| 11 | Cross-student private profile isolation | Student A cannot read Student B private data | 0 rows returned | ✅ **PASS** |
| 12 | Anonymous role access denied | Role `anon` reads 0 rows on profiles and student_profiles | 0 rows returned from both tables | ✅ **PASS** |
| 13 | Approved staff can read profiles | Approved staff can inspect profiles for incident handling | 6 profiles returned | ✅ **PASS** |
| 14 | Unapproved staff cannot read other profiles | Unapproved staff (`is_approved = false`) denied access | 0 rows returned | ✅ **PASS** |

---

## 5. Phase 4 — Regression Quality Gates

| Quality Gate | Command Executed | Exit Code | Result Summary | Status |
| :--- | :--- | :-: | :--- | :-: |
| **Vitest Unit Suite** | `npm test` | **0** | 22/22 test files passed, 296/296 unit tests passed (23.24s) | ✅ **PASS** |
| **TypeScript Static Analysis** | `npx tsc --noEmit` | **0** | Clean compile across all modules, zero errors | ✅ **PASS** |
| **ESLint Code Quality** | `npm run lint` | **0** | Zero lint errors, zero warnings | ✅ **PASS** |
| **Turbopack Production Build** | `npm run build` | **0** | 59/59 static & dynamic routes compiled successfully | ✅ **PASS** |
| **Native PostgreSQL Suite** | `npx tsx scripts/run_real_postgres_tests.ts` | **0** | 14/14 tests passed on local Docker PostgreSQL engine | ✅ **PASS** |

---

## 6. Safety Audit Confirmation

1. **Remote Database Safety:** Remote Supabase project `polbnvszmvblwenfnqll` was **NEVER** contacted, connected to, or modified.
2. **Local Port & Database Isolation:** Confirmed local execution on `localhost:54322`, Database `postgres`, Container Host IP `172.18.0.2`.
3. **Zero Administrative Elevation:** No synthetic or real accounts were promoted to `ADMIN` or `SUPER_ADMIN`.
4. **Migration File Preservation:** Zero migration files under `supabase/migrations/` were deleted, renamed, or reordered.
5. **Working Tree Integrity:** All unrelated working tree modifications were strictly preserved.

---

## 7. Deferred Tasks & Release Recommendation

### 7.1 Explicitly Deferred Tasks
* **Batch 16 — Storage Bucket Authorization Verification:**
  * Direct HTTP verification of private buckets `kavach-evidence` and `kavach-id-cards`.
  * Verifying signed URL expiry and fail-closed API error handling.
* **Batch 17 — Migration Strategy & Duplicate Version Reconciliation:**
  * Reconciling duplicate migration versions (`001`, `002`, `008`) between local repository and remote migration history before any production migration occurs.

### 7.2 Release Decision
**PRODUCTION DEPLOYMENT STATUS: STRICT RELEASE HOLD**

The recursion defect `42P17` on `public.profiles` is now verified and resolved locally. However, production release remains on **STRICT HOLD** until:
1. Storage bucket security (Batch 16) is fully verified.
2. Migration duplication reconciliation (Batch 17) is planned and reviewed.
3. Pre-migration approval is explicitly granted.
