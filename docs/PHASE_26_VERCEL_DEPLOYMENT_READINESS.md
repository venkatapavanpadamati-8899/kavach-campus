# KAVACH CAMPUS — PHASE 26 VERCEL DEPLOYMENT READINESS AUDIT

**Project:** Kavach Campus — Safe Campus Network for Higher Education  
**Vercel Project:** `kavach-campus`  
**Production URL:** `https://kavach-campus.vercel.app`  
**Production Branch:** `main`  
**Build Command:** `next build --experimental-app-only`  
**Framework:** Next.js 16.4.3 (App Router with Turbopack)  
**Deployment Status:** **`GATED — PENDING DATABASE MIGRATION SIGN-OFF`**  

---

> [!CAUTION]
> **DEPLOYMENT SEQUENCE REQUIREMENT:**  
> Vercel is connected to GitHub `main` branch. Pushing commits to `main` or deploying via Vercel CLI will immediately route production traffic to the new codebase. If production Supabase migrations (009–019) have NOT been executed prior to deployment, route handlers querying new tables (`public.college_districts`, `colleges`, `safe_box_private_notes`) or updated RLS policies may fail.

---

## 1. Project Configuration & Runtime Architecture

- **Configuration File:** [`vercel.json`](file:///d:/kavach-campus/vercel.json)
  Configures automated daily cron jobs:
  - `/api/cron/safe-walk-timeout` — Triggers at `00:00 UTC` to auto-expire orphaned SafeWalk sessions.
  - `/api/cron/escalate` — Triggers at `12:00 UTC` to escalate unacknowledged high-severity incidents.
- **Node.js Runtime Version:** Recommended `Node.js 20.x` or `22.x` (Configured in Vercel Project Settings).
- **Framework Preset:** Next.js.
- **Build Output:** 72 application routes compiled cleanly (0 errors) using `next build --experimental-app-only`.

---

## 2. Production Environment Variable Requirements

The following environment variable **NAMES** must be configured in the Vercel Dashboard under **Project Settings > Environment Variables** for the **Production** environment:

| Variable Name | Client / Server Exposure | Purpose | Production Setting Requirement |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Supabase REST / Auth endpoint | `https://dvyiclyyvmsfipzrdowu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Supabase public anonymous key | Production Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Strictly Server-Only** | Admin database operations | Production Service Role Key |
| `GEMINI_API_KEY` | **Strictly Server-Only** | Google Gemini AI inference | Production Gemini API Key |
| `NEXT_PUBLIC_APP_URL` | Public / Client | Canonical app domain | `https://kavach-campus.vercel.app` |
| `ENABLE_DEMO_OTP` | **Strictly Server-Only** | Demo OTP gate | **STRICTLY OMIT OR SET TO `false`** |
| `ENABLE_DEMO_SMS` | **Strictly Server-Only** | Demo SMS simulator | **STRICTLY OMIT OR SET TO `false`** |

> [!NOTE]
> Demo OTP (`123456`) and Demo SMS simulations are active strictly in development (`NODE_ENV !== 'production'`). In production, omitting `ENABLE_DEMO_OTP` or setting it to `false` permanently enforces real email OTP and secure Supabase GoTrue authentication.

---

## 3. Google OAuth Redirect & Callback Alignment

When moving to production, Google Cloud Console OAuth Credentials must include:
1. **Authorized JavaScript Origins:**
   - `https://kavach-campus.vercel.app`
2. **Authorized Redirect URIs:**
   - `https://dvyiclyyvmsfipzrdowu.supabase.co/auth/v1/callback`
   - `https://kavach-campus.vercel.app/api/auth/callback`

The application callback handler at [`src/app/api/auth/callback/route.ts`](file:///d:/kavach-campus/src/app/api/auth/callback/route.ts) dynamically resolves hostnames from `NEXT_PUBLIC_APP_URL` and `x-forwarded-host`, ensuring seamless OAuth exchange without PKCE storage mismatch.

---

## 4. Production Release Gating Status

| Prerequisite | Status | Verification Detail |
| :--- | :---: | :--- |
| **Local Code Quality & Builds** | **READY** | 72/72 routes compiled, TypeScript 0 errors, ESLint 0 warnings |
| **Local Automated Tests** | **READY** | 799/799 Vitest passed, Playwright running, 32/32 RLS passed |
| **Remote Supabase Backup** | **PENDING** | Owner must confirm restorable snapshot in Supabase dashboard |
| **Remote Supabase Migrations** | **PENDING** | Migrations 009–019 must be executed via Supabase SQL Editor |
| **Google Cloud OAuth URIs** | **PENDING** | Vercel domain must be registered in Google Cloud Console |
| **Vercel CLI / Git Push** | **GATED** | Paused awaiting owner execution of above prerequisites |

---

## 5. Post-Deployment Verification Smoke-Test Plan

Once deployed to production by the owner:
```powershell
# 1. Verify HTTP Response Headers
curl.exe -I https://kavach-campus.vercel.app

# 2. Verify College Search API
curl.exe -s "https://kavach-campus.vercel.app/api/colleges/search?q=SRKR"
```

Verify these core routes in browser:
- Home: `https://kavach-campus.vercel.app/`
- Login: `https://kavach-campus.vercel.app/login`
- Registration: `https://kavach-campus.vercel.app/register`
- Student Dashboard: `https://kavach-campus.vercel.app/student`
- Staff Dashboard: `https://kavach-campus.vercel.app/staff`
- Admin Dashboard: `https://kavach-campus.vercel.app/admin`
- AI Control Panel: `https://kavach-campus.vercel.app/admin/ai`

