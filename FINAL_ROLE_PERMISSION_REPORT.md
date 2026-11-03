# KAVACH CAMPUS — FINAL ROLE-BASED ACCESS CONTROL & PERMISSION REPORT

**Project Location:** `D:\Kavach Campus`  
**Date:** 2026-11-03  
**Auditor:** Application Security Engineer & RBAC Specialist  

---

## 1. Role Definition & Institutional Scope Matrix

Kavach Campus enforces a strict, hierarchical 5-tier role model with tenant data isolation:

| Role Identifier | Role Category | Institutional Identity Display | Access Scope |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Platform Super Admin | **Neutral** ("Platform Administration") | Platform-wide monitoring, campus accreditation queue |
| **`ADMIN`** | Institutional Administrator| **Neutral** ("Central Control") | System audit logs, campus boundaries, global user approvals |
| **`COLLEGE_MANAGEMENT`** | Executive Management | **College-Specific** (e.g. *SRKR Engineering College*) | College-wide incidents, staff duty assignments, college analytics |
| **`STAFF`** | Responder / Faculty | **College-Specific** (e.g. *Vishnu Institute of Tech*) | Assigned student complaints, emergency dispatches |
| **`STUDENT`** | Student End-User | **College-Specific** (Verified College Name) | Own complaints, Safe Box evidence vault, Safe Walk, SOS |

---

## 2. Server-Side Enforcement & Row-Level Security (RLS)

1. **Never Trust Client Claims:** Role and `college_id` parameters passed in client payloads are strictly ignored. The server authenticates the caller's JWT token, queries the authoritative `profiles` table, and extracts the verified role.
2. **Cross-Tenant Prevention:**
   * Incidents query:
     ```sql
     WHERE college_id = (SELECT college_id FROM profiles WHERE id = auth.uid())
     ```
   * An administrator or staff member from College A cannot view, assign, or modify incidents from College B.
3. **Student Privacy Boundaries:**
   * A student can only select rows where `student_id = auth.uid()`.
   * Safe Box evidence cannot be queried or downloaded by any other student, faculty, or external actor without an authorized court-ordered or explicit administrative escalation.

---

## 3. Automated Test Verification

| Test Scenario | Test Suite | Result |
| :--- | :--- | :---: |
| Admin / Super Admin neutral branding display | `role-college-visibility-and-isolation.test.ts` | **PASS** |
| Student / Staff verified college branding display | `role-college-visibility-and-isolation.test.ts` | **PASS** |
| Cross-college incident retrieval blocked at API layer | `role-college-api-isolation.test.ts` | **PASS** |
| Cross-college evidence download blocked | `role-college-api-isolation.test.ts` | **PASS** |
| Management dashboard college-specific incident filtering | `management-incidents-page-authorization.test.ts` | **PASS** |
| Staff dashboard assignment authorization | `staff-incidents-page-authorization.test.ts` | **PASS** |
| Student privacy RLS boundaries | `student-privacy-rls-boundaries.test.ts` | **PASS** |

