# KAVACH CAMPUS - FINAL ROUTING AUDIT

## 1. Assignment Logic Verification
Reviewed `/api/sos/route.ts` and `/api/incidents/route.ts`.

## 2. Emergency Routing (SOS)
- Bypasses Gemini AI completely.
- Immediately assigns priority `CRITICAL`.
- Queries the `profiles` table for `is_active = true` and `role IN ('SECURITY', 'STAFF')`.
- Assigns to the first available responder and inserts a `CRITICAL SOS ALERT` notification.

## 3. Escalation Fallback
- If the above query yields 0 responders, the incident still creates correctly.
- A system-level escalation is fired to the `escalations` table (`to_level: ADMIN`).
- **Verdict**: PASS. Routing relies on database profiles and falls back to Admin queues if staff is unavailable.

## 4. Standard Incident Routing
- Mapped directly to the appropriate staff queue. Dashboard relies on `assigned_to` and `status` fields.
