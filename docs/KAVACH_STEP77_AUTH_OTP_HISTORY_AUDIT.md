# KAVACH CAMPUS — STEP 77: AUTHENTICATION, OTP & INCIDENT HISTORY AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Focus:** Authentication Workflows, OTP Security, Google OAuth Flow, Cross-User History Isolation, and Student ID Verification Gate  
**Verification Date:** 2026-10-15  
**Related Test Suites:** `src/__tests__/auth-callback.test.ts`, `src/__tests__/auth-rbac.test.ts`, `src/__tests__/student-id-verification.test.ts`, `src/__tests__/integration-workflows.test.ts`

---

## 1. Authentication Engine & Session Architecture

1. **Password Authentication (`/api/auth/login`):**
   - Utilizes Supabase Auth with secure bcrypt/argon2 password hashing.
   - Requires password length $\ge 8$ characters.
   - Enforces administrative approval check (`is_approved = true`). If pending approval, login is rejected with an explanatory message.
2. **Session Cookies & Next.js Server Components:**
   - Server-side cookie exchange managed via `@supabase/ssr`.
   - Access and refresh tokens are stored in secure, `HttpOnly`, `SameSite=Lax` cookies, protecting against XSS token exfiltration.
3. **Logout & Session Termination:**
   - Invoking `supabase.auth.signOut()` invalidates the active refresh token and clears session cookies.
   - Protected API routes immediately reject subsequent requests with `HTTP 401 Unauthorized`.

---

## 2. OTP Verification & Security Controls

Stored in database table `user_otp_verifications`:

| Security Feature | Implementation Policy | Verification Status |
| :--- | :--- | :--- |
| **Code Length & Entropy** | 6-digit cryptographically random numeric code | **PASS** |
| **Hash Storage** | Stored as one-way cryptographic hash (`otp_hash`) | **PASS** |
| **Expiration Window** | 5 minutes from generation (`expires_at < NOW()`) | **PASS** |
| **Brute-Force Throttle** | Maximum 5 failed attempts per OTP (`attempts >= max_attempts`) | **PASS** |
| **Single-Use Invalidation** | Verified OTP marked `verified = true` and rejected on reuse | **PASS** |
| **Delivery Provider Status** | When Twilio credentials are missing in staging, adapter logs to audit table without throwing unhandled exceptions. In production, active carrier dispatch is required. | **PASS (Mocked in Test / Live BLOCKED without Provider Key)** |

---

## 3. Google OAuth & Reverse Proxy Security

The OAuth callback handler (`src/app/api/auth/callback/route.ts`) enforces strict security rules verified by unit tests:

1. **Authorization Code Exchange:**
   - Exchanges code for session server-side using `exchangeCodeForSession(code)`.
   - Missing or expired codes redirect to `/login?error=Invalid%20or%20expired%20grant%20code`.
2. **Reverse Proxy & HTTPS Resolution:**
   - Inspects `x-forwarded-host` and `x-forwarded-proto` to reconstruct the true public origin.
   - Prevents internal cluster address leakage when deployed behind AWS ALB, Cloudflare, or Vercel.
3. **Open-Redirect Protection:**
   - Validates the `next` redirect query parameter.
   - Rejects protocol scheme attacks (`https://attacker.com`), protocol-relative URLs (`//attacker.com`), and backslash obfuscation (`/\attacker.com`).
   - Falls back safely to the user's role-authorized dashboard (`/student`, `/staff`, `/management`, `/admin`, `/super-admin`).
4. **Automatic Student Provisioning:**
   - First-time Google OAuth sign-ins are automatically provisioned in `profiles` with role `STUDENT` and `is_approved = true`.
   - Simultaneously initializes an entry in `student_profiles` with `verification_status = 'PENDING_UPLOAD'`.

---

## 4. Student ID Verification Gate

To prevent unauthorized or fraudulent harassment reports while guaranteeing life safety:

1. **Non-Emergency Incident Submission (`POST /api/incidents`):**
   - Queries `student_profiles.verification_status`.
   - If status is **not** `VERIFIED` (`PENDING_UPLOAD`, `PENDING_VERIFICATION`, `REJECTED`), the report is rejected with:  
     `HTTP 403 Forbidden: Student ID verification required. Your account must be VERIFIED before filing non-emergency incident reports.`
2. **Emergency SOS Exemption (`POST /api/sos`):**
   - Unconditionally exempt from ID card verification. Any registered student in danger can trigger SOS instantly.

---

## 5. Cross-User Incident History Isolation

1. **Row-Level Security (RLS) Enforcement:**
   - `incidents` table policy: `USING (auth.uid() = student_id OR is_staff())`.
   - Student A cannot view Student B's incident history or records.
2. **API Layer Check (`GET /api/incidents/[id]`):**
   - Explicit server check confirms `incident.student_id === user.id` if user has role `STUDENT`.
   - Cross-user queries return `HTTP 403 / 404`.
3. **Evidence Isolation:**
   - Evidence records in `storage.objects` and `public.evidence` enforce owner and staff-only access.
   - Students cannot read or download another student's uploaded photos, videos, or ID cards.

---

## 6. Audit Test Evidence

All authentication and history test suites passed with zero failures:
- `src/__tests__/auth-callback.test.ts` (11 tests passed)
- `src/__tests__/auth-rbac.test.ts` (14 tests passed)
- `src/__tests__/student-id-verification.test.ts` (34 tests passed)
- `src/__tests__/integration-workflows.test.ts` (11 tests passed)
