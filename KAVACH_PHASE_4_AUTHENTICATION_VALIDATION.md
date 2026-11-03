# KAVACH CAMPUS — PHASE 4 AUTHENTICATION VALIDATION REPORT

**Project Location:** `D:\Kavach Campus`  
**Audit Scope:** End-to-End Authentication Workflows, Role Assignment, & Privilege Escalation Defenses  
**Date:** 2026-11-03  
**Status:** `CODE VERIFIED ONLY` (Live Staging: `NOT VERIFIED`)

---

## 1. Authentication Security Overview

This validation reviews all authentication and onboarding pathways:
1. Student Registration (`/api/auth/register`, `/register`)
2. Staff Registration & 16-Tier Hierarchy (`/api/auth/staff-register`, `/staff/register`)
3. Campus Admin Onboarding (`/api/admin/campus/register`, `/admin/campus/register`)
4. OTP Verification & Password Hashing Lifecycle (`/api/auth/verify-otp`)
5. Password Reset & Anti-Enumeration (`/api/auth/forgot-password`, `/api/auth/reset-password`)
6. Google OAuth Integration (`/api/auth/google`, `/api/auth/callback`)
7. Client-Side Role Tampering Prevention

---

## 2. Authentication Flow Analysis & Defenses

### A. Student Registration & Onboarding
* **Endpoint:** `POST /api/auth/register`
* **Input Validation:**
  - Name, institutional/personal email, 10-digit mobile number, guardian phone number.
  - Student Registration Number: 7-10 alphanumeric characters validated via `validateStudentRegistrationNumber`.
  - Academic Year: restricted to `'1st Year'` through `'4th Year'`.
* **Password Security:**
  - Enforces minimum 8 characters.
  - Plaintext password is **never stored** in `user_otp_verifications` or profile tables.
  - Account is pre-created in Supabase Auth via `supabase.auth.admin.createUser({ email_confirm: false })`, ensuring passwords are encrypted with bcrypt inside `auth.users`.
* **College Assignment:**
  - If institutional email matches known domain (e.g. `@srkr.edu.in`), `college_id` is assigned automatically.
  - If personal email (e.g. Gmail/Yahoo), college is selected via the Dual College Search Engine or flagged as `PENDING_CAMPUS_VERIFICATION`.

### B. Staff Registration & 16-Tier Hierarchy
* **Endpoint:** `POST /api/auth/staff-register`
* **Hierarchy Tiers (Top to Bottom):**
  1. Principal
  2. Vice Principal
  3. Dean (Student Affairs / Academics)
  4. Head of Department (HOD)
  5. Professor
  6. Associate Professor
  7. Assistant Professor
  8. Junior Professor
  9. Lecturer / Teacher
  10. Department Mentor
  11. Student Counsellor / Counselor
  12. Hostel Warden
  13. Women's Grievance Cell Member
  14. Administrative Officer
  15. Non-Teaching Staff
  16. Security Officer / Guard
* **Approval Workflow:**
  - All staff accounts default to:
    ```json
    { "is_verified": false, "role_status": "PENDING_APPROVAL" }
    ```
  - **Zero Self-Approval:** Staff members cannot approve their own accounts.
  - **Zero Auto-Escalation:** No staff role automatically inherits administrative rights.
  - Approvals must be executed by the authorized Campus Admin of that specific college (`POST /api/admin/users/approve`).

### C. Campus Admin Registration & Approval
* **Endpoint:** `POST /api/admin/campus/register`
* **Public Route Allowance:** Added to public routes in `src/proxy.ts` so prospective campus admins can submit registration without an existing session.
* **Governance Boundary:**
  - Defaults to `PENDING_APPROVAL`.
  - Can only be approved by `SUPER_ADMIN` via `/super-admin/pending-campus`.

### D. Anti-Tampering & Client Role Injection Protection
* **Defense Mechanism:**
  - In `POST /api/auth/register`:
    ```ts
    const forbiddenPublicRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];
    if (role && forbiddenPublicRoles.includes(role)) {
      return NextResponse.json({ error: 'Administrative and management roles cannot be self-assigned.' }, { status: 403 });
    }
    const finalRole = (role && allowedStaffRoles.includes(role)) ? role : 'STUDENT';
    ```
  - Any client attempting to submit `role: "SUPER_ADMIN"` or `role: "ADMIN"` is immediately rejected with `403 Forbidden`.
  - Roles are enforced strictly server-side.

### E. Password Reset & Anti-Enumeration
* **Endpoints:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
* **Defenses:**
  - Triple-check validation: Requires college ID, institutional email, and student registration number to match before issuing OTP.
  - Uniform response: Returns identical success status message regardless of whether the email exists, preventing user enumeration attacks.
  - OTP expires strictly within 5 minutes.

### F. Google OAuth
* **Status:** `CODE VERIFIED ONLY`
* **Implementation:** Handles PKCE authorization code exchange via `/api/auth/callback`.
* **Production Blocker:** Production Google OAuth credentials and redirect URIs (`https://kavach-campus.vercel.app/api/auth/callback`) must be configured in Google Cloud Console.

---

## 3. Staging Validation Checklist

- [ ] Register new student with institutional email (`@srkr.edu.in`) -> verify automatic college mapping.
- [ ] Register new student with personal email (`@gmail.com`) -> verify college claim capture.
- [ ] Attempt registration with `role: "ADMIN"` -> verify HTTP 403 rejection.
- [ ] Register staff member (e.g. `WARDEN`) -> verify profile is created with `is_verified: false` and `PENDING_APPROVAL`.
- [ ] Login as unapproved staff member -> verify redirect to pending approval waiting screen.
- [ ] Login as Campus Admin -> approve staff member -> verify staff member now accesses dashboard.
