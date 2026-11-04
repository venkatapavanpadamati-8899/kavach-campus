# KAVACH CAMPUS — STUDENT REGISTRATION E2E REPORT
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer & QA Architect  
**Scope:** Student Registration, OTP Verification, SSR Session Establishment, ID Card Upload, Admin Review Workflow, and Logout  

---

## 1. Executive Summary

The complete end-to-end lifecycle for student onboarding was executed live against the local Next.js development server (`http://localhost:3000`) connected to the live Supabase staging database (`https://polbnvszmvblwenfnqll.supabase.co`).

All HTTP API transitions were validated with synthetic test accounts and cleaned up immediately after execution.

---

## 2. Step-by-Step E2E Verification Results

| Step | Operation | Endpoint | Input / Condition | HTTP Status | Verdict | Notes |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | Student Registration Submission | `POST /api/auth/register` | Institutional email (`@srkr.edu.in`), full name, phone, registration number, department, year, password | `201 Created` | **PASS** | Auto-detected college tenant `srkr-bhimavaram`. OTP generated in `user_otp_verifications`. |
| **2** | OTP Verification & Account Activation | `POST /api/auth/verify-otp` | Email + 6-digit cryptographic OTP | `200 OK` | **PASS** | Profile created in `profiles` (`role: STUDENT`), initial `student_profiles` row initialized. |
| **3** | Server-Side Authenticated Session | Supabase Auth SSR | Email + Password password grant | `200 OK` | **PASS** | Signed session cookie jar tracked for all subsequent authenticated API calls. |
| **4** | Student ID Card Upload & Verification Request | `POST /api/student/verify-id` | Multipart JPEG ID card file (`50 KB`), student registration number | `200 OK` | **PASS** | Uploaded to private `kavach-id-cards` storage bucket. `verification_status` transitioned to `SUBMITTED`. |
| **5** | Admin Verification Without Reason (Negative Test) | `POST /api/admin/verifications` | Admin session, action `REJECT`, empty `rejectionReason` | `400 Bad Request` | **PASS** | Strict rejection guardrail enforced: `rejectionReason is required when rejecting`. |
| **6** | Admin Verification Approval | `POST /api/admin/verifications` | Admin session, action `APPROVE`, reviewer note | `200 OK` | **PASS** | `verification_status` transitioned to `VERIFIED`. `student_profiles.verified_at` timestamp set. |
| **7** | Student Session Termination (Logout) | `POST /api/auth/logout` | Active student session | `200 OK` | **PASS** | Server-side Supabase SSR session invalidated, auth cookies expired safely. |

---

## 3. Schema Resilience & Migration Observations

- **Pending Migration 017 (`student_college_claims.sql`):**  
  The remote database schema does not yet include `claimed_college_id` on `student_profiles`. The application layer includes resilient fallback handling in `src/app/api/student/verify-id/route.ts` and `src/app/api/admin/verifications/route.ts` to seamlessly query without this column until Migration 017 is executed.

---

## 4. Final Verdict

- **Automated API Flow:** `PASS` (All 7 live API workflow steps verified against local server and live Supabase).
- **Interactive Browser UI Clicks:** `NOT VERIFIED` (Requires manual user verification in a live browser window for visual form rendering, animations, and file drag-and-drop).

