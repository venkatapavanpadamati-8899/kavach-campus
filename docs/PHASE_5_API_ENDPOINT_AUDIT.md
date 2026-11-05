# Kavach Campus — Phase 5 Complete API Endpoint Audit (37 Endpoints)

**Document:** `docs/PHASE_5_API_ENDPOINT_AUDIT.md`  
**Date:** November 4, 2026  
**Auditor:** Senior Full-Stack & Security Systems Engineer (Antigravity Agent)  
**Workspace:** `D:\kavach-campus`  
**Branch / Commit:** `main` / `ce59e5c1fdbe40eb08b72dfa6050b198366ff03b`  

---

## 1. Executive Summary

A comprehensive architectural and security audit of all **37 API endpoints** implemented in the Kavach Campus backend (`src/app/api/`) was conducted. Each endpoint was evaluated against:
1. Authentication & Session Verification
2. Role-Based Access Control (RBAC) & Principle of Least Privilege
3. Attribute-Based Access Control (ABAC) & Tenant Boundaries
4. Input Sanitation, Body Validation & Type Checking
5. Database Constraints, RLS Alignment & Error Handling
6. Rate Limiting, Cooldowns & Denial-of-Service Protection

---

## 2. API Endpoint Inventory & Security Classification

### 2.1 Authentication & Credentials Endpoints (11 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Rate Limit / Cooldown | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/login` | `POST` | Public | All | 5 attempts/IP | Authenticates via email/password or mobile/demo OTP. Privileged roles strictly blocked from demo OTP. |
| `/api/auth/mobile-login` | `POST` | Public | Student, Staff | 3 req/5min, 30s cooldown | Dispatches simulated CSPRNG demo SMS; verifies OTP; issues secure magiclink session. |
| `/api/auth/register` | `POST` | Public | Student, Staff | IP Rate Limit | Public self-registration. Public self-assignment of `ADMIN`, `SUPER_ADMIN`, `HOD`, `PRINCIPAL` returns **403 Forbidden**. |
| `/api/auth/verify-otp` | `POST` | Public | Student, Staff | 5 attempts max | Atomically claims OTP in `user_otp_verifications`; provisions `profiles` & `student_profiles`. |
| `/api/auth/resend-otp` | `POST` | Public | All | 30s cooldown | Resends pending OTP; enforces strict cooldowns against enumeration. |
| `/api/auth/logout` | `POST` | Authenticated | Any active session | None | Revokes Supabase SSR session token; invalidates auth cookies. |
| `/api/auth/forgot-password` | `POST` | Public | All | 5 attempts/15min | Generates hashed password recovery token; anti-enumeration timing safety. |
| `/api/auth/reset-password` | `POST` | Public (Token-bound) | All | Single-use token | Verifies recovery token hash; updates password; revokes all previous sessions. |
| `/api/auth/callback` | `GET` | Public (PKCE) | All | None | Exchanges OAuth PKCE code for authenticated session tokens. |
| `/api/auth/google` | `GET` | Public | All | None | Generates Google OAuth authorization URL with institutional domain hint. |
| `/api/auth/demo-sms` | `GET` | Session Token | Student, Staff | 5-minute TTL | Simulates virtual SMS inbox for demo mode; protected via clientToken session binding. |

---

### 2.2 Incident Management Endpoints (6 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/incidents` | `GET`, `POST` | Authenticated | Student (own), Staff/Admin (college) | `POST`: Creates incident, validates GPS, runs AI analysis, duplicate prevention (15s).<br>`GET`: Students view own; staff view college incidents; anonymous student IDs masked. |
| `/api/incidents/[id]` | `GET`, `PATCH` | Authenticated | Student (owner), Assigned Staff, Security, Admin | `GET`: Role-scoped incident view; precise GPS telemetry restricted to authorized responders.<br>`PATCH`: Updates status, assigns responder, verifies college boundaries. |
| `/api/incidents/[id]/escalate` | `POST` | Authenticated | Staff, Security, HOD, Principal, Admin | Escalates severity tier; records timeline entry in `case_actions` and `escalations`; cross-college blocked (403). |
| `/api/incidents/[id]/evidence` | `GET`, `POST` | Authenticated | Student (owner), Assigned Staff, Security, Admin | `POST`: Uploads evidence, validates file magic bytes, max 25MB.<br>`GET`: Generates 15-minute temporary signed URLs; direct object access denied. |
| `/api/incidents/[id]/nearby-staff` | `GET` | Authenticated | Security, Admin, Assigned Staff | Haversine distance calculation to dispatch nearest active on-duty staff within same campus tenant. |
| `/api/incidents/[id]/notes` | `GET`, `POST` | Authenticated | Student (owner), Authorized Staff/Admin | `GET`: Case timeline notes.<br>`POST`: Appends official notes to `case_actions`; verifies caller role and college tenant. *(Fixed in Phase 5)* |

---

### 2.3 SOS Emergency Telemetry Endpoints (2 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/sos` | `POST` | Authenticated | Student | Generates immediate high-priority emergency incident; validates coordinates; dispatches push & in-app alerts. |
| `/api/sos/location` | `POST` | Authenticated | Student | Streams live GPS telemetry updates into `incident_locations` with sub-meter accuracy tracking. |

---

### 2.4 Safe Walk Telemetry & Escort Endpoints (3 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/safe-walk/start` | `POST` | Authenticated | Student | Initiates timed walk session (5-180 mins); enforces single concurrent active walk constraint. |
| `/api/safe-walk/location` | `POST` | Authenticated | Student (owner) | Records periodic breadcrumbs; updates `last_known_lat/lng`; checks destination proximity geofence. |
| `/api/safe-walk/end` | `POST` | Authenticated | Student (owner) | Atomically marks walk `COMPLETED` with server-side timestamp; verifies ownership. |

---

### 2.5 Student Profile & Vault Endpoints (5 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/student/profile` | `GET`, `PUT` | Authenticated | Student (self only) | `GET`: Retrieves profile, accommodation, photo URL.<br>`PUT`: Updates profile fields strictly for `auth.uid() = id`. |
| `/api/student/safe-box` | `GET`, `POST` | Authenticated | Student (self only) | Encrypted personal vault; generates 15-min signed URLs; resilient fallback for pending migration 016. |
| `/api/student/trusted-contacts` | `GET`, `POST`, `DELETE` | Authenticated | Student (self only) | Manages emergency contact phone numbers; sanitized formatting; bounded by user ID. |
| `/api/student/verify-id` | `GET`, `POST` | Authenticated | Student (self only) | Uploads student physical ID card; OCR verification check; scoped storage path traversal protection. |
| `/api/student/blood-search` | `GET` | Authenticated | Student, Staff | Searches emergency blood donors; validates blood group; masks donor names to protect privacy. |

---

### 2.6 Institutional Administration Endpoints (4 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/admin/users` | `GET` | Authenticated | HOD, Principal, Admin, Super Admin | Directory query; HOD strictly sees own dept; Principal/Admin strictly sees own college. |
| `/api/admin/users/approve` | `POST` | Authenticated | HOD, Principal, Admin, Super Admin | Approves/rejects staff; enforces departmental match for HOD; blocks self-approval & Super Admin elevation. |
| `/api/admin/analytics` | `GET` | Authenticated | Admin, Super Admin | Aggregates daily/monthly incident trends, hotspot locations, and category distributions. |
| `/api/admin/verifications` | `GET`, `POST` | Authenticated | Admin, Super Admin | Reviews pending student ID card submissions; approves or requests resubmission. |

---

### 2.7 Super Admin & Governance Endpoints (1 Route)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/super-admin/pending-campus` | `GET`, `POST` | Authenticated | Super Admin only | Multi-campus registration and onboarding; validates college registration against master catalog. |

---

### 2.8 Automation & Background Cron Endpoints (2 Routes)

| Endpoint Path | Methods | Auth Required | Secret Validation | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/cron/safe-walk-timeout` | `POST` | Bearer Token | `timingSafeEqual(CRON_SECRET)` | Finds expired active walks; automatically transitions to `OVERDUE`; escalates to SOS incident with fault-recovery. |
| `/api/cron/escalate` | `POST` | Bearer Token | `timingSafeEqual(CRON_SECRET)` | Checks unacknowledged high-severity incidents; escalates tier; dispatches emergency alerts. |

---

### 2.9 System & Utility Endpoints (3 Routes)

| Endpoint Path | Methods | Auth Required | Allowed Roles | Primary Function & Security Enforcement |
| :--- | :---: | :---: | :---: | :--- |
| `/api/system/health` | `GET` | Authenticated | Admin, Super Admin | Deep health check (DB connectivity, RLS recursion check, AI status); protected against reconnaissance. |
| `/api/colleges/search` | `GET` | Public | All | Searches registered campuses by name or domain; returns branding and institutional metadata. |
| `/api/notifications/test-push` | `POST` | Authenticated | Admin, Super Admin | Diagnostic endpoint for testing FCM push tokens; requires administrative privileges. |

---

## 3. Security Vulnerability & Audit Findings

1. **Zero SQL Injection Risk**: All database operations use Supabase PostgREST query builders with parameterized inputs. Zero raw string concatenation in SQL queries.
2. **Zero IDOR Vulnerabilities**: All student-facing endpoints derive ownership from server-verified sessions (`user.id = auth.uid()`), preventing unauthorized record manipulation.
3. **Cross-College Isolation**: Verified across all 37 endpoints. A user from one college attempting to access another college's data receives `HTTP 403 Forbidden`.
4. **Resilient Safe Box Fallback**: Gracefully handles the absence of remote table `safe_box_private_notes` until migration 016 is applied.

