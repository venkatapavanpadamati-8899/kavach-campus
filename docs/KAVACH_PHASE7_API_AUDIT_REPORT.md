# KAVACH CAMPUS — PHASE 7: BACKEND API-BY-API AUDIT REPORT

**Project:** Kavach Campus — Safety in One Tap (`D:\Kavach Campus`)  
**Scope:** Exhaustive Audit of all 24 Backend API Endpoints (`src/app/api/`)  
**Date:** October 18, 2026

---

## 1. Complete API Route Inventory & Verification Matrix

| Method | Route | Intended Role | Auth Enforcement | Input Validation | Error Handling | Operational Verdict |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| `POST` | `/api/auth/register` | Public | None | Email regex, password length >= 8, name >= 2 | 400 Bad Request, 503 if unconfigured | **PASS** |
| `POST` | `/api/auth/login` | Public | None | Email & password presence | 401 Unauthorized, unapproved staff gate | **PASS** |
| `POST` | `/api/auth/verify-otp` | Public/Session | None | 6-digit OTP, bcrypt comparison | 400 Expired, 401 Invalid, 404 Missing | **PASS** |
| `POST` | `/api/auth/google` | Public | None | Google ID token verification | 401 Invalid token | **PASS** |
| `GET` | `/api/auth/callback` | Public | Code exchange | Auth code exchange via Supabase SSR | 302 Redirect to `/student` | **PASS** |
| `POST` | `/api/sos` | Student | Authenticated | GPS coords range (-90..90, -180..180) | Duplicate flood prevention, CRITICAL default | **PASS** |
| `POST` | `/api/sos/location` | Student | Authenticated | Lat/Lng numeric validation | Updates incident_locations & incident table | **PASS** |
| `POST` | `/api/safe-walk/start` | Student | Authenticated | Duration, start coords, auto_sos flag | Creates active safe_walk session | **PASS** |
| `POST` | `/api/safe-walk/location`| Student | Authenticated | Lat/Lng heartbeats | Updates session breadcrumbs | **PASS** |
| `POST` | `/api/safe-walk/end` | Student | Authenticated | Session ID | Sets COMPLETED or CANCELLED status | **PASS** |
| `GET` | `/api/incidents` | Authenticated | Authenticated | Role filter (students see own, staff see assigned) | PostgREST RLS filtered | **PASS** |
| `POST` | `/api/incidents` | Student/Staff | Authenticated | Category, description, severity | Case ID auto-generation, AI analysis hook | **PASS** |
| `GET` | `/api/incidents/[id]` | Authorized | Authenticated | UUID format validation | 404 Not Found, 403 Forbidden | **PASS** |
| `PATCH`| `/api/incidents/[id]` | Staff/Admin | Authenticated | Valid incident status transitions | 403 Forbidden to ordinary students | **PASS** |
| `GET` | `/api/incidents/[id]/evidence` | Authorized | Authenticated | Incident ownership check | Signed URLs generated with 15-min TTL | **PASS** |
| `POST` | `/api/incidents/[id]/evidence` | Authorized | Authenticated | Case-bound verification | 403 if caller not participant | **PASS** |
| `GET` | `/api/incidents/[id]/notes` | Authorized | Authenticated | Incident ownership check | Returns timeline audit notes | **PASS** |
| `POST` | `/api/incidents/[id]/notes` | Staff/Admin | Authenticated | Note body validation | Records note and case action | **PASS** |
| `POST` | `/api/incidents/[id]/escalate` | Staff/Admin | Authenticated | Target level, reason | Provisions escalation record | **PASS** |
| `GET` | `/api/incidents/[id]/nearby-staff` | Staff/Admin | Authenticated | Incident GPS coords | Haversine distance calculation | **PASS** |
| `GET` | `/api/student/verify-id` | Student | Authenticated | Session user ID | Returns verification status | **PASS** |
| `POST` | `/api/student/verify-id` | Student | Authenticated | 10-digit ID check, academic batch check | Evaluates OCR, updates student_profiles | **PASS** |
| `GET` | `/api/student/profile` | Student | Authenticated | Session user ID | Returns personal profile & medical details | **PASS** |
| `PATCH`| `/api/student/profile` | Student | Authenticated | Medical details, blood group | Role tampering blocked by trigger | **PASS** |
| `GET` | `/api/student/trusted-contacts` | Student | Authenticated | Session user ID | Returns up to 5 contacts | **PASS** |
| `POST` | `/api/student/trusted-contacts` | Student | Authenticated | Phone number format | Inserts contact tied to auth.uid() | **PASS** |
| `DELETE`| `/api/student/trusted-contacts`| Student | Authenticated | Contact ID ownership check | Deletes contact | **PASS** |
| `GET` | `/api/student/blood-search` | Authorized | Authenticated | Blood group query | Returns matching willing donors | **PASS** |
| `GET` | `/api/admin/verifications` | Reviewer | Reviewer Role | Admin/Security role check | Generates signed URLs for ID cards | **PASS** |
| `POST` | `/api/admin/verifications` | Reviewer | Reviewer Role | Decision (VERIFIED/REJECTED), notes | Updates verification status & approves profile | **PASS** |
| `POST` | `/api/admin/users/approve` | Admin | Admin Role | Target user ID, approval status | Updates profiles table | **PASS** |
| `GET` | `/api/admin/analytics` | Management | Admin/Mgmt | Date range filters | Returns SLA & department metrics | **PASS** |
| `POST` | `/api/cron/escalate` | System | Bearer Secret | CRON_SECRET authorization | Escalates overdue unassigned cases | **PASS** |
| `POST` | `/api/cron/safe-walk-timeout`| System | Bearer Secret | CRON_SECRET authorization | Auto-escalates overdue safe walks to SOS | **PASS** |
| `GET` | `/api/system/health` | Public | None | Database connection ping | 200 Healthy, 503 Unhealthy | **PASS** |

---

## 2. API Security Architecture Findings
- **Zero Stack Trace Leaks:** All error handlers return standardized JSON `{ error: string }`.
- **Identity Derivation:** All user-specific routes derive `user.id` strictly from the server-side authenticated session (`supabase.auth.getUser()`).
- **Cron Security:** Cron endpoints enforce `Authorization: Bearer <CRON_SECRET>`. Missing or invalid tokens return `401 Unauthorized`.
