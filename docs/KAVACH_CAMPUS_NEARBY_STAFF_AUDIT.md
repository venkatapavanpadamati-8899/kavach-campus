# KAVACH CAMPUS NEARBY STAFF AUDIT

## 1. Feature Implementation Status
**Overall Status:** PARTIAL (Simplified Initial Implementation)

## 2. Staff Discovery Mechanism
- **Implemented in:** `/api/sos/route.ts`
- **Current Logic:** The endpoint queries for active users with roles `SECURITY` or `STAFF`. Currently, it selects the first available staff member to assign and notify.
- **Future Improvement Needed:** While the database has `campus_zones` and `campus_buildings`, we added `duty_zone_id` to `staff_profiles` in migration 003. Full spatial querying (Haversine distance calculating distance between incident coordinates and building coordinates in the staff's zone) is structured but needs explicit location matching configured.

## 3. Escalation
- If no staff is available, the system falls back to automatically triggering an `ESCALATION` record to `ADMIN` with reason `NO_STAFF_AVAILABLE_FOR_SOS`.

## 4. Dashboard Integration
- **Implemented in:** `/staff/incidents/[id]/page.tsx`
- **Dashboard Features:** Staff assigned to the incident can load the detail page and see the real-time updating live location polled from `/api/sos/location`. Includes an external map link.
