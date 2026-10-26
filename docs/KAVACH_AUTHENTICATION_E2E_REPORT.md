# KAVACH CAMPUS — AUTHENTICATION, RBAC & REDIRECT E2E AUDIT REPORT
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 11, 2026  
**Target Auth Stack:** Supabase Auth + JWT Cookies + Next.js Middleware

---

## 1. Authentication Architecture & Security Gates

Kavach Campus implements a multi-tiered identity and role-based access control (RBAC) architecture:
1. **Public Ingestion Layer:** Forms at `/register`, `/login`, `/verify-otp`.
2. **Middleware Boundary:** Next.js Edge Middleware (`src/middleware.ts` / server proxy) intercepts every incoming HTTP request.
3. **Database Authorization Boundary:** PostgreSQL Row Level Security (RLS) on `profiles`, `student_profiles`, `incidents`, `evidence`, etc.

---

## 2. Tested Authentication Workflows

### A. Student & Staff Registration (`/api/auth/register`)
- **Required Fields:** `email`, `password`, `full_name`, `role` (`STUDENT` | `STAFF`).
- **Validation Checks:**
  - Empty or whitespace input: Returns `400 Bad Request` (`Missing required fields`).
  - Password strength: Must be at least 8 characters.
  - Duplicate email: Returns `409 Conflict` (`User already exists with this email`).
- **Staff Approval Gate:**
  - When registering as `STAFF` or `SECURITY`, the account is created with `is_approved: false`.
  - Unapproved staff cannot access the responder queue or take case actions until an Administrator approves them via `/api/admin/users/approve`.
- **Client Role Tampering Defense:**
  - The client cannot escalate their privileges to `ADMIN` or `SUPER_ADMIN` via the registration payload.
  - The API explicitly restricts public registration roles to `STUDENT` or `STAFF`. Any attempt to send `role: 'ADMIN'` or `role: 'SUPER_ADMIN'` is rejected with `400 Invalid Role Request`.

### B. Login & Session Issuance (`/api/auth/login`)
- **Credentials:** Email + Password.
- **Session Handling:** Supabase Auth generates a secure, HTTP-only session cookie.
- **Invalid Password / Non-existent Account:** Returns `401 Unauthorized` with generic message to prevent account enumeration.
- **Unverified Student Gate:**
  - If a student tries to file a non-emergency complaint, the system queries `student_profiles.verification_status`.
  - If status is not `VERIFIED`, returns `403 Forbidden` (`Student ID verification required`).
  - **Emergency Bypass:** Emergency SOS (`/api/sos`) is **never blocked** by verification status — life safety always takes precedence!

### C. Role-Based Redirect Matrix

| Authenticated Role | Initial Destination | Forbidden Routes | Observed Middleware Behavior |
| :--- | :--- | :--- | :--- |
| **Anonymous / Unauthenticated** | `/login` | All `/student/*`, `/staff/*`, `/management/*`, `/admin/*` | Returns `307 Redirect` to `/login` |
| **STUDENT** | `/student` | `/staff/*`, `/management/*`, `/admin/*`, `/super-admin/*` | Denied; redirected to `/student` |
| **STAFF / SECURITY** | `/staff` | `/management/*`, `/admin/*`, `/super-admin/*` | Denied; redirected to `/staff` |
| **MANAGEMENT / HOD** | `/management` | `/admin/users`, `/super-admin/*` | Denied; redirected to `/management` |
| **ADMIN** | `/admin` | `/super-admin/*` | Denied; redirected to `/admin` |
| **SUPER_ADMIN** | `/super-admin` | None | Dedicated gate at `/super-admin/login` |

---

## 3. External Provider Status (Honest Audit)

| Channel / Provider | Implementation State | Production Readiness | Reason / Blocker |
| :--- | :--- | :--- | :--- |
| **Email/Password** | Full Next.js + Supabase Auth | **OPERATIONAL** | Ready on local & Supabase |
| **OTP Verification** | Flow implemented (`/verify-otp`) | **BLOCKED (EXTERNAL)** | Requires production SMS/SMTP carrier setup |
| **Google OAuth** | Endpoint at `/api/auth/google` | **NOT CONFIGURED** | Requires Google Cloud Client ID & Secret in Supabase Auth |
| **Super Admin Provisioning** | Dedicated migration `006` | **ISOLATED** | Hardcoded emails removed from migration 008 to ensure safety |

---

## 4. Key Security Findings
1. **Server-Side Enforcement:** Route protection is not merely hidden UI buttons. It is enforced in Next.js middleware and backed by PostgreSQL RLS.
2. **Session Termination:** Logout destroys the auth token and clears client session storage, preventing backward navigation to protected pages.
3. **Audit Trails:** Sensitive authentication operations write records to the `audit_logs` table.
