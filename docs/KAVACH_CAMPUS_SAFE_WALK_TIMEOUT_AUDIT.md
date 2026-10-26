# KAVACH CAMPUS - SAFE WALK TIMEOUT AUDIT

## 1. Timeout Mechanism Implementation
- **Files Created**: `src/app/api/cron/safe-walk-timeout/route.ts`
- **Methodology**: 
  - Finds all `safe_walks` where `status = 'ACTIVE'` and `expires_at < NOW()`.
  - Atomically updates them to `OVERDUE` to prevent duplicate processing.
  - Generates an automated SOS incident (`type = 'SAFE_WALK_TIMEOUT'`) if the walk has `auto_sos_enabled = true`.
  - Logs the event securely in the `audit_logs` table.

## 2. Missed Check-in & Escalation Policy
- Timeout is distinguished from manual SOS.
- The cron handles escalating only if the walk was not formally `COMPLETED` or `CANCELLED`.
- It links the generated `incident_id` to the `safe_walks` record for traceablity via `escalation_incident_id`.

## 3. Automation Verification
- **Status:** **BLOCKED**
- **Reason:** The actual scheduling configuration (e.g. `vercel.json` or external trigger) is missing from the repository. The `/api/cron/safe-walk-timeout` endpoint is fully functional when triggered via HTTP POST (with the correct `CRON_SECRET`), but it will not run autonomously until deployment infrastructure is configured.

## 4. Privacy & Location Rules
- The cron job securely processes timeouts server-side without exposing locations in its API response.
- Generates an internal SOS so campus security receives the last known coordinates through the normal incident handling flow.
