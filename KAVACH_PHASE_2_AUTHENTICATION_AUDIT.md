# KAVACH CAMPUS — PHASE 2 AUTHENTICATION & ACCESS AUDIT

**Project:** Kavach Campus  
**Audit Scope:** Public Registration, Role Privilege Separation, OTP Security, Session Lifecycle  
**Audit Date:** 2026-11-03  

---

## 1. Authentication Portals & Security Posture

| Portal / Route | Target User Group | Public Self-Registration | Server-Side Enforcement | Status |
| :--- | :--- | :---: | :--- | :---: |
| `/login` | Students & General Users | YES (via `/register`) | Rate limiting, bcrypt OTP hash, session cookies | **PASS** |
| `/register` (Student tab) | Students | YES | Name, single email, 10-digit mobile, 7-10 char reg number | **PASS** |
| `/register` (Staff tab) | Faculty & Staff Members | YES (Pending Approval) | 16-level hierarchy; defaults `is_approved = false` | **PASS** |
| `/admin/campus/register` | Prospective Campus Admins | Request-Only | Requires Super Admin review & approval | **PASS** |
| `/admin/login` | Campus Admins & Leadership | **DISABLED** | Authenticates against `profiles.role`; blocks students | **PASS** |
| `/super-admin/login` | Platform Super Admin | **DISABLED** | Strictly requires `profiles.role === 'SUPER_ADMIN'` | **PASS** |
| `/forgot-password` | All Users | N/A | Anti-enumeration response, CSPRNG OTP, 5-min expiry | **PASS** |
| `/verify-otp` | Registrants & Password Reset | N/A | Timing-safe hash check; 60s resend cooldown | **PASS** |

---

## 2. Invariant Verification Results

- **Privilege Escalation Denial:**  
  Attempting to send `role: 'ADMIN'`, `'SUPER_ADMIN'`, `'MANAGEMENT'`, `'PRINCIPAL'`, or `'HOD'` via `/api/auth/register` returns **HTTP 403 Forbidden** with message:  
  `"Administrative and management roles cannot be self-assigned through public registration."`  
  Verified in `src/__tests__/release-blocker-audit-behavioral.test.ts` (Lines 422–445).
- **Self-Approval Denial:**  
  `POST /api/admin/users/approve` verifies caller role, checks `caller.college_id === target.college_id`, and blocks self-approval.
- **Unverified Student Dashboard Gate:**  
  `src/proxy.ts` detects unverified students and redirects to `/student/verification-status`, while allowing immediate access to `/student/sos`.
- **Zero Plaintext Password Exposure:**  
  `POST /api/auth/register` creates an unconfirmed user in `auth.users` to hash passwords securely inside PostgreSQL, storing only metadata and hashed OTP in temporary tables.
