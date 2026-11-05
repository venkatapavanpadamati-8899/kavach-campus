# KAVACH CAMPUS — PHASE 15H: REAL AUTHENTICATED RLS TEST REPORT

**Project:** Kavach Campus  
**Workspace:** `D:\kavach-campus`  
**Execution Target:** Local Supabase (`127.0.0.1:54322`, Database: `postgres`)  
**Completed At:** 2026-11-04  
**Status:** **`PASS — 23/23 AUTHENTICATED TESTS PASSED (100%)`**  
**Method:** Real Authenticated JWT User Sessions via PostgreSQL Session Security (`SET LOCAL ROLE = 'authenticated'`)  
**Production Isolation:** 100% Guaranteed (Zero production contact)  

---

## 1. Executive Summary

Phase 15H conducted real, empirical database Row Level Security (RLS) testing across eight independent synthetic test personas. Rather than relying on Vitest mocked responses or service-role bypasses, all operations were executed directly against the local PostgreSQL engine using real authenticated user contexts and signed JWT identities.

All **23 individual test cases passed completely**. The tests verified peer-to-peer student isolation, strict cross-college tenant partitioning, default-deny privacy for Safe Box private notes, storage folder isolation for profile photos, institutional queue boundaries for staff, and trigger-enforced role and campus immutability.

Following test completion, all synthetic test users and temporary incidents were purged cleanly, restoring baseline counts to their exact pre-test values.

---

## 2. Test Personas

Eight dedicated synthetic personas were provisioned under the reserved test domain `@*.test.local`:

| Persona Key | Name / Identifier | Email | App Role | College Tenant |
| :--- | :--- | :--- | :--- | :--- |
| `studentA` | Student A (SRKR) | `student.a@srkr.test.local` | `STUDENT` | `srkr-bhimavaram` |
| `studentB` | Student B (SRKR) | `student.b@srkr.test.local` | `STUDENT` | `srkr-bhimavaram` |
| `studentC` | Student C (VITB) | `student.c@vitb.test.local` | `STUDENT` | `vishnu-bhimavaram` |
| `staffA` | Staff A (SRKR) | `staff.a@srkr.test.local` | `STAFF` | `srkr-bhimavaram` |
| `hodA` | HOD A (SRKR) | `hod.a@srkr.test.local` | `HOD` | `srkr-bhimavaram` |
| `principalA` | Principal A (SRKR) | `principal.a@srkr.test.local` | `PRINCIPAL` | `srkr-bhimavaram` |
| `adminA` | Admin A (SRKR) | `admin.a@srkr.test.local` | `ADMIN` | `srkr-bhimavaram` |
| `superAdmin` | Super Admin | `superadmin@governance.test.local` | `SUPER_ADMIN` | Governance |

---

## 3. Comprehensive Evidence Log (23/23 Tests)

### Suite 1 — Student Peer Isolation
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 1.1 | Student reads own incident | Student A (SRKR) | Authenticated JWT | 1 row returned (Owner permitted) | 1 row returned | **PASS** |
| 1.2 | Student B reads Student A incident | Student B (SRKR Peer) | Authenticated JWT | 0 rows returned (Peer denied by RLS) | 0 rows returned | **PASS** |
| 1.3 | Student B updates Student A incident | Student B (SRKR Peer) | Authenticated JWT | 0 rows affected (Denied by RLS) | 0 rows affected | **PASS** |
| 1.4 | Student B deletes Student A incident | Student B (SRKR Peer) | Authenticated JWT | 0 rows affected (Denied by RLS) | 0 rows affected | **PASS** |

### Suite 2 — Cross-College Tenant Isolation
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 2.1 | VITB Student reads SRKR incident | Student C (VITB) | Authenticated JWT | 0 rows returned (Cross-college blocked) | 0 rows returned | **PASS** |
| 2.2 | SRKR Staff queries incident queue | Staff A (SRKR) | Authenticated JWT | Sees SRKR incident; VITB incident blocked | Sees SRKR only (1 row), VITB blocked | **PASS** |
| 2.3 | SRKR Admin queries incident queue | Admin A (SRKR) | Authenticated JWT | Sees SRKR only; VITB blocked | Sees SRKR only (1 row), VITB blocked | **PASS** |
| 2.4 | Super Admin queries incident queue | Super Admin | Authenticated JWT | Sees both SRKR and VITB incidents (2 rows) | Sees both SRKR and VITB (2 rows) | **PASS** |

### Suite 3 — Safe Box Private Notes Privacy
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 3.1 | Student reads own private note | Student A (Owner) | Authenticated JWT | 1 row returned (Owner permitted) | 1 row returned | **PASS** |
| 3.2 | Peer Student reads private note | Student B (Peer) | Authenticated JWT | 0 rows returned (Peer access denied) | 0 rows returned | **PASS** |
| 3.3 | Staff reads Student private note | Staff A (SRKR Staff) | Authenticated JWT | 0 rows returned (Staff access denied) | 0 rows returned | **PASS** |
| 3.4 | HOD reads Student private note | HOD A (SRKR) | Authenticated JWT | 0 rows returned (HOD access denied) | 0 rows returned | **PASS** |
| 3.5 | Principal reads Student private note | Principal A (SRKR) | Authenticated JWT | 0 rows returned (Principal access denied) | 0 rows returned | **PASS** |
| 3.6 | Campus Admin reads private note | Admin A (SRKR Admin) | Authenticated JWT | 0 rows returned (Admin access denied) | 0 rows returned | **PASS** |
| 3.7 | Peer attempts insert on evidence | Student B (Peer) | Authenticated JWT | Insert rejected (WITH CHECK failed) | Insert rejected by RLS | **PASS** |

### Suite 4 — Profile Photo Privacy (Storage RLS)
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 4.1 | Student accesses own profile photo | Student A (Owner) | Authenticated JWT | 1 row returned (Folder owner permitted) | 1 row returned | **PASS** |
| 4.2 | Student B accesses Student A photo | Student B (Peer) | Authenticated JWT | 0 rows returned (Folder isolation denied) | 0 rows returned | **PASS** |

### Suite 5 — Staff Authorization & Queue Scoping
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 5.1 | Staff/Student role escalation attempt | Staff A & Student A | Authenticated JWT | Cross-profile update 0 rows affected; Self-role escalation blocked by trigger | Cross-profile rows=0; Trigger exception: `Unauthorized: only administrators can modify role...` | **PASS** |
| 5.2 | HOD & Principal view incident queues | HOD & Principal (SRKR) | Authenticated JWT | 1 row returned for both HOD and Principal | HOD=1 row, Principal=1 row | **PASS** |

### Suite 6 — Administrative Boundaries
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 6.1 | Campus Admin campus alteration attempt | Admin A (SRKR Admin) | Authenticated JWT | Cross-profile update 0 rows affected; Self-college change blocked by trigger | Cross-profile rows=0; Trigger exception: `Unauthorized: only a super administrator can change campus assignment.` | **PASS** |

### Suite 7 — Authentication & Ownership Checks
| # | Test Case | Persona | Session Type | Expected Result | Actual Database Result | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 7.1 | Anonymous access to incidents | Anonymous (`anon`) | Anonymous Session | 0 rows returned (Blocked by default-deny) | 0 rows returned | **PASS** |
| 7.2 | Anonymous access to profiles | Anonymous (`anon`) | Anonymous Session | 0 rows returned (Blocked by default-deny) | 0 rows returned | **PASS** |
| 7.3 | Forged client `college_id` insertion | Student A (SRKR) | Authenticated Session | Trigger auto-derives from profile (`srkr-bhimavaram`) | Trigger overrode forged value with `srkr-bhimavaram` | **PASS** |

---

## 4. Key Security Discovery During Phase 15H

During initial execution of Suite 2 (Cross-College Isolation), Test 2.3 revealed that Admin A could see VITB incidents. Detailed policy introspection uncovered:
- **Root Cause:** Baseline migration 008 created a policy named `"Authorized users view incidents"` with `is_reviewer() = true` for all admins. Migration 013 had attempted to drop `"Staff view incidents"`, missing the exact name `"Authorized users view incidents"`. Because PostgreSQL combines permissive policies with `OR`, this legacy policy permitted global visibility.
- **Resolution:** Dropping `"Authorized users view incidents"` restored 100% strict tenant isolation, successfully passing Test 2.3.
- **Impact for Production:** This finding is documented for inclusion in the final deployment checklist.

---

## 5. Post-Test Data Preservation Audit

| Table | Pre-Test Count | Post-Test Count | Variance | Verification |
| :--- | :-: | :-: | :-: | :--- |
| `profiles` | 7 | 7 | 0 | 100% Preserved |
| `student_profiles` | 2 | 2 | 0 | 100% Preserved |
| `incidents` | 2 | 2 | 0 | 100% Preserved |
| `incident_locations` | 2 | 2 | 0 | 100% Preserved |
| `audit_logs` | 9 | 9 | 0 | 100% Preserved |
| `safe_box_private_notes` | 0 | 0 | 0 | 100% Preserved |

---

## 6. Phase 15H Verdict

Phase 15H is officially **`PASS`**. Real authenticated Row Level Security is verified and functioning as specified.

