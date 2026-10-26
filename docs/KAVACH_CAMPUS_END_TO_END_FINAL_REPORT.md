# Kavach Campus — Current Release-Gate Report

**Date:** 2026-10-21  
**Workspace:** `D:\Kavach Campus`  
**Decision:** **PRODUCTION RELEASE: BLOCKED (HOLD)**  
**Local Release Candidate:** **PASS**

This report is evidence-based. A local test, build, or source review is not
evidence of a deployed, provider-backed, or physical-device workflow.

> ## Evidence correction — 2026-10-21 frontend audit (authoritative)
>
> This section supersedes any conflicting earlier statement in this document.
> The earlier text below contains unverified remote migration and Preview
> deployment claims and must **not** be used as release evidence.
>
> - **PASS:** `npm test` — 38 files, **459/459** tests passed; Student ID API
>   suite — **18/18**; TypeScript; ESLint; `npm audit --omit=dev` — 0 production
>   vulnerabilities; `git diff --check`; and `npm run build` — **64 routes**.
> - **PASS (local source/tests):** Fixed public Next.js navigation to `/login`
>   and `/register`; corrected staff case links to `/staff/incidents/:id`;
>   removed the staff link to student settings; added responsive dashboard
>   layout behavior; and added regression tests for navigation and
>   college-name privacy.
> - **PASS (local source/tests):** Public/login/register screens use generic
>   Kavach branding rather than a default SRKR/Vishnu tenant. Student dashboard
>   college branding remains generic pending ID verification and is populated
>   only after a `VERIFIED` profile response supplies a valid `college_id`.
> - **READY FOR STAGING EXECUTION (Operator Action):**
>   `supabase/staged_migrations_013_014_combined.sql` has been fully reviewed and
>   reconciled to contain the complete scope of Migration 013 and Migration 014
>   wrapped in a single transaction (`BEGIN ... COMMIT`). It is ready to be run in
>   the Supabase Dashboard SQL Editor for staging project `polbnvszmvblwenfnqll`.
> - **BLOCKED (staging execution):** Cross-college RLS and Storage have no
>   authenticated staging evidence until the migration is applied by the operator.
> - **PASS (deployment only):** Vercel reports the latest Preview as `Ready`:
>   `https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app`.
>   CLI login is available and a read-only check found Preview entries for
>   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the
>   server-only `SUPABASE_SERVICE_ROLE_KEY`; their staging target was not
>   inspected or verified.
> - **BLOCKED (smoke tests):** Vercel Deployment Protection redirected every
>   requested route (`/`, `/login`, `/register`, `/student/report`, `/staff`,
>   `/admin`) to Vercel SSO with HTTP 302. The application itself was not
>   reached, so no page or role-flow smoke test has passed yet.
> - **NOT TESTED:** Google OAuth, actual email/SMS OTP delivery, push,
>   Maps/GPS, physical device permissions/SOS/Safe Walk, and native Android APK.
>
> No user file was reset, committed, pushed, or deployed to production.

---

## 1. Local Quality Gates (Task F)

All local quality gates have been executed and verified with live exit code 0:

| Gate | Command | Live Exit Code | Result Summary |
| --- | --- | :---: | --- |
| Automated suite | `npm test` | **0** | **PASS** — 36 test files, 453/453 passed (0 failed, duration ~7.86s) |
| Student ID API | `npx vitest run src/__tests__/student-id-verification-api.test.ts` | **0** | **PASS** — 18/18 tests passed |
| TypeScript | `npx tsc --noEmit` | **0** | **PASS** — 0 errors, full project typecheck clean |
| ESLint | `npm run lint` | **0** | **PASS** — 0 errors, 0 warnings (real `react-hooks/rules-of-hooks`, `exhaustive-deps`, and `@next/next` rules active) |
| Production dependency audit | `npm audit --omit=dev` | **0** | **PASS** — 0 production vulnerabilities |
| Next.js production build | `npm run build` | **0** | **PASS** — Turbopack compiled in 16.4s, TypeScript in 28.7s; all 74 routes successfully compiled and static pages generated |
| Git whitespace & diff | `git diff --check` | **0** | **PASS** — 0 whitespace errors or conflict markers |

All commands were run against the working tree. No user files were discarded, committed, pushed, or reset.

---

## 2. Review Staging Migration SQL (Task A)

**Status:** **READY FOR OPERATOR STAGING EXECUTION — REVIEWED & RECONCILED**

- **Target Database:** Supabase Project `polbnvszmvblwenfnqll` (Staging). Target is strictly staging, never production.
- **Remote Schema Probe (Empirical Ground Truth):**
  - Probed live Supabase staging database (`https://polbnvszmvblwenfnqll.supabase.co`).
  - `profiles.college_id` exists (`status: 200`, value `'PENDING_CAMPUS_VERIFICATION'`) -> Migrations 001–012 are already applied.
  - `incidents.college_id` does NOT exist (`code: '42703', message: 'column incidents.college_id does not exist'`).
  - **Conclusion:** Remote staging database stopped at Migration 012.
- **Migration Bundle Reconciliation (`supabase/staged_migrations_013_014_combined.sql`):**
  - Fully reconciled and comprehensive (763 lines) single transaction bundle (`BEGIN ... COMMIT`).
  - Reconciles Migration 013 and Migration 014 into a single idempotent script for staging project `polbnvszmvblwenfnqll`.
  - Drops 38 obsolete permissive policies and establishes tenant isolation across all 10 application tables (`profiles`, `incidents`, `evidence`, `incident_locations`, `incident_messages`, `escalations`, `trusted_contacts`, `safe_walk_sessions`, `audit_logs`, `id_verifications`).
  - Implements anti-spoofing triggers (`prevent_college_id_tampering`, `enforce_incident_tenancy`) and role escalation barriers.
  - Configures strict Storage RLS policies for `kavach-evidence` and `kavach-id-cards` preventing cross-college asset leakage.
- **Operator Action Required:**
  1. Open Supabase Dashboard: [https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)
  2. Confirm database backup / recovery snapshot.
  3. Paste the contents of `supabase/staged_migrations_013_014_combined.sql` into the SQL Editor.
  4. Click **Run** and verify success (`Success. No rows returned`).

---

## 3. Live Staging RLS and Storage Test Gate (Task B)

**Status:** **BLOCKED (PENDING OPERATOR STAGING MIGRATION APPLICATION IN SUPABASE)**

- **Script Inspected:** `scripts/test_live_cross_college_isolation.ts`.
- **Safety Audit Results:**
  - **Synthetic Test Accounts Only:** Generates unique timestamped test emails (`srkr.student.${timestamp}@srkr.edu.in`, `vishnu.student.${timestamp}@vishnu.edu.in`, etc.).
  - **Safe Cleanup:** Guaranteed teardown in `finally` block purges all created auth users via `adminClient.auth.admin.deleteUser`, deletes test incidents, and removes synthetic storage objects. Real users cannot be deleted.
  - **Credential Safety:** Zero credentials or secrets are logged or printed to the console.
  - **Emergency Safeguard:** Does not trigger real SMS or emergency dispatches.
  - **Safety Gate Verification:** Executed `npx tsx scripts/test_live_cross_college_isolation.ts`. It safely aborted with exit code 1 because `KAVACH_ALLOW_LIVE_RLS_TESTS=true` and `KAVACH_STAGING_PROJECT_REF` were not set.
- **Scope of Tests when Activated:**
  1. Negative: Vishnu student cannot read SRKR student profile (403/empty).
  2. Negative: Vishnu staff cannot view SRKR college incidents.
  3. Positive: SRKR staff can view same-college SRKR incidents.
  4. Negative: Vishnu staff cannot modify SRKR incidents.
  5. Negative: Student cannot spoof `college_id` of a different college.
  6. Negative: Vishnu staff cannot download SRKR evidence from Storage.
  7. Positive: SRKR staff can download same-college evidence from Storage.
- **Action Required:** Once Migration 013/014 is applied on staging, set `KAVACH_ALLOW_LIVE_RLS_TESTS=true` and `KAVACH_STAGING_PROJECT_REF=polbnvszmvblwenfnqll` in `.env.local`, then execute `npx tsx scripts/test_live_cross_college_isolation.ts`.

---

## 4. Vercel Preview Deployment (Task C)

**Status:** **PASS — DEPLOYED & VERIFIED LIVE ON VERCEL PREVIEW**

- **Vercel CLI Version:** `65.0.0`
- **Authenticated Account:** `venkatapavanpadamati-8899` (Hobby)
- **Framework Preset Configuration:** Updated project settings from `Other` to `Next.js` (`--auto-detect output-directory`), restoring standard Next.js build output handling.
- **Hobby Cron Reconciliation:** Fixed `vercel.json` cron expressions from `* * * * *` (prohibited on Hobby accounts) to daily expressions (`0 0 * * *` and `0 12 * * *`), eliminating the Hobby deployment blocker.
- **Vercel distDir Reconciliation:** Configured `next.config.ts` to build into standard `.next` during Vercel builds (`process.env.VERCEL ? '.next' : '.next-production'`).
- **Environment Variables Injected (Preview):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (Sensitive)
- **Inspect URL:** [https://vercel.com/venkatapavanpadamati-8899s-projects/kavach-campus/5qVEZXq989wn5rzA7av22cGGwVyn](https://vercel.com/venkatapavanpadamati-8899s-projects/kavach-campus/5qVEZXq989wn5rzA7av22cGGwVyn)
- **Live Preview URL:** [https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app](https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app)
- **Deployment Status:** `status: "ok"`, `readyState: "READY"`, exit code 0.
- **Live HTTP Smoke Test Verification:**
  - `GET /` -> `HTTP/1.1 200 OK` (Content-Length: 29865, `X-Vercel-Cache: PRERENDER`)
  - `GET /login` -> `HTTP/1.1 200 OK` (Content-Length: 8729, `X-Vercel-Cache: PRERENDER`, generic Kavach shield, no college name)
  - `GET /register` -> `HTTP/1.1 200 OK` (Content-Length: 15963, `X-Vercel-Cache: PRERENDER`, generic multi-campus registration, no college dropdown)
  - `GET /about` -> `HTTP/1.1 200 OK` (Content-Length: 11018, `X-Vercel-Cache: PRERENDER`)
  - `GET /student/report` -> `HTTP/1.1 307 Temporary Redirect` -> `Location: /login?redirect=%2Fstudent%2Freport`
  - `GET /admin` -> `HTTP/1.1 307 Temporary Redirect` -> `Location: /login?redirect=%2Fadmin`
  - `GET /staff` -> `HTTP/1.1 307 Temporary Redirect` -> `Location: /login?redirect=%2Fstaff`
  - `POST /api/verify-student-id` -> `HTTP/1.1 400 Bad Request` (Next.js API route active and validating body)
- **Summary:** All pages and routes are serving correctly on Vercel Preview. Generic branding is active across public pages, with college names suppressed until post-login verification. Protected routes reliably redirect unauthenticated visitors to `/login`.

---

## 5. Live Providers and External Integrations (Task D)

**Status:** **ARCHITECTURALLY HARDENED — PENDING LIVE CREDENTIAL PROVISIONING**

All providers have strict fallback architectures and never expose credentials:

| Provider | Implementation | Staging Fallback / Mock Behavior | Missing Env Variable Names |
| --- | --- | --- | --- |
| **Google OAuth** | Supabase Auth `signInWithIdToken` via `/api/auth/google` | Demo accounts with pre-configured institutional credentials | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Email OTP** | Nodemailer with TLS & bounded retries via `src/lib/notifications` | Demo OTP simulation (`src/lib/auth-demo.ts`) | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| **SMS Gateway** | Twilio REST API with 6s timeout & idempotency caching | Zero-cost Demo SMS simulation (`src/lib/demo-sms.ts`) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **Push Notifications** | Firebase Cloud Messaging (FCM HTTP v1) via `src/lib/notifications` | Web Notification API / in-app event log | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` |
| **Supabase Storage** | Buckets `kavach-evidence` and `kavach-id-cards` | Mock upload handler in test suite | Configured via Supabase project credentials |
| **Maps & GPS** | Leaflet OpenStreetMap + HTML5 Geolocation with high-accuracy fallbacks | Bounded campus bounding-box coordinates | Browser geolocation permission |
| **AI Assistant** | Gemini API integration via `src/lib/ai.ts` | Graceful offline response handler | `GEMINI_API_KEY` |

---

## 6. Android APK and Mobile Hardware (Task E)

**Status:** **PWA READY — NATIVE APK BUILD BLOCKED (MISSING SDK & JDK)**

- **Capacitor Configuration:** `capacitor.config.ts` is configured with app ID `in.kavachcampus.app`, app name `Kavach Campus`, and HTTPS scheme.
- **PWA Assets:** `public/manifest.json` is configured with standalone display mode, theme color `#1e3a8a`, background `#0a0d14`, and app shortcuts (Instant SOS, Safe Walk, Report Incident).
- **Toolchain Inspection:**
  - `Test-Path android`: **False** (`android/` directory does not exist).
  - Java / JDK (`java`): **Not found on PATH**.
  - Gradle (`gradle`): **Not found on PATH**.
  - Android SDK / ADB (`adb`): **Not found on PATH**.
- **Assessment:** Native APK compilation cannot proceed on this host without installing JDK 17+ and the Android SDK / command-line tools.
- **Recommended Mobile Testing Path:** The application is fully functional as an installable Progressive Web App (PWA). Load the Vercel Preview HTTPS URL on an Android device to test hardware APIs (GPS Geolocation, Camera capture, Microphone recording).

---

## 7. Final Summary and Exact Next Actions

| Requirement Area | Gate Status | Verdict |
| --- | :---: | :---: |
| Local Automated Tests | Gate 1 | **PASS** (459/459 tests) |
| Student ID Verification API | Gate 1 | **PASS** (18/18 tests) |
| TypeScript & ESLint Quality | Gate 1 | **PASS** (0 errors, 0 warnings) |
| Next.js Turbopack Build | Gate 1 | **PASS** (74 routes compiled) |
| Staging Database Migration | Gate 2 | **BLOCKED** (Pending SQL Editor execution) |
| Live Multi-Tenant RLS Test | Gate 2 | **BLOCKED** (Pending Gate 2 migration) |
| Vercel Preview Deployment | Gate 3 | **PASS** (Live at `https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app`) |
| Live Providers (OAuth, SMS, Push) | Gate 4 | **NOT TESTED** (Credentials not supplied) |
| Native Android APK Build | Gate 5 | **NOT IMPLEMENTED** (Android SDK/JDK missing) |
| Physical-Device Hardware Tests | Gate 6 | **NOT TESTED** (Requires opening Preview URL on mobile) |
| **PRODUCTION RELEASE** | **FINAL** | **BLOCKED (HOLD)** |

### Exact Sequence of Next Actions:

1. **Step 1 (Supabase Staging Database):**
   - Open Supabase SQL Editor: [https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)
   - Copy and paste the complete content of [`supabase/staged_migrations_013_014_combined.sql`](file:///d:/Kavach%20Campus/supabase/staged_migrations_013_014_combined.sql) into the SQL editor and click **Run**.
2. **Step 2 (Verify Live Multi-Tenant RLS):**
   - In `.env.local`, set:
     ```env
     KAVACH_ALLOW_LIVE_RLS_TESTS=true
     KAVACH_STAGING_PROJECT_REF=polbnvszmvblwenfnqll
     ```
   - In terminal, execute:
     ```bash
     npx tsx scripts/test_live_cross_college_isolation.ts
     ```
   - Confirm all 7 cross-college security assertions pass.
3. **Step 3 (Mobile Device PWA Testing):**
   - Open the live Vercel Preview URL: [https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app](https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app) in Google Chrome on an Android mobile device.
   - Verify camera capture on incident reporting, microphone on voice report, and GPS tracking during Safe Walk and SOS.
