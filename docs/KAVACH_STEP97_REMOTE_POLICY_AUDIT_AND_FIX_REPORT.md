# KAVACH CAMPUS — STEP 97: REMOTE RLS POLICY AUDIT AND SAFE COMPLETION REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace Directory:** `D:\Kavach Campus`  
**Supabase Project Ref:** `polbnvszmvblwenfnqll`  
**Supabase Host URL:** `https://polbnvszmvblwenfnqll.supabase.co`  
**Supabase SQL Editor:** [SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)  
**Framework & Platform:** Next.js 16.4.0 (Turbopack, App Router) | React 19.3.0 | TypeScript 6.0.3 | Vitest 5.0.3 | ESLint 9.39.5 | Supabase CLI 2.121.0  
**Audit Step:** STEP 97 — Remote RLS Policy Audit, Storage Security, and Safe Completion  
**Evaluation Date:** 2026-10-17  
**Auditor / Verification Engine:** Antigravity System Security & Quality Preflight Engine  

---

## 1. Executive Summary & Current Status Scorecard

Under **STEP 97**, a thorough static and defensive review was conducted across the database schema, all active policy definitions, storage authorization rules, API endpoints, background jobs, and the STEP 96 safe remediation script.

### 🛑 FINAL RELEASE VERDICT: **HOLD (RELEASE GATED)**

While the local application source code achieved **100% PASS** across all five quality gates (188/188 automated tests passing, 0 ESLint errors/warnings, 0 TypeScript errors, 55/55 production routes compiled, 0 vulnerable dependencies), **Production Release is maintained strictly on gating status (HOLD)** pending user-supplied output from the remote database catalog query.

```text
================================================================================
STEP 97 MASTER STATUS SCORECARD
================================================================================
- Local Quality Gates (Rerun):        100% PASS (5 / 5 quality checks verified)
- Unit & Integration Test Suite:      PASS (15 test files, 188 / 188 tests passed)
- ESLint 9 Static Code Linting:       PASS (0 errors, 0 warnings across project)
- TypeScript 6.0.3 Compilation:       PASS (Clean compile, 0 type errors)
- Next.js 16.4.0 Production Build:    PASS (55 / 55 routes generated cleanly)
- Dependency Security Audit:          PASS (0 vulnerabilities found via npm audit)
- Local Secret Protection:            PASS (Zero keys/secrets leaked or printed)
- Cron Authorization Hardening:       PASS (Bearer undefined bypass closed & tested)
- Remote RLS Enabled Status:          PARTIAL (27 tables show RLS = true in screenshot)
- Remote Policy Expressions:          NOT VERIFIED (Awaiting SQL Editor results)
- Storage Bucket Privacy:             PASS (kavach-evidence & kavach-id-cards private)
- Storage File Size Limits:           PASS (Evidence: 10 MiB, ID Cards: 5 MiB)
- Storage Object Policies:            NOT VERIFIED (Folder path prefix checks pending)
- Duplicate Student IDs:              PASS (Query returned 0 rows in SQL Editor)
- Local Service-Role Credential:      BLOCKED (Contains placeholder template string)
- Step 96 Remediation Safety Review:  PASS (Detailed compatibility audit completed)
- Production Migrations 005-008:      NOT RUN / PROTECTED (Safely held unexecuted)
================================================================================
```

---

## 2. In-Depth Statement-by-Statement Review of the Remediation File

The remediation script [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql) was reviewed line-by-line for compatibility with existing application queries and legitimate workflows:

### A. Helper Functions (`is_staff` and `is_admin`)
```sql
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'PRINCIPAL')
      AND is_approved = true
  );
$$;
```
- **Security Definer & Pinned Search Path:** Explicitly pins `SET search_path = public`, eliminating search-path injection vulnerabilities.
- **Role Alignment:** Expanded to cover all institutional responder roles (`STAFF`, `SECURITY`, `ADMIN`, `SUPER_ADMIN`, `COUNSELLOR`, `WOMENS_CELL`, `HOD`, `PRINCIPAL`), preventing legitimate counsellors and department heads from being locked out.
- **Approval Check:** Requires `is_approved = true`, ensuring unapproved staff cannot view student data.

### B. Profiles Read Scoping (`public.profiles`)
```sql
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile and staff read student profiles" ON public.profiles;

CREATE POLICY "Users read own profile and staff read student profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.is_staff()
);
```
- **Elimination of Universal Exposure:** Drops legacy policies with `USING (true)` from migration 001.
- **PostgreSQL Permissive Policy OR Semantics:** If a legacy policy `USING (true)` remains active on the table, PostgreSQL combines policies using `OR`: `(auth.uid() = id OR is_staff()) OR (true) = true`. Therefore, dropping legacy policies is mandatory.
- **Workflow Compatibility:**
  - Student reading own profile (`/student/profile`): `auth.uid() = id` evaluates to `true`.
  - Staff inspecting student contact for assigned case (`/staff/incidents/[id]`): `is_staff()` evaluates to `true`.
  - Student reading another student's profile: Evaluates to `false` -> **ACCESS DENIED**.
  - Anonymous visitor: Evaluates to `false` -> **ACCESS DENIED**.

### C. Evidence Storage Path Enforcement (`kavach-evidence`)
```sql
CREATE POLICY "Authenticated users upload own evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kavach-evidence'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
  )
);
```
- **Folder Path Isolation:** Guarantees that Student A (`auth.uid() = 123...`) cannot upload files to Student B's folder (`987.../evidence.jpg`).
- **Read Scoping:** Allows owning student and approved staff to view evidence, while blocking third-party students and anonymous users.

### D. ID Card Storage Path Enforcement (`kavach-id-cards`)
```sql
CREATE POLICY "Authenticated users upload own id card"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kavach-id-cards'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE (auth.uid()::text || '/%')
  )
);
```
- **ID Card Privacy:** Strictly limits uploads and reads to the owning student or authorized reviewer staff.

### E. Self-Role Escalation Prevention Trigger
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
- **Tampering Defense:** If a student executes `UPDATE profiles SET role = 'ADMIN'` or `is_approved = true`, the trigger raises an exception and aborts the transaction.
- **Legitimate Updates Preserved:** Updates to `phone`, `full_name`, or `student_id` by the student proceed normally because `OLD.role` and `OLD.is_approved` remain unchanged.

---

## 3. Inspection of the 30 Reported Public Policies

The screenshot confirmed **30 active policies** in the `public` schema. Without the exact output of `pg_policies`, the policies are categorized below based on migration architecture:

| Table Name | Expected Minimum Policies | Core Risk If Policy Missing or Broad | Verification Status |
| :--- | :--- | :--- | :---: |
| `profiles` | SELECT (own + staff), UPDATE (own) | Legacy `USING (true)` exposes all student contact data | **NOT VERIFIED** |
| `student_profiles` | SELECT (own + staff), INSERT (own), UPDATE (own) | ID card URL and admission details readable campus-wide | **NOT VERIFIED** |
| `staff_profiles` | SELECT (authenticated), UPDATE (own) | Department and responder availability exposed | **NOT VERIFIED** |
| `incidents` | SELECT (own + staff), INSERT (own), UPDATE (staff) | Student A reading Student B's confidential complaints | **NOT VERIFIED** |
| `incident_locations`| SELECT (own + staff), INSERT (own) | Live GPS coordinates of victim exposed to unauthorized users | **NOT VERIFIED** |
| `evidence` | SELECT (own + staff), INSERT (own) | Private photo/audio evidence metadata readable by peers | **NOT VERIFIED** |
| `safe_walks` | SELECT (own), INSERT (own), UPDATE (own) | Night-walk destination and tracking exposed | **NOT VERIFIED** |
| `trusted_contacts` | SELECT (own), INSERT (own), UPDATE/DELETE (own) | Personal emergency contact phone numbers leaked | **NOT VERIFIED** |
| `escalations` | SELECT (staff), INSERT (staff/system) | Operational escalation notes visible to public | **NOT VERIFIED** |
| `case_actions` | SELECT (staff + student for non-internal), INSERT (staff) | Internal investigation logs exposed to students | **NOT VERIFIED** |
| `notifications` | SELECT (own), UPDATE (own) | Notifications containing case IDs leaked to other users | **NOT VERIFIED** |
| `audit_logs` | SELECT (admin only), INSERT (system only) | Security logs readable or modifiable by ordinary users | **NOT VERIFIED** |
| `ai_configuration` | SELECT (admin), UPDATE (admin) | AI prompt templates tampered with | **NOT VERIFIED** |
| `emergency_configuration` | SELECT (authenticated/public), UPDATE (admin) | Campus emergency hotline numbers redirected | **NOT VERIFIED** |

*Note: In accordance with safety rules, remote policy expressions are marked `NOT VERIFIED` until the owner provides the query output from Supabase SQL Editor.*

---

## 4. Storage Security Inspection (`storage.objects`)

| Bucket ID | Public Access | File Size Limit | Allowed MIME Types | Storage Object Policies | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `kavach-evidence` | `false` (Verified) | 10 MiB (Verified) | JPEG, PNG, WEBP, PDF, MP4 | 4 policies visible in screenshot | **PARTIAL** |
| `kavach-id-cards` | `false` (Verified) | 5 MiB (Verified) | JPEG, PNG, WEBP, PDF | 4 policies visible in screenshot | **PARTIAL** |

**Critical Security Caveat:**
- Setting `public = false` blocks unauthenticated direct URL access (e.g. `https://.../storage/v1/object/public/...`).
- However, authenticated access to private buckets is governed by policies on `storage.objects`.
- If an INSERT policy on `storage.objects` uses only `WITH CHECK (bucket_id = 'kavach-evidence')` without checking the path prefix, any authenticated user can upload or overwrite files anywhere in the bucket!
- The exact condition in your 4 visible storage policies must be confirmed using Check 12 of `kavach_step96_remote_readonly_audit.sql`.

---

## 5. API Server-Side Authorization Audit

All application API endpoints enforce strict server-side authorization:

1. **Incident Access Boundary (`src/app/api/incidents/[id]/route.ts`):**
   ```typescript
   // Line 44: Strictly blocks student from reading another student's case
   if (userProfile?.role === 'STUDENT' && incident.student_id !== user.id) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```
2. **SOS Case Creation (`src/app/api/sos/route.ts`):**
   ```typescript
   // Line 33: student_id is derived from authenticated session, not request body
   const { data: { user } } = await supabase.auth.getUser();
   student_id: user.id
   ```
3. **Safe Walk Creation (`src/app/api/safe-walk/start/route.ts`):**
   ```typescript
   // Derived directly from user.id; validates duration between 5 and 180 minutes
   student_id: user.id
   ```
4. **User Role Approval (`src/app/api/admin/users/approve/route.ts`):**
   - Requires caller to hold `ADMIN` or `SUPER_ADMIN`.
   - Requires `is_approved = true`.
   - Explicitly forbids promoting any user to `SUPER_ADMIN` via the approval endpoint.
   - Requires `SUPER_ADMIN` authorization to approve `ADMIN` accounts.
5. **Background Cron Authentication (`src/app/api/cron/*`):**
   - Remediated in STEP 96. Requires truthy `CRON_SECRET` and exact `Bearer` token match.

---

## 6. Execution Results of All Five Quality Gates

```text
================================================================================
STEP 97 QUALITY GATES RE-EXECUTION RESULTS
================================================================================
1. Vitest Test Suite (npm test):
   - Command:       npm test (vitest run)
   - Results:       15 test files passed (15 / 15)
   - Tests:         188 tests passed (188 / 188)
   - Execution Time: 14.78s
   - Status:        PASS

2. ESLint Static Code Analysis (npm run lint):
   - Command:       npm run lint (eslint .)
   - Results:       0 errors, 0 warnings
   - Status:        PASS

3. TypeScript Compiler Check (npx tsc --noEmit):
   - Command:       npx tsc --noEmit
   - Results:       0 type errors
   - Status:        PASS

4. Production Turbopack Build (npm run build):
   - Command:       npm run build (next build)
   - Results:       55 / 55 routes compiled cleanly
   - Status:        PASS

5. Production Dependency Audit (npm audit --omit=dev):
   - Command:       npm audit --omit=dev
   - Results:       found 0 vulnerabilities
   - Status:        PASS
================================================================================
```

---

## 7. Service-Role Configuration & Secret Management

- **Local State:** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` remains a placeholder template string.
- **Defensive Behavior:** Application endpoints (`/api/auth/register`, `/api/admin/verifications`, `/api/system/health`) safely detect the placeholder and return `HTTP 503 Service Unavailable`, preventing internal stack trace disclosure.
- **Strict Constraint:** Never paste service-role keys or database credentials into chat. Configure them directly in your secure hosting environment (Vercel Project Settings) and your local `.env.local`.

---

## 8. Exact Read-Only SQL Query for Owner Execution

To complete the remote policy inspection, open your [Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new) and run this exact query:

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

Also check the 4 storage policies:
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

## 9. Final Release Recommendation

### Release Recommendation: 🛑 **HOLD (RELEASE GATED)**

**Justification:**
1. **Remote RLS Verification is Pending:** The 30 public policies and 4 storage policies active on your production database have not yet been inspected for broad `USING (true)` expressions or missing folder ownership checks.
2. **Administrative Credential is Pending:** `SUPABASE_SERVICE_ROLE_KEY` in local configuration is still a placeholder.
3. **Path to Production Release:** Once you run the SQL query above and paste the results (or screenshot) into chat:
   - We will verify whether any policy is overly broad.
   - If legacy policies are found, running [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql) will surgically resolve them.
   - Production release can then immediately transition to **APPROVED FOR RELEASE**.
