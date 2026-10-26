# KAVACH CAMPUS — BATCH 25: AUTHENTICATION, OTP & REDIRECTS AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Baseline Git Commit:** `master` (`aa96b34`)  
**Scope:** Rigorous security evaluation of Registration, Email OTP, Demo OTP, Login, Password Recovery, Google OAuth, and Session Lifecycle.

---

## 1. Executive Summary & Auth Domain Scorecard

```text
================================================================================
                    AUTHENTICATION SUBSYSTEM SCORECARD
================================================================================
Registration Security:                 PASS (Enforces 8+ char password, blocks admin role self-request)
Email OTP Cryptography:                PASS (Bcrypt salt 10, 10-minute TTL, max 5 attempts)
Demo OTP Guard (Development Only):     PASS (Strictly rejected in production mode via auth-demo.ts)
Privileged Role Demo OTP Protection:   PASS (ADMIN/SUPER_ADMIN can NEVER authenticate via demo OTP)
Password Recovery Workflow:            PASS (/api/auth/forgot-password & /api/auth/reset-password)
Google OAuth Implementation:           PASS (PKCE code exchange, auto-provisions STUDENT role)
Google OAuth Live Round-Trip:          BLOCKED (Pending Google Cloud Console Client ID/Secret)
Session Invalidation on Logout:        PASS (Cookie cleared, server session revoked)
================================================================================
```

---

## 2. Authentication Subsystem Deep Dives

### 2.1 Registration & Self-Assignment Prevention (`POST /api/auth/register`)
- **Input Validation:**
  - Full Name: Minimum 2 characters.
  - College Email: Validated against standard institutional email pattern.
  - Password: Minimum 8 characters.
- **Role Escalation Guard (Lines 35-46):**
  - Public registration requests specifying privileged roles (`ADMIN`, `SUPER_ADMIN`, `MANAGEMENT`, `PRINCIPAL`, `HOD`) are rejected with HTTP 403:
    `"Administrative and management roles cannot be self-assigned through public registration."`
  - Self-requested staff roles (`STAFF`, `SECURITY`, `COUNSELLOR`, `MENTOR`) are created with `is_approved = false` requiring institutional administrator review.
  - Student registrations are set to `role = 'STUDENT'`.
- **OTP Generation & Storage:**
  - 6-digit numeric OTP generated via `Math.floor(100000 + Math.random() * 900000)`.
  - Hashed using `bcrypt.hash(otp, 10)` before insertion into `public.user_otp_verifications`.
  - Expiration: `expires_at = NOW() + INTERVAL '10 minutes'`.
  - Zero plaintext OTP storage in the database.

---

### 2.2 Email OTP vs. Demo OTP Security Boundaries (`src/lib/auth-demo.ts`)

To allow rapid developer iteration and automated testing without opening a backdoor into production, Batch 25 implemented an airtight **Demo OTP Boundary**:

```mermaid
flowchart TD
    A[Incoming OTP Submission] --> B{Is NODE_ENV === 'production'?}
    B -- YES (Production) --> C[Strictly Enforce Bcrypt Hash Check]
    B -- NO (Development/Test) --> D{Is ENABLE_DEMO_OTP === 'true'?}
    D -- NO --> C
    D -- YES --> E{Is Role Privileged?<br/>ADMIN, SUPER_ADMIN, MANAGEMENT}
    E -- YES --> C
    E -- NO --> F{Does OTP === '123456'?}
    F -- YES --> G[Accept OTP for Demo Student Account]
    F -- NO --> C
    C --> H{bcrypt.compare(otp, record.otp_hash)}
    H -- MATCH --> I[Authentication Succeeded]
    H -- NO MATCH --> J[Reject with 401 Invalid OTP]
```

#### Automated Test Verification (`src/__tests__/auth-demo-otp.test.ts`):
1. **Production Rejection:** `NODE_ENV = 'production'` strictly rejects demo OTP `123456` even if `ENABLE_DEMO_OTP = 'true'`.
2. **Privileged Account Immunity:** `verifyDemoOtp('123456', 'ADMIN')` returns `false` unconditionally. Administrators can never use demo OTPs.
3. **Attempt Limit:** In `POST /api/auth/verify-otp`, failed attempts increment `record.attempts`. Upon reaching `max_attempts` (5), the pending verification record is deleted.

---

### 2.3 Password Recovery Workflow (`/forgot-password` & `/reset-password`)
- **Request Endpoint (`POST /api/auth/forgot-password`):**
  - Accepts `{ email }`.
  - Anti-User-Enumeration: Always returns HTTP 200 with message `"If an account exists with this email, a verification OTP has been sent."` whether the email exists or not.
  - If user exists, generates a 6-digit recovery OTP, bcrypt hashes it, and stores it in `user_otp_verifications` with `action: 'PASSWORD_RESET'` and a 10-minute TTL.
- **Execution Endpoint (`POST /api/auth/reset-password`):**
  - Accepts `{ email, otp, password }`.
  - Validates minimum 8-character password.
  - Verifies OTP (via bcrypt hash or `verifyDemoOtp` if in development mode).
  - Uses `createAdminClient().auth.admin.updateUserById(userId, { password })`.
  - Deletes the consumed recovery OTP immediately upon successful update.
  - Records event in immutable `public.audit_logs` (`action = 'PASSWORD_RESET_SUCCESS'`).

---

### 2.4 Google OAuth Authentication (`POST /api/auth/google` & `GET /api/auth/callback`)
- **Implementation:**
  - Initiates OAuth 2.0 PKCE flow via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  - Callback handler (`src/app/api/auth/callback/route.ts`) validates the authorization grant code:
    ```ts
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ```
  - Auto-provisions new Google OAuth users with `role = 'STUDENT'` and `is_approved = true`.
  - Open Redirect Guard: Validates `next` query parameter, blocking external URL redirects and protocol-relative paths (`//evil.com`).
- **Live Status:**
  - Local code exchange and mock handling: **PASS**.
  - Live round-trip with Google Cloud Console: **BLOCKED** pending user configuration of Google Cloud OAuth Client ID and Secret in Supabase Auth.

---

### 2.5 Session Termination & Logout
- **Client Action:** Triggering `supabase.auth.signOut()` calls the Supabase GoTrue endpoint, invalidating the session token.
- **Cookie Deletion:** Clears active auth cookies (`sb-*-auth-token`).
- **Middleware Re-check:** On subsequent navigation or browser back-button press, `src/proxy.ts` detects the absence of session cookies and redirects immediately to `/login`.
