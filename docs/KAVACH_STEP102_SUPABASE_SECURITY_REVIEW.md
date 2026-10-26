# KAVACH CAMPUS — STEP 102: SUPABASE SECURITY POLICY REVIEW

**Project:** Kavach Campus — Campus Safety in One Tap  
**Workspace Directory:** `D:\Kavach Campus`  
**Supabase Project Ref:** `polbnvszmvblwenfnqll`  
**Supabase Host URL:** `https://polbnvszmvblwenfnqll.supabase.co`  
**Supabase SQL Editor:** [SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)  
**Read-Only Audit Script:** [`supabase/verification/kavach_step102_readonly_security_audit.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step102_readonly_security_audit.sql)  
**Evaluation Timestamp:** 2026-10-17T12:23:00+05:30  
**Verification Engine:** Antigravity System Security & Quality Preflight Engine  

---

## 1. Executive Summary & Release Verdict

### 🛑 FINAL RELEASE VERDICT: **HOLD (RELEASE GATED)**

Under **STEP 102**, an in-depth security policy review was conducted for Kavach Campus. All 5 local automated quality gates passed with **100% compliance** (188/188 automated tests passing, 0 ESLint errors/warnings, 0 TypeScript compilation errors, 55/55 production routes compiled cleanly, and 0 production dependency vulnerabilities). Furthermore, live anonymous REST probes verified that unauthenticated callers receive empty sets (`[]`) across all sensitive public tables.

However, **Production Release is maintained strictly on HOLD**. In strict adherence to security verification directives:
1. **Live Policy Expressions Await Query Execution:** Neither local tests nor anonymous HTTP probes can prove what an authenticated student can see in Supabase. The exact SQL expressions (`qual` and `with_check`) of the 30 active public policies and 4 storage object policies must be extracted from the live PostgreSQL catalog via the Supabase SQL Editor (**Query A** and **Query B**).
2. **Administrative Key Remains BLOCKED:** `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` remains a placeholder template string. Server routes fail closed with `HTTP 503 Service Unavailable`.
3. **Zero Destructive Actions:** No SQL containing `DROP`, `DELETE`, `TRUNCATE`, or destructive `ALTER` was executed against production. Migrations 005, 006, 007, and 008 were held unexecuted.

```text
================================================================================
STEP 102 MASTER STATUS SCORECARD
================================================================================
- Local Quality Gates (5/5 checks):    100% PASS (test, lint, types, build, audit)
- Unit & Integration Test Suite:      PASS (15 test files, 188 / 188 tests passed)
- ESLint 9 Static Code Linting:       PASS (0 errors, 0 warnings across project)
- TypeScript 6.0.3 Compilation:       PASS (Clean compile, 0 type errors)
- Next.js 16.4.0 Production Build:    PASS (55 / 55 routes generated cleanly)
- Dependency Vulnerability Audit:     PASS (0 vulnerabilities found via npm audit)
- Anonymous REST Table Isolation:     PASS (HTTP 200 [] on all 7 sensitive tables)
- Anonymous Public Storage Access:    PASS (HTTP 400 NoSuchBucket on private buckets)
- Remote Public Policy Expressions:   NOT VERIFIED (Awaiting SQL Editor Query A)
- Storage Object Path Policies:       NOT VERIFIED (Awaiting SQL Editor Query B)
- Service-Role Secret Configuration:  BLOCKED (Contains placeholder template string)
- Standalone Safe Remediation Script: PASS (supabase/verification/kavach_step96_safe_remediation.sql)
- Read-Only Audit SQL Suite:          PASS (supabase/verification/kavach_step102_readonly_security_audit.sql)
- Production Migrations 005-008:      NOT RUN / PROTECTED (Safely held unexecuted)
================================================================================
```

---

## 2. Distinction of Evidence Sources

To ensure transparency and prevent premature claims of security, all findings are categorized by their evidence source:

1. **Locally Verified Findings:** Verified by executing the test runner, compiler, linter, bundler, and npm audit on the local machine.
2. **Remote Database Evidence Observed:** Verified by screenshots and active HTTP probes against `https://polbnvszmvblwenfnqll.supabase.co` (e.g. 27 tables with `rowsecurity = true`, 0 duplicate student IDs, 4 storage policies present, anonymous queries return `[]`).
3. **Source Code / Migration Inferred Findings:** Inferred by static inspection of SQL migration files, API route authorization guards, and client logic.
4. **Findings Still Blocked or Not Verified:** The exact active runtime `qual` (USING) and `with_check` expressions in the production PostgreSQL catalog, which can only be read via the Supabase Dashboard SQL Editor.

---

## 3. Comprehensive Verification Matrix (Task D)

| Table or Endpoint | Policy / Code Location | Observed Evidence | Expected Secure Behavior | Status | Recommended Remediation |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`public.profiles` (Anonymous)** | `GET /rest/v1/profiles` | Returns HTTP 200 `[]` (0 rows) | Anonymous callers cannot read student or staff profiles | **PASS** | None required for anon |
| **`public.profiles` (Authenticated)** | `pg_policies` on `profiles` | 30 policies active in public schema; exact expressions pending | Student sees only `auth.uid() = id`; approved staff see student profiles for duties | **NOT VERIFIED** | Drop legacy `USING (true)` policies; apply `kavach_step96_safe_remediation.sql` Statement 2 |
| **`public.student_profiles`** | `GET /rest/v1/student_profiles` | Returns HTTP 200 `[]` (0 rows); unique query returned 0 duplicates | Isolated to owning student and approved staff | **NOT VERIFIED** (Remote) / **PASS** (Local) | Verify unique constraint on `student_id_number` |
| **`public.incidents` (Anonymous)** | `GET /rest/v1/incidents` | Returns HTTP 200 `[]` (0 rows) | Anonymous callers cannot read incident records | **PASS** | None required for anon |
| **`public.incidents` (Cross-Student)** | `pg_policies` on `incidents` / [`src/app/api/incidents/[id]`](file:///d:/Kavach%20Campus/src/app/api/incidents/[id]/route.ts) | Local test confirms 403 Forbidden; remote policy pending | Student A cannot read Student B incident | **NOT VERIFIED** (Remote) / **PASS** (Local) | Verify remote policy checks `student_id = auth.uid()` |
| **`public.incidents` (Staff Access)** | [`src/app/api/incidents/[id]`](file:///d:/Kavach%20Campus/src/app/api/incidents/[id]/route.ts) | Local test confirms 403 Forbidden for unassigned staff | Unassigned staff cannot view cases assigned to other responders | **NOT VERIFIED** (Remote) / **PASS** (Local) | Staff policy must check assignment or administrative role |
| **`public.incident_locations`** | [`src/app/api/sos/location`](file:///d:/Kavach%20Campus/src/app/api/sos/location/route.ts) | Returns HTTP 200 `[]` to anon; API masks GPS coordinates | Exact GPS masked unless caller is student, assigned responder, or security | **NOT VERIFIED** (Remote) / **PASS** (Local) | Ensure no broad SELECT policy exists on `incident_locations` |
| **`public.evidence`** | `GET /rest/v1/evidence` | Returns HTTP 200 `[]` (0 rows) | Evidence metadata isolated to student owner and case staff | **NOT VERIFIED** (Remote) / **PASS** (Local) | Enforce ownership or assigned incident link |
| **`public.safe_walks`** | `GET /rest/v1/safe_walks` | Returns HTTP 200 `[]` (0 rows) | Telemetry visible only to student owner and assigned emergency staff | **NOT VERIFIED** (Remote) / **PASS** (Local) | Verify `student_id = auth.uid()` |
| **`public.trusted_contacts`** | `GET /rest/v1/trusted_contacts` | Returns HTTP 200 `[]` (0 rows) | Contacts visible only to owning student | **NOT VERIFIED** (Remote) / **PASS** (Local) | Verify `user_id = auth.uid()` |
| **`public.audit_logs`** | `GET /rest/v1/audit_logs` | Returns HTTP 200 `[]` (0 rows) | Read access restricted to `ADMIN` and `SUPER_ADMIN` | **NOT VERIFIED** (Remote) / **PASS** (Local) | Verify `is_admin() = true` on SELECT |
| **`kavach-evidence` (Bucket)** | `storage.buckets` | Screenshot shows private, 10 MiB limit; HTTP probe returns NoSuchBucket | Bucket private; size limits enforced | **PASS** | Verified private bucket |
| **`kavach-id-cards` (Bucket)** | `storage.buckets` | Screenshot shows private, 5 MiB limit; HTTP probe returns NoSuchBucket | Bucket private; size limits enforced | **PASS** | Verified private bucket |
| **`storage.objects` (Evidence)** | `pg_policies` on `storage.objects` | 4 policies active; exact expressions pending | Upload requires folder prefix: `(storage.foldername(name))[1] = auth.uid()::text` | **NOT VERIFIED** | Apply `kavach_step96_safe_remediation.sql` Statement 3 |
| **`storage.objects` (ID Cards)** | `pg_policies` on `storage.objects` | 4 policies active; exact expressions pending | Upload requires folder prefix: `(storage.foldername(name))[1] = auth.uid()::text` | **NOT VERIFIED** | Apply `kavach_step96_safe_remediation.sql` Statement 4 |
| **Self-Role Escalation Trigger** | `trg_prevent_self_role_escalation` | Trigger definition prepared in remediation SQL | Ordinary users cannot update their own role or `is_approved` | **NOT VERIFIED** | Apply `kavach_step96_safe_remediation.sql` Statement 5 |
| **SECURITY DEFINER Functions** | `pg_proc` search_path | Function templates have `SET search_path = public` | Pinned search path prevents search-path hijacking | **NOT VERIFIED** | Apply `kavach_step96_safe_remediation.sql` Statement 1 |
| **Cron Secret Validation** | [`src/app/api/cron/escalate`](file:///d:/Kavach%20Campus/src/app/api/cron/escalate/route.ts) | Tested with mock headers; rejects `undefined` | Fails closed if `CRON_SECRET` is unset | **PASS** | Code hardened and tested |
| **Admin Route Fail-Closed** | 5 admin routes | Tested with mock client; returns HTTP 503 | Fails closed gracefully if service-role key is unconfigured | **PASS** | Code hardened and tested |
| **Deterministic SOS Fallback** | [`src/app/api/incidents`](file:///d:/Kavach%20Campus/src/app/api/incidents/route.ts) | 12 tests verify keywords in English, Telugu, Hindi | Critical keywords immediately set severity to CRITICAL | **PASS** | Fully tested and verified |

---

## 4. Analysis of Storage Path Conventions & Bucket Isolation

The application source code was audited for all Supabase Storage interactions:

1. **Evidence Uploads (`kavach-evidence`):**
   - The client constructs paths using the authenticated user's ID:
     `${user.id}/${Date.now()}-${file.name}`
   - Expected policy check on `INSERT`:
     ```sql
     WITH CHECK (
       bucket_id = 'kavach-evidence'
       AND (
         (storage.foldername(name))[1] = auth.uid()::text
         OR name LIKE (auth.uid()::text || '/%')
       )
     )
     ```
2. **ID Card Uploads (`kavach-id-cards`):**
   - The client uploads student ID cards under:
     `${user.id}/id-card-${Date.now()}.${ext}`
   - Expected policy check on `INSERT`:
     ```sql
     WITH CHECK (
       bucket_id = 'kavach-id-cards'
       AND (
         (storage.foldername(name))[1] = auth.uid()::text
         OR name LIKE (auth.uid()::text || '/%')
       )
     )
     ```
3. **Read Access (`SELECT`):**
   - Must be restricted to the file owner (`auth.uid()::text = (storage.foldername(name))[1]`) or institutional responders holding approved staff/admin roles (`public.is_staff()`).

---

## 5. Read-Only SQL Audit Suite (Prepared for Owner Execution)

The complete read-only SQL script has been prepared at:  
👉 [`supabase/verification/kavach_step102_readonly_security_audit.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step102_readonly_security_audit.sql)

It contains 10 structured sections covering:
1. Public tables and RLS enabled status (`pg_tables`).
2. All public policy expressions (`pg_policies`).
3. Storage object policies (`storage.objects`).
4. Storage bucket settings (`storage.buckets`).
5. Policies granted to `anon` or `public` roles.
6. Permissive policy OR-combination risks.
7. SECURITY DEFINER function definitions and `search_path`.
8. Active triggers on sensitive tables (`pg_trigger`).
9. Unique constraints on `student_profiles` (`information_schema.table_constraints`).
10. Application-referenced columns in public tables.

---

## 6. Verified Local Quality Check Results

```text
================================================================================
STEP 102 LOCAL QUALITY GATES EXECUTION DETAILS
================================================================================
1. Vitest Test Suite (npm test):
   - Command:       npm test (vitest run)
   - Results:       15 test files passed (15 / 15)
   - Tests:         188 tests passed (188 / 188)
   - Execution:     14.73s
   - Exit Code:     0 (PASS)

2. ESLint Static Code Analysis (npm run lint):
   - Command:       npm run lint (eslint .)
   - Results:       0 errors, 0 warnings across all TypeScript and React files
   - Exit Code:     0 (PASS)

3. TypeScript Compiler Check (npx tsc --noEmit):
   - Command:       npx tsc --noEmit
   - Results:       Clean compile, 0 type errors
   - Exit Code:     0 (PASS)

4. Production Turbopack Build (npm run build):
   - Command:       npm run build (next build)
   - Results:       55 / 55 routes compiled cleanly
   - Exit Code:     0 (PASS)

5. Production Dependency Audit (npm audit --omit=dev):
   - Command:       npm audit --omit=dev
   - Results:       found 0 vulnerabilities
   - Exit Code:     0 (PASS)
================================================================================
```

---

## 7. Next Action Required from Project Owner

To finalize the remote security verification without making unapproved database modifications, execute these two read-only queries in the **[Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)**:

### Query A — Database RLS Policies
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
ORDER BY tablename, policyname;
```

### Query B — Storage Policies
```sql
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
ORDER BY policyname;
```

---

## 8. Final Release Decision

### Verdict: 🛑 **RELEASE HOLD**

**Conditions to Unlock Release:**
1. The project owner shares the text or screenshots of **Query A** and **Query B**.
2. Verification confirms that no `USING (true)` or `WITH CHECK (true)` policies exist on sensitive tables (`profiles`, `incidents`, `evidence`) that allow authenticated students to view peers' private records.
3. Verification confirms that `storage.objects` upload policies enforce folder path matching (`auth.uid()`).
4. Genuine credentials (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GEMINI_API_KEY`) are populated in Vercel.
