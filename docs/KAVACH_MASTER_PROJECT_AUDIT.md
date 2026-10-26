# KAVACH CAMPUS — MASTER PROJECT AUDIT & SYSTEM INVENTORY

**Audit Date:** 2026-10-19T19:35:00+05:30  
**Project:** Kavach Campus (Tagline: *Safety in One Tap.*)  
**Technology Stack:** Next.js 16.4.0 (Turbopack), TypeScript 5.9 (Strict), Supabase PostgreSQL (`polbnvszmvblwenfnqll`), Vitest 2.1.9, ESLint 9 (Flat Config).

---

## 1. COMPREHENSIVE FEATURE INVENTORY

### A. Existing & Verified Features (Working 100%)
1. **Redesigned Landing Page:** Hero section featuring modern university architectural background (`/images/campus_hero_bg.jpg`), glassmorphic panels, tagline *"Safety in One Tap"*, direct CTA routing (`/register`, `/login`, `/student/sos`), role portal gateways, metrics bar, and footer links.
2. **Dedicated Visual Backgrounds:**
   - Landing Hero: `/images/campus_hero_bg.jpg` (Illuminated twilight campus)
   - Student Dashboard & Safe Walk: `/images/student_safewalk_bg.jpg` (Dusk lamp-lit pathway)
   - Authentication (Login / Register / OTP): `/images/auth_campus_bg.jpg` (Sunlit glass pavilion)
   - Emergency SOS: `/images/sos_emergency_bg.jpg` (Security operations command room)
   - Staff & Administration: `/images/staff_admin_bg.jpg` (Executive safety conference suite)
3. **Authentication & Session Security:**
   - Multi-role support: `STUDENT`, `STAFF`, `COUNSELLOR`, `WOMENS_CELL`, `SECURITY`, `MENTOR`, `HOD`, `PRINCIPAL`, `ADMIN`, `SUPER_ADMIN`.
   - HttpOnly, SameSite=Lax, Secure SSR session cookies managed via `@supabase/ssr`.
   - Logout endpoint (`POST /api/auth/logout`) completely purges authentication cookies.
4. **Phone & OTP Lifecycle (Demo & Production):**
   - In-memory CSPRNG 6-digit random OTP generator with 5-minute expiry, max 5 verification attempts, and minimum 30-second cooldown between requests.
   - Demo OTP strictly disabled in production builds (`isDemoOtpEnabled()` returns `false` unconditionally when `NODE_ENV === 'production'`).
   - `NEXT_PUBLIC_ENABLE_DEMO_OTP` removed from client bundles.
5. **Incident Reporting & Harassment Workflow:**
   - Multi-category support (Harassment, Stalking, Ragging, Medical, Emergency, Theft, Security, Maintenance).
   - Unique case tracking IDs (e.g. `KC-2026-XXXXX`).
   - State transition enforcement: `RECEIVED` -> `ACKNOWLEDGED` -> `INVESTIGATING` -> `IN_PROGRESS` -> `RESOLVED`.
   - Student A/B isolation: Student B is forbidden from reading, updating, or viewing Student A's complaints (HTTP 404 / RLS hidden).
6. **AI Severity Detection & Dual-Layer Safety Fallback:**
   - Primary: Gemini 2.5 Pro analysis with prompt-injection defense (`<complaint>` untrusted tag encapsulation).
   - Secondary / Fallback: Multi-lingual deterministic keyword scanner (English, Telugu, Hindi) detecting life threats ("knife", "రక్తం", "चाकू", "వేధింపులు") and auto-escalating to L4/CRITICAL urgency without external API dependencies.
7. **GPS & Geolocation Validation:**
   - Strict latitude `[-90, 90]` and longitude `[-180, 180]` bounds verification. Out-of-bounds rejected with `HTTP 400`.
   - Missing coordinates stored as SQL `null`—zero coordinate fabrication or `(0,0)` substitution.
8. **Student & Staff ID Verification:**
   - Private upload to `kavach-id-cards` storage bucket (`public: false`).
   - Administrative reviewer approval/rejection workflow with audit trail.
   - Database trigger `trg_prevent_student_self_verification` blocks students from modifying their own verification status.
9. **Emergency SOS & Safe Walk:**
   - Instant 3-second countdown with immediate cancel option to prevent accidental triggers.
   - Live location ping broadcasts with Safe Word authentication (`kavach_safe_word`).
   - Safe Walk arrival timer with automated backend cron escalation if walk times out.
10. **Database & Storage Architecture:**
    - 19 active PostgreSQL tables on Supabase remote instance `polbnvszmvblwenfnqll`.
    - Both `kavach-evidence` and `kavach-id-cards` buckets verified `public: false`.
    - Cross-student file listing and folder tampering blocked by Storage RLS policies.

---

## 2. MISSING OR UNCONFIGURED EXTERNAL INTEGRATIONS

1. **Production Paid Telecom SMS (Twilio / Indian DLT Gateway):**
   - Status: **NOT CONFIGURED** (by design for ₹0 student safety).
   - Adapter is implemented in `src/lib/notifications/index.ts` with bounded retries and idempotency. Requires college account credentials when ready for telecom rollout.
2. **Institutional SMTP Email Server:**
   - Status: **NOT CONFIGURED**.
   - Requires institutional mail server host (`smtp.college.edu`) and credentials.
3. **Production Cloud Hosting (Vercel / Cloud VM):**
   - Status: **STAGED / READY FOR DEPLOYMENT**.
   - Build compiles with 0 errors; deployment documentation and environment templates prepared.

---

## 3. CONFIGURATION BLOCKERS

1. **Supabase CLI `db diff --linked`:**
   - Status: **BLOCKED (Docker Dependency)**.
   - Requires Docker Desktop running locally on the Windows host to run the shadow container. Mitigated by direct RPC and live schema probes.

---

## 4. AVAILABLE TEST SUITES

- Vitest Automated Test Suite: 28 test files, 368 tests passed, 0 failures.
- TypeScript Static Analysis: `npx tsc --noEmit` -> 0 errors.
- ESLint Static Quality Check: `npm run lint` -> 0 errors, 0 warnings.
- Production Turbopack Build: `npm run build` -> 63 routes compiled (Exit 0).
- Production Dependency Audit: `npm audit --omit=dev` -> 0 vulnerabilities.
- Live E2E Integration Suite: `scripts/test_harassment_workflow_e2e.ts` -> 30/30 checks passed against live server and Supabase.
