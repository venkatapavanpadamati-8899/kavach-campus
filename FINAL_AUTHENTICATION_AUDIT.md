# KAVACH CAMPUS — FINAL AUTHENTICATION AUDIT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Date:** 2026-11-03  
**Auditor:** Application Security & Authentication Specialist  

---

## 1. Authentication Methods Matrix

| Method | Implementation | Security Boundary | Current Verified Status |
| :--- | :--- | :--- | :---: |
| **Email + Password** | `/api/auth/login` | Salted bcrypt (salt 12), rate-limited | **VERIFIED LOCALLY (PASS)** |
| **11-Field Registration** | `/api/auth/register`| Public role escalation blocked | **VERIFIED LOCALLY (PASS)** |
| **Mobile Number + OTP** | `/api/auth/mobile-login`| `/^[6-9]\d{9}$/`, rate-limited | **VERIFIED LOCALLY (PASS)** |
| **Real SMS OTP Dispatch**| `/lib/notifications/index.ts`| Twilio HTTPS REST API adapter | **BLOCKED BY OWNER CONFIG** |
| **Google OAuth** | `/api/auth/google` | PKCE code exchange + proxy recovery| **BLOCKED BY OWNER CONFIG** |
| **Password Reset** | `/api/auth/reset-password`| Token validation, 15m expiration | **VERIFIED LOCALLY (PASS)** |
| **Session Gating** | `src/proxy.ts` | Multi-role routing & pre-dashboard gate| **VERIFIED LOCALLY (PASS)** |

---

## 2. Real vs. Simulated OTP Distinction

* **Simulated Development Mode (₹0 Cost):**
  * Dispatches 6-digit CSPRNG tokens (`node:crypto.randomInt(100000, 999999)`).
  * Stored in server memory with 5-minute TTL.
  * Zero SMS charges, zero external network requests.
* **Production Live SMS Mode:**
  * Enabled when `ENABLE_REAL_NOTIFICATIONS=true` and `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` are configured.
  * If unconfigured in production mode (`NODE_ENV === 'production'`), safely returns HTTP 503 instead of pretending SMS was delivered.

---

## 3. Account Collision & Role Protection

1. **Multiple Accounts per Mobile Number:**
   * If a mobile number matches more than one registered user record, `/api/auth/mobile-login` immediately rejects the request with HTTP 409 (Conflict).
   * **Rule:** It never authenticates an arbitrary account.
2. **Administrative Role Protection:**
   * Roles `ADMIN`, `SUPER_ADMIN`, `HOD`, and `PRINCIPAL` cannot authenticate using Mobile Demo OTP. They must log in with institutional credentials.
