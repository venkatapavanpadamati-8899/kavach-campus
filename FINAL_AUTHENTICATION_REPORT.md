# KAVACH CAMPUS — FINAL AUTHENTICATION SYSTEM REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Full-Stack Architect & Authentication Security Engineer  

---

## 1. Executive Summary

The Kavach Campus authentication architecture provides multi-method authentication with strict institutional access boundaries, role isolation, and pre-dashboard verification gating.

| Authentication Method | Implementation Path | Verification Status | Notes |
| :--- | :--- | :---: | :--- |
| **Institutional Email + Password** | `/app/login/page.tsx`<br>`/api/auth/login` | **VERIFIED BY AUTOMATED TEST** | Bcrypt hash verification, account status checks |
| **Mobile Number + OTP (Demo)** | `/app/login/page.tsx`<br>`/api/auth/mobile-login` | **VERIFIED BY AUTOMATED TEST** | CSPRNG 6-digit OTP, zero-cost dev simulation |
| **Mobile Number + OTP (Twilio/Live)**| `/lib/notifications/index.ts` | **BLOCKED BY OWNER CONFIGURATION** | Requires `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN` |
| **Google OAuth (PKCE)** | `/app/api/auth/google`<br>`/app/api/auth/callback` | **VERIFIED BY AUTOMATED TEST** | Proxy recovery forwards root `?code=` to callback |
| **Google OAuth (Live Provider)** | Supabase Auth Provider | **BLOCKED BY OWNER CONFIGURATION** | Google Cloud Client ID & Secret activation needed |
| **Student Registration (11-Field)** | `/app/register/page.tsx`<br>`/api/auth/register` | **VERIFIED BY AUTOMATED TEST** | Accepts personal or institutional email |
| **Magic Link Passwordless** | `/app/login/page.tsx` | **VERIFIED BY AUTOMATED TEST** | Account existence check before dispatch |
| **Password Reset (Forgot/Reset)** | `/app/forgot-password`<br>`/app/reset-password` | **VERIFIED BY AUTOMATED TEST** | Token validation & rate limiting enforced |
| **Proxy Session Middleware** | `/src/proxy.ts` | **VERIFIED BY AUTOMATED TEST** | Pre-dashboard gating & role-based route protection |

---

## 2. Authentication Flow & State Management

### A. Dual Login Mode (Email vs Mobile)
The `/login` screen presents two distinct, accessible tabs:
1. **Institutional Email:** Email + Password or Magic Link.
2. **Mobile OTP:** Indian 10-digit mobile number input with `+91` selector, CSPRNG OTP generation, rate limiting, and 60-second cooldown timer.

### B. Defensive OAuth Recovery in Middleware (`src/proxy.ts`)
```ts
if ((pathname === '/' || pathname === '/login') && request.nextUrl.searchParams.has('code')) {
  const callbackUrl = new URL('/api/auth/callback', request.url);
  callbackUrl.search = request.nextUrl.search;
  return NextResponse.redirect(callbackUrl);
}
```
If Supabase redirects OAuth users to the Site URL root or login page with `?code=`, the proxy intercepts and completes the PKCE exchange.

### C. Role-Based Redirect Matrix
| Authenticated Role | Destination Route | Verification Condition |
| :--- | :--- | :--- |
| `STUDENT` | `/student` (or `/student/verification-status`) | If `verification_status !== 'VERIFIED'`, locked to `/student/verification-status` |
| `STAFF` / `MENTOR` / `COUNSELLOR` | `/staff` | Requires `is_approved === true` |
| `HOD` / `PRINCIPAL` / `MANAGEMENT` | `/management` | Institutional scope enforcement |
| `ADMIN` | `/admin` | Dedicated login at `/admin/login` |
| `SUPER_ADMIN` | `/super-admin` | Dedicated login at `/super-admin/login` |

---

## 3. Security Boundaries & Protections

1. **Privileged Role Protection:** Administrative and management roles (`ADMIN`, `SUPER_ADMIN`, `MANAGEMENT`, `PRINCIPAL`, `HOD`) are strictly blocked from logging in via Mobile Demo OTP. They must authenticate with their primary institutional credentials.
2. **Public Self-Assignment Blocked:** The `/api/auth/register` endpoint strictly forbids self-assigning any administrative or management role.
3. **Emergency SOS Exemption:** Students are allowed access to `/student/sos` at all times, even prior to college ID card approval, ensuring immediate emergency accessibility.
4. **Session Termination:** Logout via `/api/auth/logout` invalidates the Supabase session, purges auth cookies, and clears client tenant storage.

