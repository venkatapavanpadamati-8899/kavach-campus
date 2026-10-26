# KAVACH CAMPUS — STEP 94: RLS REMOTE SECURITY VERIFICATION AND COMPLETION REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace Directory:** `D:\Kavach Campus`  
**Supabase Project Ref:** `polbnvszmvblwenfnqll`  
**Supabase Host URL:** `https://polbnvszmvblwenfnqll.supabase.co`  
**Supabase Dashboard:** [Project Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll)  
**Supabase SQL Editor:** [SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)  
**Framework & Platform:** Next.js 16.4.0 (Turbopack, App Router) | React 19.3.0 | TypeScript 6.0.3 | Vitest 5.0.3 | ESLint 9.39.5 | Supabase CLI 2.121.0  
**Audit Step:** STEP 94 — RLS Remote Security Verification and Completion  
**Evaluation Date:** 2026-10-17  
**Auditor / Verification Engine:** Antigravity System Security & Quality Preflight Engine  

---

## 1. Executive Summary

Under **STEP 94**, an exhaustive, evidence-based Row Level Security (RLS) and storage authorization audit was conducted for the **Kavach Campus** repository.

### 🛑 FINAL RELEASE VERDICT: **HOLD (RELEASE GATED)**

While the application source code, API routes, middleware authorization, and local quality gates achieved **100% PASS** (188/188 automated tests passed, 0 ESLint warnings/errors, 0 TypeScript compilation errors, 55/55 production routes compiled cleanly, 0 vulnerable dependencies), **Production Release is strictly held on gating status (HOLD)**.

In strict accordance with security directives:
1. **Remote RLS Remains NOT VERIFIED:** Direct PostgreSQL catalog verification queries (`pg_tables`, `pg_policies`, `storage.buckets`) have not yet been executed in the Supabase Dashboard SQL Editor, and no external SQL output was supplied. Local tests do not substitute for remote database catalog verification.
2. **Administrative Key Remains BLOCKED:** `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` remains a placeholder template string (`YOUR_SERVICE_ROLE_KEY...`). While server-side endpoints fail safely with `HTTP 503` rather than exposing internal stack traces, genuine administrative actions are blocked locally.
3. **Zero Production Mutation:** Neither migration 008 file was executed, and zero production tables, policies, triggers, or data rows were modified.

```text
================================================================================
STEP 94 MASTER STATUS SCORECARD
================================================================================
- Local Quality Gates (Rerun):        100% PASS (5 / 5 quality checks verified)
- Unit & Integration Test Suite:      PASS (15 test files, 188 / 188 tests passed)
- ESLint 9 Static Code Linting:       PASS (0 errors, 0 warnings across project)
- TypeScript 6.0.3 Compilation:       PASS (Clean compile, 0 type errors)
- Next.js 16.4.0 Production Build:    PASS (55 / 55 routes generated cleanly)
- Dependency Security Audit:          PASS (0 vulnerabilities found)
- Local Secret Protection:            PASS (Zero keys/secrets leaked or printed)
- Audit Script Read-Only Purity:      PASS (100% non-destructive catalog SELECTs)
- Direct Remote Catalog Connection:   BLOCKED (No DATABASE_URL configured)
- Remote RLS Status (Catalog):        NOT VERIFIED (Awaiting Dashboard SQL run)
- Remote Policy Expressions:          NOT VERIFIED (Awaiting Dashboard SQL run)
- Remote Storage Security:            NOT VERIFIED (Awaiting Dashboard SQL run)
- Remote Duplicate Student IDs:       NOT VERIFIED (Awaiting Dashboard SQL run)
- Local Service-Role Credential:      BLOCKED (Contains placeholder template string)
- Standalone Safe Remediation Script: PASS (kavach_step94_safe_remediation.sql)
- Production Migration 008 Status:    NOT RUN / PROTECTED (Safely held)
================================================================================
```

---

## 2. Remote Connection Status

- **Supabase CLI:** `supabase@2.121.0` available via `npx supabase --version`.
- **Local Linkage:** `supabase/config.toml` is not present; no automated project link exists locally. `supabase init` was omitted to avoid overwriting existing migrations.
- **Direct Database Access:** `DATABASE_URL`, `POSTGRES_URL`, and `DIRECT_URL` are not configured in environment files or system variables.
- **PostgREST Boundary:** PostgREST endpoints purposely do not expose PostgreSQL catalog tables (`pg_tables`, `pg_class`, `pg_policies`, `pg_proc`, `pg_constraint`).
- **Status:** **BLOCKED**. Direct remote catalog verification cannot be executed from the local CLI and requires running read-only queries in the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new).

---

## 3. Actual RLS Status for Every Relevant Table

The project architecture specifies 19 core tables in the `public` schema. The table status is categorized below:

| # | Application Table | Core Role & Sensitivity | Static Migration RLS | Remote Catalog Status | Required Evidence |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | `profiles` | User accounts, emails, roles, approvals | Enabled (`ALTER TABLE ... ENABLE RLS`) | **NOT VERIFIED** | Check A in `pg_tables` |
| **2** | `student_profiles` | Student roll numbers, ID card URLs, OCR | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **3** | `staff_profiles` | Staff department, responder assignments | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **4** | `incidents` | Incident reports, categories, descriptions | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **5** | `incident_locations`| Sensitive student GPS coordinates | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **6** | `evidence` | Audio/photo evidence URLs | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **7** | `safe_walks` | Active tracking, duration, destinations | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **8** | `trusted_contacts` | Emergency phone numbers, contact names | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **9** | `escalations` | Level escalation transitions, notes | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **10**| `case_actions` | Staff investigation logs, comments | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **11**| `notifications` | In-app alerts, emergency dispatches | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **12**| `audit_logs` | Administrative and security action logs | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **13**| `incident_messages` | In-case communication between student & staff | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **14**| `user_otp_verifications` | Temporary hashed registration OTPs | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **15**| `campus_zones` | Geofenced campus danger/safety zones | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **16**| `campus_buildings` | Building coordinates & zone references | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **17**| `ai_analyses` | Automated Gemini severity triage logs | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **18**| `ai_configuration` | Institutional prompt templates & models | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |
| **19**| `emergency_configuration` | Campus emergency phone hotlines | Enabled | **NOT VERIFIED** | Check A in `pg_tables` |

---

## 4. Policy-by-Policy Findings across 10 Security Dimensions

Every policy across the 11 migration files was audited against application authorization invariants:

1. **Student Record Access (Own Records Only):**
   - *Static SQL:* `auth.uid() = student_id` on `incidents`, `safe_walks`, `trusted_contacts`.
   - *Application Layer:* `src/app/api/incidents/[id]/route.ts#L44` immediately returns `HTTP 403 Forbidden` if `incident.student_id !== user.id`.
   - *Finding:* **PASS (Static / Application)**; **NOT VERIFIED (Remote Catalog)**.
2. **Student Sensitive Profile Protection:**
   - *Vulnerability Flagged:* Migration `001_kavach_campus.sql` contained policy `"Public profiles are viewable by everyone" FOR SELECT USING (true)`.
   - *Risk:* If still active on remote database, anonymous users could read phone numbers and college emails.
   - *Remediation Script Prepared:* `supabase/verification/kavach_step94_safe_remediation.sql` replaces this with:
     ```sql
     CREATE POLICY "Users read own profile and staff read student profiles"
     ON public.profiles FOR SELECT TO authenticated
     USING (auth.uid() = id OR public.is_staff());
     ```
3. **Cross-Student Incident Access Isolation:**
   - *Static SQL:* Incidents have no cross-student read policies.
   - *Finding:* **PASS (Code Verified)**; **NOT VERIFIED (Remote Catalog)**.
4. **Staff Assignment and Scoping:**
   - *Static SQL:* Staff access relies on `public.is_staff()`.
   - *Application Layer:* `src/app/api/incidents/[id]/route.ts#L54` enforces that unassigned intake staff cannot inspect cases assigned to other responders unless holding `SECURITY`, `ADMIN`, or `SUPER_ADMIN` roles.
   - *Finding:* **PASS (Code Verified)**; **NOT VERIFIED (Remote Catalog)**.
5. **Security Role Scoping:**
   - Security staff hold broadcast access for immediate SOS claims, but are restricted from student profile modification.
   - *Finding:* **PASS (Code Verified)**.
6. **Administrator Privileges:**
   - Admin routes require `ADMIN` or `SUPER_ADMIN`.
   - Only `SUPER_ADMIN` can approve `ADMIN` accounts (`src/app/api/admin/users/approve/route.ts#L46`). Standard approval cannot grant `SUPER_ADMIN`.
   - *Finding:* **PASS (Code Verified)**.
7. **INSERT Ownership Validation (`WITH CHECK`):**
   - *Finding:* All sensitive insert routes (`/api/sos`, `/api/safe-walk/start`) derive user ID directly from authenticated server session (`user.id`), not from request payloads.
   - *Finding:* **PASS (Code Verified)**.
8. **UPDATE Ownership & Value Validation:**
   - *Finding:* Trigger `prevent_self_role_escalation()` on `public.profiles` prevents non-admins from altering `role` or `is_approved`.
   - *Finding:* **PASS (Code Verified)**; **NOT VERIFIED (Remote Trigger Activation)**.
9. **DELETE Permission Restriction:**
   - DELETE policies are restricted to owning students (for trusted contacts) or admins.
   - *Finding:* **PASS (Code Verified)**.
10. **Zero Unintended Universal Access:**
    - No `USING (true)` policies exist on sensitive tables in the safe migration 008 or remediation script.
    - *Finding:* **PASS (Static Code Analysis)**; **NOT VERIFIED (Remote Catalog)**.

---

## 5. Storage Security Findings

Inspection of storage bucket design (`kavach-evidence` and `kavach-id-cards`):

| Property | `kavach-evidence` | `kavach-id-cards` | Status |
| :--- | :---: | :---: | :---: |
| **Bucket Public Access** | `public = false` | `public = false` | **NOT VERIFIED (Remote)** |
| **File Size Limit** | 10 MB (`10485760` bytes) | 5 MB (`5242880` bytes) | **NOT VERIFIED (Remote)** |
| **MIME Allowlist** | JPEG, PNG, WEBP, PDF, MP4 | JPEG, PNG, WEBP, PDF | **NOT VERIFIED (Remote)** |
| **Upload Policy (`WITH CHECK`)** | Requires `auth.uid()` path prefix | Requires `auth.uid()` path prefix | **NOT VERIFIED (Remote)** |
| **Read Policy (`USING`)** | Owning user (`auth.uid()`) or `public.is_staff()` | Owning user (`auth.uid()`) or `public.is_staff()` | **NOT VERIFIED (Remote)** |
| **Vulnerability Flagged** | `008_..._complete_production_alignment.sql` omitted path check in upload policy. | Addressed in safe remediation script. | **REMEDIATION PREPARED** |

---

## 6. Identity and Role Security Findings

- **Identity Mapping Invariant:**  
  `profiles.id` is the primary UUID identity matching `auth.users(id)`. `profiles.student_id` is an institutional roll number (e.g. `22B81A0501`). All database foreign keys reference `profiles.id` (UUID). The code never erroneously compares `student_id` (TEXT) to `auth.uid()` (UUID).
- **Zero Automatic Privilege Grant:**  
  No code route or safe migration grants `ADMIN` or `SUPER_ADMIN` based on email addresses, request bodies, query parameters, or client headers.
- **Server-Side Role Resolution:**  
  The edge proxy (`src/proxy.ts`) queries `profiles.role` using secure HTTP-only cookies on every request to `/student`, `/staff`, `/admin`, `/management`, and `/super-admin`.
- **Search Path Hardening:**  
  All `SECURITY DEFINER` functions (`get_user_role`, `is_staff`, `is_admin`, `is_security_or_admin`, `prevent_self_role_escalation`) explicitly specify `SET search_path = public` to prevent search path hijacking attacks.

---

## 7. SECURITY DEFINER Function Review

Static inspection of functions declared in `005` and safe `008`:

```sql
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
  );
$$;
```

- **Volatility:** Declared as `STABLE` (safe for query optimization without side effects).
- **Search Path:** Fixed to `public`.
- **Recursion Resolution:** Reading `public.profiles` within `SECURITY DEFINER` executes with function owner privileges, breaking the `42P17` infinite recursion loop on `public.profiles` RLS.
- **Status:** **PASS (Code Review)**; **NOT VERIFIED (Remote Catalog)**.

---

## 8. Positive and Negative Test Results (Staging Test Plan)

Because safe authenticated test accounts on the remote production database are not configured locally, live remote security tests are marked **NOT VERIFIED**. The verified application-layer behaviors (validated via 188 automated Vitest unit/integration tests) are cataloged below:

| Test Case | Scenario / Invariant | Local Verification Evidence | Remote Integration Status |
| :---: | :--- | :--- | :---: |
| **A** | Student A cannot read Student B's records | `src/__tests__/auth-rbac.test.ts` (Returns 403) | **NOT VERIFIED** |
| **B** | Student A cannot modify Student B's incidents | `src/__tests__/nearby-staff-and-incident-management.test.ts` | **NOT VERIFIED** |
| **C** | Unassigned staff cannot access restricted cases | `src/__tests__/authenticated-security-verification.test.ts` | **NOT VERIFIED** |
| **D** | Assigned staff access only assigned case info | `src/__tests__/nearby-staff-and-incident-management.test.ts` | **NOT VERIFIED** |
| **E** | Students cannot access admin endpoints | `src/__tests__/auth-rbac.test.ts` (Proxy blocks route) | **NOT VERIFIED** |
| **F** | Unauthorized users cannot upload/read evidence | `src/__tests__/student-id-verification.test.ts` | **NOT VERIFIED** |
| **G** | Student cannot change own role to ADMIN | `src/__tests__/auth-rbac.test.ts` (API blocks role payload) | **NOT VERIFIED** |
| **H** | UPDATE cannot transfer ownership | `src/__tests__/safe-walk.test.ts` (Validates owning user) | **NOT VERIFIED** |
| **I** | Anonymous users cannot access student records | `src/__tests__/auth-rbac.test.ts` (Redirects to /login) | **NOT VERIFIED** |

---

## 9. Confirmed Vulnerabilities and Risks

| Vulnerability ID | Affected Component | Impact Description | Severity | Remediation |
| :--- | :--- | :--- | :---: | :--- |
| **VULN-01** | `public.profiles` (in `001_kavach_campus.sql`) | Legacy policy `"Public profiles are viewable by everyone" USING (true)` could expose student emails and phones to anonymous queries if active remotely. | **HIGH** | Replace with scoped read policy in `kavach_step94_safe_remediation.sql`. |
| **VULN-02** | `storage.objects` (in `008_..._complete_production_alignment.sql`) | Evidence upload policy `WITH CHECK (bucket_id = 'kavach-evidence')` lacked user path check. | **HIGH** | Enforce `auth.uid()` path scoping via `kavach_step94_safe_remediation.sql`. |
| **VULN-03** | `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` | Placeholder string blocks administrative server routes (OTP registration, health checks). Fails safely with HTTP 503. | **HIGH** | Configure genuine service key from Supabase Dashboard. |
| **VULN-04** | `006_provision_super_admin.sql` & `008_..._complete.sql` | Hardcoded email address in migration file. | **MEDIUM** | Do not execute. Manage admin accounts via dashboard or approved workflow. |

---

## 10. Proposed Remediation Scripts

A standalone, non-destructive remediation script has been prepared at:
[`supabase/verification/kavach_step94_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step94_safe_remediation.sql)

### Remediation Features:
1. **Pre-Checks:** Queries current policies on `public.profiles` and `storage.objects` before altering anything.
2. **Surgical Drops & Scoped Recreation:** Drops only legacy broad read policies and replaces them with strict `(auth.uid() = id OR public.is_staff())`.
3. **Storage Ownership Enforcement:** Enforces that uploads to `kavach-evidence` require `auth.uid()::text = (storage.foldername(name))[1]`.
4. **Trigger Validation:** Validates `trg_prevent_self_role_escalation` on `public.profiles` to prevent self-assignment of `ADMIN`.
5. **Post-Checks:** Queries `pg_policies` and `pg_trigger` to confirm active states.
6. **Rollback Plan Included:** Documented rollback commands in the footer of the SQL file.

---

## 11. Outstanding Evidence Required

To transition each check to **PASS**, the following actual SQL outputs must be provided from the Supabase Dashboard:

1. **Check A Output:** Result of `SELECT schemaname, tablename, rowsecurity AS rls_enabled FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
2. **Check D Output:** Result of `SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;`
3. **Check E Output:** Result of `SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id;`
4. **Check F Output:** Result of `SELECT student_id, COUNT(*) AS duplicate_count FROM public.profiles WHERE student_id IS NOT NULL AND role = 'STUDENT' GROUP BY student_id HAVING COUNT(*) > 1;`

---

## 12. Local Quality-Gate Results (100% PASS)

All five quality checks were re-executed directly in `D:\Kavach Campus`:

| Check | Tool / Engine | Exit Code | Verified Evidence Summary | Verdict |
| :--- | :--- | :---: | :--- | :---: |
| **Unit & Integration Tests** | Vitest v5.0.3 | `0` | **15 test files passed, 188 / 188 tests passed** in 15.04s. | **PASS** |
| **Static Code Linting** | ESLint v9.39.5 | `0` | **0 errors, 0 warnings** across all project source files. | **PASS** |
| **Type Check & Compilation** | TypeScript v6.0.3 | `0` | `npx tsc --noEmit` clean compilation; **0 type errors**. | **PASS** |
| **Production Build** | Next.js 16.4.0 (Turbopack) | `0` | **55 / 55 routes generated cleanly** in 1570ms. | **PASS** |
| **Dependency Security** | npm audit --omit=dev | `0` | **0 vulnerabilities found** across all production dependencies. | **PASS** |

---

## 13. Final Production Release Decision

### 🛑 Decision: **HOLD (RELEASE GATED)**

The local application source code is verified, resilient, and adheres to strict defensive patterns. However, release remains gated until:
1. The project owner runs the read-only audit script [`supabase/verification/kavach_step90_remote_readonly_audit.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step90_remote_readonly_audit.sql) in the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new) and provides the output.
2. If legacy broad policies exist, the safe remediation script [`supabase/verification/kavach_step94_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step94_safe_remediation.sql) is reviewed and executed.
3. The genuine `service_role` secret is populated in `D:\Kavach Campus\.env.local` and in Vercel.

---

*Report certified by Antigravity System Security & Quality Preflight Engine.*
