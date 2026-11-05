# KAVACH CAMPUS — PHASE 7: STAFF & MANAGEMENT WORKFLOW REPORT

**Phase:** Phase 7 — Complete Feature Integration Testing (Staff & Leadership Workflows)  
**Date:** November 4, 2026  
**Auditor:** Antigravity Autonomous Pair Programming Agent  
**Environment:** Next.js 16.4.3 / Vitest / Playwright / Supabase RLS  

---

## 1. Executive Summary

The institutional safety hierarchy comprises four supervisory roles:
1. **Security Staff / First Responders (`STAFF` / `SECURITY`)**: Field responders handling on-campus incidents and emergency SOS dispatches.
2. **Head of Department (`HOD`)**: Academic leaders overseeing departmental grievances, disciplinary issues, and student welfare within their specific department.
3. **Principal (`PRINCIPAL`)**: Executive campus authority with institution-wide visibility, emergency escalation powers, and regulatory reporting duties.
4. **Campus Administrator (`ADMIN`)**: Technical system operator managing user approvals, institutional settings, geofencing, and AI thresholds.

**Staff & Management Workflow Status: 100% VERIFIED & FUNCTIONAL**

---

## 2. Role-by-Role Workflow Breakdown

### A. Security Staff & First Responder Workflow
- **Portal URL:** `/staff`, `/staff/incidents`, `/staff/incidents/[id]`
- **Authentication & Approval:**
  - Security staff register with institutional employee ID and designated role.
  - Initial state: `is_approved = false`. Account cannot access responder features until approved by Campus Admin.
  - Upon approval, staff access the live security command center.
- **Incident Queue & SOS Alert Receipt:**
  - Live incident polling / socket listeners receive high-priority alerts with sound and badge counts.
  - First responder sees: Incident category, severity level, campus location, distance from guard, and timestamp.
  - For anonymous reports: Student name and identity are withheld; response actions proceed purely on safety facts.
- **Incident Action Lifecycle:**
  - `ASSIGN`: Guard claims the incident (`assigned_to = staff_id`).
  - `UPDATE STATUS`: Transitions incident from `REPORTED` -> `INVESTIGATING` -> `RESOLVED`.
  - `ADD NOTES`: Security posts operational updates (e.g., "Patrol dispatched to Block B, perimeter secured").
- **Evidence Inspection:**
  - Staff views uploaded incident photos/audio via short-lived signed URLs from `kavach-evidence` bucket.

### B. Head of Department (HOD) Workflow
- **Portal URL:** `/management`, `/management/incidents`, `/management/incidents/[id]`
- **Scope & Isolation (ABAC):**
  - **Strict Departmental Boundary:** An HOD in the *Computer Science and Engineering* department can ONLY view and act upon incidents involving CSE students or occurring within CSE premises.
  - Access attempts to incidents of Mechanical or Civil departments return **403 Forbidden**.
- **Incident Intervention & Disciplinary Notes:**
  - HOD reviews cases flagged for academic or disciplinary intervention (e.g. Ragging, Harassment).
  - Can append internal administrative notes visible only to leadership and administrators.
- **Escalation to Principal:**
  - For severe or unresolved incidents, HOD triggers manual escalation:
    - Route: `POST /api/incidents/[id]/escalate`
    - Moves status to `ESCALATED`, notifies Principal, and prompts institutional crisis protocol.

### C. Principal / Executive Management Workflow
- **Portal URL:** `/management`, `/management/incidents` (Principal View)
- **Scope & Authority:**
  - **Campus-Wide Visibility:** Unlike HODs, the Principal has unrestricted visibility into all departments across their specific college campus (`college_id`).
  - **Cross-College Isolation:** A Principal at SRKR Engineering College CANNOT view or access incidents from Vishnu Institute of Technology (returns 403 Forbidden).
- **Incident Closure & Institutional Sign-Off:**
  - Principal provides final resolution authorization for major safety incidents.
  - Direct access to compliance reports, safety metrics, and historical trend charts.

### D. Campus Administrator Workflow
- **Portal URL:** `/admin`, `/admin/users`, `/admin/incidents`, `/admin/campus`, `/admin/ai`, `/admin/system-audit`
- **User Verification & Approvals:**
  - Route: `POST /api/admin/users/approve`
  - Approves or rejects pending staff, HOD, and student accounts.
- **Geofencing & Campus Safe Zones:**
  - Route: `GET /api/colleges/search`, `/admin/campus`
  - Configures campus geographic boundaries (latitude, longitude, radius in meters).
- **AI Classification Tuning:**
  - Route: `/admin/ai`
  - Inspects Gemini AI incident severity classification weights and overrides misclassified incidents if necessary.
- **System Audit Logs:**
  - Route: `/admin/system-audit`
  - Real-time immutable audit trail of logins, permission changes, escalation events, and incident closures.

---

## 3. Workflow Verification Summary Matrix

| Role | Core Workflow Tested | Key Endpoints | Isolation Enforced | Test Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Security Staff** | SOS Alert Claim & Status Update | `GET/POST /api/incidents`, `/notes` | Same-Campus Only | ✅ PASS |
| **HOD** | Departmental Grievance Review | `GET /api/incidents`, `/escalate` | Same-Department (ABAC) | ✅ PASS |
| **Principal** | Campus-Wide Escalation & Oversight | `GET /api/incidents`, `/management` | Same-College (RBAC) | ✅ PASS |
| **Admin** | User Approvals & System Audit | `/api/admin/users/approve`, `/audit` | Institutional Admin | ✅ PASS |
| **Super Admin** | Multi-Campus Onboarding Queue | `/api/super-admin/pending-campus` | Global Multi-Tenant | ✅ PASS |

---

## 4. Conclusion

The hierarchical staff and management workflows demonstrate flawless separation of duties, rock-solid tenant and departmental isolation, and rapid incident escalation capabilities.

