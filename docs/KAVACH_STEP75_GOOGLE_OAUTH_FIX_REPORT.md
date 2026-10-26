# 🛡️ Kavach Campus — STEP 75: Google OAuth Redirect URI Mismatch Fix Report

**Generated Date:** 2026-10-11  
**Workspace:** `D:\Kavach Campus`  
**Supabase Project ID:** `polbnvszmvblwenfnqll`  
**Current Release Status:** CONDITIONAL — Code Hardened & Fully Tested Locally; Pending Manual Remote Google Cloud Console OAuth Configuration.

---

## 1. Executive Summary

During testing of the **Google Sign-In** flow on `http://localhost:3000/login`, Google OAuth returned an error:
```
Error 400: redirect_uri_mismatch
```

This report documents the thorough investigation, architectural root cause, local code hardening, automated regression test suite, and the exact step-by-step manual configuration needed in **Google Cloud Console** and **Supabase Dashboard** to resolve this error.

---

## 2. Root Cause Analysis

### Architecture of Supabase Google OAuth
When a user clicks **Continue with Google** in Kavach Campus:
1. **Client Request:** The web browser initiates `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://localhost:3000/api/auth/callback' } })`.
2. **Supabase Broker Redirect:** Supabase Auth service acts as the OAuth 2.0 broker. It redirects the user's browser to Google's OAuth endpoint:
   `https://accounts.google.com/o/oauth2/v2/auth?...`
3. **The Redirect URI Sent to Google:** In this broker architecture, Supabase sends its own backend callback URL as the `redirect_uri` to Google:
   $$\text{redirect\_uri} = \mathbf{https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback}$$
4. **Google Cloud Console Validation:** Google checks if that incoming `redirect_uri` is present in the **Authorized redirect URIs** list under the OAuth 2.0 Client ID in the Google Cloud Console.
5. **The Failure:** 
   - Either `https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback` was **NOT** added to the **Authorized redirect URIs** list in Google Cloud Console.
   - OR it was incorrectly placed in **Authorized JavaScript origins** instead of **Authorized redirect URIs**.
   - OR `http://localhost:3000` was mistakenly configured as the redirect URI in Google Cloud Console instead of the Supabase callback endpoint.

---

## 3. Redirect URI Matrix

| Location | Purpose | Exact Required URI / Setting |
| :--- | :--- | :--- |
| **Google Cloud Console — Authorized redirect URIs** | Where Google redirects the user after Google consent screen | `https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback` |
| **Google Cloud Console — Authorized JavaScript origins** | Where Google JavaScript calls originate | `http://localhost:3000`<br>`https://polbnvszmvblwenfnqll.supabase.co` |
| **Supabase Dashboard — Site URL** | Default site URL | `http://localhost:3000` (Local) / `https://<production-domain>` |
| **Supabase Dashboard — Redirect URLs** | Allowed client redirect destinations after code exchange | `http://localhost:3000/api/auth/callback`<br>`http://localhost:3000/**` |
| **Local Application — `signInWithOAuth` `redirectTo`** | Destination where Supabase returns after OAuth flow | `${window.location.origin}/api/auth/callback` (resolves to `http://localhost:3000/api/auth/callback`) |

> [!IMPORTANT]
> **Never enter `http://localhost:3000/api/auth/callback` directly into Google Cloud Console's Authorized redirect URIs.** Google talks directly to the Supabase backend (`https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback`). Supabase is what talks to your local application callback.

---

## 4. Local Code Hardening & Defect Fixes

### 1. `src/app/api/auth/callback/route.ts`
Hardened the server-side OAuth callback route handler:
- **OAuth Provider Error Handling:** Catches `error` or `error_description` in query parameters and redirects safely to `/login?error=...`.
- **Missing Authorization Code:** Gracefully handles missing `code` parameters and routes to `/login?error=Missing%20authorization%20code`.
- **Code Exchange Failure:** Handles `exchangeCodeForSession(code)` failures and preserves detailed error context.
- **Auto-Provisioning New Profiles:** For new Google users without an existing `profiles` record, automatically inserts a `profiles` entry (`role: 'STUDENT', is_approved: true`) and upserts `student_profiles` (`verification_status: 'PENDING_UPLOAD', admission_type: 'REGULAR'`).
- **Open Redirect Protection:** Strict validation of the `next` destination:
  ```typescript
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !next.includes(':')) {
    destination = next;
  }
  ```
  Prevents protocol manipulation (`https://attacker.com`), protocol-relative bypasses (`//attacker.com`), and backslash normalization bypasses (`/\attacker.com`).
- **Reverse Proxy Header Support:** Reads `x-forwarded-host` and `x-forwarded-proto` to maintain correct origin across Vercel and reverse proxies.
- **Dynamic Prerender Resilience:** Preserves Next.js bailout errors (`digest` check) while catching unexpected runtime errors.

### 2. `src/app/login/page.tsx`
Updated `handleGoogleLogin` and OTP sign-in callback URL resolution:
- Dynamically resolves client origin via `window.location.origin` with fallback to `process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'`.

### 3. `.env.example`
- Added `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to document site URL configuration.

---

## 5. Automated Regression Test Suite (`src/__tests__/auth-callback.test.ts`)

Authored 11 comprehensive automated tests covering all OAuth callback permutations:
1. `redirects to /login with error when provider returns oauth error parameter` — **PASS**
2. `redirects to /login when authorization code is completely missing` — **PASS**
3. `redirects to /login when exchangeCodeForSession fails` — **PASS**
4. `redirects to /login when getUser returns null user session` — **PASS**
5. `authenticates existing STUDENT and redirects to /student` — **PASS**
6. `authenticates existing ADMIN and redirects to /admin` — **PASS**
7. `auto-provisions new profile and student_profiles on first Google login` — **PASS**
8. `preserves safe relative "next" redirect query parameter` — **PASS**
9. `rejects malicious external "next" parameter to prevent open redirect vulnerabilities` — **PASS**
10. `properly resolves reverse proxy headers (x-forwarded-host & x-forwarded-proto)` — **PASS**
11. `catches unhandled exceptions and redirects to /login with internal error` — **PASS**

---

## 6. Full Quality Gates Verification

| Verification Gate | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Tests** | `npm test` | **159 / 159 PASS** | 13 test files passed (100%) |
| **ESLint Analysis** | `npm run lint` | **0 errors, 0 warnings** | Clean pass |
| **TypeScript Validation** | `npx tsc --noEmit` | **0 errors** | Strict typecheck clean |
| **Production Build** | `npm run build` | **55 routes compiled** | Turbopack compilation successful |
| **Dependency Security Audit**| `npm audit --omit=dev` | **0 vulnerabilities** | Production dependencies clean |
| **Local Server Status** | `http://localhost:3000/login` | **HTTP 200 OK** | Server active on PID 27816 |

---

## 7. Manual Configuration Checklist for the Developer

To eliminate `Error 400: redirect_uri_mismatch`, complete these exact manual steps in Google Cloud Console and Supabase Dashboard:

### Step 1: Google Cloud Console Configuration
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your Kavach Campus project.
3. Click on your **OAuth 2.0 Client ID** (under *OAuth 2.0 Client IDs*).
4. Scroll to **Authorized redirect URIs**:
   - Click **+ ADD URI**.
   - Paste the exact Supabase callback URL:
     ```
     https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback
     ```
5. Scroll to **Authorized JavaScript origins**:
   - Ensure the following are listed:
     ```
     http://localhost:3000
     https://polbnvszmvblwenfnqll.supabase.co
     ```
6. Click **SAVE** at the bottom. *(Note: Changes can take 1–5 minutes to propagate across Google's edge caches).*

### Step 2: Supabase Dashboard Configuration
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll).
2. Navigate to **Authentication** → **Providers** → **Google**:
   - Ensure **Enable Google provider** is switched **ON**.
   - Verify that the **Client ID** and **Client Secret** match your Google Cloud OAuth Client credentials.
   - Note the **Callback URL** displayed by Supabase; it must match:
     `https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback`.
3. Navigate to **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (for local development).
   - **Redirect URLs**: Add `http://localhost:3000/api/auth/callback` and `http://localhost:3000/**`.
   - Click **Save**.

### Step 3: Verification in Browser
1. Open `http://localhost:3000/login` in an Incognito / Private window.
2. Click **Continue with Google**.
3. Choose your Google Account.
4. Verify that Google authorizes without any `redirect_uri_mismatch` error and redirects back to `/student` (or role-specific dashboard).

---

## 8. Release Status Declaration

> [!CAUTION]
> **Declaration of Authenticity:** Although all local automated tests (159/159), build (55 routes), lint, and TypeScript checks pass completely, Google Sign-In **cannot** be declared fully operational until a developer completes the Google Cloud Console credential update above and successfully executes a real end-to-end Google login in a live browser.
