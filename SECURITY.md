# KAVACH CAMPUS — SECURITY ARCHITECTURE & VULNERABILITY POLICY

**Document Date:** 2026-11-03
**Security Standard:** OWASP Top 10, Zero-Trust Architecture, Role-Based Access Control (RBAC)
**Target Environment:** Vercel Production (`https://kavach-campus.vercel.app`) + Supabase PostgreSQL

---

## 1. Security Architecture Overview

Kavach Campus handles sensitive student emergency dispatches, voice recordings, geolocation pings, and confidential evidence files. Security is enforced at every layer of the stack:

### A. Authentication & Session Security
* **Supabase GoTrue & PKCE:** Modern Proof Key for Code Exchange (PKCE) flow for Google OAuth.
* **Open-Redirect Mitigation:** All `redirectTo` and `returnTo` parameters are sanitized against protocol schemes (`http:`, `https:`, `javascript:`), protocol-relative URLs (`//evil.com`), and backslash evasion (`/\evil.com`) via `sanitizeRedirectUrl()` in `src/lib/oauth.ts`.
* **Password Hashing:** Passwords are never stored in plaintext. Passwords in registration/reset flows use bcrypt (`bcryptjs`) before database insertion.
* **OTP Rate Limiting:** Mobile OTP requests are strictly throttled (1 request per 60 seconds per phone number, maximum 5 attempts before invalidation).

### B. Authorization & Row Level Security (RLS)
* **Student Privacy Boundary:** Students can only read and create their own incidents, profile data, and Safe Box items. Direct query parameters (`student_id=...`) are ignored in favor of `auth.uid()`.
* **Staff Scoping:** Staff responders can only view incidents assigned to them or unassigned cases in their department/campus.
* **Cross-College Isolation:** Multi-tenant institution isolation prevents staff or students from College A from accessing records from College B.
* **Anonymous Report Masking:** Incidents marked `is_anonymous: true` mask the student ID, name, email, and phone number (`[PROTECTED ANONYMOUS REPORT]`) for all staff and management roles except Super Admin.

### C. Evidence & Safe Box Storage Security
* **Storage Bucket:** Private Supabase Storage bucket (`kavach-evidence`). Direct public URLs are disabled.
* **Temporary Signed URLs:** File downloads and previews use short-lived signed URLs (15 minutes / 900 seconds) generated on-demand only after server-side ownership or authorized responder validation.
* **File Upload Filters:** Maximum file size is strictly capped at 25MB. Files are verified against an allowed MIME whitelist (JPEG, PNG, WebP, GIF, MP4, QuickTime, WebM, MP3, WAV, OGG, PDF).
* **Filename Sanitization:** Uploaded filenames are sanitized (`/[^a-zA-Z0-9._-]/g`) and prefixed with a random UUID to prevent path traversal.

### D. Geolocation & SOS Privacy
* **Selective Coordinates Visibility:** Student GPS coordinates are visible strictly to the student owner, assigned responder, or approved security/super admin. Unassigned faculty and standard staff cannot access live location coordinates.
* **Emergency Override:** Unverified students are permitted to file emergency life-safety reports (`category: 'EMERGENCY'` or `priority: 'CRITICAL'`), ensuring life preservation without bypassing authentication or rate limits.

---

## 2. Automated Security Audit Results

```text
========================================================================================
✔ Dependency Vulnerabilities (npm audit --omit=dev): 0 Vulnerabilities found
✔ TypeScript Type Soundness (npx tsc --noEmit):      0 Type errors
✔ ESLint Code Cleanliness (npm run lint):            0 Errors, 0 Warnings
✔ Git Whitespace Integrity (git diff --check):       0 Whitespace defects
========================================================================================
```

---

## 3. Vulnerability Reporting & Disclosure

To report a suspected security vulnerability in Kavach Campus, please contact the institutional administrator or repository maintainer. Do not file public GitHub issues for security vulnerabilities.
