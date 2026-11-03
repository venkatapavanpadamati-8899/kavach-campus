# KAVACH CAMPUS — FINAL MOBILE NUMBER & OTP LOGIN REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Authentication & Application Security Engineer  

---

## 1. Overview & Dual Login Capability

Kavach Campus provides a dual-method authentication interface on `/login`:
1. **Institutional Email + Password / Magic Link**
2. **Mobile Number + 6-Digit OTP**

---

## 2. Six-Step Mobile Authentication Workflow

### Step 1: Interface Selection
Users toggle between **Institutional Email** and **Mobile OTP** tabs without page reloads.

### Step 2: Country Code & Input Formatting
* Default country code is fixed to **+91 (India)**.
* Input accepts 10 digits starting with `[6-9]`.
* Form auto-strips formatting characters, hyphens, and spaces.

### Step 3: Server-Side Validation & Normalization
* Validates 10-digit Indian mobile standard via regex `/^[6-9]\d{9}$/`.
* Queries database `profiles` table to find an existing account matching the phone number.
* Returns clear error if no registered account exists:
  > *"No registered account found with mobile number +91 XXXXXXXXXX. Please register first with your institutional email."*

### Step 4: OTP Dispatch Logic
* **Development / Test Mode:**
  * Uses cryptographic CSPRNG (`node:crypto.randomInt(100000, 999999)`).
  * Stores OTP in memory with a 5-minute TTL.
  * Dispatches zero external requests (100% free, no credit card required).
  * Returns demo token chip for rapid evaluation.
* **Production Mode:**
  * If Twilio is configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) and `ENABLE_REAL_NOTIFICATIONS=true`, dispatches real SMS to carrier networks.
  * If no real gateway is configured in production, safely returns HTTP 503 (`SMS gateway required`).

### Step 5: Verification & Anti-Abuse Controls
* **Rate Limiting:** Maximum 3 OTP requests per 10-minute sliding window; 30-second cooldown between requests.
* **Attempt Limiting:** Maximum 5 invalid OTP verification attempts before token invalidation.
* **Privileged Role Prohibition:** Admins and Management cannot sign in via mobile demo OTP; they must use institutional email credentials.

### Step 6: Post-Verification Session & Routing
* Calls Supabase Admin API `generateLink` (`type: 'magiclink'`) to establish an authentic Supabase session.
* Retrieves authoritative profile (`role`, `is_approved`, `college_id`).
* Unapproved students are redirected to `/student/verification-status`.
* Approved students are redirected to `/student`.
* Staff/Management redirected to respective dashboards.

---

## 3. Automated Test Verification

| Test Scenario | Test Suite | Result |
| :--- | :--- | :---: |
| 1. Missing or unconfigured service role key returns HTTP 503 | `mobile-otp-auth.test.ts` | **PASS** |
| 2. Invalid phone formats (< 10 digits, letters) return HTTP 400 | `mobile-otp-auth.test.ts` | **PASS** |
| 3. Unrecognized action steps return HTTP 400 | `mobile-otp-auth.test.ts` | **PASS** |
| 4. Unregistered phone number returns HTTP 404 | `mobile-otp-auth.test.ts` | **PASS** |
| 5. Production mode without SMS gateway returns HTTP 503 | `mobile-otp-auth.test.ts` | **PASS** |
| 6. CSPRNG 6-digit OTP generation & cookie setting | `mobile-otp-auth.test.ts` | **PASS** |
| 7. Rapid OTP request rate-limiting (HTTP 429) | `mobile-otp-auth.test.ts` | **PASS** |
| 8. Missing / malformed OTP verification returns HTTP 400 | `mobile-otp-auth.test.ts` | **PASS** |
| 9. Incorrect OTP rejection with remaining attempts counter | `mobile-otp-auth.test.ts` | **PASS** |
| 10. Successful OTP verification establishes session & returns user role | `mobile-otp-auth.test.ts` | **PASS** |
| 11. Privileged roles (ADMIN/HOD) forbidden from mobile OTP | `mobile-otp-auth.test.ts` | **PASS** |

---

## 4. Production Readiness & Owner Actions

To activate live SMS delivery in production:
1. Obtain Twilio Account SID, Auth Token, and a registered phone number.
2. Add environment variables in Vercel:
   * `TWILIO_ACCOUNT_SID`
   * `TWILIO_AUTH_TOKEN`
   * `TWILIO_PHONE_NUMBER`
   * `ENABLE_REAL_NOTIFICATIONS=true`
3. Never expose these keys in browser bundles or client code.

