# KAVACH CAMPUS — PHASE 2 API SECURITY AUDIT

**Project:** Kavach Campus  
**Audit Scope:** All 36 Next.js Route Handlers (`src/app/api/*`)  
**Audit Date:** 2026-11-03  

---

## Complete Route-by-Route Security Matrix

| # | Endpoint Route | HTTP Method | Auth Required | Role / Scope Enforcement | Input Validation & Guards | Status |
| :-: | :--- | :---: | :---: | :--- | :--- | :---: |
| 1 | `/api/admin/analytics` | POST | YES | ADMIN / SUPER_ADMIN | Date range validation, tenant isolation | **PASS** |
| 2 | `/api/admin/users/approve` | POST | YES | ADMIN / SUPER_ADMIN / MANAGEMENT | Role whitelist, no self-approval | **PASS** |
| 3 | `/api/admin/verifications` | GET | YES | ADMIN / SUPER_ADMIN | College-scoped review query | **PASS** |
| 4 | `/api/auth/callback` | GET | NO (PKCE) | Exchange auth code for session | Safe URL validation, CSRF defense | **PASS** |
| 5 | `/api/auth/demo-sms` | POST | GATED | Dev/Demo environment only | Gated by `ENABLE_DEMO_SMS` | **PASS** |
| 6 | `/api/auth/forgot-password` | POST | NO | Rate limited (60s cooldown) | Anti-enumeration, email regex | **PASS** |
| 7 | `/api/auth/google` | GET | NO | OAuth redirect initiation | Origin whitelist check | **PASS** |
| 8 | `/api/auth/login` | POST | NO | Password authentication | Brute force defense, session creation | **PASS** |
| 9 | `/api/auth/logout` | POST | YES | Authenticated caller | Cookie invalidation, session kill | **PASS** |
| 10 | `/api/auth/mobile-login` | POST | NO | Phone-based OTP authentication | 10-digit regex, rate limiting | **PASS** |
| 11 | `/api/auth/register` | POST | NO | Role whitelist (blocks privileged) | Min 8 char pass, phone regex | **PASS** |
| 12 | `/api/auth/resend-otp` | POST | NO | Rate limited (60s cooldown) | Database timestamp check | **PASS** |
| 13 | `/api/auth/reset-password` | POST | NO | Verified OTP token | Min 8 char pass, bcrypt hash | **PASS** |
| 14 | `/api/auth/verify-otp` | POST | NO | OTP recipient | Timing-safe compare, 5m expiry | **PASS** |
| 15 | `/api/colleges/search` | GET | NO | Public tenant discovery | Sanitized query & 6-digit PIN | **PASS** |
| 16 | `/api/cron/escalate` | POST | CRON SECRET | Bearer token authorization | `timingSafeEqual` secret check | **PASS** |
| 17 | `/api/cron/safe-walk-timeout`| POST | CRON SECRET | Bearer token authorization | `timingSafeEqual` secret check | **PASS** |
| 18 | `/api/incidents` | GET, POST | YES | Role-scoped (Student/Staff/Admin) | Strict college_id partition | **PASS** |
| 19 | `/api/incidents/[id]` | GET | YES | Participant or authorized responder| UUID param validation | **PASS** |
| 20 | `/api/incidents/[id]/escalate`| POST| YES | Assigned staff or Admin | Prevents duplicate escalation | **PASS** |
| 21 | `/api/incidents/[id]/evidence`| GET, POST | YES | Incident participants only | 15MB limit, magic-byte check | **PASS** |
| 22 | `/api/incidents/[id]/nearby-staff`| GET | YES | College safety responders | GPS radius bounds checking | **PASS** |
| 23 | `/api/incidents/[id]/notes` | GET, POST | YES | Assigned responders | Note sanitization, AI advisory | **PASS** |
| 24 | `/api/notifications/test-push`| POST| YES | Admin only | Push payload validation | **PASS** |
| 25 | `/api/safe-walk/end` | POST | YES | Safe walk owner | Session state machine check | **PASS** |
| 26 | `/api/safe-walk/location` | POST | YES | Safe walk owner | Lat/Lng bounding, rate limiting | **PASS** |
| 27 | `/api/safe-walk/start` | POST | YES | Student only | Validates contacts, destination | **PASS** |
| 28 | `/api/sos` | POST | YES | Student only | Immediate incident creation | **PASS** |
| 29 | `/api/sos/location` | POST | YES | Active incident owner | Live GPS update, coordinate bounds | **PASS** |
| 30 | `/api/student/blood-search` | GET | YES | Authenticated campus members | Scoped blood group query | **PASS** |
| 31 | `/api/student/profile` | GET, PUT | YES | Profile owner only | Blocks privileged role editing | **PASS** |
| 32 | `/api/student/safe-box` | GET,POST,DEL| YES | Evidence owner only | Magic-byte MIME validation | **PASS** |
| 33 | `/api/student/trusted-contacts`| GET,POST,DEL| YES| Student owner only | Max 5 contacts limit, phone regex | **PASS** |
| 34 | `/api/student/verify-id` | POST | YES | Student applicant only | 5MB max, magic bytes, no script | **PASS** |
| 35 | `/api/super-admin/pending-campus`| GET, POST| YES | SUPER_ADMIN only | Global accreditation review | **PASS** |
| 36 | `/api/system/health` | GET | YES | Authenticated callers | Redacts sensitive environment details| **PASS** |
