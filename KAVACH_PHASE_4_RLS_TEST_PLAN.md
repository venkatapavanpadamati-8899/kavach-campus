# KAVACH CAMPUS — PHASE 4 RLS VALIDATION & TEST PLAN

**Project Location:** `D:\Kavach Campus`  
**Document Type:** Comprehensive Row Level Security (RLS) Test Matrix & Execution Plan  
**Date:** 2026-11-03  
**Status:** `CODE VERIFIED ONLY` (Live Staging Execution: `NOT VERIFIED` / `BLOCKED`)

---

## 1. Scope & Objective

This test plan defines the exact verification scenarios to validate multi-tenant isolation, role-based access control (RBAC), and Row Level Security (RLS) boundaries in an isolated Staging environment.

> [!CRITICAL]
> Unit tests and mock database tests pass 100% in Vitest (`src/__tests__/student-privacy-rls-boundaries.test.ts`, `src/__tests__/role-college-visibility-and-isolation.test.ts`, `src/__tests__/ultimate-negative-security.test.ts`).
> However, **Live RLS verification requires executing authenticated SQL and API queries against a real Supabase database**.

---

## 2. Multi-Role Access Boundary Matrix

| User Role | Permitted Incident Access | Permitted Profile Access | Safe Box / Evidence Access | Cross-College Access |
| :--- | :--- | :--- | :--- | :---: |
| **Student** | Own created incidents (`reported_by = auth.uid()`) only | Own profile (`id = auth.uid()`) only | Own uploaded evidence & private notes only | **DENIED** |
| **Staff (Mentor / Teacher)** | Incidents explicitly assigned to them or within their department scope | Profiles of assigned students only | Evidence attached to assigned incidents | **DENIED** |
| **Staff (HOD / Warden / Women's Cell)** | Incidents matching category/department within own college | Staff/student directory within own college | Evidence attached to department incidents | **DENIED** |
| **Campus Admin** | All incidents belonging to own `college_id` | All profiles belonging to own `college_id` | Evidence for own campus incidents | **DENIED** |
| **Principal** | Campus-wide safety incident dashboards for own campus | Staff and student roster within own campus | Campus incident evidence | **DENIED** |
| **College Management** | Read-only analytics & aggregate safety metrics for own campus | Staff and student directory for own campus | Incident summary reports | **DENIED** |
| **Admin (System)** | Scoped to configured operational college | Profiles within assigned administrative scope | Scoped to operational boundary | **DENIED** |
| **Super Admin** | Platform-wide incidents across all colleges | All profiles across all colleges | All evidence for audit/compliance | **PERMITTED** |

---

## 3. Detailed Staging Test Scenarios

### Scenario 1: Student Privacy & Horizontal Privilege Isolation
* **Actor:** Student A (`college_id = 'SRKR'`, `user_id = UUID_A`)
* **Target:** Student B's incident (`reported_by = UUID_B`)
* **Operation:** `SELECT * FROM incidents WHERE id = incident_b_id;`
* **Expected Result:** Query returns `0 rows`.
* **API Route Test:** `GET /api/incidents/incident_b_id` with Student A auth token returns `404 Not Found` or `403 Forbidden`.

### Scenario 2: Cross-College Student Isolation
* **Actor:** Student A (`college_id = 'SRKR'`)
* **Target:** Incident belonging to `college_id = 'AUCE'`
* **Operation:** `SELECT * FROM incidents WHERE college_id = 'AUCE';`
* **Expected Result:** Query returns `0 rows`.

### Scenario 3: Staff Multi-Tenant Boundary Enforcement
* **Actor:** Staff Member X (`college_id = 'SRKR'`, `role = 'WARDEN'`)
* **Target:** Incidents from `college_id = 'DNR'`
* **Operation:** `SELECT * FROM incidents WHERE college_id = 'DNR';`
* **Expected Result:** Query returns `0 rows`. Staff access is strictly locked to `college_id = 'SRKR'`.

### Scenario 4: Campus Admin Scope Restriction
* **Actor:** Campus Admin (`college_id = 'SRKR'`)
* **Target:** Staff approval request for an applicant at `college_id = 'VRSEC'`
* **Operation:** `POST /api/admin/users/approve` with target user belonging to `VRSEC`.
* **Expected Result:** API returns `403 Forbidden` (`Unauthorized: Cannot manage staff from a different institution`).

### Scenario 5: Unverified / Pending Staff Containment
* **Actor:** Staff applicant (`is_verified = false`, `role_status = 'PENDING_APPROVAL'`)
* **Target:** Active student complaint records.
* **Operation:** `SELECT * FROM incidents;`
* **Expected Result:** Query returns `0 rows`. Unverified staff cannot inspect sensitive student complaints until approved by Campus Admin.

### Scenario 6: Storage Bucket Confidentiality (`kavach-profile-photos`)
* **Actor:** Authenticated Student A (`auth.uid() = UUID_A`)
* **Target:** Profile photo of Student B stored at `UUID_B/avatar.jpg`
* **Operation:** Download file via Supabase Storage API.
* **Expected Result:** HTTP 400/403 (`Access Denied` by storage policy `"Users read own profile photos"`).

### Scenario 7: Safe Box Private Notes Owner-Only Access
* **Actor:** Staff member or Student B
* **Target:** `safe_box_private_notes` row owned by Student A
* **Operation:** `SELECT * FROM safe_box_private_notes WHERE owner_id = UUID_A;`
* **Expected Result:** Query returns `0 rows`. Access granted exclusively when `owner_id = auth.uid()`.

---

## 4. Staging Validation Procedure

1. Seed Staging database with test colleges: `SRKR`, `AUCE`, `DNR`.
2. Seed test profiles for each of the 8 roles across both colleges.
3. Execute the automated test harness using authenticated Supabase client sessions (`supabase.auth.signInWithPassword`).
4. Validate that zero queries violate multi-tenant boundaries.
