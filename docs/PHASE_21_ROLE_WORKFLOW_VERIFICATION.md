# Phase 21: User Role Workflow Verification

**Phase:** 21D — User Role Workflows  
**Timestamp:** 2026-11-05T11:08:00+05:30  
**Test Suite Coverage:** `tests/e2e/pages.spec.ts` (56/56 passing), `tests/e2e/protected-routes-auth-redirect.spec.ts` (28/28 passing), `scripts/run_phase15k_authenticated_tests.ts` (32/32 passing)  
**Status:** PASS (Automated E2E & RLS Verified)

---

## 1. Executive Summary

Kavach Campus implements a strict role-based access control (RBAC) hierarchy coupled with row-level security (RLS) policies at the PostgreSQL database layer. All 6 core organizational roles have been verified for UI access, route authorization, redirect rules, and database-level multi-tenant boundaries.

---

## 2. Role-by-Role Workflow Matrix

| Role | Primary Portal | Key Capabilities | RLS Policy Scope | Redirect / Aliases | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | `/student` | Anonymous & identified incident reporting, live incident tracking, safety score, emergency dialer | Can only view own incidents (`student_id = auth.uid()`) or public safety advisories | `/dashboard` auto-routes to `/student` | ✅ PASS |
| **Staff / Faculty** | `/staff` | Incident triage, status updates, resolution notes, department escalation, classroom alert reception | Can view incidents assigned to their college & department | `/dashboard` auto-routes to `/staff` | ✅ PASS |
| **Department Head (HOD)** | `/management` | Departmental analytics, staff assignment, resolution approval, grievance sign-off | College & department-scoped incident read/update permissions | `/hod` -> 307 temporary redirect to `/management` | ✅ PASS |
| **Principal** | `/management` | Campus-wide safety metrics, multi-department analytics, compliance audits, institutional escalation | Full read & audit access across the entire specific college tenant | `/principal` -> 307 temporary redirect to `/management` | ✅ PASS |
| **Campus Admin** | `/admin` | User provisioning, role assignment, college branding, audit log review, emergency broadcasts | Full read/write for all users, incidents, and logs within own college tenant | Direct access guarded by `role in ('admin', 'super_admin')` | ✅ PASS |
| **Super Admin** | `/super-admin` | Multi-college provisioning, global audit log inspection, cross-tenant system administration | Unrestricted global access (`super_admin` bypass check) | Direct access guarded strictly by `role = 'super_admin'` | ✅ PASS |

---

## 3. Detailed Workflow Verification

### 3.1. Student Workflow
- **Filing Incidents**: Tested both identified and anonymous reporting channels (`/report`). Anonymous filings strip author identity (`student_id = NULL`, `is_anonymous = true`).
- **Tracking**: Status tracking page (`/track/[id]`) verifies access tokens and status progression (`submitted` -> `investigating` -> `resolved`).
- **Emergency Tools**: Verified instant SOS trigger and emergency contacts dialer (`/emergency`).
- **Security Check**: Students attempting to load `/admin` or `/management` are redirected to `/student` or `/unauthorized`.

### 3.2. Staff / Faculty Workflow
- **Triage Queue**: Displays incoming reports flagged for staff triage.
- **Evidence Inspection**: Private storage access requires signed URLs generated via server role key; raw URLs reject unauthenticated access.
- **Status Updates**: Transitions status with mandatory audit log recording.

### 3.3. HOD & Principal (Management Portal)
- **Unified Portal Route**: `/management` serves both HODs and Principals with contextual permission granularity.
- **Direct Redirects**:
  - `GET /hod` responds with HTTP 307 redirect to `/management`.
  - `GET /principal` responds with HTTP 307 redirect to `/management`.
- **Analytics & Exports**: Verified report generation and department resolution oversight.

### 3.4. Campus Admin Workflow
- **User Management**: Admin can assign roles within their college tenant. Cannot elevate users to `super_admin` or reassign users to foreign colleges.
- **Audit Logs**: Read-only timeline of all system actions, filtered by college ID.

### 3.5. Super Admin Workflow
- **Multi-Tenant Control**: Access to college onboarding, system health monitoring, and global telemetry.
- **Cross-College Protection**: RLS verification ensures regular admins cannot see records of other institutions; Super Admin can view all institutions.

---

## 4. Empirical Test Verification

1. **Route Redirection Tests (`protected-routes-auth-redirect.spec.ts`)**:
   - 28/28 assertions verified. Unauthenticated visits to `/student`, `/staff`, `/management`, `/admin`, `/super-admin` redirect to `/auth/login`.
2. **Page Component Rendering (`pages.spec.ts`)**:
   - 56/56 role page rendering specs passed without runtime or hydration errors.
3. **Database RLS Boundary Tests (`scripts/run_phase15k_authenticated_tests.ts`)**:
   - 32/32 real authenticated persona queries passed. Cross-college leakage = 0.

