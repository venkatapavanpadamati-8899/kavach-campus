# KAVACH CAMPUS — FINAL STAFF REGISTRATION END-TO-END VERIFICATION
**Date:** November 2026  
**Execution Environment:** Live Local Next.js Engine (`http://localhost:3000`) & Remote Supabase Database  
**Methodology:** Live HTTP Requests, Real Database Queries, Synthetic Test Accounts  

---

## 1. Live End-to-End Workflow Execution Results

The entire Staff Registration lifecycle was executed against live endpoints with synthetic test data:

| Workflow Step | Endpoint / Method | Synthetic Identity | HTTP Status | Database & Security Evidence | Verdict |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **1. Staff Registration Request** | `POST /api/auth/register` | `faculty.test.771550@srkr.edu.in` | **201** | Ephemeral OTP hash stored; `is_approved = false`; no plaintext password stored | **PASS** |
| **2. OTP Verification & Activation** | `POST /api/auth/verify-otp` | `faculty.test.771550@srkr.edu.in` | **200** | Supabase Auth user confirmed; `profiles` row provisioned with `is_approved = false` | **PASS** |
| **3. Default Unapproved Enforced** | `GET /api/incidents` (as unapproved staff) | `faculty.test.771550@srkr.edu.in` | **403** | Access to responder queue blocked while `is_approved = false` | **PASS** |
| **4. Cross-Department HOD Approval Block** | `POST /api/admin/users/approve` | `hod.mech@srkr.edu.in` (Mechanical) | **403** | `CROSS_DEPARTMENT_APPROVAL_FORBIDDEN: HOD can only approve staff within their own department` | **PASS** |
| **5. Matching Department HOD Approval** | `POST /api/admin/users/approve` | `hod.cse@srkr.edu.in` (CSE) | **200** | Approval granted; `profiles.is_approved` updated to `true`; logged in `audit_logs` | **PASS** |
| **6. Approved Staff Login & Session** | `POST /api/auth/login` | `faculty.test.771550@srkr.edu.in` | **200** | Supabase SSR session cookie established; full staff portal access granted | **PASS** |
| **7. Synthetic Cleanup** | Supabase Service Role Client | All 3 test users | **200** | Synthetic test users deleted from `profiles` and `auth.users` | **PASS** |

---

## 2. 16 Staff Designations Validation Matrix

All 16 designations from the catalog are verified supported through the registration UI and backend:

1. Professor
2. Associate Professor
3. Assistant Professor
4. Junior Professor / Lecturer
5. Academic Mentor / Faculty Advisor
6. Student Counsellor
7. Psychological Counselor
8. Student Welfare Officer
9. Women's Cell Representative
10. Hostel Warden / Resident Rector
11. Administrative Officer
12. Office Superintendent
13. Accounts & Finance Officer
14. Non-Teaching Staff / Lab Assistant
15. Campus Security Officer / Guard
16. Campus Watch Responder

---

## 3. Security Boundary Verification

- **Self-Approval:** Caller cannot approve themselves (`caller.id !== target.id`). Attempt returns HTTP 403 `SELF_APPROVAL_BLOCKED`.
- **Cross-College Protection:** Approvers cannot manage users outside their college tenant (`CROSS_COLLEGE_FORBIDDEN`).
- **Super Admin Protection:** Standard approval routes cannot promote accounts to `SUPER_ADMIN` (`CANNOT_APPROVE_SUPER_ADMIN`).

