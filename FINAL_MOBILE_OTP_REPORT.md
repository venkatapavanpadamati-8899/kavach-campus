# KAVACH CAMPUS — FINAL MOBILE NUMBER & OTP AUTHENTICATION REPORT

**Project Location:** `D:\Kavach Campus`  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Authentication & Application Security Engineer  

---

## 1. Architecture & Dual-Login Workflow

The Kavach Campus authentication gateway supports:
1. **Institutional Email + Password / Magic Link**
2. **Indian Mobile Number + 6-Digit OTP**

---

## 2. Six-Step Mobile Authentication Flow

1. **Interface Selection:** Clean toggle between Email and Mobile tabs on `/login`.
2. **Input Normalization:** Enforces `+91` country code, cleans non-numeric input, validates 10 digits starting with `[6-9]`.
3. **Account Lookup & Duplicate Protection:**
   * Queries `profiles` table for matching phone number.
   * If no account exists: Returns HTTP 404 prompting registration.
   * If multiple accounts match: Returns HTTP 409 requesting institutional email login (never selects an arbitrary account).
4. **OTP Dispatch:**
   * **Development / Test:** Dispatches simulated OTP using CSPRNG (`node:crypto.randomInt()`), 5-minute expiry, zero external SMS charges.
   * **Production:** Ready for Twilio integration (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`). Returns HTTP 503 if provider unconfigured in production mode.
5. **Verification & Rate Limiting:**
   * Max 3 OTP requests per 10 minutes; 30-second cooldown between requests.
   * Max 5 incorrect OTP attempts before token invalidation.
   * Administrative roles (`ADMIN`, `SUPER_ADMIN`, `HOD`, `PRINCIPAL`) are forbidden from mobile demo OTP.
6. **Session Establishment & Redirection:**
   * Generates authentic Supabase token via `generateLink` (`magiclink`).
   * Unapproved students redirected to `/student/verification-status`.
   * Approved students redirected to `/student`.

---

## 3. Automated Test Verification (11/11 Passing)

All mobile OTP scenarios are verified in `src/__tests__/mobile-otp-auth.test.ts`:
* Service role configuration check: **PASS**
* Phone format validation: **PASS**
* Unregistered mobile handling (HTTP 404): **PASS**
* Multiple account conflict protection (HTTP 409): **PASS**
* CSPRNG OTP generation & cookie setting: **PASS**
* Rate limiting enforcement (HTTP 429): **PASS**
* Invalid OTP rejection & attempt counter: **PASS**
* Privileged role bypass block (HTTP 403): **PASS**
* Post-login session & destination routing: **PASS**

