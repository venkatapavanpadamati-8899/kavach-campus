# KAVACH CAMPUS — EMERGENCY SOS, RESPONDER ROUTING & ESCALATION AUDIT
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 11, 2026  
**Primary Endpoints:** `/api/sos`, `/api/sos/location`, `/api/cron/escalate`

---

## 1. Emergency SOS Lifecycle Architecture

When a student triggers the emergency button:
```
Student Taps SOS (Client)
       │
       ▼
Acquire Geolocation (Optional / Non-blocking)
       │
       ▼
POST /api/sos (Server-Side Incident Generation)
       │
       ├─► 1. Check for Existing Active SOS (Duplicate flood protection)
       ├─► 2. Generate Incident ID (e.g. SOS-2026-A1B2C3)
       ├─► 3. Save Coordinates & Accuracy to incident_locations
       ├─► 4. Discover Active Security Responders (role: 'SECURITY')
       ├─► 5. Broadcast Emergency Alert to Authorized Responders
       ├─► 6. Send SMS to Trusted Contacts (Disabled by default / Free tier)
       └─► 7. Record Immutable Audit Log (audit_logs table)
```

---

## 2. Tested Resilience & Edge-Case Behaviors

### A. GPS Permission Denied / Unavailable
- **Requirement:** A student hiding in a washroom or under distress with GPS turned off must still receive emergency response.
- **Observed Behavior:** `/api/sos` accepts payloads where `latitude` and `longitude` are null.
- **Handling:** Incident is created with `status: 'RECEIVED'`, `severity: 'CRITICAL'`. Routing method is flagged as `PENDING_ASSIGNMENT_BROADCAST` and an escalation record is created (`reason: 'NO_VALID_COORDINATES_FOR_ROUTING'`).
- **Safety Verdict:** **PASS — Incident creation is never blocked by GPS.**

### B. Prevention of Fabricated Staff Distances
- **Safety Policy:** Never invent staff coordinates, simulated distances, or arbitrary responder assignments (e.g., `staffList[0]`).
- **Observed Implementation:** 
  - If staff coordinates are not verified via active GPS tracking, the system **leaves `assignedStaffId: null`**.
  - Instead, it initiates an **authorized broadcast** to all verified active security staff so the closest on-duty officer can claim the incident.
- **Safety Verdict:** **PASS — Zero fake distances or fabricated assignments.**

### C. Duplicate Submission & Panic Flood Protection
- **Scenario:** A terrified student rapidly taps the SOS button 10 times in 5 seconds.
- **Handling:** `/api/sos` queries `incidents` for an active SOS (`is_tracking_active: true`, `status: ['RECEIVED', 'ASSIGNED']`).
- **Result:** The system recognizes the existing incident, returns HTTP 200 with the existing `caseId` and `isExisting: true`, preventing database record floods.

### D. Automated Incident Escalation Cron (`/api/cron/escalate`)
- Periodic cron checks for incidents remaining in `ASSIGNED` or `RECEIVED` status beyond the maximum SLA (e.g., 15 minutes).
- Automatically escalates the incident from `SYSTEM` to `ADMIN` with an audit trail entry.

---

## 3. Privacy & Need-to-Know Data Boundaries
- **General Staff:** Do not receive emergency push alerts for cases outside their assigned building/jurisdiction.
- **Security Responders:** Receive alert with student name, emergency case ID, and GPS coordinates/campus zone.
- **Medical / Mental Health:** Only counselor/medical responders receive self-harm or counseling flags.
