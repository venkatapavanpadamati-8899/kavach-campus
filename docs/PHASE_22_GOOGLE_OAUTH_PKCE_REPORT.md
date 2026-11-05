# Phase 22: Google OAuth 2.0 & PKCE Deep-Dive Investigation Report

**Phase:** 22C — Google OAuth & PKCE  
**Date:** 2026-11-05T11:28:30+05:30  
**Error Investigated:** `AuthApiError: PKCE code verifier not found in storage`  
**Code-Level Verification:** ✅ PASS (100% — 43/43 Unit Tests)  
**Live Production Gate:** ⏸️ GATED (Owner Configuration Required in Google Cloud Console & Supabase)

---

## 1. Anatomy of the PKCE Error

```text
AuthApiError: PKCE code verifier not found in storage
```

### Forensic Root Cause:
1. **RFC 7636 PKCE Architecture**:
   In Proof Key for Code Exchange (PKCE), the client generates a high-entropy cryptographic string (`code_verifier`) and derives a `code_challenge`.
   When the OAuth flow initiates, the `code_verifier` is written to browser cookies (`sb-<project-ref>-auth-token-code-verifier`).
2. **Domain & Origin Isolation**:
   Browser cookies are strictly bound to the origin host. If a user initiates login on `http://192.168.1.7:3000` (LAN mobile or desktop), the verifier cookie is saved under domain `192.168.1.7`.
3. **The Supabase Redirect Fallback**:
   If `http://192.168.1.7:3000/**` is not explicitly whitelisted in the Supabase Dashboard under **Authentication > URL Configuration > Redirect URLs**, Supabase rejects `redirect_to=http://192.168.1.7:3000/api/auth/callback` and defaults redirecting to the configured **Site URL** (`http://localhost:3000/`).
4. **The Verifier Cookie Drop**:
   When the browser is redirected to `http://localhost:3000/api/auth/callback`, it sends cookies for `localhost`. Because the verifier was stored under `192.168.1.7`, the verifier cookie is absent. The server's `exchangeCodeForSession(code)` fails with:
   `PKCE code verifier not found in storage`.

---

## 2. Engineering Safeguards Implemented in Codebase

| Component | Safeguard Implemented | File Reference | Status |
| :--- | :--- | :--- | :---: |
| **Browser Client Singleton** | Single persistent GoTrue storage manager in memory | [`src/lib/supabase/client.ts`](file:///d:/kavach-campus/src/lib/supabase/client.ts) | ✅ Verified |
| **Dynamic Origin Handling** | Uses `x-forwarded-host` or request origin; handles LAN IP | [`src/app/api/auth/google/route.ts`](file:///d:/kavach-campus/src/app/api/auth/google/route.ts) | ✅ Verified |
| **Cookie Options Standardization** | `path: '/'`, `sameSite: 'lax'` on all client/server cookies | [`src/lib/supabase/server.ts`](file:///d:/kavach-campus/src/lib/supabase/server.ts) | ✅ Verified |
| **Defensive Callback Proxy** | Forwards unexpected `/` or `/login` landing with `?code=` | [`src/proxy.ts`](file:///d:/kavach-campus/src/proxy.ts) | ✅ Verified |
| **Direct Google Token Fallback** | Fallback exchange with `oauth2.googleapis.com/token` | [`src/app/api/auth/callback/route.ts`](file:///d:/kavach-campus/src/app/api/auth/callback/route.ts) | ✅ Verified |

---

## 3. Mandatory Owner Configuration Checklist (External Portals)

To enable live Google OAuth sign-in across both local LAN and production:

### A. Google Cloud Console Settings:
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth 2.0 Client ID for Web Application.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `http://192.168.1.7:3000`
   - `https://kavach-campus.vercel.app`
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback`
   - `http://192.168.1.7:3000/api/auth/callback`
   - `https://kavach-campus.vercel.app/api/auth/callback`

### B. Supabase Dashboard Settings:
1. Open your Supabase Dashboard (`https://supabase.com/dashboard/project/polbnvszmvblwenfnqll`).
2. Navigate to **Authentication** > **URL Configuration**.
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/**`
   - `http://192.168.1.7:3000/**`
   - `https://kavach-campus.vercel.app/**`

