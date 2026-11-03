# KAVACH CAMPUS — AUTHENTICATION & REGISTRATION AUDIT

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Status:** 100% VERIFIED  

---

## 1. Registration Workflows

### 1.1 Student Registration (`/register`)
- **Institution Selection:** Integrated with `CollegeSearchInput`, allowing students to find their college either by typing the college name or entering a 6-digit PIN code.
- **Multi-College Handling:** In areas where multiple affiliated colleges share a single PIN code, all matching colleges appear with their affiliated university and autonomous status badges.
- **Unlisted Colleges:** If an institution is not listed, the student can click "Request to add college" to trigger the modal form.
- **Verification & Activation:** Upon form submission, an OTP is dispatched (via simulated demo SMS or SMTP email) and the student is smoothly redirected to `/verify-otp` in 800ms.
- **Default State:** Initial status is `verification_status: 'PENDING'`, restricting access to protected features until ID verification is reviewed.

### 1.2 Staff Registration (`/register?role=STAFF`)
- **Separate Onboarding Flow:** Staff members select their designation from the official 16-level hierarchy:
  1. Principal
  2. Provost
  3. Vice Principal
  4. Dean
  5. Head of Department (HOD)
  6. Professor
  7. Associate Professor
  8. Assistant Professor
  9. Junior Professor
  10. Lecturer
  11. Teacher / Instructor
  12. Mentor / Faculty Advisor
  13. Student Counselor
  14. Administrative Officer
  15. Non-Teaching Staff
  16. Security Officer
- **Approval Gate:** All staff accounts are created with `is_approved: false`. They cannot access `/staff` or `/management` until verified by their campus administrator or principal.

### 1.3 Campus Admin Registration (`/admin/campus/register`)
- **Dedicated Request Portal:** Built specifically for institutional administrators.
- **Governance Disclaimer:** Clearly states legal and safety compliance requirements under UGC/AICTE safety mandates.
- **Approval Workflow:** The first Campus Admin of an institution routes directly to Super Admin for approval. Subsequent staff approvals are handled by the approved Campus Admin.

---

## 2. Authentication & Session Management

- **Email + Password Login:** Handled via Supabase SSR Auth with secure HTTP-only session cookies.
- **Mobile Number + OTP Login:** Supported via `/api/auth/mobile-login` and `/api/auth/verify-otp`.
- **Google OAuth:** Integrated via `/api/auth/google` with PKCE authorization code callback at `/api/auth/callback`.
- **Password Reset:** Implemented via `/forgot-password`, `/api/auth/forgot-password`, and `/reset-password` with secure token validation.
- **Logout:** Handled via `/api/auth/logout`, clearing server session cookies and invalidating tokens.
