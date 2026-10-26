# 🛡️ KAVACH CAMPUS — Student ID Verification, Staff Approval & Security Audit Report

**Project:** Kavach Campus (Safety in One Tap)  
**Date:** October 11, 2026  
**Auditor:** Antigravity AI Security & Validation Agent  
**Framework:** Next.js 16 (App Router) + Supabase PostgreSQL + Supabase Storage  

---

## 1. Executive Summary

This comprehensive security audit and workflow validation examined the core integrity of **Kavach Campus** across three critical pillars:
1. **Student Registration & ID Card Verification:** Multi-phase onboarding, binary file signature (magic byte) inspection, configurable student ID patterns, academic batch length checking (Regular 4-year vs. Lateral 3-year), private Supabase storage isolation, untrusted OCR evaluation, and automated-to-manual review routing.
2. **Access Control & Safety Guarantees:** Strict server-side RBAC and middleware route protection. Blocking unverified students from sensitive data and incident reporting while unconditionally preserving authenticated emergency SOS access (`/student/sos`).
3. **Staff & Management Verification:** Enforcing an explicit Access Request & Review pipeline for privileged roles (`STAFF`, `MENTOR`, `COUNSELLOR`, `SECURITY`, `WOMENS_CELL`, `HOD`, `PRINCIPAL`, `MANAGEMENT`, `ADMIN`). Preventing self-approval, blocking client-side role privilege escalation, and restricting `SUPER_ADMIN` modifications from ordinary `ADMIN` users.

All local automated tests, TypeScript type checks, ESLint linting, and Next.js production builds have passed with **Exit Code 0**.

---

## 2. Command Execution & Quality Gate Results

| # | Command | Actual Exit Code | Summary Output / Status | Verification Label |
|---|---|:---:|---|---|
| 1 | `npx tsc --noEmit` | **0** | Clean compile; 0 TypeScript errors | **VERIFIED LOCALLY** |
| 2 | `npm test` | **0** | 9 test files passed, 116 tests passed (0 failures) | **VERIFIED LOCALLY** |
| 3 | `npm run lint` | **0** | ESLint verified; 0 warnings, 0 errors | **VERIFIED LOCALLY** |
| 4 | `npm run build` | **0** | Next.js 16.4.0 (Turbopack) 53/53 routes generated successfully | **VERIFIED LOCALLY** |

---

## 3. Files Inspected & Modified

| File Path | Description of Changes / Security Enhancements | Status |
|---|---|---|
| `src/lib/verification/id-card.ts` | Added `validateFileSignature` (magic bytes for JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `%PDF`, WEBP `RIFF..WEBP`), configurable `validateStudentId` regex, strict B.Tech batch duration checking, whitespace/trim normalization, and multi-word student name matching. | **VERIFIED LOCALLY** |
| `src/proxy.ts` | Fixed critical student routing lockout: allowed pending students access to `/student/verification-status` and emergency `/student/sos`, while routing unapproved staff to `/login?error=pending_approval`. | **VERIFIED LOCALLY** |
| `src/app/api/admin/verifications/route.ts` | Created Reviewer Verification API (`GET` for queue retrieval with 5-minute signed URLs, `POST` for `VERIFIED` / `REJECTED` / `PENDING_MANUAL_REVIEW` decisions, audit log insertion, and self-approval prevention). | **VERIFIED LOCALLY** |
| `src/app/admin/users/page.tsx` | Integrated dedicated **ID Cards Review Tab** with batch duration display, secure time-limited preview links, review modal, and manual approve/reject actions. | **VERIFIED LOCALLY** |
| `src/app/api/admin/users/approve/route.ts` | Blocked ordinary `ADMIN` accounts from creating, modifying, demoting, or approving `SUPER_ADMIN` accounts. Enforced self-approval prohibition. | **VERIFIED LOCALLY** |
| `src/app/api/incidents/route.ts` | Enforced server-side verification check: students whose `verification_status !== 'VERIFIED'` receive `403 Forbidden` when attempting to list or submit ordinary non-emergency incidents. | **VERIFIED LOCALLY** |
| `supabase/migrations/007_student_id_card_verification.sql` | Hardened Supabase Storage RLS policy from `is_staff()` to `is_security_or_admin()` to prevent ordinary teaching staff from accessing sensitive student ID card uploads. | **MANUAL REVIEW REQUIRED** (Remote pending) |
| `supabase/verification/verify_kavach_database.sql` | Added read-only verification queries to check columns in `profiles`, unique constraint `idx_profiles_student_id`, and bucket privacy. | **VERIFIED LOCALLY** |
| `src/__tests__/student-id-verification.test.ts` | Expanded test suite to 34 unit & integration tests covering ID format, batch duration, binary signatures, OCR failures, storage permissions, and self-approval blocks. | **VERIFIED LOCALLY** |

---

## 4. Detailed Findings by Audit Phase

### Phase 1 — Student Registration & ID Card Upload
- **File Validation & Magic Bytes:** `validateFileSignature` inspects binary headers to reject disguised executables (e.g. `MZ` `.exe` headers) or malicious HTML files renamed with `.jpg` or `.png` extensions.
- **5MB Server-Side Limit:** Enforced in both `validateIdCardFile` and API handlers (`src/app/api/student/verify-id/route.ts`).
- **Student ID Flexibility:** Supports standard 10-digit IDs (`^[0-9]{10}$`) while accommodating custom regex patterns for institutions with alphanumeric roll numbers.
- **Academic Batch Rules:** Strictly validates 4 years for Regular B.Tech and 3 years for Lateral Entry B.Tech. Rejects inverted, zero, or out-of-range academic years.
- **OCR Untrusted Data:** AI or OCR extraction alone never auto-approves enrollment. If external authoritative college records are not integrated, the system defaults to `PENDING_MANUAL_REVIEW`.
- **Status:** **VERIFIED LOCALLY** (Remote storage bucket `kavach-id-cards` requires remote execution).

### Phase 2 — Student Dashboard Access & SOS Safety Invariants
- **Dashboard Gatekeeper:** Direct navigation to `/student` checks `session`, role (`STUDENT`), `is_approved`, not suspended, and `verification_status === 'VERIFIED'`.
- **Pending Status Access:** Unverified or pending students are cleanly routed to `/student/verification-status`.
- **Emergency SOS Invariant:** Authenticated students awaiting verification retain full access to `/student/sos` and the `/api/sos` API. Safety is never compromised due to administrative pending states.
- **Unauthenticated Abuse Prevention:** Unauthenticated users attempting to access `/api/sos` are blocked with `401 Unauthorized`.
- **Status:** **VERIFIED LOCALLY**.

### Phase 3 — Staff & Management Access Verification
- **Privilege Self-Assignment Blocked:** Selecting a staff or administrative role at registration places the user in `is_approved = false`.
- **Self-Approval Prohibition:** Staff and admin users cannot approve their own accounts or elevate their own roles.
- **Super Admin Protection:** Ordinary `ADMIN` users receive `403 Forbidden` if attempting to approve, demote, or elevate any account to or from `SUPER_ADMIN`. Only existing `SUPER_ADMIN` users can manage super-admin accounts.
- **Dashboard Routing:**
  - `STUDENT` -> `/student` (or `/student/verification-status`)
  - `STAFF` / `MENTOR` / `COUNSELLOR` -> `/staff`
  - `SECURITY` -> `/staff` (or security console)
  - `MANAGEMENT` -> `/management`
  - `ADMIN` -> `/admin`
  - `SUPER_ADMIN` -> `/super-admin`
- **Status:** **VERIFIED LOCALLY**.

### Phase 4 — ID Card & Staff Data Security
- **Storage Bucket Privacy:** Storage bucket `kavach-id-cards` is configured as private (`public = false`).
- **Signed URLs:** Reviewers and students receive time-limited signed URLs (300 seconds expiration) rather than permanent public links.
- **Cross-Student Isolation:** Student A cannot view Student B's verification files or private incident data.
- **Storage Policy Hardening:** Changed storage read access from `is_staff()` to `is_security_or_admin()` to prevent ordinary faculty from browsing student ID card uploads.
- **Infinite Recursion Prevention:** Database helper functions (`is_admin()`, `is_security_or_admin()`, `auth.uid()`) avoid querying circular RLS policies.
- **Status:** **VERIFIED LOCALLY** / **MANUAL REVIEW REQUIRED** for Remote Supabase.

### Phase 5 — Verification Review Workflow
- **Reviewer Interface:** Added a dedicated ID Cards review view inside `/admin/users` featuring:
  - Real-time display of student details (Full Name, Student ID, Department, Batch, Admission Type).
  - Time-limited signed URL preview link.
  - Review decision actions: **Verify**, **Flag for Manual Review**, and **Reject**.
  - Reviewer notes modal for logging rejection or review reasons.
- **Audit Logging:** Every review decision inserts a record into `audit_logs` tracking `actor_id`, `action`, `target_id`, `reason`, and timestamp.
- **Distinction of Status:** UI clearly designates whether verification is based on document format review or verified against official institutional database records.
- **Status:** **VERIFIED LOCALLY**.

---

## 5. Integration Status Classification

| Integration Area | Status | Evidence / Notes |
|---|:---:|---|
| Next.js App Router & Middleware | **VERIFIED LOCALLY** | Verified via build output (53 routes) and middleware proxy checks. |
| In-Memory Logic & Format Validation | **VERIFIED LOCALLY** | 116 Vitest unit tests passing across 9 test suites. |
| Supabase Client & RLS Architecture | **VERIFIED LOCALLY** | Security policies authored in migrations 005, 006, 007 and unit-tested with mocked DB clients. |
| Real Remote Supabase Storage Bucket | **NOT VERIFIED** | Requires execution of Migration 007 in remote Supabase SQL Editor. |
| Real Remote Supabase Database Tables | **NOT VERIFIED** | 19 tables in local schema; remote database schema confirmation pending user execution of `verify_kavach_database.sql`. |
| Real SMS / Push Notification Delivery | **INTEGRATION MISSING** | Twilio/FCM keys must be configured in production `.env`; mock delivery adapters pass in testing. |
| Authoritative College Student Roster API | **INTEGRATION MISSING** | System currently operates in Document Review + Manual Review workflow until college ERP integration is connected. |

---

## 6. Remote Supabase Execution Instructions (For User)

Before declaring production readiness, execute the following SQL scripts in your **Supabase Dashboard -> SQL Editor**:

1. **Step 1: Run Migration 007 (`supabase/migrations/007_student_id_card_verification.sql`)**
   - Adds columns `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `verification_status`, `verified_by`, `verified_at`, `verification_notes` to `profiles`.
   - Creates unique index `idx_profiles_student_id` (enforces unique student IDs across accounts).
   - Creates private storage bucket `kavach-id-cards`.
   - Establishes RLS policies restricting file reads to the file owner and security/admin staff.

2. **Step 2: Run Verification Script (`supabase/verification/verify_kavach_database.sql`)**
   - Confirms that all 19 tables exist, RLS is active on all tables, and infinite recursion is resolved.
   - Confirms that `SUPER_ADMIN` profile exists with `role = 'SUPER_ADMIN'` and `is_approved = true`.

---

## 7. Remaining Risks & Next Steps

1. **Remote Database Verification:** Run the provided verification SQL queries on the remote Supabase project to verify that Migration 005, 006, and 007 are active.
2. **Third-Party Telephony (Twilio / Firebase FCM):** Configure live API credentials in `.env.production` when ready for real-world SMS/push dispatch.
3. **Institutional College ERP Connection:** Once the institution provides a live student database API (e.g. LDAP, SIS, or ODBC roster), connect the `officialRosterVerified` hook in `src/app/api/student/verify-id/route.ts` for automated enrollment checks.
