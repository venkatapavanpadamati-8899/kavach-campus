# KAVACH CAMPUS — PHASE 2 RLS SECURITY AUDIT

**Project:** Kavach Campus  
**Security Boundary:** Multi-Institution Multi-Tenant Row Level Security  
**Audit Scope:** Database RLS policies, Storage policies, Cross-College Isolation  
**Audit Date:** 2026-11-03  

---

## 1. Table-by-Table RLS Policy Verification

| Table Name | RLS Status | Verified Policy Rules | Code Verification Status | Live DB Verification Status |
| :--- | :---: | :--- | :---: | :---: |
| `profiles` | **ENABLED** | Users read/edit own profile; Admin reads own college; Super Admin reads all | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `student_profiles` | **ENABLED** | Student reads own; Warden/Security/Principal reads within college; Others denied | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `student_residences` | **ENABLED** | Student reads own; Authorized residential staff read within college; Others denied | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `incidents` | **ENABLED** | Student reads own; Staff reads assigned/department; Management reads college | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `incident_locations` | **ENABLED** | Active responders and assigned staff read coordinates within college | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `incident_messages` | **ENABLED** | Participants of active incident within authorized college only | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `evidence` | **ENABLED** | Uploader reads own; Case investigator reads if incident is in caller's college | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `safe_box_private_notes`| **ENABLED** | Strictly restricted to `owner_id = auth.uid()`. Even admin cannot view | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `safe_walk_sessions` | **ENABLED** | Walker reads own; Emergency contacts read active walk; Campus security reads college | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `safe_walk_locations`| **ENABLED** | Scoped to active session walker & authorized college safety dispatch | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `emergency_contacts` | **ENABLED** | Student manages own 5 trusted contacts; Emergency responders read on active SOS | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `audit_logs` | **ENABLED** | Append-only via service role; Super Admin reads platform; Admin reads college | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `storage.objects` (`id-cards`) | **ENABLED** | Private bucket; Student uploads to own path `auth.uid()/*`; Admin reads college | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |
| `storage.objects` (`evidence-media`) | **ENABLED**| Private bucket; Incident participants & assigned investigators only | **PASS** | **NOT VERIFIED — LIVE DB ACCESS REQUIRED** |

---

## 2. Seven Mandatory Security Scenarios

1. **Student A cannot access Student B's private records:**  
   Verified via `src/__tests__/student-privacy-rls-boundaries.test.ts`. Returns empty set / 403.
2. **Staff cannot access unassigned incidents:**  
   Verified via `src/__tests__/staff-incidents-page-authorization.test.ts`. Unauthorized access returns 403.
3. **Staff from College A cannot access College B records:**  
   Verified via `src/__tests__/role-college-api-isolation.test.ts` and `tenant-migration-hardening.test.ts`.
4. **Campus Admin cannot access unauthorized colleges:**  
   Verified via `src/__tests__/role-college-api-isolation.test.ts`. College ID scoping rejects cross-college queries.
5. **Management cannot access records outside its authorized scope:**  
   Verified via `src/__tests__/management-incidents-page-authorization.test.ts`.
6. **Admin cannot bypass server-side authorization:**  
   Verified via `src/__tests__/admin-superadmin-security-audit.test.ts`.
7. **Super Admin access is explicitly permission-controlled:**  
   Verified via `src/__tests__/admin-superadmin-security-audit.test.ts`. Access audited in `audit_logs`.
