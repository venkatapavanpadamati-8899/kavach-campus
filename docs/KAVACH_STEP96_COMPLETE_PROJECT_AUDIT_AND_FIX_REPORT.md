# KAVACH CAMPUS — STEP 96: COMPLETE PROJECT AUDIT, SECURITY FIXES, SUPABASE RLS VERIFICATION, FUNCTIONAL TESTING AND RELEASE READINESS REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace Directory:** `D:\Kavach Campus`  
**Supabase Project Ref:** `polbnvszmvblwenfnqll`  
**Supabase Host URL:** `https://polbnvszmvblwenfnqll.supabase.co`  
**Supabase Dashboard:** [Project Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll)  
**Supabase SQL Editor:** [SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)  
**Framework & Platform:** Next.js 16.4.0 (Turbopack, App Router) | React 19.3.0 | TypeScript 6.0.3 | Vitest 5.0.3 | ESLint 9.39.5 | Supabase CLI 2.121.0  
**Audit Step:** STEP 96 — Complete Project Audit, Security Fixes, Remote RLS Verification, and Release Readiness  
**Evaluation Date:** 2026-10-17  
**Auditor / Verification Engine:** Antigravity System Security & Quality Preflight Engine  

---

## 1. Executive Summary

Under **STEP 96**, an exhaustive, evidence-based project audit and defensive security review was conducted across the entire **Kavach Campus** codebase, database migrations, security policies, storage configuration, authentication workflows, background jobs, and release gating criteria.

### 🛑 FINAL RELEASE VERDICT: **HOLD (RELEASE GATED)**

While all five local quality gates achieved **100% PASS** (188/188 automated tests passed, 0 ESLint errors/warnings, 0 TypeScript compilation errors, 55/55 production routes compiled cleanly, 0 vulnerable dependencies), and a critical cron authorization vulnerability was remediated in the application layer, **Production Release remains strictly on HOLD**.

```text
================================================================================
STEP 96 MASTER STATUS SCORECARD
================================================================================
- Local Quality Gates:                100% PASS (5 / 5 quality checks verified)
- Unit & Integration Test Suite:      PASS (15 test files, 188 / 188 tests passed)
- ESLint 9 Static Code Linting:       PASS (0 errors, 0 warnings across project)
- TypeScript 6.0.3 Compilation:       PASS (Clean compile, 0 type errors)
- Next.js 16.4.0 Production Build:    PASS (55 / 55 routes generated cleanly)
- Production Dependency Audit:        PASS (0 vulnerabilities found via npm audit)
- Local Secret Protection:            PASS (Zero secrets/keys logged or committed)
- Read-Only Audit Purity:             PASS (kavach_step96_remote_readonly_audit.sql)
- Remote Tables RLS Status:           PARTIAL (27 tables show RLS = true in screenshot)
- Remote Policy Expressions:          REVIEW REQUIRED (30 public policies active)
- Storage Bucket Privacy:             PASS (kavach-evidence & kavach-id-cards private)
- Storage File Size Limits:           PASS (Evidence: 10 MiB, ID Cards: 5 MiB)
- Storage Object Policies:            REVIEW REQUIRED (4 policies visible; path check pending)
- Duplicate Student IDs:              PASS (Query returned 0 rows in SQL Editor)
- Local Service-Role Credential:      BLOCKED (Contains placeholder template string)
- Cron Secret Authorization Fix:      FIXED & VERIFIED (Eliminated Bearer undefined bypass)
- Standalone Safe Remediation Script: PASS (kavach_step96_safe_remediation.sql prepared)
- Production Migrations 005-008:      NOT RUN / PROTECTED (Safely held unexecuted)
================================================================================
```

---

## 2. Overall Project Readiness

| Component | Target Architecture | Implemented State | Audit Status | Evidence / Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Frontend UI/UX** | Next.js 16 App Router | 55 Compiled Routes | **PASS** | Responsive student, staff, admin, and management dashboards |
| **Database Schema** | Supabase PostgreSQL | 19 Application Tables | **PASS** | Full relational model with FKs, checks, and enums |
| **Local Quality Gates** | 5 Gates (Test, Lint, Types, Build, Audit) | 5/5 Passing | **PASS** | 188 tests passing, 0 lint warnings, 0 type errors, 0 vulns |
| **Remote Table RLS** | RLS on 100% of public tables | 27 tables RLS = true | **PARTIAL** | Screenshot confirms visible rows true; non-visible pending |
| **Remote Policy Expressions** | Strict role- and relationship-scoping | 30 policies active | **REVIEW REQUIRED** | Requires catalog inspection to confirm no `USING (true)` |
| **Storage Privacy** | Private buckets for evidence & IDs | `public = false` | **PASS** | Confirmed via SQL Editor screenshot |
| **Storage Size Limits** | Evidence 10MB, ID Cards 5MB | 10 MiB / 5 MiB | **PASS** | Confirmed via SQL Editor screenshot |
| **Storage Path Isolation** | `auth.uid()` path prefix enforcement | 4 policies active | **REVIEW REQUIRED** | Requires expression check to ensure folder prefix checked |
| **Student ID Uniqueness** | Zero duplicate student identifiers | 0 rows returned | **PASS** | Confirmed via SQL Editor screenshot |
| **Service Role Key** | Real institutional secret | Placeholder string | **BLOCKED** | Safe 503 fallback in place; requires real secret |
| **Production Migrations** | Safe aligned schema migration | Held unexecuted | **NOT RUN / PROTECTED** | Migrations 005-008 safely held until approval |

---

## 3. RLS Status for Every Relevant Public Table

The remote database returned 27 tables in the `public` schema. The 19 core application tables and their observed statuses are detailed below:

| # | Application Table | Core Role & Sensitivity | Static Migration RLS | Observed Remote RLS | Current Audit Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | `profiles` | User accounts, emails, roles, approvals | Enabled | `true` (Screenshot) | **PARTIAL** |
| **2** | `student_profiles` | Student roll numbers, ID card URLs, OCR | Enabled | `true` (Screenshot) | **PARTIAL** |
| **3** | `staff_profiles` | Staff department, responder assignments | Enabled | `true` (Screenshot) | **PARTIAL** |
| **4** | `incidents` | Incident reports, categories, descriptions | Enabled | `true` (Screenshot) | **PARTIAL** |
| **5** | `incident_locations`| Sensitive student GPS coordinates | Enabled | `true` (Screenshot) | **PARTIAL** |
| **6** | `evidence` | Audio/photo evidence metadata URLs | Enabled | `true` (Screenshot) | **PARTIAL** |
| **7** | `safe_walks` | Active tracking, duration, destinations | Enabled | `true` (Screenshot) | **PARTIAL** |
| **8** | `trusted_contacts` | Emergency phone numbers, contact names | Enabled | `true` (Screenshot) | **PARTIAL** |
| **9** | `escalations` | Level escalation transitions, notes | Enabled | `true` (Screenshot) | **PARTIAL** |
| **10**| `case_actions` | Staff investigation logs, comments | Enabled | `true` (Screenshot) | **PARTIAL** |
| **11**| `notifications` | In-app alerts, emergency dispatches | Enabled | `true` (Screenshot) | **PARTIAL** |
| **12**| `audit_logs` | Administrative and security action logs | Enabled | `true` (Screenshot) | **PARTIAL** |
| **13**| `incident_messages` | In-case communication between student & staff | Enabled | `true` (Screenshot) | **PARTIAL** |
| **14**| `user_otp_verifications` | Temporary hashed registration OTPs | Enabled | `true` (Screenshot) | **PARTIAL** |
| **15**| `campus_zones` | Geofenced campus danger/safety zones | Enabled | `true` (Screenshot) | **PARTIAL** |
| **16**| `campus_buildings` | Building coordinates & zone references | Enabled | `true` (Screenshot) | **PARTIAL** |
| **17**| `ai_analyses` | Automated Gemini severity triage logs | Enabled | `true` (Screenshot) | **PARTIAL** |
| **18**| `ai_configuration` | Institutional prompt templates & models | Enabled | `true` (Screenshot) | **PARTIAL** |
| **19**| `emergency_configuration` | Campus emergency phone hotlines | Enabled | `true` (Screenshot) | **PARTIAL** |

*Note: In PostgreSQL, `rowsecurity = true` indicates that Row Level Security is active. However, if any table lacks policies, non-service-role queries will return empty sets (default deny); conversely, if a table has a permissive policy with `USING (true)`, all rows are exposed. Detailed policy review remains mandatory.*

---

## 4. Policy-by-Policy Findings across Active Security Dimensions

The SQL Editor query revealed **30 public schema policies**. The following security dimensions govern these policies:

1. **Permissive Policy OR Behavior (CRITICAL POSTGRESQL SEMANTICS):**
   - In PostgreSQL, multiple `PERMISSIVE` policies on the same table and command combine with **OR**.
   - If a table has both a restrictive policy (`auth.uid() = id`) and a legacy broad policy (`USING (true)` from migration 001), PostgreSQL evaluates `(auth.uid() = id) OR (true) = true`.
   - **Remediation:** Dropping legacy broad read policies is mandatory to prevent accidental universal data access.
2. **Student Record Access (Own Records Only):**
   - Incidents, safe walks, and trusted contacts enforce `auth.uid() = student_id` or `auth.uid() = user_id`.
   - Application API routes enforce this boundary independently at `src/app/api/incidents/[id]/route.ts#L44`.
3. **Student Profile Exposure Prevention:**
   - Universal read policies (`"Public profiles are viewable by everyone"`) expose student phone numbers and college IDs.
   - `kavach_step96_safe_remediation.sql` provides the exact surgical replacement policy scoped to `auth.uid() = id OR public.is_staff()`.
4. **Staff Assignment and Scoping:**
   - Staff access relies on `public.is_staff()`.
   - Application route `src/app/api/incidents/[id]/route.ts#L54` verifies that staff can only view cases within their department or assigned scope unless holding `ADMIN` or `SUPER_ADMIN`.
5. **Role Escalation Protection:**
   - Server-side registration prevents self-assigning `ADMIN`, `SUPER_ADMIN`, `MANAGEMENT`.
   - Database trigger `trg_prevent_self_role_escalation` prevents non-admins from modifying `role` or `is_approved`.
6. **SECURITY DEFINER Function Safety:**
   - Privileged helper functions (`is_staff`, `is_admin`, `get_user_role`) must explicitly declare `SET search_path = public` to avoid search-path hijacking attacks.

---

## 5. Storage Configuration and Policy Findings

| Property | `kavach-evidence` | `kavach-id-cards` | Observed State | Audit Status |
| :--- | :---: | :---: | :---: | :---: |
| **Bucket Privacy** | `public = false` | `public = false` | `public = false` | **PASS** |
| **File Size Limit** | 10 MB (`10485760` bytes) | 5 MB (`5242880` bytes) | 10 MiB / 5 MiB | **PASS** |
| **Allowed MIME Types** | JPEG, PNG, WEBP, PDF, MP4 | JPEG, PNG, WEBP, PDF | Configured | **PASS** |
| **Upload Policy (`WITH CHECK`)** | Requires `auth.uid()` path prefix | Requires `auth.uid()` path prefix | 4 policies active | **REVIEW REQUIRED** |
| **Read Policy (`USING`)** | Owner or approved responder | Owner or approved reviewer | 4 policies active | **REVIEW REQUIRED** |

**Storage Policy Vulnerability Analysis:**
- In legacy migration `008_kavach_campus_complete_production_alignment.sql`, the evidence upload policy was defined as:
  `CREATE POLICY "Students can upload evidence" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kavach-evidence');`
- This policy lacked the folder ownership check `(storage.foldername(name))[1] = auth.uid()::text`.
- If active remotely, an authenticated student could upload or overwrite files inside another student's evidence folder.
- `kavach_step96_safe_remediation.sql` provides the safe replacement enforcing strict `auth.uid()` folder prefixes on both upload and read operations.

---

## 6. Authentication and Authorization Findings

- **Registration Flow:** Implemented at `src/app/api/auth/register/route.ts`. Validates names, college email formats, and minimum password complexity (>= 8 characters). Enforces that administrative roles cannot be self-requested.
- **Login Flow:** Uses Supabase Auth (`supabase.auth.signInWithPassword`). Server sets secure cookies.
- **Google OAuth:** Handled at `src/app/api/auth/google/route.ts` and callback at `src/app/api/auth/callback/route.ts`. Supports PKCE code exchange with state parameter verification.
- **Password Reset & OTP:** Temporary hashed OTP verification implemented at `src/app/api/auth/verify-otp/route.ts`.
- **Administrative Account Approval:** Route `src/app/api/admin/users/approve/route.ts` enforces that only `SUPER_ADMIN` can approve `ADMIN` accounts, and forbids assigning `SUPER_ADMIN` via standard approval workflows.
- **Service-Role Key Status:** `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` remains a placeholder. Server routes detect this and fail gracefully with `HTTP 503 Service Unavailable`, preventing internal stack trace leaks while keeping administrative actions blocked locally.

---

## 7. SOS and Emergency Workflow Status

- **Trigger Endpoint:** `src/app/api/sos/route.ts` (POST).
- **Authentication:** Derives caller identity directly from `user.id` via session cookies; client cannot spoof `student_id`.
- **Incident Creation:** Inserts into `incidents` with `category = 'SOS'` and initial `status = 'REPORTED'`.
- **Location Capture:** Inserts GPS coordinates into `incident_locations` with `accuracy`, `speed`, `heading`.
- **AI Triage Fallback:** If Gemini API key is missing or calls fail, incident creation proceeds unconditionally with deterministic severity `CRITICAL` and default routing to `SECURITY`. AI failure does NOT block emergency SOS.
- **Nearby Staff Notification:** Finds approved active staff within campus radius and creates records in `notifications`.
- **5-Minute Timeout Escalation:** Cron endpoint `/api/cron/escalate` automatically escalates overdue unacknowledged SOS cases from `STAFF` to `ADMIN`.

---

## 8. Notification Provider Status

| Channel | Implementation | Operational Status | Verification State |
| :--- | :--- | :---: | :--- |
| **Database Notifications** | `public.notifications` table | Operational | **PASS** (Created during incident lifecycle) |
| **In-App Toast Alerts** | UI notification listener | Operational | **PASS** (Polled/subscribed in dashboards) |
| **Browser Web Push** | `public/sw.js` + Web Push API | Stub / Adapter | **NOT CONFIGURED** (VAPID keys not set) |
| **SMS Gateway** | Twilio / SMS Adapter | Stub / Adapter | **NOT CONFIGURED** (Provider credentials not set) |
| **Email Gateway** | Nodemailer / SMTP Adapter | Stub / Adapter | **NOT CONFIGURED** (`SMTP_PASSWORD` not set) |

---

## 9. AI Integration Status

- **Integration Architecture:** Google Gemini API configured via `@google/genai` in `src/lib/ai/gemini.ts`.
- **Role:** Strictly **advisory** classification of incident descriptions and severity.
- **Deterministic Guardrails:** Hardcoded safety keywords ("knife", "assault", "harassment", "bleeding", "fire") immediately force `CRITICAL` / `HIGH` severity without waiting for or trusting LLM output.
- **Failure Resilience:** Comprehensive fallback tests in `src/__tests__/severity-classification.test.ts` prove 100% incident creation success even when the AI provider returns timeouts, HTTP 500, or invalid JSON.
- **Live Status:** **BLOCKED / NOT VERIFIED** (Genuine `GEMINI_API_KEY` is not configured in local `.env.local`).

---

## 10. Cron and Deployment Status

- **Automated Escalation Cron:** `src/app/api/cron/escalate/route.ts` (Every 2 minutes via `vercel.json`).
- **Safe Walk Timeout Cron:** `src/app/api/cron/safe-walk-timeout/route.ts` (Every 2 minutes via `vercel.json`).
- **Authorization Security:** Fixed in STEP 96. Requires `Authorization: Bearer <CRON_SECRET>`. Both endpoints strictly verify that `process.env.CRON_SECRET` is truthy, eliminating the `"Bearer undefined"` bypass vulnerability.
- **Vercel Configuration:** `vercel.json` defines cron paths and headers. Production deployment pending environment variable provisioning.

---

## 11. Functional Page and Route Status

All 55 application routes compile and render cleanly:
- **Public Routes:** `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp`, `/about`, `/features`, `/contact`, `/privacy`.
- **Student Portal:** `/student`, `/student/report`, `/student/sos`, `/student/safe-walk`, `/student/incidents`, `/student/incidents/[id]`, `/student/trusted-contacts`, `/student/profile`, `/student/settings`, `/student/verification-status`.
- **Staff Portal:** `/staff`, `/staff/incidents`, `/staff/incidents/[id]`.
- **Admin Portal:** `/admin`, `/admin/users`, `/admin/campus`, `/admin/incidents`, `/admin/incidents/[id]`, `/admin/system-audit`, `/admin/ai`.
- **Management Portal:** `/management`, `/management/incidents`, `/management/incidents/[id]`.
- **Super Admin Portal:** `/super-admin`, `/super-admin/login`.
- **API Endpoints (19 routes):** `/api/auth/*`, `/api/cron/*`, `/api/incidents/*`, `/api/safe-walk/*`, `/api/sos/*`, `/api/student/*`, `/api/admin/*`, `/api/system/health`.

---

## 12. Tests Executed and Exact Results

```text
================================================================================
QUALITY GATES VERIFICATION EXECUTION RESULTS
================================================================================
1. Vitest Test Suite (npm test):
   - Test Files:  15 passed (15 / 15)
   - Tests:       188 passed (188 / 188)
   - Execution Time: 15.17s
   - Negative Tests Added: Cron secret undefined bypass protection assertions

2. ESLint Static Code Analysis (npm run lint):
   - Command:     eslint .
   - Result:      0 errors, 0 warnings across all TypeScript and React files

3. TypeScript Compiler Check (npx tsc --noEmit):
   - Command:     tsc --noEmit
   - Result:      Clean compile, 0 type errors

4. Production Turbopack Build (npm run build):
   - Framework:   Next.js 16.4.0 (Turbopack)
   - Route Count: 55 routes generated cleanly (0 build errors)

5. Production Dependency Audit (npm audit --omit=dev):
   - Result:      found 0 vulnerabilities
================================================================================
```

---

## 13. Vulnerabilities Discovered

1. **VULN-01 (High - Fixed): Cron Authorization Undefined Secret Bypass:**
   - *Affected Files:* `src/app/api/cron/escalate/route.ts#L8` and `src/app/api/cron/safe-walk-timeout/route.ts#L8`.
   - *Vulnerability:* Header was compared directly against ``Bearer ${process.env.CRON_SECRET}``. When `CRON_SECRET` was unset in environment variables, this evaluated to `"Bearer undefined"`, allowing an unauthenticated attacker sending `Authorization: Bearer undefined` to trigger automated escalations.
2. **VULN-02 (High - Identified / Remediation Prepared): Legacy Universal Profile Read Exposure:**
   - *Affected SQL:* `001_kavach_campus.sql` contained `CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);`.
   - *Impact:* Exposes student telephone numbers, registration IDs, and department records.
3. **VULN-03 (Medium - Identified / Remediation Prepared): Evidence Upload Folder Ownership Omission:**
   - *Affected SQL:* `008_kavach_campus_complete_production_alignment.sql` omitted folder path check `(storage.foldername(name))[1] = auth.uid()::text`.
   - *Impact:* Allowed authenticated users to upload files into other users' storage paths.
4. **VULN-04 (Low - Configuration): Local Service Role Key Placeholder:**
   - *Affected File:* `.env.local`.
   - *Impact:* Blocks administrative backend operations in local testing (mitigated by safe 503 fallback).

---

## 14. Vulnerabilities Fixed

- **VULN-01 Remediated:**
  - Updated both `/api/cron/escalate` and `/api/cron/safe-walk-timeout` to enforce:
    ```typescript
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    ```
  - Added unit test assertions in `src/__tests__/authenticated-security-verification.test.ts` verifying that requests with `Authorization: Bearer undefined` strictly receive `HTTP 401 Unauthorized` when `CRON_SECRET` is unset.

---

## 15. Vulnerabilities Still Open / Pending Remote Verification

- **VULN-02 & VULN-03 Remote State:** The exact policy expressions active on the live Supabase instance require catalog inspection via Check 2 of `kavach_step96_remote_readonly_audit.sql`. If broad policies exist, executing `kavach_step96_safe_remediation.sql` is required to close them.
- **Service Role Key:** Requires the project owner to populate the genuine `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel dashboard.

---

## 16. Files Changed in This Step

| File Path | Description of Changes |
| :--- | :--- |
| [`src/app/api/cron/escalate/route.ts`](file:///d:/Kavach%20Campus/src/app/api/cron/escalate/route.ts) | Added truthiness validation for `CRON_SECRET` to prevent undefined token bypass |
| [`src/app/api/cron/safe-walk-timeout/route.ts`](file:///d:/Kavach%20Campus/src/app/api/cron/safe-walk-timeout/route.ts) | Added truthiness validation for `CRON_SECRET` to prevent undefined token bypass |
| [`src/__tests__/authenticated-security-verification.test.ts`](file:///d:/Kavach%20Campus/src/__tests__/authenticated-security-verification.test.ts) | Added negative tests verifying rejection of `Bearer undefined` cron headers |
| [`supabase/verification/kavach_step96_remote_readonly_audit.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_remote_readonly_audit.sql) | Comprehensive 16-check read-only catalog inspection SQL script |
| [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql) | Standalone safe remediation script with pre-checks, scoped policies, triggers, and rollback |
| [`docs/KAVACH_STEP96_COMPLETE_PROJECT_AUDIT_AND_FIX_REPORT.md`](file:///d:/Kavach%20Campus/docs/KAVACH_STEP96_COMPLETE_PROJECT_AUDIT_AND_FIX_REPORT.md) | This master report |

---

## 17. SQL Scripts Created But Not Executed

1. [`supabase/verification/kavach_step96_remote_readonly_audit.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_remote_readonly_audit.sql):
   - *Status:* **READY FOR MANUAL EXECUTION IN SUPABASE SQL EDITOR**.
   - *Purity:* Contains ONLY `SELECT` statements against `pg_tables`, `pg_policies`, `storage.buckets`, `pg_proc`, `pg_trigger`, and `pg_constraint`.
2. [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql):
   - *Status:* **READY FOR MANUAL EXECUTION AFTER AUDIT REVIEW**.
   - *Safety:* Includes pre-checks, post-checks, idempotency (`IF EXISTS`), and complete rollback guidance.

---

## 18. Remote Checks Blocked by Missing Access

- Direct PostgreSQL connection string (`DATABASE_URL` / port 5432) is not configured in local environment files.
- Supabase PostgREST API purposely does not expose PostgreSQL system catalogs (`pg_tables`, `pg_policies`, `pg_proc`).
- Direct remote catalog inspection from the local terminal is therefore **BLOCKED**, necessitating user execution of read-only queries in the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new).

---

## 19. Exact Owner Actions Required

To advance the project from **HOLD** to **APPROVED FOR RELEASE**, the project owner should execute the following 4 steps:

### Step 1: Run Read-Only Audit Check in Supabase SQL Editor
Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new) and execute the queries from [`supabase/verification/kavach_step96_remote_readonly_audit.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_remote_readonly_audit.sql), particularly **Check 2** and **Check 5**:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 2: Apply Safe Remediation (If Legacy Policies Found)
If Check 2 or Check 5 reveals any policies with `USING (true)` on `profiles` or missing folder path checks on `storage.objects`, execute [`supabase/verification/kavach_step96_safe_remediation.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step96_safe_remediation.sql) in the SQL Editor.

### Step 3: Populate Service Role Secret
Retrieve your `service_role` secret from [Supabase API Settings](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/settings/api) and set it in `.env.local` and your Vercel Project Environment Variables.

### Step 4: Populate CRON_SECRET & GEMINI_API_KEY
Generate a high-entropy secret string for `CRON_SECRET` and obtain a Gemini API key from Google AI Studio. Set both in Vercel Environment Variables.

---

## 20. Final Release Recommendation

### Release Recommendation: 🛑 **HOLD (RELEASE GATED)**

**Justification:**
1. While the application code is in an exceptional state (100% tests passing, 0 lint/type errors, 55 routes compiled cleanly, dependency vulnerabilities at zero), production release cannot be approved until active remote policies are verified to contain no legacy `USING (true)` clauses.
2. The administrative service-role credential remains a placeholder in local configuration.
3. Once the owner runs the read-only inspection query in the Supabase SQL Editor and confirms or applies the safe remediation script, and configures the production secrets in Vercel, Kavach Campus will be fully eligible for **APPROVED FOR RELEASE**.
