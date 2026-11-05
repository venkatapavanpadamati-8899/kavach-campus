# Phase 25 — Authentication & Credential Security Report

**Project:** Kavach Campus (Women & Campus Safety Platform)  
**Workspace:** `D:\kavach-campus`  
**Execution Date:** 2026-11-05  

---

## 1. Executive Summary

Authentication integrity and user session safety are paramount for a campus safety application handling sensitive student complaints. Phase 25 verified that all authentication channels—including email/password, simulated mobile OTP, Google OAuth PKCE, and session tokens—function strictly as designed with zero credential leakage.

---

## 2. Authentication Modalities & Security Enforcements

### 2.1 Demo Mobile OTP & Zero-Cost Simulation Mode
- **Mandatory Development Flags:**
  - `ENABLE_DEMO_OTP=true`
  - `ENABLE_DEMO_SMS=true`
  - Fixed Demo Code: `123456`
- **Cost Impact:** **₹0 (Zero Real Telecom Spend)**.
- **Safety Disclaimer:** Every simulated dispatch includes explicit banners:
  `[DEMO SMS DISPATCH - ₹0 FREE SIMULATION] NOTICE: NOT A REAL MOBILE OWNERSHIP VERIFICATION`.
- **CSPRNG Fallback:** If demo OTP is disabled, a cryptographically secure 6-digit random code is generated via `crypto.randomInt(100000, 999999)`.
- **Rate-Limiting:**
  - Minimum 30-second cooldown between consecutive requests.
  - Maximum 3 verification dispatches within a 5-minute sliding window.
  - Account lockout after 5 consecutive failed attempts.

### 2.2 Google OAuth & PKCE Storage Resilience
- **Decoupled Architecture:** The Google Sign-In button is rendered completely independent from the credentials form. Form submission events do not conflict with OAuth redirection.
- **PKCE Handshake Security:** State parameters and PKCE code verifiers are stored in secure browser cookies. If a client browser loses the PKCE verifier (e.g. cross-network LAN mobile device transition), the application presents a clear error banner (`google_oauth_client_deleted` / `PKCE verification failed`) with a recovery link rather than an unhandled application crash.

### 2.3 Session Cookie Hygiene
- Session tokens use HTTP-only, secure cookies with `SameSite=Lax`.
- Client-side JavaScript cannot read raw session credentials.
- All service-role queries are restricted to backend route handlers; service-role keys are never sent to the client browser.

---

## 3. Preserved User Personas

| Email | Role | College ID | Verification State |
|---|---|---|---|
| `student@srkr.edu.in` | STUDENT | `srkr-bhimavaram` | Verified Student |
| `security@srkr.edu.in` | STAFF | `srkr-bhimavaram` | Campus Security |
| `warden@srkr.edu.in` | STAFF | `srkr-bhimavaram` | Hostel Warden |
| `counselor@srkr.edu.in` | STAFF | `srkr-bhimavaram` | Student Counselor |
| `principal@srkr.edu.in` | MANAGEMENT | `srkr-bhimavaram` | College Management |
| `admin@srkr.edu.in` | ADMIN | `srkr-bhimavaram` | Campus Admin |
| `superadmin@kavachcampus.gov.in`| SUPER_ADMIN | `srkr-bhimavaram` | Platform Governance |

All 7 accounts remain active with zero credential or data modifications.

