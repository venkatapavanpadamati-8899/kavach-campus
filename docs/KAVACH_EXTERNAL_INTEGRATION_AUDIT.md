# KAVACH CAMPUS — EXTERNAL INTEGRATION AUDIT

**Audit Date:** 2026-10-19T17:25:00+05:30  
**Project:** Kavach Campus — Campus Safety and Emergency Response Platform  
**Target Environment:** Next.js 16.4.0 (Turbopack) · Node.js v24.19.0 · Supabase PostgreSQL  
**Audit Purpose:** Comprehensive inspection of all external services, notification adapters, AI fallbacks, authentication providers, and storage interfaces.

---

## 1. PROJECT STACK & ARCHITECTURE BASELINE

- **Framework:** Next.js 16.4.0 with App Router & Turbopack.
- **Language:** TypeScript 5.9 (Strict mode enabled).
- **Package Manager:** npm (Lockfile v3).
- **Quality Gates:** Vitest 2.1.9, ESLint 9 (Flat Config), `@typescript-eslint/parser`.
- **Primary Database & Auth:** Supabase Cloud (`polbnvszmvblwenfnqll.supabase.co`).
- **Storage Subsystem:** Supabase Private Storage (`kavach-evidence`, `kavach-id-cards`).

---

## 2. EXTERNAL INTEGRATION INVENTORY & STATUS

| Integration Service | Implementation Path | Configured Status | Runtime Behavior | Verification Status |
| :--- | :--- | :---: | :--- | :---: |
| **Supabase Database** | `src/lib/supabase/` | **CONFIGURED** | Direct PostgreSQL via REST/RPC (`polbnvszmvblwenfnqll`) | **PASS** |
| **Supabase Authentication** | `src/app/api/auth/` | **CONFIGURED** | SSR cookie sessions, HttpOnly, SameSite, Secure | **PASS** |
| **Supabase Storage** | `src/app/api/incidents/[id]/evidence` | **CONFIGURED** | Private buckets (`public: false`), RLS path isolation | **PASS** |
| **AI Classifier (Gemini)** | `src/lib/ai.ts` | **PARTIAL** | Gemini 2.5 Pro via `@google/genai`; safe deterministic fallback | **PASS** |
| **Deterministic Safety Engine** | `src/app/api/incidents/route.ts` | **CONFIGURED** | Multi-lingual keyword rules (EN, TE, HI) for L1–L4 urgency | **PASS** |
| **Demo SMS Simulator** | `src/lib/demo-sms.ts` | **CONFIGURED** | In-memory CSPRNG simulation (Free, dev only) | **PASS** |
| **Production SMS (Twilio)** | `src/lib/notifications/index.ts` | **NOT CONFIGURED** | Adapter implemented with retries/idempotency; disabled by default | **NOT CONFIGURED** |
| **Email (SMTP)** | `src/lib/notifications/index.ts` | **NOT CONFIGURED** | Adapter implemented; requires SMTP host/user/pass | **NOT CONFIGURED** |
| **Push Notifications (FCM)** | `src/lib/notifications/index.ts` | **NOT CONFIGURED** | Adapter implemented; requires Google service account | **NOT CONFIGURED** |
| **Browser Push API** | `src/lib/notifications/browser.ts` | **CONFIGURED** | Free HTML5 Notification API on foreground tabs | **PASS** |
| **GPS Geolocation** | `src/app/api/incidents/route.ts` | **CONFIGURED** | Server validation ([-90,90], [-180,180]); null handling | **PASS** |
| **Cron Automated Escalation** | `src/app/api/cron/` | **CONFIGURED** | Protected by `CRON_SECRET`, scheduled via `vercel.json` | **PASS** |

---

## 3. DETAILED FINDINGS BY SUBSYSTEM

### A. Supabase Database & RLS
- **Database Connectivity:** Verified via `GET /api/system/health`. Both `anon_db_status` and `service_role_db_status` return `PASS`.
- **Tables (19/19 Online):** `profiles`, `student_profiles`, `staff_profiles`, `incidents`, `incident_locations`, `evidence`, `ai_analyses`, `escalations`, `case_actions`, `notifications`, `safe_walks`, `trusted_contacts`, `audit_logs`, `campus_zones`, `campus_buildings`, `user_otp_verifications`, `incident_messages`, `ai_configuration`, `emergency_configuration`.
- **Row Level Security:** 8 sensitive tables reject anonymous writes (`42501`). Student A/B isolation strictly enforced.
- **Triggers:** `trg_prevent_student_self_verification` is active on `student_profiles`, preventing student privilege escalation.

### B. Private Storage
- **Buckets:** `kavach-evidence` and `kavach-id-cards` both have `public: false`.
- **Isolation:** Student A cannot upload or list objects in Student B's directory path.

### C. SMS & OTP Verification
- **Development Mode:** `src/lib/demo-sms.ts` provides a zero-cost, in-memory simulator with 5-minute expiry, max 5 attempts, and 30-second cooldown.
- **Production Mode:** `isDemoOtpEnabled()` in `src/lib/auth-demo.ts` strictly checks `process.env.NODE_ENV !== 'production'` and server-side `ENABLE_DEMO_OTP === 'true'`. In production builds, demo OTP is completely disabled.
- **Real SMS Gateway:** The Twilio notification adapter in `src/lib/notifications/index.ts` handles real SMS dispatch with bounded retries (max 2 on 5xx) and idempotency caching (10-minute TTL). Real delivery is guarded by `ENABLE_REAL_NOTIFICATIONS === 'true'`. Since live Twilio credentials have not been configured by the college, it safely defaults to `NOT_CONFIGURED`.

### D. AI Safety & Fallback Engine
- **Dual-Layer Architecture:**
  1. *Primary:* `analyzeIncident()` in `src/lib/ai.ts` sends structured prompt with prompt-injection defense (`<complaint>` tags treated strictly as untrusted data) to Gemini.
  2. *Secondary / Fallback:* If Gemini API returns 403, timeout, or rate-limit error, `src/app/api/incidents/route.ts` seamlessly activates the deterministic safety engine without throwing or dropping student reports.
- **Multi-Lingual Keywords:** Scans critical words across English ("knife", "suicide", "bleeding", "threat"), Telugu ("కత్తి", "చంపేస్తా", "రక్తం", "వేధింపులు"), and Hindi ("चाकू", "मारपीट", "धमकी"). Assigns L4/CRITICAL urgency automatically.
- **Human Authority:** AI recommendations never finalize safety statuses autonomously; staff review is mandatory.

### E. GPS Coordinates & Real-Device Tracking
- **Validation:** Server verifies latitude `[-90, 90]` and longitude `[-180, 180]`. Out-of-bounds coordinates return `HTTP 400 Bad Request`.
- **Absence Handling:** Missing coordinates are stored as SQL `null`—never substituted with `(0,0)`.
- **Device Limitations:** Standard web browsers cannot perform background GPS tracking when the tab is closed or the screen is locked without a native mobile wrapper (Capacitor/React Native) or progressive web app foreground lock.

---

## 4. QUALITY GATES SUMMARY

```powershell
npm test             -> 28 test files passed, 368 tests passed, 0 failures (PASS)
npx tsc --noEmit     -> 0 errors (PASS)
npm run lint         -> 0 errors, 0 warnings (PASS)
npm run build        -> 63 routes compiled with Turbopack (PASS)
npm audit --omit=dev -> 0 vulnerabilities (PASS)
```

---

## 5. AUDIT CONCLUSION & RECOMMENDATIONS

- **Status:** **PASS (Self-Contained MVP)**
- **External Dependencies Needed for 100% Live College Rollout:**
  1. Production Twilio or Indian DLT SMS credentials for real telecom SMS.
  2. Production SMTP server credentials for email alerts.
  3. Production Vercel or cloud host deployment.
