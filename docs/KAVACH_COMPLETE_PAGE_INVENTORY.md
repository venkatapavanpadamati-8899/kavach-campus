# KAVACH CAMPUS — COMPLETE APPLICATION PAGE & ROUTE INVENTORY
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Framework:** Next.js 16.4.0 (Turbopack, App Router)  
**Date of Audit:** October 11, 2026  
**Dev Server:** Active at `http://localhost:3000` (PID 27816)

---

## 1. Executive Summary
An exhaustive file-system inspection of `src/app` discovered:
- **Application Pages (`page.tsx`):** 35 distinct pages
- **API Endpoints (`route.ts`):** 17 API & Cron routes
- **Total Registered App Router Routes:** 52 routes (54 static/dynamic chunks compiled in Next.js build)

All routes were verified live against `http://localhost:3000`.

---

## 2. Public Pages Inventory (Authentication NOT Required)

| Route Path | Source File | Purpose | Intended Role | HTTP Status | Response Size | Loading State | Error Handling | Mobile Responsive |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Main Landing Page ("Safety in One Tap", Quick SOS CTA, Emergency Helpline banner, feature preview) | Public / All | `200 OK` | 21,447 B | Instant Static | Fallback static content | Yes (CSS Grid / Flex) |
| `/about` | `src/app/about/page.tsx` | Campus safety vision, institutional governance, Women's Cell info | Public / All | `200 OK` | 15,184 B | Static | Static page | Yes |
| `/contact` | `src/app/contact/page.tsx` | Campus security control room contacts, medical center, helpline | Public / All | `200 OK` | 15,332 B | Static | Static page | Yes |
| `/features` | `src/app/features/page.tsx` | Technical features (One-Tap SOS, Safe Walk, AI routing, geofence) | Public / All | `200 OK` | 20,550 B | Static | Static page | Yes |
| `/privacy` | `src/app/privacy/page.tsx` | Student Data Protection & Privacy Policy, FERPA/DPDP adherence | Public / All | `200 OK` | 15,433 B | Static | Static page | Yes |
| `/login` | `src/app/login/page.tsx` | Unified login form (Email + Password + Role selector) | Public / Returning | `200 OK` | 17,997 B | Client state | Error banner on 401 | Yes |
| `/register` | `src/app/register/page.tsx` | Student & Staff registration portal with validation | Public / New User | `200 OK` | 16,696 B | Submitting spinner | Field validation errors | Yes |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Password recovery request form | Public | `200 OK` | 15,345 B | Submitting state | Error banner | Yes |
| `/reset-password` | `src/app/reset-password/page.tsx` | Secure password update via recovery token | Public / Recovery | `200 OK` | 15,692 B | Client state | Token validation error | Yes |
| `/verify-otp` | `src/app/verify-otp/page.tsx` | 6-digit OTP verification screen | Public / Registered | `200 OK` | 13,793 B | OTP verify button | Resend/Expired notice | Yes |
| `/super-admin/login` | `src/app/super-admin/login/page.tsx` | Dedicated Super Admin credential gate | Super Admin | `200 OK` | 16,882 B | Client state | Unapproved/Invalid alert | Yes |

---

## 3. Student Portal Pages (Authentication Required — Role: `STUDENT`)

*All student routes are enforced by Next.js middleware: unauthenticated requests receive HTTP 307 redirect to `/login`.*

| Route Path | Source File | Purpose | Data Dependencies | Unauthenticated Status | Mobile Responsive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/student` | `src/app/student/page.tsx` | Student Hub: Active SOS card, Safe Walk launcher, recent reports | `supabase.auth`, `profiles`, `incidents` | `307 -> /login` | Yes |
| `/student/sos` | `src/app/student/sos/page.tsx` | One-Tap Emergency Trigger with GPS acquisition | Geolocation API, `/api/sos` | `307 -> /login` | Yes (Primary Mobile) |
| `/student/report` | `src/app/student/report/page.tsx` | Non-emergency incident & harassment reporting form | `/api/incidents`, `student_profiles` | `307 -> /login` | Yes |
| `/student/safe-walk` | `src/app/student/safe-walk/page.tsx` | Safe Walk companion tracker with timeout countdown | `/api/safe-walk/start`, `/api/safe-walk/end` | `307 -> /login` | Yes |
| `/student/incidents` | `src/app/student/incidents/page.tsx` | Personal history of reported incidents & status tracking | `incidents` (filtered by student_id via RLS) | `307 -> /login` | Yes |
| `/student/incidents/[id]` | `src/app/student/incidents/[id]/page.tsx` | Detailed case timeline, officer assignment, resolution notes | `incidents`, `case_actions`, `audit_logs` | `307 -> /login` | Yes |
| `/student/profile` | `src/app/student/profile/page.tsx` | Student academic profile, enrollment number, department | `profiles`, `student_profiles` | `307 -> /login` | Yes |
| `/student/trusted-contacts` | `src/app/student/trusted-contacts/page.tsx` | Manage emergency contacts (Parent, Guardian, Mentor phone) | `trusted_contacts` table | `307 -> /login` | Yes |
| `/student/verification-status` | `src/app/student/verification-status/page.tsx` | Student ID OCR card upload and verification progress | `storage/kavach-id-cards`, `student_profiles` | `307 -> /login` | Yes |
| `/student/settings` | `src/app/student/settings/page.tsx` | Notification preferences, language (EN/TE/HI), dark mode | Local state / profile | `307 -> /login` | Yes |

---

## 4. Responder & Staff Pages (Authentication Required — Role: `STAFF`, `SECURITY`, `COUNSELOR`)

| Route Path | Source File | Purpose | Data Dependencies | Unauthenticated Status | Mobile Responsive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/staff` | `src/app/staff/page.tsx` | Staff Operations Dashboard: Live dispatch queue, active alerts | `incidents`, `incident_locations` | `307 -> /login` | Yes |
| `/staff/incidents` | `src/app/staff/incidents/page.tsx` | Incident intake list, filter by status (RECEIVED, ASSIGNED) | `incidents` | `307 -> /login` | Yes |
| `/staff/incidents/[id]` | `src/app/staff/incidents/[id]/page.tsx` | Case action workstation: Acknowledge, dispatch, record notes | `incidents`, `case_actions` | `307 -> /login` | Yes |

---

## 5. Management & Governance Pages (Role: `MANAGEMENT`, `HOD`, `DEAN`)

| Route Path | Source File | Purpose | Data Dependencies | Unauthenticated Status | Mobile Responsive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/management` | `src/app/management/page.tsx` | Executive Dashboard: Campus-wide metrics, SLA compliance | `incidents`, `campus_zones` | `307 -> /login` | Yes |
| `/management/incidents` | `src/app/management/incidents/page.tsx` | High-level incident oversight table | `incidents` | `307 -> /login` | Yes |
| `/management/incidents/[id]` | `src/app/management/incidents/[id]/page.tsx` | Management case review, escalation inspection | `incidents`, `escalations` | `307 -> /login` | Yes |

---

## 6. Administration & Super Admin Pages (Role: `ADMIN`, `SUPER_ADMIN`)

| Route Path | Source File | Purpose | Data Dependencies | Unauthenticated Status | Mobile Responsive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin` | `src/app/admin/page.tsx` | Primary Admin Command Center: Live telemetry, incident counters | `incidents`, `profiles`, `audit_logs` | `307 -> /login` | Yes |
| `/admin/ai` | `src/app/admin/ai/page.tsx` | AI Safety Configuration: Severity threshold adjustments, keyword rules | `ai_configuration`, `ai_analyses` | `307 -> /login` | Yes |
| `/admin/campus` | `src/app/admin/campus/page.tsx` | Geofence mapping, campus zones, building perimeter boundaries | `campus_zones` table | `307 -> /login` | Yes |
| `/admin/incidents` | `src/app/admin/incidents/page.tsx` | Master incident registry with multi-column filtering | `incidents`, `profiles` | `307 -> /login` | Yes |
| `/admin/incidents/[id]` | `src/app/admin/incidents/[id]/page.tsx` | Full forensic investigation view: Evidence, GPS log, audit trail | `incidents`, `incident_locations`, `evidence` | `307 -> /login` | Yes |
| `/admin/system-audit` | `src/app/admin/system-audit/page.tsx` | Comprehensive security audit log viewer, RLS posture check | `audit_logs` table | `307 -> /login` | Yes |
| `/admin/users` | `src/app/admin/users/page.tsx` | Staff/responder approval workstation & role assignment | `profiles` | `307 -> /login` | Yes |
| `/super-admin` | `src/app/super-admin/page.tsx` | Super Admin governance, cross-tenant privileges | `profiles`, `audit_logs` | `307 -> /super-admin/login` | Yes |

---

## 7. Backend API Endpoints (`route.ts`)

| API Route | HTTP Methods | Purpose | Auth Required | Provider / Service |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | User registration & initial profile creation | No | Supabase Auth + `profiles` |
| `/api/auth/login` | `POST` | Credential login & role token session issuance | No | Supabase Auth |
| `/api/auth/verify-otp` | `POST` | OTP validation endpoint | No | Supabase Auth / OTP service |
| `/api/auth/google` | `GET` | Google OAuth redirect initiator | No | Supabase OAuth provider |
| `/api/auth/callback` | `GET` | Supabase OAuth code exchange callback | No | Supabase Auth |
| `/api/sos` | `POST` | One-Tap Emergency trigger, GPS recording, broadcast | Yes (Bearer/Cookie) | Supabase DB + In-app + Push adapter |
| `/api/sos/location` | `POST` | Real-time GPS coordinate streaming during active SOS | Yes | `incident_locations` table |
| `/api/incidents` | `GET`, `POST` | Incident listing and non-emergency filing with AI analysis | Yes | Supabase DB + `@google/genai` |
| `/api/incidents/[id]` | `GET`, `PATCH` | Incident detail fetch and status transition / assignment | Yes | Supabase DB + `case_actions` |
| `/api/safe-walk/start` | `POST` | Start a timed Safe Walk session with geofence | Yes | `safe_walks` table |
| `/api/safe-walk/end` | `POST` | Complete or cancel an active Safe Walk session | Yes | `safe_walks` table |
| `/api/cron/escalate` | `POST` | Automated auto-escalation cron for overdue incidents | Yes (`CRON_SECRET`) | `incidents`, `escalations` |
| `/api/cron/safe-walk-timeout` | `POST` | Automated timeout checker for overdue Safe Walks | Yes (`CRON_SECRET`) | `safe_walks`, `incidents` |
| `/api/student/verify-id` | `POST` | Upload and verify Student ID card with OCR extraction | Yes | Supabase Storage + OCR logic |
| `/api/admin/users/approve` | `POST` | Admin approval for newly registered staff/responders | Yes (`ADMIN`) | `profiles` table |
| `/api/admin/verifications` | `GET`, `POST` | Admin review for pending student ID verifications | Yes (`ADMIN`) | `student_profiles` table |
| `/api/system/health` | `GET` | System health check (database, memory, timestamp) | No | Supabase client probe |
