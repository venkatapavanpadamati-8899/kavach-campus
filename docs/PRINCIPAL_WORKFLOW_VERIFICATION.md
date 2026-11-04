# KAVACH CAMPUS — PRINCIPAL WORKFLOW VERIFICATION
**Date:** November 2026  
**Auditor:** Senior Security Engineer & Access Control Architect  
**Scope:** Principal / Director College-Wide Staff Governance, Cross-Department Authority, and Institutional Boundary Enforcement  

---

## 1. Executive Summary

The Principal / Director role represents the institutional executive authority. Unlike an HOD whose authority is strictly limited to a single department, a Principal possesses college-wide jurisdiction across all academic, administrative, and security departments within their assigned campus tenant, while remaining strictly isolated from other college tenants.

---

## 2. Tested Scenarios & Live Results

| Test Scenario | Action | Input Condition | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Intra-College Cross-Department Staff Approval** | Principal approves EEE Faculty member | Principal at SRKR (`college_id: 'srkr-bhimavaram'`), target staff in EEE department | HTTP 200, staff approved across departments | HTTP 200 `User approved successfully` | **PASS** |
| **Cross-College Multi-Tenant Block** | Principal attempts to approve staff from another college (Vishnu) | Principal at SRKR (`college_id: 'srkr-bhimavaram'`), target staff at Vishnu (`college_id: 'vishnu-bhimavaram'`) | HTTP 403 `Cannot manage users outside your assigned campus` | HTTP 403 `Cannot manage users outside your assigned campus` | **PASS** |
| **Super Admin Privilege Escalation Block** | Principal attempts to approve a user as `SUPER_ADMIN` | `requestedRole: 'SUPER_ADMIN'` | HTTP 400 Bad Request | HTTP 400 `Cannot assign SUPER_ADMIN role via standard approval` | **PASS** |
| **Management Dashboard Incident Oversight** | Principal views college incident queue | Verified Principal session | College-wide incidents visible | HTTP 200 / Incidents scoped to `srkr-bhimavaram` | **PASS** |

---

## 3. Enforcement Implementation

In `src/app/api/admin/users/approve/route.ts`:
```ts
// Multi-tenant check: Campus admins, Principals, HODs can only manage their own campus
if (callerRole !== 'SUPER_ADMIN') {
  if (callerCollegeId && targetCollegeId && callerCollegeId !== targetCollegeId) {
    return NextResponse.json(
      { error: 'Cannot manage users outside your assigned campus', code: 'CROSS_COLLEGE_FORBIDDEN' },
      { status: 403 }
    );
  }
}
```

---

## 4. Final Verdict

- **Principal Governance & Cross-College Isolation:** `PASS` (Live tested via HTTP against running server).
- **Principal Browser Interface Inspection:** `NOT VERIFIED` (Requires manual browser login to `/management`).

