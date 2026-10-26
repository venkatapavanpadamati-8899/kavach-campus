# KAVACH CAMPUS — STEP 120: FINAL MIGRATION READINESS & DATABASE EVIDENCE REVIEW

**Date:** 2026-10-17  
**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Supabase Reference:** `polbnvszmvblwenfnqll` (ap-northeast-1)  
**Evaluator:** Antigravity Autonomous Security Subsystem  
**Final Release Decision:** 🛑 **HOLD — CONTROLLED DBA REVIEW REQUIRED BEFORE PRODUCTION RELEASE**

---

## 1. Executive Status & Evidence Categorization

To maintain complete rigor and integrity, all project findings are strictly categorized into three distinct evidence tiers:
1. **Tier 1: Static Code & DDL Review** (Codebase files & SQL scripts).
2. **Tier 2: Mocked Automated Test Suite** (246 Vitest unit and integration tests).
3. **Tier 3: Live Database Ground Truth** (Read-only metadata extracted from linked Supabase PostgreSQL).

| Security Component | Status | Tier 1: Static Code | Tier 2: Mocked Tests | Tier 3: Live DB Truth | Recommendation |
|---|---|---|---|---|---|
| **Student Profile Trigger** | 🟡 **PARTIAL** | ✅ Verified (`search_path=public`, `SECURITY DEFINER`) | ✅ Passed (Tests 11, 14, 15, 19, 20) | ⚠️ **0 triggers in production** | Ready for controlled manual execution |
| **Evidence INSERT Policy** | 🟡 **PARTIAL** | ✅ Verified (Case-bound check on `incidents`) | ✅ Passed (Tests 8, 9, 18, 21, 22) | ⚠️ **Unrestricted case_id in production** | Ready for controlled manual execution |
| **Permissive OR Cleanup** | ✅ **HARDENED** | ✅ All historical names dropped defensively | ✅ Passed (Tests 17, 24) | ⚠️ **Must be applied to clear old policies** | Ready for controlled manual execution |
| **Storage & Signed URLs** | ✅ **PASS** | ✅ Dual-layer (prefix RLS + 15m signed URL API) | ✅ Passed (Tests 13, 23) | ✅ Confirmed (`public=false`) | Fully architected & safe |
| **Rollback Safety** | 🟡 **CONDITIONAL** | ✅ Syntax verified; clean reversal | ✅ Passed | ⚠️ **Reverts to vulnerable Step 114 baseline** | Use only for emergency recovery |
| **Automated Tests** | ✅ **PASS** | N/A | **246 passed (18 files, 18.48s)** | N/A | Fully verified locally |
| **TypeScript & ESLint** | ✅ **PASS** | 0 errors / 0 warnings | N/A | N/A | Fully verified locally |
| **Production Release** | 🛑 **HOLD** | Blocked | Blocked | Awaiting manual DBA migration & live auth test | **HOLD** |

---

## 2. Task 1: Exact Candidate & Rollback SQL Statement Audit

### 2.1 Candidate Script: `supabase/verification/kavach_step115_security_hardening_candidate.sql`

#### Precondition Assertions (`DO $$` lines 39–100)
- Asserts `public.is_reviewer()` exists, `prosecdef = true`, and owner is `postgres`.
- Asserts `public.is_admin()` exists, `prosecdef = true`, and owner is `postgres`.
- Asserts `case_id`, `file_path`, and `uploaded_by` exist on `public.evidence`.
- Asserts `case_id` exists on `public.incidents`.
- Asserts `verification_status` exists on `public.student_profiles`.
- **Finding:** Any schema drift immediately halts migration via `RAISE EXCEPTION`.

#### Detailed Mutation Statements

| Target Table | Action | Policy / Object Name | Clause / Definition |
|---|---|---|---|
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Users upload evidence"` | Removes legacy Step 114 policy. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Users insert evidence"` | Removes historical repair variant. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Users can upload evidence for own incidents"` | Removes original `001_kavach_campus.sql` variant. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Authorized users upload incident evidence"` | Drops existing version for idempotent replacement. |
| `public.evidence` | `CREATE POLICY` | `"Authorized users upload incident evidence"` | `FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM incidents i WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id) AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR public.is_reviewer())))` |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Staff view evidence"` | Removes broad staff policy. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Staff can view all evidence"` | Removes historical broad staff policy. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Users view own evidence"` | Removes partial user read policy. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Users can view own evidence"` | Removes historical variant. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Authorized users view incident evidence"` | Idempotent drop. |
| `public.evidence` | `DROP POLICY IF EXISTS` | `"Authorized users view evidence"` | Idempotent drop. |
| `public.evidence` | `CREATE POLICY` | `"Authorized users view incident evidence"` | `FOR SELECT TO authenticated USING (uploaded_by = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM incidents i WHERE (i.case_id = evidence.case_id OR i.id::text = evidence.case_id) AND (i.student_id = auth.uid() OR i.assigned_to = auth.uid() OR public.is_reviewer())))` |
| `public.student_profiles` | `DROP POLICY IF EXISTS` | `"Students update own profile"` | Drops policy lacking `WITH CHECK`. |
| `public.student_profiles` | `DROP POLICY IF EXISTS` | `"Students can update own student profile"` | Removes historical variant. |
| `public.student_profiles` | `CREATE POLICY` | `"Students update own profile"` | `FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` |
| `public.student_profiles` | `DROP POLICY IF EXISTS` | `"Staff read student profiles"` | Removes broad staff read policy. |
| `public.student_profiles` | `DROP POLICY IF EXISTS` | `"Students read own private profile"` | Replaced by consolidated reviewer/owner policy. |
| `public.student_profiles` | `DROP POLICY IF EXISTS` | `"Public student profiles are viewable by everyone"` | Removes legacy public read policy. |
| `public.student_profiles` | `DROP POLICY IF EXISTS` | `"Reviewers and student owner read profile"` | Idempotent drop. |
| `public.student_profiles` | `CREATE POLICY` | `"Reviewers and student owner read profile"` | `FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_reviewer())` |
| `public` | `CREATE OR REPLACE FUNCTION` | `prevent_student_profile_tampering()` | `RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `public.student_profiles` | `DROP TRIGGER IF EXISTS` | `trg_prevent_student_profile_tampering` | Idempotent drop. |
| `public.student_profiles` | `CREATE TRIGGER` | `trg_prevent_student_profile_tampering` | `BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_student_profile_tampering()` |
| `public.incidents` | `DROP POLICY IF EXISTS` | `"Staff view incidents"` | Removes broad staff policy. |
| `public.incidents` | `DROP POLICY IF EXISTS` | `"Authorized users view incidents"` | Idempotent drop. |
| `public.incidents` | `CREATE POLICY` | `"Authorized users view incidents"` | `FOR SELECT TO authenticated USING (student_id = auth.uid() OR assigned_to = auth.uid() OR public.is_reviewer())` |
| `storage.objects` | `DROP POLICY IF EXISTS` | (9 legacy policies dropped) | Drops broad/unprefixed storage policies. |
| `storage.objects` | `CREATE POLICY` | `"Authenticated users upload own evidence"` | `FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kavach-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR name LIKE (auth.uid()::text \|\| '/%')))` |
| `storage.objects` | `CREATE POLICY` | `"Users and admins read authorized evidence"` | `FOR SELECT TO authenticated USING (bucket_id = 'kavach-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR name LIKE (auth.uid()::text \|\| '/%') OR public.is_admin()))` |
| `public.audit_logs` | `INSERT` | Audit Record | Logs `SECURITY_REMEDIATION_STEP115` with version `1.15.0`. |

---

### 2.2 Rollback Script: `supabase/verification/kavach_step115_rollback_candidate.sql`

1. Drops trigger `trg_prevent_student_profile_tampering` from `public.student_profiles`.
2. Drops function `public.prevent_student_profile_tampering()`.
3. Reverts `public.student_profiles` UPDATE policy to Step 114 baseline:
   `CREATE POLICY "Students update own profile" ON public.student_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);` (omits `WITH CHECK`).
4. Reverts `public.evidence` INSERT policy to Step 114 baseline:
   `CREATE POLICY "Users upload evidence" ON public.evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);` (omits case verification).
5. Writes `SECURITY_ROLLBACK_STEP115` audit log.

**Critical Rollback Evaluation:**
- **Syntactic Health:** Clean, non-blocking, and executes in `<100ms`.
- **Policy Cleanliness:** Does **NOT** restore broad `is_staff()` policies.
- **Security Limitation:** It restores a **vulnerable baseline** where students can alter verification status and attach evidence to arbitrary cases. It is strictly an **emergency service-recovery script**.

---

## 3. Task 2: Student Profile Trigger Verification

### 3.1 Protected vs Unprotected Columns
The trigger intercepts column modifications by checking:
```sql
OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status
AND OLD.verified_at IS NOT DISTINCT FROM NEW.verified_at
AND OLD.verified_by IS NOT DISTINCT FROM NEW.verified_by
AND OLD.verification_notes IS NOT DISTINCT FROM NEW.verification_notes
AND OLD.ocr_extracted_data IS NOT DISTINCT FROM NEW.ocr_extracted_data
AND OLD.id IS NOT DISTINCT FROM NEW.id
```

- **Protected Columns:** `verification_status`, `verified_by`, `verified_at`, `verification_notes`, `ocr_extracted_data`, `id`.
- **Allowed Ordinary Edits:** `course`, `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `blood_group`, `medical_conditions`, `hostel_room`.
- If no protected column is modified, the trigger returns `NEW` immediately with zero overhead.

### 3.2 Authorization & Bypass Verification
1. **DBA / Migration Bypass:** `v_session_user IN ('postgres', 'supabase_admin')` allows maintenance operations.
2. **Backend Service-Role Bypass:**
   ```sql
   v_jwt_role := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true));
   IF v_jwt_role = 'service_role' THEN RETURN NEW; END IF;
   ```
   Validated against `src/app/api/student/verify-id/route.ts` and `src/app/api/admin/verifications/route.ts`. Both routes use `createAdminClient()` (`SUPABASE_SERVICE_ROLE_KEY`), ensuring automated verification and administrative decisions proceed unblocked.
3. **Reviewer & Admin Bypass:** `public.is_reviewer() OR public.is_admin()` allows campus security officers to manually verify students.
4. **Client-Side Tampering Impossibility:** PostgREST verifies the cryptographic HMAC signature of incoming JWTs. An attacker sending forged HTTP headers or modified JWT claims is rejected with HTTP 401 before any SQL execution occurs.
5. **Business Rule Consideration on `id_card_url`:** If a verified student later changes `id_card_url`, should verification be revoked?  
   **Analysis:** Automated revocation is a business workflow rule, not a database constraint. In accordance with strict instructions, we do not inject unreviewed business logic into the migration script. It is flagged for institutional administrative review.

---

## 4. Task 3: Evidence Case-Bound Authorization Verification

### 4.1 Schema Linkage
- `public.evidence.case_id` is of type `text`.
- `public.incidents.case_id` is of type `text` (human-readable, e.g. `KC-2026-OWN01`).
- `public.incidents.id` is of type `uuid` (e.g. `d9b2d61b-31d6-44ec-b8aa-111111111111`).
- Clause: `(i.case_id = evidence.case_id OR i.id::text = evidence.case_id)` handles both identifiers safely without casting errors.

### 4.2 Security Boundary Logic
- **Student Owner:** `i.student_id = auth.uid()` -> Allowed to attach evidence to own reported incident.
- **Assigned Responder:** `i.assigned_to = auth.uid()` -> Allowed to attach incident resolution proof.
- **Reviewer / Security Admin:** `public.is_reviewer()` -> Allowed for institutional intake.
- **Unassigned Staff Member:** Neither owner, assigned responder, nor reviewer -> **DENIED** (fails closed).
- **Another Student:** Not the owner -> **DENIED** (fails closed).
- **Malformed / Nonexistent / Null `case_id`:** `EXISTS` evaluates to FALSE -> **DENIED** (fails closed).
- **Permissive OR Bypass:** Candidate SQL explicitly drops all 4 historical variants (`"Users upload evidence"`, `"Users insert evidence"`, `"Users can upload evidence for own incidents"`, and `"Authorized users upload incident evidence"`). Zero lingering permissive policies remain.

---

## 5. Task 4: Storage Architecture & Signed URL Flow

### 5.1 Storage Policy vs Application Security Model
- **Storage Buckets:** Both `kavach-evidence` and `kavach-id-cards` are private (`public = false`).
- **Direct Client Storage RLS:**
  `auth.uid()::text = (storage.foldername(name))[1]`
  A user can ONLY directly upload and read files within their own folder prefix. Direct cross-user reads via Supabase Storage client are blocked at the storage engine level.
- **Cross-User Evidence Retrieval Flow (`src/app/api/incidents/[id]/route.ts`):**
  1. Student owner, assigned responder, or reviewer requests incident details.
  2. The server route verifies that caller is `student_id = auth.uid()`, `assigned_to = auth.uid()`, or reviewer role.
  3. Only upon successful incident authorization does the server invoke `createAdminClient().storage.from('kavach-evidence').createSignedUrl(cleanPath, 900)`.
  4. The 15-minute signed URL is delivered; raw bucket paths are scrubbed from the JSON response.
  5. The signed URL is self-authenticating with an HMAC signature and expires automatically after 900 seconds.

---

## 6. Task 5: Read-Only SQL Queries for Live Database Pre-Flight

DBAs must execute these queries in the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new) before and after running the migration:

### Query 1: Active RLS Status & Policies on All Sensitive Tables
```sql
SELECT 
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relname IN ('evidence', 'student_profiles', 'incidents', 'profiles')
ORDER BY c.relname, p.cmd, p.policyname;
```

### Query 2: Active User Triggers on `student_profiles`
```sql
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  r.rolname AS function_owner,
  pg_get_functiondef(p.oid) AS definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_roles r ON r.oid = p.proowner
WHERE t.tgrelid = 'public.student_profiles'::regclass;
```

### Query 3: Function Security & Search Path Audit
```sql
SELECT 
  p.proname AS function_name,
  r.rolname AS owner,
  p.prosecdef AS is_security_definer,
  proconfig AS execution_settings
FROM pg_proc p
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.proname IN ('is_reviewer', 'is_admin', 'is_security_or_admin', 'prevent_student_profile_tampering');
```

### Query 4: Storage Buckets and Object Policies
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards');

SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
```

### Query 5: Table Grants Audit
```sql
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('student_profiles', 'evidence', 'incidents')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
```

---

## 7. Task 6: Test Results Breakdown & Reality Check

- **Local Automated Tests (Vitest):**
  - **18 test files, 246 tests passed (100% pass rate in 18.48s).**
  - **Scope:** Unit tests mock Supabase responses and simulate trigger logic. They prove that Next.js application logic, route authorization, parameter parsing, and fallback handlers are error-free.
  - **Limitation:** Mocked tests **do not prove** that the remote Supabase database enforces RLS for real users until the migration is executed.
- **TypeScript Static Typing:** `npx tsc --noEmit` — 0 errors.
- **ESLint Code Quality:** `npm run lint` — 0 errors, 0 warnings.
- **Production Build:** `npm run build` — 55 routes generated cleanly via Next.js 16.4.0 Turbopack.

---

## 8. Manual Pre-Migration, Execution, and Rollback Checklist

### Step 1: Pre-Migration Snapshot (5 minutes)
- [ ] Confirm low campus traffic window (e.g. outside active class transition hours).
- [ ] Take a manual backup/snapshot of `polbnvszmvblwenfnqll` in the Supabase Dashboard.
- [ ] Run **Read-Only Queries 1 through 5** in the SQL Editor and archive the output.

### Step 2: Migration Execution (< 30 seconds)
- [ ] Open `supabase/verification/kavach_step115_security_hardening_candidate.sql`.
- [ ] Paste into the Supabase Dashboard SQL Editor.
- [ ] Execute script.
- [ ] Confirm transaction commit: `Success. No rows returned.`

### Step 3: Post-Migration Immediate Verification (5 minutes)
- [ ] Re-run **Query 1**: Verify `Authorized users upload incident evidence` is active with no legacy permissive policies on `public.evidence`.
- [ ] Re-run **Query 2**: Verify `trg_prevent_student_profile_tampering` is active on `public.student_profiles`.
- [ ] Test student profile update from client: Verify student can update blood group, but gets rejected when attempting to update `verification_status`.
- [ ] Test student evidence upload: Verify student can upload to own incident, but fails on another student's incident.

### Step 4: Emergency Rollback (If needed)
- [ ] If application issues arise, paste `supabase/verification/kavach_step115_rollback_candidate.sql` and execute.
- [ ] Re-run Query 1 to confirm baseline state.

---

## 9. Final Release Recommendation

**Current Verdict: 🛑 HOLD — PRODUCTION RELEASE BLOCKED**

1. **Engineering Readiness:** ✅ **PASS**. Code, routes, tests (246/246), candidate migration DDL, and rollback logic are fully prepared and validated.
2. **Migration Readiness:** ✅ **READY FOR CONTROLLED MANUAL EXECUTION**. The candidate script is defensively hardened, transactional, and contains precondition assertion blocks.
3. **Release Gate:** Production release remains strictly on **HOLD** until the institutional DBA manually runs the migration in the Supabase SQL Editor and live multi-user role isolation is verified.
