# KAVACH CAMPUS — HOD WORKFLOW VERIFICATION
**Date:** November 2026  
**Auditor:** Senior Security Engineer & Access Control Architect  
**Scope:** Head of Department (HOD) Role Scoping, Departmental Boundaries, Cross-Department Rejection, and Faculty Approval  

---

## 1. Executive Summary

The Head of Department (HOD) workflow enforces strict academic boundaries. An HOD belongs to an academic department within an institution and is granted authority to approve and manage only faculty and staff belonging to their exact department.

---

## 2. Tested Scenarios & Live Results

| Test Scenario | Action | Input Condition | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Intra-Department Faculty Approval** | CSE HOD approves CSE Assistant Professor | `targetUserId` in CSE, `action: 'APPROVE'` | HTTP 200, `profiles.is_approved = true` | HTTP 200 `User approved successfully` | **PASS** |
| **Cross-Department Approval Block** | Mechanical HOD attempts to approve CSE Assistant Professor | `targetUserId` in CSE, caller in MECH | HTTP 403 `CROSS_DEPARTMENT_APPROVAL_FORBIDDEN` | HTTP 403 `Cannot approve staff from a different department` | **PASS** |
| **Management Escalation Prevention** | HOD attempts to self-promote to `PRINCIPAL` or `ADMIN` | `requestedRole: 'PRINCIPAL'` | HTTP 403 / Forbidden | HTTP 403 `ROLE_APPROVAL_UNAUTHORIZED` | **PASS** |
| **Cross-College Approval Block** | SRKR HOD attempts to approve Vishnu faculty | Caller in SRKR, target in Vishnu | HTTP 403 `CROSS_COLLEGE_FORBIDDEN` | HTTP 403 `Cannot manage users outside your assigned campus` | **PASS** |

---

## 3. Enforcement Implementation

In `src/app/api/admin/users/approve/route.ts`:
```ts
if (callerRole === 'HOD') {
  if (!callerDepartment || !targetDepartment || callerDepartment.toLowerCase().trim() !== targetDepartment.toLowerCase().trim()) {
    return NextResponse.json(
      { error: 'Cannot approve staff from a different department', code: 'CROSS_DEPARTMENT_APPROVAL_FORBIDDEN' },
      { status: 403 }
    );
  }
}
```

---

## 4. Final Verdict

- **Departmental Scoping & Security Enforcement:** `PASS` (Live tested via HTTP against running server).
- **HOD Web Interface Click-Through:** `NOT VERIFIED` (Requires manual browser login to `/management`).

