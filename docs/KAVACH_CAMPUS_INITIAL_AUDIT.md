# KAVACH CAMPUS — INITIAL WORKSPACE & BASELINE AUDIT

**Audit Date:** 2026-11-01T20:45:37+05:30
**Project:** Kavach Campus (Smart College Student Safety and Emergency Response Platform)  
**Repository:** [https://github.com/venkatapavanpadamati-8899/kavach-campus](https://github.com/venkatapavanpadamati-8899/kavach-campus)  
**Production URL:** [https://kavach-campus.vercel.app](https://kavach-campus.vercel.app)  
**Auditor Role:** Autonomous Senior Software Engineer, Security Auditor, QA Engineer & Release Manager  

---

## 1. Initial Baseline and Current Follow-Up

The entries in this section include historical assertions and are not, by themselves, current evidence. The 2026-11-01 follow-up reran the reported timeout case, full suite, TypeScript, ESLint, dependency audit, and production build; it reviewed commit `57835c8` and the live-database audit script. It did not verify live database rows/policies, inspect provider consoles, or test a physical device.

### Baseline Metrics
- **Package Manager & Framework:** npm, Next.js 16.4.3, React 19, TypeScript 6. The configured production build uses Turbopack with `--experimental-app-only`.
- **Latest automated test run:** `npm test` ➔ 51 suites; 672 passed, 0 failed, 0 skipped; exit code 0. The reported L1/LOW timeout test passed in isolation and its full test file passed 12/12.
- **TypeScript:** `npx tsc --noEmit` ➔ exit code 0.
- **ESLint:** `npm run lint` ➔ exit code 0.
- **Production dependency audit:** `npm audit --omit=dev` ➔ 0 vulnerabilities; exit code 0.
- **Production build:** `npm run build` (`next build --experimental-app-only`) ➔ exit code 0; all 68 routes generated. The `prebuild` script that deleted `.next` before Next.js acquired its build lock was removed in the current worktree.
- **Whitespace validation:** `git diff --check` ➔ exit code 0.
- **Source revision:** `main`, `HEAD`/`origin/main` `57835c86b86bbf3d38e3de813d7c7638c1c46835`. Current worktree has uncommitted code and report changes; see the final verification report for the exact file list.
- **Production deployment:** Read-only Vercel listing reports READY production deployment(s) on commit `57835c86b86bbf3d38e3de813d7c7638c1c46835`, matching local `HEAD`. No deployment command was run in this audit.
- **Production smoke tests:** Probes returned `/` 200, `/login` 200, `/firebase-messaging-sw.js` 200, `/student` 307, `/api/student/profile` 401, and unauthenticated `POST /api/sos` 401.

---

## 2. Architecture & Subsystem Inventory

### A. Authentication & Authorization
- **Multi-Factor OTP:** Email OTP via Nodemailer SMTP with bcrypt hash storage in `user_otp_verifications`.
- **Demo SMS Mode:** Zero-cost `ENABLE_DEMO_SMS=true` simulation for mobile verification without incurring paid SMS carrier charges.
- **RBAC Roles:** `STUDENT`, `STAFF`, `MENTOR`, `COUNSELLOR`, `SECURITY`, `HOD`, `PRINCIPAL`, `WOMENS_CELL`, `ADMIN`, `SUPER_ADMIN`.
- **Tenant Scope:** Campus multi-tenancy enforced with verified college tenants (e.g. SRKR, Vishnu, etc.).

### B. Artificial Intelligence Engine
- **Source configuration:** Google Gemini via `@google/genai`, with model names and schema handling in source.
- **Automated test scope:** `ai-evaluation-and-routing.test.ts` mocks the provider and supplies predetermined responses for its AI scenarios; it tests schema/fallback behavior, not real model classifications or accuracy.
- **Live provider behavior, credential validity, and production AI routing:** NOT TESTED in the latest follow-up.
- **Output schema in source:** `{ category, severity: L1-L4, urgency: LOW-CRITICAL, confidence, summary }`.

### C. Smart Responder & Mentor Routing Engine
- **Role Hierarchy:** Low severity ➔ Mentors/Counsellors; High/Critical ➔ Security/HOD/Principal/Admin.
- **Haversine Distance:** Calculates Great-Circle distance in meters between student coordinates and on-duty responders with location consent.
- **Coordinate Freshness:** Rejects stale coordinates older than 15 minutes.
- **Safe Fallback:** Departmental fallback without inventing coordinates when GPS is unavailable.

### D. GPS & Live Coordinates
- **Validation:** Strict range bounds ($-90 \le \text{lat} \le 90$, $-180 \le \text{lng} \le 180$).
- **Database Tables:** `incidents`, `incident_locations`, `staff_locations`.
- **Controlled Test Mode:** Local code has a dedicated test branch. Automated tests verify session-derived student ownership, `STUDENT` role enforcement, cooldown, and no direct notification dispatch. The browser's geolocation result does not prove a satellite lock. Physical-device GPS and live database persistence remain unverified.
- **Maps Redirection:** Generates direct Google Maps links (`https://www.google.com/maps/search/?api=1&query=lat,lng`) for responder dispatch.

### E. Profile Management
- **Persistence:** Read & write endpoints (`GET /api/student/profile`, `PUT /api/student/profile`).
- **Fields:** Personal info, college info, blood group, medical conditions, hostel/residence type (`DAY_SCHOLAR`, `COLLEGE_HOSTEL`, `PRIVATE_HOSTEL`).
- **Tampering Guards:** Rejects modifications to server-controlled institutional verification fields (`verification_status`, `verified_by`, `ocr_extracted_data`).

---

## 3. Defects, Security Risks & Status

| Identified Area | Nature of Risk / Issue | Current Status | Resolution |
| :--- | :--- | :--- | :--- |
| **Global Error Prerendering** | Next.js 16 build crash during prerendering `/_global-error` when no root error boundary existed. | **FIXED** | Implemented custom `src/app/global-error.tsx` client component. |
| **AI Evaluation Test Coverage** | Standalone AI evaluation suite covering all 12 edge cases & mentor routing was missing. | **FIXED** | Authored `src/__tests__/ai-evaluation-and-routing.test.ts` (18 tests passing). |
| **AI Output Sanitization** | Non-standard string categories or severities could cause runtime typing mismatch. | **HISTORICAL CLAIM** | Current AI behavior was not independently re-audited in this follow-up. |
| **SOS countdown / controlled GPS safety** | Page previously auto-activated SOS and could resume a countdown after GPS test failure. | **FIXED LOCALLY** | Current page requires explicit SOS action. Controlled test server-checks the student role and fails on persistence errors. Covered by the focused controlled-GPS route suite. |
| **Production and physical validation** | Local changes are not proven deployed; device and provider evidence unavailable. | **OPEN** | No deployment, physical GPS test, live database row query, visible push, or provider delivery was performed. |
| **Twilio Trial Limitations** | Carrier SMS delivery blocked for unverified external numbers (`Error 572002`). | **DOCUMENTED / CONTROLLED** | Handled by zero-cost simulation fallback (`ENABLE_DEMO_SMS=true`). |

---

## 4. Current Status & Operator Field Validation Steps

### Overall Verdict: **`NOT READY`**

1. **Automated quality gates:** **PASS** — 51 suites/672 tests, TypeScript, ESLint, production dependency audit, and the 68-route production build passed. The reported timeout did not reproduce.
2. **Production deployment metadata:** **PASS (READY)** — Read-only Vercel listing reports deployment(s) on the current source commit. This does not verify application behavior.
3. **Database RLS & isolation:** **NOT VERIFIED** — The new live audit script creates and deletes synthetic records. It was not run; the current worktree adds an explicit isolated-test mode and expected-host guard before those actions.
4. **Physical/provider checks:** **MANUAL REQUIRED** — GPS, visible push, carrier SMS/email, and live AI behavior were not tested.
5. **Next operator action:** First provision an isolated Supabase test project and obtain authorized review of the production incident triggers/RLS. Do not run the database script or production controlled GPS test until alert isolation is established.
