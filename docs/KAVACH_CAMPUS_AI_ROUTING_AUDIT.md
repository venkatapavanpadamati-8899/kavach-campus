# KAVACH CAMPUS - AI ROUTING AUDIT

## 1. Trace Overview
Traced the escalation and staff assignment logic for incidents and SOS alerts in the Kavach Campus backend.

## 2. Default Incident Flow
- Regular incidents are submitted and marked as `RECEIVED`.
- Based on priority (e.g., `CRITICAL` vs `LOW`), different notification and assignment systems *should* trigger. Currently, standard incidents remain in `RECEIVED` state until manually acted upon by staff in the dashboard, ensuring no automation incorrectly assigns non-critical items.

## 3. SOS Routing Flow (`/api/sos/route.ts`)
When a student activates an SOS:
1. It immediately assigns `CRITICAL` severity and `HIGH` urgency.
2. It attempts to find the first active staff member with `role='SECURITY'` or `role='STAFF'`.
3. If a staff member is found:
   - The incident `assigned_to` is updated.
   - The status changes to `ASSIGNED`.
   - A `CRITICAL SOS ALERT` notification is immediately inserted.
4. If **no staff member is found** (Escalation Fallback):
   - A record is created in the `escalations` table (`from_level: SYSTEM`, `to_level: ADMIN`, `reason: NO_STAFF_AVAILABLE_FOR_SOS`).

## 4. Conclusion
The routing logic correctly enforces critical fallbacks. If local staff aren't available, it automatically escalates to administrators.
