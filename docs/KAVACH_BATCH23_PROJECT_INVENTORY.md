# KAVACH CAMPUS — BATCH 23: PROJECT INVENTORY & BASELINE

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Git Branch & Commit:** `master` (`aa96b34`)  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Audit Purpose:** Comprehensive Start-to-End Full-Stack Project Inventory

---

## 1. Project Overview & Architecture

Kavach Campus is an enterprise campus emergency response, incident management, and student safety platform.
- **Frontend Framework:** Next.js 16.4.0 (App Router with Turbopack), React 19.3.0, Framer Motion, Lucide React.
- **Backend Architecture:** Next.js API Routes (Serverless / Node runtime), Supabase Server Client (`@supabase/ssr`), Supabase Admin Client (`@supabase/supabase-js`).
- **Database:** Supabase PostgreSQL with Table-level Row Level Security (RLS) and Security Definer helper functions.
- **Storage:** Supabase Storage with private buckets `kavach-evidence` and `kavach-id-cards`.
- **AI Integration:** Google GenAI SDK (`@google/genai`) for Gemini 2.5 severity classification and routing, backed by deterministic local rules engine fallback.
- **Notification Subsystems:** Twilio SMS dispatch, Firebase Cloud Messaging (FCM) web/mobile push, and SMTP transactional email adapters.

---

## 2. Toolchain and Configuration

| Category | Technology | Version | Key Configuration File |
|:---|:---|:---|:---|
| **Runtime & Core** | Next.js / Node.js | 16.4.0 / 24+ | `next.config.ts`, `package.json` |
| **Language** | TypeScript | 6.0.3 | `tsconfig.json` |
| **Styling & Motion** | CSS Modules & Framer Motion | 14.0.0 | `src/app/globals.css`, `src/app/page.module.css` |
| **Linter** | ESLint (Flat Config) | 9.39.5 | `eslint.config.mjs` |
| **Test Runner** | Vitest | 5.0.3 | `vitest.config.mts` |
| **Container Engine**| Docker Desktop / Supabase CLI | Docker 29.8.2 / Supabase 2.121.0 | 12 active local containers |

---

## 3. Complete Source Tree Inventory

### 3.1 Frontend Portals (`src/app/`) — 36 UI Pages (59 Compiled Routes)
1. **Public Portal:**
   - `/`: Landing page with features, live emergency hotline badges, and quick emergency dial actions.
   - `/about`: Institutional mission, architecture, and safety protocols.
   - `/features`: Feature breakdown for students, security staff, and administrators.
   - `/contact`: Campus security control room contact information and directory.
   - `/privacy`: Student data protection policy, GPS retention limits, and evidence handling.
2. **Authentication Flow:**
   - `/login`: Unified login with password, magic link OTP, and Google OAuth buttons.
   - `/register`: Student/staff registration with role-escalation safeguards.
   - `/verify-otp`: 6-digit bcrypt email verification OTP entry with 10-minute timer.
   - `/forgot-password`, `/reset-password`: Account recovery workflows.
   - `/super-admin/login`: Dedicated public gateway for institutional platform administrators.
3. **Student Portal (`/student`):**
   - `/student`: Student dashboard with real-time status cards.
   - `/student/sos`: One-tap emergency SOS activation with location capture.
   - `/student/safe-walk`: Journey tracking with timer, heartbeat pings, and escalation.
   - `/student/report`: Incident reporting with AI narrative classification.
   - `/student/incidents`, `/student/incidents/[id]`: Incident status, officer timeline, and private evidence.
   - `/student/verification-status`: 10-digit ID verification, academic batch checks, and Storage RLS-aligned ID card upload.
   - `/student/trusted-contacts`: Emergency contacts CRUD with telephone validation.
   - `/student/profile`: Medical notes, blood group, and emergency contact details.
   - `/student/settings`: Account notification preferences.
4. **Staff & Responder Portal (`/staff`):**
   - `/staff`: Security responder dashboard with active incident feeds.
   - `/staff/incidents`, `/staff/incidents/[id]`: Incident investigation, case-bound evidence viewer, GPS breadcrumbs, and responder status toggles.
5. **Management Portal (`/management`):**
   - `/management`: Oversight dashboard for Deans, HODs, and Principals.
   - `/management/incidents`, `/management/incidents/[id]`: Escalated cases and compliance monitoring.
6. **Administrator Portal (`/admin`):**
   - `/admin`: Security administration dashboard.
   - `/admin/users`: User management and staff approval quarantine.
   - `/admin/campus`: Campus geometry, boundary geofences, and safety contacts.
   - `/admin/ai`: Gemini AI severity classification thresholds and fallback rules.
   - `/admin/system-audit`: Tamper-evident audit log viewer.
   - `/admin/incidents`: Campus-wide incident resolution.
7. **Super-Admin Portal (`/super-admin`):**
   - `/super-admin`: Platform health, database connection monitoring, and system metrics.

---

### 3.2 Backend API Routes (`src/app/api/`) — 24 Endpoints
1. `/api/auth/login` (POST): Supabase password authentication.
2. `/api/auth/register` (POST): Registration with bcrypt OTP generation and role-guard.
3. `/api/auth/verify-otp` (POST): 6-digit OTP verification and account provisioning.
4. `/api/auth/google` (POST): Google One-Tap ID token verification.
5. `/api/auth/callback` (GET): Supabase Google OAuth PKCE callback and safe redirect routing.
6. `/api/sos` (POST): Emergency SOS incident creation (decoupled from AI).
7. `/api/sos/location` (POST): Real-time GPS coordinate breadcrumb ingestion.
8. `/api/safe-walk/start` (POST): Initiates safe walk session with timer.
9. `/api/safe-walk/location` (POST): Journey GPS heartbeat ping.
10. `/api/safe-walk/end` (POST): Completes or cancels safe walk session.
11. `/api/incidents` (GET, POST): Lists authorized incidents or files new complaint with AI evaluation.
12. `/api/incidents/[id]` (GET, PATCH): Fetches case details or updates responder status.
13. `/api/incidents/[id]/evidence` (GET, POST): Case-bound evidence association and retrieval.
14. `/api/incidents/[id]/escalate` (POST): Triggers emergency escalation for overdue incidents.
15. `/api/incidents/[id]/nearby-staff` (GET): Queries active responders in proximity.
16. `/api/incidents/[id]/notes` (GET, POST): Case resolution notes.
17. `/api/student/verify-id` (GET, POST): 10-digit ID verification, academic batch checks, and storage path normalization.
18. `/api/student/profile` (GET, PUT): Student profile and emergency medical notes.
19. `/api/student/trusted-contacts` (GET, POST, DELETE): Trusted contact management.
20. `/api/student/blood-search` (GET): Emergency campus blood donor registry search.
21. `/api/admin/analytics` (GET): Campus incident trends and department statistics.
22. `/api/admin/users/approve` (POST): Approves pending staff accounts.
23. `/api/admin/verifications` (GET, POST): Reviews student ID card verification queue.
24. `/api/system/health` (GET): Real-time system health and database connectivity check.
25. `/api/cron/escalate` (POST): Automated cron for overdue unacknowledged emergency incidents.
26. `/api/cron/safe-walk-timeout` (POST): Automated cron for timed-out safe walk journeys.

---

### 3.3 Database Migrations Inventory (`supabase/migrations/`)
- `001_kavach_campus_final.sql`: Canonical baseline schema (19 tables, enums, drop public profile wildcard).
- `002_kavach_campus_schema_repair.sql`: Schema repairs (requires policy drop order fix before column alter).
- `003_kavach_campus_gps_tracking.sql`: Distance calculation and GPS tracking columns.
- `004_kavach_campus_safe_walk_schema.sql`: Safe walk status enum & validation.
- `005_kavach_campus_rls_infinite_recursion_repair.sql`: SECURITY DEFINER role functions to break RLS loop.
- `007_student_id_card_verification.sql`: Student ID verification schema (requires audit log column alignment).
- `008_kavach_campus_schema_and_rls_alignment_safe.sql`: Safe alignment DDL without user mutations.
- `kavach_step115_security_hardening_candidate.sql`: Case-bound evidence, GPS isolation, tamper prevention trigger.

---

### 3.4 Automated Test Suites (`src/__tests__/`) — 22 Files (296 Tests)
- All 22 test files passing (296/296 tests) across Vitest.
