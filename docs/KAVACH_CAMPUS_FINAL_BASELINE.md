# KAVACH CAMPUS - FINAL BASELINE AND INVENTORY

## 1. Project Overview
- **Name:** Kavach Campus (Safety in One Tap)
- **Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase Auth, PostgreSQL, Storage, Gemini AI.

## 2. Directory & Structure
- **Pages:** `/login`, `/register`, `/student/*` (dashboard, sos, safe-walk, trusted-contacts), `/staff/*`, `/admin/*`.
- **API Routes:** `/api/ai/classify`, `/api/incidents/*`, `/api/cron/*`, `/api/safe-walk/*`.
- **Supabase Clients:** `@supabase/ssr` server actions and route handlers configured in `src/lib/supabase/`.

## 3. Environment Variables (Names Only)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `SMTP_PASSWORD`

## 4. Feature Implementation Status
| Feature | Status | Notes |
|---------|--------|-------|
| Auth & Profiles | **PARTIAL** | Login works; external providers (Google) lacking active credentials setup. |
| SOS & Incidents | **PARTIAL** | DB and routing present, but real staff GPS lacking. |
| AI Classification | **IMPLEMENTED** | Endpoint `/api/ai/classify` works using Gemini but risks overriding human judgment if relied on solely. |
| Notifications | **NOT IMPLEMENTED** | Mock UI only. No Twilio or FCM integrated. |
| Safe Walk Start/End | **IMPLEMENTED** | Endpoints exist and write to DB correctly. |
| Safe Walk Timeout | **IMPLEMENTED** | Cron logic present, deployment config (`vercel.json`) generated but not executing yet. |
| Trusted Contacts | **PARTIAL** | DB schema exists; alerts dispatch is mocked. |
| Tests (Jest/PW) | **NOT IMPLEMENTED** | No automated tests found in project. |

## 5. Known Vulnerabilities & Debt
- 204 ESLint issues (122 errors, 82 warnings), including heavy use of `any` types.
- Missing `SUPABASE_SERVICE_ROLE_KEY` remote validation.
