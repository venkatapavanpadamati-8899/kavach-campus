# Kavach Campus — Complete Repository Inventory & Audit

**Date:** 2026-10-21  
**Project:** Kavach Campus  
**Workspace:** `D:\Kavach Campus`  
**Runtime:** Node.js v24.19.0, Next.js 16.4.0 (Turbopack), TypeScript 6.0.3, Vitest 5.0.3, ESLint 9.39.5

---

## 1. Executive Summary

This document presents a comprehensive, evidence-based audit of every component, file category, configuration, and interface in the Kavach Campus repository. Every finding recorded is backed by actual source code inspection and live terminal execution results.

---

## 2. Package & Dependency Configuration

- **`package.json`**:
  - Core Framework: Next.js 16.4.0, React 19.3.0, React DOM 19.3.0
  - Data & Realtime: `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3, `socket.io` 4.8.4, `socket.io-client` 4.8.4
  - Security & Auth: `google-auth-library` 11.2.0, `jose` 6.2.12, `jsonwebtoken` 9.0.3, `bcryptjs` 3.0.3
  - UI & Animation: `lucide-react` 1.53.0, `framer-motion` 14.0.0
  - Utilities: `nodemailer` 10.0.16, `uuid` 14.0.2, `@google/genai` 2.28.0
- **Dev Dependencies & Tooling**:
  - TypeScript 6.0.3, Vitest 5.0.3, ESLint 9.39.5
  - Linters: `@typescript-eslint/eslint-plugin` 8.72.0, `eslint-plugin-react-hooks` 5.1.0, `@next/eslint-plugin-next` 16.4.0
  - Vercel CLI: 65.0.0
- **Production Vulnerabilities**:
  - `npm audit --omit=dev`: **0 vulnerabilities** (Exit code 0).

---

## 3. Configuration & Build Engine Audit

1. **Next.js Engine (`next.config.ts`)**:
   - Compiles with Turbopack in 2.4s.
   - All 74 routes statically pre-rendered or declared dynamic (`export const dynamic = 'force-dynamic'`).
2. **TypeScript (`tsconfig.json`)**:
   - Target ES2017, Module ESNext, Strict mode enabled.
   - `npx tsc --noEmit` exited with code 0.
3. **ESLint (`eslint.config.mjs`)**:
   - Replaced legacy dummy rule handlers with genuine `eslint-plugin-react-hooks` and `@next/eslint-plugin-next`.
   - `npm run lint` exited with code 0 (0 errors, 0 warnings).
4. **PWA & Mobile Ready**:
   - Web App Manifest: `public/manifest.json` configured with standalone display and quick-action shortcuts for SOS, Safe Walk, and Incident Reporting.
   - Root Layout: `src/app/layout.tsx` updated with mobile viewport, theme color `#1e3a8a`, and PWA capability metadata.
   - Capacitor: `capacitor.config.ts` created for native Android packaging.

---

## 4. Route & Architecture Inventory (74 Routes Total)

### 4.1 Frontend Pages (Public & Auth)
- `/` — Landing page with live safety stats, quick access emergency triggers, and campus directory.
- `/about` — Platform mission, governance, and institutional compliance standards.
- `/features` — Feature breakdown (Safe Walk, AI incident classification, SOS beacon).
- `/contact` — Campus emergency control room and technical support contacts.
- `/privacy` — Privacy charter, student confidentiality safeguards, and evidence retention policies.
- `/login` — Unified role-based sign-in with email/password and Google OAuth.
- `/register` — Institutional student registration with domain validation.
- `/verify-otp` — 6-digit OTP verification with replay protection and countdown timer.
- `/forgot-password` & `/reset-password` — Secure recovery flows.
- `/unauthorized` — Graceful access denial screen with context-aware navigation.

### 4.2 Student Portal (`/student/*`)
- `/student` — Student command center, active alerts, quick SOS, and Safe Walk launcher.
- `/student/cases` & `/student/incidents` — Personal incident tracking with real-time status history.
- `/student/incidents/[id]` — Detailed case overview with confidential timeline and evidence status.
- `/student/report` — Comprehensive multi-modal incident reporting form with file attachments.
- `/student/voice-report` — Audio-based confidential reporting.
- `/student/sos` — Instant emergency trigger with geolocation tracking and responder dispatch.
- `/student/safe-walk` — Live companion timer, route beaconing, and automated timeout escalation.
- `/student/profile` — Student identity details and institutional ID card status.
- `/student/verification-status` — Verification holding queue and resubmission handler.
- `/student/contacts` & `/student/trusted-contacts` — Emergency SMS and push contact management.
- `/student/settings` — Notification preferences and privacy controls.

### 4.3 Staff Portal (`/staff/*`)
- `/staff` — Campus safety officer and responder dashboard.
- `/staff/incidents` — Assigned and zone-filtered incident queue (strictly scoped to own campus).
- `/staff/incidents/[id]` — Incident triage interface, action logger, note recorder, and evidence viewer.

### 4.4 Management & Administration (`/admin/*`, `/management/*`, `/super-admin/*`)
- `/management` & `/management/incidents` — Executive oversight and campus-wide safety analytics.
- `/admin` & `/admin/campus` — Campus security administration, staff routing, and responder zones.
- `/admin/ai` — AI routing accuracy evaluation, category distribution, and confidence scores.
- `/admin/users` — Campus user directory and staff approval queue.
- `/admin/system-audit` — Administrative audit log viewer.
- `/super-admin` & `/super-admin/pending-campus` — Multi-institutional governance, pending campus assignments, and system-wide tenant management.

---

## 5. Backend API & Server Actions Inventory

| Endpoint | Method | Role Required | Campus Isolation | Description |
| :--- | :---: | :---: | :---: | :--- |
| `/api/auth/register` | POST | Public | Domain Derived | Registers user; unmapped domains assigned `PENDING_CAMPUS_VERIFICATION` |
| `/api/auth/verify-otp` | POST | Public | Email Bound | Validates OTP with 5-minute expiry and 5-attempt limit |
| `/api/auth/login` | POST | Public | Profile Bound | Authenticates user and checks approval status |
| `/api/auth/google` | POST | Public | Domain Derived | Validates Google ID token; auto-provisions profile |
| `/api/auth/callback` | GET | Public | Domain Derived | OAuth redirect handler with safe destination routing |
| `/api/auth/logout` | POST | Authenticated | N/A | Revokes session and clears secure cookies |
| `/api/auth/demo-sms` | GET/POST| Authenticated | User Bound | Simulated ₹0 SMS dispatch and retrieval |
| `/api/incidents` | GET/POST| Student/Staff | Strictly Scoped | Creates/lists incidents; auto-assigns reporter's `college_id` |
| `/api/incidents/[id]` | GET/PATCH| Student/Staff | Strictly Scoped | Fetches single incident or updates workflow status |
| `/api/incidents/[id]/evidence` | GET/POST| Owner/Staff | Strictly Scoped | Uploads (25MB limit) or downloads private signed URLs |
| `/api/sos` | POST | Student | Reporter Scoped | Dispatches high-priority alert to same-campus responders |
| `/api/sos/location` | POST | Student | Reporter Scoped | Ingests live GPS breadcrumbs for active emergency |
| `/api/safe-walk/start` | POST | Student | Reporter Scoped | Starts Safe Walk session with duration & destination |
| `/api/safe-walk/location`| POST | Student | Reporter Scoped | Streams coordinates during active walk session |
| `/api/safe-walk/end` | POST | Student | Reporter Scoped | Terminates walk session cleanly |
| `/api/cron/safe-walk-timeout`| GET/POST| Cron Key/Admin| System Wide | Escalates expired Safe Walks to `AUTO_SOS` |
| `/api/cron/escalate` | GET/POST| Cron Key/Admin| System Wide | Escalates overdue unacknowledged incidents |
| `/api/student/verify-id`| POST | Student | User Bound | Ingests ID card file with binary magic-byte inspection |
| `/api/admin/users/approve`| POST | Admin/Super | Campus Scoped | Approves staff accounts within own campus |
| `/api/admin/verifications`| GET/POST| Admin/Super | Campus Scoped | Reviews student ID submissions within own campus |
| `/api/super-admin/pending-campus`| GET/POST| Super Admin | Multi-Campus | Assigns verified institution to unmapped accounts |
| `/api/system/health` | GET | Public | N/A | Probes database connectivity and service status |

---

## 6. Security & Architectural Invariants

1. **Client-Side `college_id` Discarded**:
   - All incident creation endpoints strictly derive `college_id` from the authenticated user's profile on the server.
   - Database triggers (`trg_assign_incident_college_id`) unconditionally overwrite any client-supplied `college_id` with `profile.college_id`.
2. **Strict RLS Permissive Purge**:
   - Migration 014 systematically drops legacy global policies (`"Public profiles are viewable by everyone"`, `"Staff can read all profiles"`).
   - In PostgreSQL, permissive policies combine with `OR`. Removing legacy policies ensures tenant isolation cannot be bypassed.
3. **Storage Object Access Control**:
   - `kavach-evidence` and `kavach-id-cards` buckets are strictly private (`public = false`).
   - Downloads require time-limited signed URLs (900 seconds) generated by server-side clients only after validating incident ownership.
4. **Role Escalation Protection**:
   - Database trigger `trg_prevent_self_role_escalation` on `public.profiles` aborts any update to `role`, `is_approved`, or `college_id` unless executed by an administrator or service role.
