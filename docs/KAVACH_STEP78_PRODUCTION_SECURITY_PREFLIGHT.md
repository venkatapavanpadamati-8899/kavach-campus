# KAVACH CAMPUS — STEP 78: PRODUCTION SECURITY PREFLIGHT & SAFE DEPLOYMENT READINESS REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Framework:** Next.js 16.4.0 (Turbopack, Cache Components, Partial Prefetching) | React 19.3.0 | TypeScript 6.0.3 | Vitest 5.0.3  
**Audit Phase:** STEP 78 — Production Security Verification & Safe Deployment Readiness  
**Evaluation Date:** 2026-10-15  
**Auditor / Agent:** Antigravity System Security & Quality Preflight Engine  

---

## 1. Executive Preflight Summary

| Gate / Functional Domain | Status | Evidence / Verification Method | Notes / Operational Boundary |
| :--- | :---: | :--- | :--- |
| **Automated Test Quality Suite** | **PASS** | `vitest run` — 14/14 suites, 173/173 tests passed | 6 new security regression tests added in Step 78 |
| **Static Code Analysis (Lint)** | **PASS** | `npm run lint` — ESLint 9 | 0 errors, 0 warnings across all app routes and components |
| **TypeScript Strict Checking** | **PASS** | `npx tsc --noEmit` | Exit code 0, complete type safety |
| **Production Build Compilation** | **PASS** | `npm run build` — Next.js 16.4.0 Turbopack | 55/55 routes compiled successfully |
| **Production Dependency Audit** | **PASS** | `npm audit --omit=dev` | 0 vulnerabilities found |
| **Nearby Staff API Security** | **PASS** | API code inspection & 14 unit regression tests | All 13 security and privacy invariants verified |
| **Incident Reassignment Concurrency** | **PASS** | Optimistic locking via `expected_assigned_to` | Returns `HTTP 409 Conflict` on concurrent collisions |
| **Staff & Student GPS Privacy** | **PASS** | Haversine validation, masking & zero-fabrication | Student GPS masked for non-permitted viewers; staff coordinates never sent to clients |
| **Authentication & Open Redirects** | **PASS** | Code inspection & unit test suite | RFC-compliant origin checks; strict validation of `next` redirect parameter |
| **OTP Generation & Verification** | **PASS** | Unit tests & code audit | Bcrypt hashing, 10m expiry, 5 attempt limit, single-use invalidation |
| **Cron Authentication & Idempotency** | **PASS** | Code audit & test suite | Strict `CRON_SECRET` bearer check; state-guarded idempotent execution |
| **Migration 008 Safety Preflight** | **PASS (Static)** | Static DDL analysis | Purely additive, idempotent, decoupled from user emails |
| **Live Remote Supabase Execution** | **NOT VERIFIED / BLOCKED** | Requires Supabase Dashboard SQL Editor execution | Read-only pre-execution verification SQL scripts provided |
| **Real Google OAuth Browser Login** | **NOT VERIFIED / BLOCKED** | Requires live browser interaction with Google Consent Screen | Mocked server code PASS; real provider round-trip pending user browser test |
| **Live Carrier SMS / Push Delivery** | **NOT VERIFIED / BLOCKED** | Requires funded live Twilio / Firebase FCM credentials | Staging fallback adapter logging active |
| **Overall Deployment Readiness** | **PARTIAL** | Local software ready; remote infrastructure requires verification | **Controlled staging readiness achieved; do not execute automatic unverified production migration** |

---

## 2. Phase 2: Nearby Staff API & Incident Management Security Audit

We inspected `GET /api/incidents/[id]/nearby-staff`, `GET /api/incidents/[id]`, and `PATCH /api/incidents/[id]`. All 13 specific verification points were tested:

### 2.1 Thirteen Security Invariants Verification Table

| # | Invariant | Audit Findings | Test / Code Location | Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Server-side Authentication** | All routes invoke `supabase.auth.getUser()`. If missing or invalid session, immediate `HTTP 401 Unauthorized` is returned. | `src/app/api/incidents/[id]/nearby-staff/route.ts#L17-L21` | **PASS** |
| **2** | **Server-side Incident Authorization** | Validates caller role from `public.profiles` against `authorizedRoles`. Rejects non-staff with `HTTP 403 Forbidden`. | `src/app/api/incidents/[id]/nearby-staff/route.ts#L24-L40` | **PASS** |
| **3** | **Students Cannot Access Staff GPS** | Ordinary students calling `GET /api/incidents/[id]/nearby-staff` receive `HTTP 403 Forbidden`. Response returns distances in meters, never raw coordinates. | `src/__tests__/nearby-staff-and-incident-management.test.ts#L37-L61` | **PASS** |
| **4** | **Unassigned Staff Cannot Inspect Unauthorized Cases** | General staff members cannot view or query responders for an incident assigned to another staff member. Returns `HTTP 403 Forbidden`. | `src/app/api/incidents/[id]/route.ts#L48-L58` | **PASS** |
| **5** | **Permitted Staff View Student Location** | Student GPS (`latitude`, `longitude`, `location_accuracy`) is visible ONLY to the student owner, assigned responder, or Security/Admin. Masked (`null`) for all others. | `src/app/api/incidents/[id]/route.ts#L60-L67` | **PASS** |
| **6** | **Staff GPS Requires Freshness (<15m)** | Coordinates older than 15 minutes are classified as stale. They are excluded from nearest distance ranking (`hasFreshGps: false`, `distanceMeters: null`). | `src/lib/routing/assignment.ts#L82-L88` | **PASS** |
| **7** | **Zero Fabrication Policy** | If incident or staff GPS is missing, coordinates are never fabricated. System displays institutional fallback explanatory notice. | `src/__tests__/nearby-staff-and-incident-management.test.ts#L215-L255` | **PASS** |
| **8** | **Validated Distance Calculations** | Haversine formula strictly verifies $-90 \le \text{lat} \le 90$ and $-180 \le \text{lon} \le 180$, rejecting non-numeric values with `NaN`. | `src/lib/routing/assignment.ts#L48-L77` | **PASS** |
| **9** | **Ineligible / Unavailable Staff Excluded** | Filters `is_active = true` and `is_approved = true`. Ranks role-qualified candidates based on severity matrix (`SEVERITY_TARGET_ROLES`). | `src/app/api/incidents/[id]/nearby-staff/route.ts#L60-L65` | **PASS** |
| **10** | **Reassignment Verifies Target Staff Eligibility** | **Fixed defect:** `PATCH /api/incidents/[id]` now verifies target profile has an authorized staff role (`allowedRoles.includes(targetProfile.role)`), preventing assignment to students. | `src/app/api/incidents/[id]/route.ts#L247-L255` | **PASS** |
| **11** | **Concurrent Reassignment Protection** | **Added feature:** Supports optimistic concurrency via `expected_assigned_to`. If current assignment differs, returns `HTTP 409 Conflict`. | `src/app/api/incidents/[id]/route.ts#L218-L224` | **PASS** |
| **12** | **Privacy in Audit Logs** | `audit_logs` records only aggregate counts (`candidate_count`, `qualified_count`) and flags, never student PII or raw GPS coordinates. | `src/app/api/incidents/[id]/nearby-staff/route.ts#L192-L205` | **PASS** |
| **13** | **No Client Parameter Authorization Bypass** | Caller identity and permissions are retrieved strictly from server-side JWT session and `profiles` table. Client cannot pass query params or headers to escalate role. | `src/app/api/incidents/[id]/route.ts#L11-L37` | **PASS** |

---

## 3. Phase 3: Authentication, OTP & Privacy Audit

### 3.1 Google OAuth Callback Security (`/api/auth/callback`)
- **Reverse Proxy Resolution:** Correctly inspects `x-forwarded-host` and `x-forwarded-proto` to reconstruct the true origin.
- **Open-Redirect Protection:** Validates the `next` redirect query parameter. Explicitly rejects absolute protocols (`https://attacker.com`), protocol-relative URLs (`//attacker.com`), backslash bypasses (`/\attacker.com`), and URI schemes (`javascript:`).
- **Auto-Provisioning Boundary:** First-time OAuth sign-ins are provisioned strictly as `STUDENT` with `is_approved = true` and `verification_status = 'PENDING_UPLOAD'`. Privileged roles cannot be provisioned via Google OAuth.
- **Status:** **PASS** (Code & Unit Tests) | **NOT VERIFIED / BLOCKED** (Live Google Browser Login requires human interaction on consent screen).

### 3.2 Registration & Role Escalation Defense (`/api/auth/register`)
- **Password Strength:** Enforces minimum 8 characters server-side.
- **Role Escalation Prevention:** Rejects public self-assignment of `ADMIN`, `SUPER_ADMIN`, `MANAGEMENT`, `PRINCIPAL`, and `HOD` with `HTTP 403 Forbidden`.
- **Status:** **PASS**.

### 3.3 OTP Verification & Brute-Force Throttle (`/api/auth/verify-otp`)
- **Entropy & Cryptography:** 6-digit numeric OTP hashed with `bcryptjs` (salt rounds 10).
- **Expiration Window:** 10 minutes (`expires_at < NOW()` triggers immediate purge).
- **Throttling:** Maximum 5 attempts allowed. Failed attempt increments counter. Exceeded attempts purge the verification record.
- **Single-Use Invalidation:** Record is unconditionally deleted upon successful verification.
- **Status:** **PASS**.

### 3.4 Student Privacy & Cross-Student Isolation
- **Incident History:** Student A cannot query Student B's incident history (`HTTP 403 Forbidden` enforced in both API and Supabase RLS).
- **Evidence Files:** Stored in private storage bucket `kavach-evidence` (`public = false`). RLS ensures only the uploading student and authorized staff can read files.
- **Student ID Cards:** Stored in private bucket `kavach-id-cards` (`public = false`).
- **Status:** **PASS**.

---

## 4. Phase 4: Supabase Migration Safety Preflight

### 4.1 Migration Scripts Comparative Analysis

| Migration File | Key Operations | Structural Impact | Risk Level | Recommendation |
| :--- | :--- | :--- | :---: | :--- |
| **`005_...recursion_repair.sql`** | `SECURITY DEFINER` helper functions (`get_user_role`, `is_staff`, `is_admin`) | Resolves 42P17 infinite recursion loops on `profiles` | **LOW** | Safe to apply. |
| **`006_provision_super_admin.sql`** | Hardcodes target email `venkatapavanpadamati1@gmail.com` and updates role to `SUPER_ADMIN` | Modifies existing user role; contains hardcoded personal email | **HIGH** | **DO NOT RUN IN AUTOMATED MIGRATIONS.** Apply manually only if desired by project owner. |
| **`007_student_id_card_verification.sql`** | Adds `student_profiles` columns, unique index, and `kavach-id-cards` bucket | Adds constraints; partial index on `student_id` | **MEDIUM** | Requires verifying no duplicate `student_id` exists before indexing. |
| **`008_kavach_campus_schema_and_rls_alignment_safe.sql`** | Purely structural, decoupled schema alignment, storage buckets, safe triggers | Consolidated non-destructive migration without hardcoded users | **LOW (with preflight check)** | Recommended safe migration. |

### 4.2 Detailed Review of `008_kavach_campus_schema_and_rls_alignment_safe.sql`
1. **Extensions & Types:** Uses `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` and `pgcrypto`. Idempotent `app_role` enum definition.
2. **Security Definer Functions:** Creates `get_user_role()`, `is_staff()`, `is_admin()`, and `is_security_or_admin()`. All set `search_path = public` to prevent search path injection attacks.
3. **Safe Walks Alignment:** Uses `ADD COLUMN IF NOT EXISTS` for all 12 columns (`expires_at`, `auto_sos_enabled`, `start_latitude`, etc.). Safe constraint check prevents syntax errors if constraint already exists.
4. **Student Profiles Alignment:** Uses `ADD COLUMN IF NOT EXISTS`. Adds partial unique index `idx_profiles_student_id ON profiles(student_id) WHERE student_id IS NOT NULL AND role = 'STUDENT'`.
5. **Storage Buckets:** Provisions `kavach-evidence` and `kavach-id-cards` with `public = false`, 10MB/5MB file size limits, and allowed MIME types.
6. **Trigger:** Adds `prevent_self_role_escalation` trigger preventing non-admins from altering `role` or `is_approved`.
7. **Potential Breaking Risks:**
   - If existing `public.profiles` contains duplicate student IDs for active students, creating `idx_profiles_student_id` will fail.
   - If existing rows in `safe_walks` or `student_profiles` contain statuses outside allowed constraints, constraint addition will fail.
   - **Conclusion:** Migration 008 is safe and non-destructive, but must be preceded by read-only verification queries.

---

## 5. Phase 5: Read-Only Supabase Pre-Execution Verification Queries

Before applying `008_kavach_campus_schema_and_rls_alignment_safe.sql` in production, run these **READ-ONLY** SQL queries in the [Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new):

```sql
-- =============================================================================
-- KAVACH CAMPUS: PRE-MIGRATION 008 READ-ONLY READINESS PROBE
-- (Does NOT alter any table, column, policy, or data)
-- =============================================================================

-- 1. Check Row-Level Security (RLS) Status on all Public Tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Check for Duplicate Student IDs (which would fail partial unique index creation)
SELECT student_id, COUNT(*) as duplicate_count
FROM public.profiles 
WHERE student_id IS NOT NULL AND role = 'STUDENT' 
GROUP BY student_id 
HAVING COUNT(*) > 1;

-- 3. Check Existing Status Values in safe_walks Table
SELECT DISTINCT status, COUNT(*) 
FROM public.safe_walks 
GROUP BY status;

-- 4. Check Existing Verification Status Values in student_profiles Table
SELECT DISTINCT verification_status, COUNT(*) 
FROM public.student_profiles 
GROUP BY verification_status;

-- 5. Inspect Existing SECURITY DEFINER Functions and Search Paths
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('get_user_role', 'is_staff', 'is_admin', 'is_security_or_admin', 'prevent_self_role_escalation');

-- 6. Check Storage Buckets Configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards');

-- 7. Check Active Storage Policies on storage.objects
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

---

## 6. Phase 6: Notifications & Background Cron Audit

### 6.1 Cron Route Verification
| Endpoint | Method | Authentication | Idempotency Mechanism | Escalation Target |
| :--- | :---: | :--- | :--- | :--- |
| `/api/cron/escalate` | `POST` / `GET` | `Bearer ${CRON_SECRET}` | Queries only `status = 'ASSIGNED'` & updates to `'ESCALATED'` | `ADMIN` / `SUPER_ADMIN` |
| `/api/cron/safe-walk-timeout` | `POST` / `GET` | `Bearer ${CRON_SECRET}` | Atomic guard `.eq('status', 'ACTIVE')` before transitioning to `'OVERDUE'` | Generates `SAFE_WALK_TIMEOUT` High incident |

### 6.2 Hosting Platform Compatibility Note
- **Vercel Cron Schedule:** `vercel.json` configures both cron jobs on `* * * * *` (every minute).
- **Plan Restriction:**
  - **Vercel Pro / Enterprise:** Supports 1-minute cron intervals (`* * * * *`).
  - **Vercel Hobby (Free):** Restricts cron jobs to once per day (`0 0 * * *`).
  - **Recommendation:** If deploying on Vercel Hobby, use an external uptime monitor (e.g., GitHub Actions workflow, Cron-Job.org, or Cloudflare Worker) with the `Authorization: Bearer <CRON_SECRET>` header to trigger endpoints every minute.

---

## 7. Phase 7: Complete Quality Gate Execution Evidence

All quality gates executed locally in `D:\Kavach Campus`:

```text
1. npm test (Vitest)
   Result: 14 passed (14 test files), 173 passed (173 tests)
   Duration: 1.85s
   Exit Code: 0

2. npm run lint (ESLint 9)
   Result: 0 errors, 0 warnings
   Exit Code: 0

3. npx tsc --noEmit (TypeScript 6.0.3)
   Result: Clean compile, 0 type errors
   Exit Code: 0

4. npm run build (Next.js 16.4.0 Turbopack)
   Result: 55/55 routes generated
   Compile Time: 1001ms
   Exit Code: 0

5. npm audit --omit=dev
   Result: found 0 vulnerabilities
   Exit Code: 0
```

---

## 8. Prioritized Next Actions for Controlled Production Launch

1. **Step 1: Run Read-Only Verification Script**
   - Execute Section 5 read-only SQL queries in Supabase SQL Editor.
   - Confirm zero duplicate `student_id` entries and clean status enums.
2. **Step 2: Apply Migration 008 (Safe Decoupled)**
   - Run `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` in the Supabase Dashboard.
3. **Step 3: Staging User Verification**
   - Perform a real browser Google Sign-in to confirm OAuth provider consent flow and redirection to `/student`.
   - Test password registration with live OTP delivery.
4. **Step 4: Configure Production Environment Variables**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` are set in Vercel project settings.
5. **Step 5: Verify Cron Triggering**
   - Ensure external cron trigger or Vercel Pro cron is sending `Authorization: Bearer <CRON_SECRET>` every minute.

---

**Report Certification:**  
This document represents an evidence-based audit of Kavach Campus. All local code changes have been validated against regression suites, Next.js 16 compilation standards, and strict least-privilege role boundaries.
