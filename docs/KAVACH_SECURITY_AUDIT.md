# Kavach Campus — Comprehensive Security Audit Report

**Date:** 2026-10-19  
**System:** Kavach Campus Emergency Safety Platform  
**Target:** Application Codebase, Authentication Security, Storage Policies, and RBAC  
**Security Standard:** Least Privilege, Defense-in-Depth, Zero Secret Exposure

---

## 1. Executive Security Assessment

The Kavach Campus application has undergone an exhaustive multi-layer security audit covering authentication mechanisms, server-side authorization guards, Row Level Security (RLS) policies, storage access controls, and rate-limiting protections.

| Security Category | Audited Scope | Posture | Evidence |
|---|---|:---:|---|
| **Secret Protection** | `.env.local`, client bundles, logs | **PASS** | No `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` or client code. Git-ignored. |
| **Authentication & OTP** | Registration, Login, Reset, Demo SMS | **PASS** | CSPRNG 6-digit OTP, bcrypt hash storage, 5-min expiry, max 5 attempts, replay protection. |
| **Server-Side RBAC** | Middleware (`src/proxy.ts`), API route guards | **PASS** | All sensitive routes check session, role, and resource ownership before execution. |
| **Storage Security** | `kavach-id-cards`, `kavach-evidence` | **PASS** | Buckets are private (`public = false`); access via user-isolated RLS and 5-15 min signed URLs. |
| **File Integrity** | Document & evidence uploads | **PASS** | Binary magic bytes inspection rejects disguised scripts/executables renamed to .jpg/.pdf. |
| **Anti-Enumeration** | Forgot password, registration | **PASS** | Constant-response messaging prevents user account discovery. |
| **Audit Logging** | Verification, SOS, Escalation, Evidence | **PASS** | Immutable audit records written to `audit_logs` with actor UUID and event metadata. |
| **Free-Tier Protection** | Safety features, SMS, emergency SOS | **PASS** | Safety features strictly ₹0 free; paid SMS/gateways remain disabled. |

---

## 2. Authentication & Account Security Audit

### 1. Student Registration (`/api/auth/register`)
- **Input Validation:** Requires valid name (>=2 chars), valid college email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), and password length >= 8.
- **Privilege Escalation Defense:** Rejects client-supplied roles `ADMIN`, `SUPER_ADMIN`, `MANAGEMENT`, `PRINCIPAL`, and `HOD` with HTTP 403 Forbidden. Only `STUDENT` and restricted staff roles (`STAFF`, `COUNSELLOR`, `SECURITY`, `WOMENS_CELL`) are accepted.
- **Credential Storage:** Plaintext passwords are never stored in temporary verification tables; bcrypt hashes are used for OTP and password verification.
- **Account Enumeration Defense:** Returns sanitized error messaging without exposing internal DB structures.

### 2. Login & Session Creation (`/api/auth/login`)
- **Authentication Engine:** Supabase Auth `signInWithPassword` verified on the server.
- **Approval Check:** Unapproved staff and unapproved student accounts are rejected with HTTP 403, and their temporary session is revoked immediately via `supabase.auth.signOut()`.
- **Credential Sanitization:** Response returns safe profile metadata (`id`, `name`, `role`); password and secret hashes are never returned.

### 3. Server-Side Logout (`/api/auth/logout`)
- **Session Revocation:** Invokes `supabase.auth.signOut()` on the SSR server client.
- **Cookie Clearing:** Purges authentication tokens and invalidates `demo_sms_token` cookie.
- **UI Integration:** Dashboard "Sign Out" button coordinates client and server logout cleanly.

### 4. Password Recovery & Reset (`/api/auth/forgot-password` & `/api/auth/reset-password`)
- **Account Privacy:** `/api/auth/forgot-password` always returns `{ success: true, message: 'If an account exists...' }` to prevent account enumeration.
- **OTP Generation:** Uses cryptographically secure random generator `randomInt(100000, 1000000)`.
- **Single-Use Enforcement:** `/api/auth/reset-password` deletes the verification record immediately upon successful password change to prevent OTP replay.
- **Fixed Demo Bypass Block:** Static demo OTP `'123456'` is strictly prohibited for password recovery to prevent unauthorized account takeover.

---

## 3. Storage Security & File Upload Hardening

### Private Bucket Architecture
Two private Supabase Storage buckets are configured in Migration `008` and Migration `009`:
1. `kavach-id-cards`: Private (`public = false`), max file size 5MB.
2. `kavach-evidence`: Private (`public = false`), max file size 25MB.

### Storage Access Policies
- **User-Isolated Storage Paths:** Uploaded ID documents are strictly placed in `${auth.uid()}/id_card_${timestamp}.${ext}`.
- **Student-to-Student Isolation:** Storage RLS policy enforces `auth.uid()::text = (storage.foldername(name))[1]`. Student A cannot read or download Student B's uploaded ID document.
- **Reviewer Authorization:** Only authenticated users with `ADMIN`, `SUPER_ADMIN`, or `SECURITY` roles can access student documents, and only via temporary signed URLs (300 seconds).
- **Binary Magic Bytes Validation:** Endpoint inspects raw buffer headers:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47`
  - PDF: `25 50 44 46` (`%PDF`)
  - WEBP: `RIFF....WEBP`
  Disguised HTML, PHP, shell scripts, or executables renamed to `.jpg` or `.png` are rejected with HTTP 400 Bad Request.

---

## 4. Role-Based Access Control (RBAC) & Route Protection

The proxy/middleware in `src/proxy.ts` enforces role separation across 9 application roles:

| Role | Permitted Dashboard | Can Access Incident Evidence | Can Approve Users | Can Verify Student IDs |
|---|---|:---:|:---:|:---:|
| `STUDENT` | `/student/*` | Own cases only | NO | NO |
| `STAFF` | `/staff/*` | Assigned cases only | NO | NO |
| `COUNSELLOR` | `/staff/*` | Assigned cases only | NO | NO |
| `WOMENS_CELL` | `/staff/*` | Assigned cases only | NO | NO |
| `SECURITY` | `/staff/*`, `/admin/*` | All incident evidence | NO | YES |
| `HOD` | `/management/*` | Department cases | NO | NO |
| `PRINCIPAL` | `/management/*` | Institutional summary | NO | NO |
| `ADMIN` | `/admin/*`, `/management/*` | All incident evidence | YES | YES |
| `SUPER_ADMIN` | All portals | Full audit & evidence | YES | YES |

### Route Protection Rules
1. Unauthenticated requests to protected paths (`/student`, `/staff`, `/admin`, `/management`, `/super-admin`) are redirected to `/login` (or `/super-admin/login`).
2. Students whose verification status is not `VERIFIED` are restricted to `/student/verification-status` and `/student/sos` (emergency SOS is always accessible for safety).
3. Non-admin users attempting to access `/admin` or `/super-admin` are redirected to `/unauthorized`.
4. Role checks are repeated in each API route on the server (defense-in-depth).

---

## 5. Security Vulnerability Scan & Status

| Vulnerability / Threat | Risk Level | Mitigation Status | Mitigation Details |
|---|:---:|:---:|---|
| **SQL Injection** | CRITICAL | **PREVENTED** | Parameterized queries via Supabase PostgREST client; no string concatenation in SQL. |
| **Service Role Key Leakage** | CRITICAL | **PREVENTED** | `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` and never imported in client components. |
| **Infinite Recursion Loop (PostgreSQL 42P17)** | CRITICAL | **FIXED** | Replaced recursive RLS profile queries with `SECURITY DEFINER` functions in Migrations 005/008. |
| **Student Self-Verification** | HIGH | **FIXED** | Database trigger `prevent_student_self_verification()` in Migration 009 prevents status tampering. |
| **Unauthorized Evidence Access** | HIGH | **FIXED** | Evidence API requires case ownership or responder/security role; generates temporary 900s signed URLs. |
| **OTP Replay Attack** | MEDIUM | **PREVENTED** | Records deleted immediately upon successful verification or expiry; 5 failed attempts locks out OTP. |
| **Fake File Signature Disguise** | MEDIUM | **FIXED** | Binary magic bytes inspection implemented in `/api/student/verify-id` and verification libraries. |
| **Cross-Site Scripting (XSS)** | MEDIUM | **PREVENTED** | React JSX automatic string escaping; Next.js built-in sanitization. |
| **Insecure Direct Object References (IDOR)** | MEDIUM | **PREVENTED** | All database rows constrained by RLS `auth.uid() = student_id` or explicit server-side checks. |
