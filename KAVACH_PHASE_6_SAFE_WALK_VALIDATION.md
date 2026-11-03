# KAVACH CAMPUS — PHASE 6: SAFE WALK & TIMEOUT LIFECYCLE REPORT

**Project:** Kavach Campus  
**Feature:** Safe Walk Companion & Automated Escalation  
**Execution Timestamp:** 2026-11-03T22:00:00+05:30  
**Status:** `VERIFIED (CODE & AUTOMATION CONTRACT)`

---

## 1. Executive Summary

The Safe Walk feature provides real-time digital protection for students walking alone across or around campus. If a student fails to check in before their chosen estimated arrival time, the system transitions into an overdue state and automatically alerts trusted contacts and campus security.

Phase 6 verified the entire state machine, database transition atomicity, crash resiliency, and cron trigger reliability.

---

## 2. State Machine Lifecycle

```
[ Idle ] ──► [ Active Walk ] ──► [ Check-In ]
                   │                  │
                   │ (Arrived Safely) │ (Timer Reset)
                   ▼                  ▼
             [ Completed ]       [ Active Walk ]
                   │
                   │ (Timer Expires + Grace Period Exceeded)
                   ▼
             [ Overdue ]
                   │
                   │ (Automated Cron Job Invocation)
                   ▼
       [ Escalated Alert Dispatched ]
       (SMS to Contacts + In-App to Security)
```

### State Definitions
1. **ACTIVE:** Student initiates walk with destination, estimated duration (e.g. 15 mins), and selected emergency contacts. Periodic GPS location updates are transmitted.
2. **CHECKED_IN:** Student taps "I'm OK" to confirm safety and extend the arrival deadline.
3. **COMPLETED:** Student taps "I have arrived safely", terminating the session normally.
4. **OVERDUE:** Current timestamp exceeds `start_time + duration + grace_period` without completion.
5. **ESCALATED:** Background cron identifies overdue status, issues emergency alerts, and logs incident.

---

## 3. Server-Side Timeout Engine (`/api/cron/safe-walk-timeout`)

### Execution Mechanics
- Invoked on a regular schedule by the hardened GitHub Actions workflow or cloud scheduler with `Bearer ${CRON_SECRET}`.
- Queries `safe_walk_sessions` where:
  - `status = 'active'`
  - `expected_end_at < NOW()`
- Updates session status to `'overdue'` atomically to prevent duplicate escalation triggers.
- For each newly overdue session:
  - Emits in-app alerts to campus security guards for that `college_id`.
  - Dispatches simulated/live SMS alert to student's nominated trusted contacts containing last known GPS coordinates.
- Returns standardized response contract:
  ```json
  {
    "success": true,
    "processedCount": 1,
    "escalatedCount": 1
  }
  ```

---

## 4. Crash Recovery & Network Disconnect Resiliency

- **Offline / Dead Battery Safety:** The timeout calculation is entirely server-side. If a student's phone dies, loses cellular connectivity, or the browser tab closes during a walk, the countdown continues on the server. When time expires, escalation occurs automatically without needing an active client connection.
- **Atomic Database Locks:** Status transitions from `active` -> `overdue` use conditional SQL updates (`WHERE id = $1 AND status = 'active'`) ensuring that concurrent scheduler runs never double-dispatch emergency alerts.

---

## 5. Automated Unit & Integration Tests

All Safe Walk state transitions and scheduler hooks are covered by automated tests:
- `src/__tests__/safe-walk-scheduler-workflow.test.ts` (9 / 9 PASS)
- `src/__tests__/safe-walk-service.test.ts` (PASS)
- `src/__tests__/sos-and-safe-walk-integration.test.ts` (PASS)
