# KAVACH CAMPUS — SEVERITY ROUTING & RESPONDER DISPATCH MATRIX
**Document Identifier:** `KAVACH-DOC-ROUTING-001`  
**Classification:** Institutional Standard Operating Procedure (SOP)  
**Effective Date:** 2026-10-11  

---

## 1. PURPOSE & ARCHITECTURAL SCOPE

The **Kavach Campus** Severity Routing Matrix governs how student complaints, security reports, and emergency SOS alerts are automatically classified, prioritized, and assigned to designated campus responders.

### Core Safety Invariants:
1. **Decoupled Emergency Dispatch:** Emergency SOS creation NEVER waits for Gemini AI or any cloud LLM. It dispatches immediately with `CRITICAL` priority in < 100ms.
2. **Deterministic Safety Override:** If critical danger keywords (e.g., weapon, fire, violence, assault in English, Telugu, or Hindi) are present, the rule engine overrides AI classification to `CRITICAL` or `HIGH`.
3. **No Fabricated Data:** The system never fabricates responder locations, GPS coordinates, or staff availability.
4. **Auditability:** Every severity assessment, override reason, and responder reassignment is permanently logged to `public.audit_logs`.

---

## 2. SEVERITY LEVEL TAXONOMY & TARGET RESPONDERS

| Severity Level | Incident Scope & Examples | Primary Responders | Escalation Authority | Response Target SLA |
| :--- | :--- | :--- | :--- | :---: |
| **L1 / LOW** | Lost property, room maintenance, noise disturbances, minor peer friction, general campus inquiries. | Assigned Department Mentor, Academic Advisor, Student Counselor | Department Head (HOD) | < 24 Hours |
| **L2 / MEDIUM** | Repeated verbal harassment, hostel room disputes, facility safety hazards, suspicious loitering, cyber-bullying. | Assigned Mentor + Student Counselor + Women's Development Cell (WDC) | HOD & Chief Warden | < 4 Hours |
| **L3 / HIGH** | Stalking, physical intimidation, theft/burglary, extortion, ragging, severe assault threats, active trespassing. | Campus Security Desk + Women's Cell + HOD + Administrative Dean | Campus Security Officer & Principal | < 30 Minutes |
| **L4 / CRITICAL** | Immediate life threat, weapons (knife, firearm), active physical violence, kidnapping, suicide ideation, one-tap SOS. | Campus Quick Response Team (QRT) + Campus Security Guards + Medical Cell | Principal, Campus Security Chief & Executive Management | **< 3 Minutes** |

---

## 3. MULTILINGUAL KEYWORD OVERRIDE DICTIONARY

To guarantee zero false negatives during cloud AI latency, timeouts, or network outages, the deterministic keyword engine monitors three languages simultaneously:

### A. Critical Safety Keywords (Auto-Escalate to `CRITICAL` / `L4`)
- **English:** `gun`, `knife`, `blood`, `fire`, `kidnap`, `attack`, `kill`, `suicide`, `die`, `weapon`, `shoot`, `assault`
- **Telugu (తెలుగు):** `తుపాకీ`, `కత్తి`, `రక్తం`, `మంటలు`, `చంపేస్తా`, `దాడి`, `కిడ్నాప్`, `ఆత్మహత్య`
- **Hindi (हिन्दी):** `बंदूक`, `चाकू`, `खून`, `आग`, `मार`, `हमला`, `अपहरण`, `आत्महत्या`

### B. High Risk Keywords (Auto-Escalate to `HIGH` / `L3` minimum)
- **English:** `fight`, `punch`, `stolen`, `thief`, `robbery`, `harass`, `stalk`, `creep`, `threat`, `molest`, `ragging`
- **Telugu (తెలుగు):** `వేధింపు`, `దొంగ`, `కొట్టారు`, `ర్యాగింగ్`, `బెదిరింపు`
- **Hindi (हिन्दी):** `छेड़छाड़`, `చోరీ`, `झगड़ा`, `मारपीट`, `धमकी`, `रैगिंग`

---

## 4. GPS & NEAREST MENTOR DISPATCH ALGORITHM

When an incident includes valid student coordinates (`latitude`, `longitude`):

```
                   [Student Report / SOS]
                             │
            ┌────────────────┴────────────────┐
     [GPS Available]                   [GPS Unavailable]
            │                                 │
   Filter Candidates:                  Non-Location Fallback:
   • is_approved = true                • Do NOT fabricate coordinates
   • is_on_duty = true                 • Select on-duty departmental mentor
   • is_location_sharing = true        • For CRITICAL: Broadcast to all
   • location_age <= 15 mins             active security guards
            │                                 │
   Calculate Haversine Distance               │
   within Max Campus Radius (2.5 km)          │
            │                                 │
     Sort by Distance                         │
   Select Nearest Responder                   │
            │                                 │
            └────────────────┬────────────────┘
                             │
                             ▼
              [Assign & Begin 5-Min SLA]
```

---

## 5. ESCALATION TIMEOUT & RETRY PROTOCOL

1. **Initial Assignment:** Case is assigned to the selected responder, setting `status = 'ASSIGNED'`, `assigned_at = NOW()`, and `ack_deadline = NOW() + 5 minutes`.
2. **Acknowledgement:** If the responder acknowledges within 5 minutes, status transitions to `IN_PROGRESS`.
3. **Timeout Expiry:** If 5 minutes elapse without acknowledgement:
   - System atomically marks current assignment expired.
   - Previous responder is added to `attempted_responders` blacklist for this incident.
   - Next nearest eligible responder is assigned.
   - Audit entry is logged: `ESCALATED_NEXT_RESPONDER`.
4. **Responder Pool Exhaustion:** If no eligible responders remain:
   - Status updates to `ESCALATED`.
   - Priority escalates to Institutional Administrators and Campus Security Chief.
   - An immutable audit entry is logged: `ALL_RESPONDERS_EXHAUSTED`.
