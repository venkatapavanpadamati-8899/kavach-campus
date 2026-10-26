# KAVACH CAMPUS — COMPLAINT ROUTING & ESCALATION TEST MATRIX

**Document Version:** 1.0.0  
**Implementation Modules:** `src/lib/routing/assignment.ts`, `src/app/api/incidents/route.ts`, `src/app/api/cron/escalate/route.ts`  
**Evaluation Scope:** 14 Synthetic Routing Scenarios across Departmental, Role, and Urgency Tiers.

---

## 1. SEVERITY-TO-ROLE ROUTING POLICY MATRIX

| Urgency / Severity | Target Eligible Roles | Escalation SLA | Default Routing Mechanism |
| :---: | :--- | :---: | :--- |
| **L1 / LOW** | `MENTOR`, `COUNSELLOR`, `STAFF` | 48 Hours | Nearest on-duty mentor or Departmental Coordinator |
| **L2 / MODERATE** | `MENTOR`, `COUNSELLOR`, `WOMENS_CELL`, `HOD` | 24 Hours | Nearest on-duty counsellor or Women's Cell member |
| **L3 / HIGH** | `SECURITY`, `WOMENS_CELL`, `HOD`, `ADMIN` | 6 Hours | Immediate nearest active responder with push notification |
| **L4 / CRITICAL** | `SECURITY`, `ADMIN`, `SUPER_ADMIN` | Immediate | Broadcast to all active security staff & on-duty administrators |

---

## 2. 14-CASE COMPREHENSIVE ROUTING TEST MATRIX

| Case # | Incident Scenario | Category | Severity | Expected Recipient Role | Assigned Mechanism | SLA / Escalation Action | Audit Log Action | Verification Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **01** | Low-severity library noise / study hall dispute | `GENERAL` | **L1** | `MENTOR` / `STAFF` | Departmental Coordinator | 48h SLA -> Auto-notify HOD if overdue | `INCIDENT_CREATED` | **PASS** |
| **02** | Moderate bullying complaint in hostel corridor | `BULLYING` | **L2** | `COUNSELLOR` / `MENTOR` | Nearest Hostel Warden / Counsellor | 24h SLA -> Escalate to Chief Warden | `INCIDENT_ASSIGNED` | **PASS** |
| **03** | Harassment report requiring designated female officer | `HARASSMENT` | **L3** | `WOMENS_CELL` | Filter `role === 'WOMENS_CELL'` | 6h SLA -> Priority alert to Committee Head | `CASE_CONFIDENTIAL_ROUTED` | **PASS** |
| **04** | Repeated stalking incident after verbal warning | `STALKING` | **L3** | `SECURITY` & `HOD` | Security Supervisor + Dept Head | 4h SLA -> Direct notice to Proctor | `INCIDENT_ESCALATED` | **PASS** |
| **05** | High-severity threat reported outside campus gates | `THREAT` | **L3** | `SECURITY` | Nearest GPS Guard (< 2.5km) | 2h SLA -> Dispatch alert to Quick Response Wing | `RESPONDER_DISPATCHED` | **PASS** |
| **06** | Critical active weapon / physical violence incident | `EMERGENCY` | **L4** | `SECURITY` & `ADMIN` | Immediate Broadcast to all Guards | 0m (Immediate) -> Alarm triggered | `CRITICAL_BROADCAST_SENT` | **PASS** |
| **07** | Complaint filed against a departmental staff member | `HARASSMENT` | **L3** | `WOMENS_CELL` / `PRINCIPAL` | Conflict-of-interest bypass (Staff skipped) | 12h SLA -> Isolated from accused staff member | `CONFLICT_BYPASS_LOGGED` | **PASS** |
| **08** | Complaint naming the Department HOD | `MISCONDUCT` | **L3** | `PRINCIPAL` & `ADMIN` | Direct routing to Executive Leadership | 12h SLA -> HOD access blocked via RLS | `EXECUTIVE_ESCALATION` | **PASS** |
| **09** | Complaint involving the Principal | `GOVERNANCE` | **L4** | `SUPER_ADMIN` / Governing Body | Direct routing to Management Portal | Immediate Board Review notification | `GOVERNING_BODY_ALERTED` | **PASS** |
| **10** | Designated mentor is off-duty / unavailable | `ACADEMIC` | **L1** | `MENTOR_BACKUP` | Fallback to on-duty Departmental Coordinator | Automatic reroute upon shift check | `FALLBACK_ROUTED` | **PASS** |
| **11** | After-hours complaint submitted at 2:30 AM | `SAFETY` | **L3** | `NIGHT_PATROL` / `SECURITY` | Auto-detects night shift responders | 1h SLA -> Control room night desk | `NIGHT_SHIFT_DISPATCH` | **PASS** |
| **12** | New student has unmapped department profile | `GENERAL` | **L1** | `ADMIN_TRIAGE` | Central Campus Safety Triage Desk | Manual assignment queue | `TRIAGE_ASSIGNED` | **PASS** |
| **13** | Gemini AI service timeout or API rate-limit | `ANY` | **L2-L4** | Determined by Deterministic Rules Engine | Multi-lingual keyword fallback active | Preserves student submission without crash | `AI_FALLBACK_TRIGGERED` | **PASS** |
| **14** | External SMS dispatch provider offline | `EMERGENCY` | **L4** | In-App + Browser Push + PostgreSQL | Multi-channel failover (In-app + Sound alarm) | Delivery failure flagged for operator retry | `NOTIFICATION_FALLBACK_DELIVERED` | **PASS** |

---

## 3. CONFLICT OF INTEREST & PRIVACY SAFEGUARDS

1. **Accused Party Access Denial:** When a complaint explicitly tags a staff member or faculty ID as the subject of the investigation, Supabase RLS and server-side route handlers filter out the accused person's UUID from the case reviewer pool.
2. **Student Identity Masking:** For anonymous harassment complaints, the complainant's real name and registration number are masked (`Anonymous Student`) in staff views, while verified audit logs store an encrypted hash verifiable only by the Super Admin during formal judicial inquiry.
3. **Escalation Cron Automation:** The endpoint `/api/cron/escalate` periodically inspects overdue unacknowledged cases. If an assigned mentor does not acknowledge within the SLA window, the case status atomically transitions to `ESCALATED` and re-assigns to the Department HOD.
