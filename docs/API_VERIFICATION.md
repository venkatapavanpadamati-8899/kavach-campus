# KAVACH CAMPUS — API ENDPOINT VERIFICATION REPORT

**Date:** 2026-11-03  
**Auditor:** Backend API & QA Automation Engineer  
**Total Routes:** 69 (Static and Dynamic Serverless Route Handlers)

---

## 1. Core API Endpoints Verification Matrix

| Endpoint Route | HTTP Methods | Authentication Required | Role Restrictions | Key Validation & Error Handling | Verification Status |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `/api/auth/login` | POST | Public | Any | Email/Password, Magic Link, Demo OTP; Rate limited. | **PASS** |
| `/api/auth/mobile-login` | POST | Public | Any | Step: `send` / `verify`; 6-digit CSPRNG OTP; Rate limited. | **PASS** |
| `/api/auth/callback` | GET | Public | Any | Supabase PKCE exchange; Google ID token fallback; State verification. | **PASS** |
| `/api/auth/google` | GET | Public | Any | Builds Google authorization URL; sanitizes return path. | **PASS** |
| `/api/incidents` | GET, POST | Authenticated | Any (POST: Student) | Validates title, description, category; Emergency bypass for unverified ID. | **PASS** |
| `/api/incidents/[id]` | GET, PATCH | Authenticated | Owner / Assigned / Admin | IDOR defense; Masks location & student info if anonymous. | **PASS** |
| `/api/incidents/[id]/evidence` | GET, POST | Authenticated | Owner / Assigned / Admin | Generates 15-min signed URLs; 25MB file upload limit. | **PASS** |
| `/api/student/safe-box` | GET, POST, DELETE | Authenticated | STUDENT | Owner-only queries; 15-min signed URLs; 25MB limit; Delete cleanup. | **PASS** |
| `/api/sos` | POST | Authenticated | STUDENT | 60-second cooldown; marks `[CONTROLLED TEST]` in testing; suppresses sirens. | **PASS** |
| `/api/sos/location` | POST | Authenticated | STUDENT | Validates latitude (-90 to 90) and longitude (-180 to 180). | **PASS** |
| `/api/safe-walk/start` | POST | Authenticated | STUDENT | Requires destination and duration (5-180 mins). | **PASS** |
| `/api/safe-walk/location` | POST | Authenticated | STUDENT | Updates session coordinates during active safe walk. | **PASS** |
| `/api/safe-walk/end` | POST | Authenticated | STUDENT | Terminates active safe walk session. | **PASS** |
| `/api/cron/safe-walk-timeout` | POST | Bearer Secret | System Cron | Verifies `CRON_SECRET`; detects expired safe walks and escalates. | **PASS** |
| `/api/cron/escalate` | POST | Bearer Secret | System Cron | Verifies `CRON_SECRET`; escalates overdue unacknowledged incidents. | **PASS** |
| `/api/admin/analytics` | GET | Authenticated | ADMIN, SUPER_ADMIN | Computes real database aggregations by college, category, and severity. | **PASS** |
| `/api/admin/users/approve` | POST | Authenticated | ADMIN, SUPER_ADMIN | Approves pending faculty/staff accounts; Audited. | **PASS** |
| `/api/system/health` | GET | Public | Any | Returns service operational status (`200 OK`). | **PASS** |
