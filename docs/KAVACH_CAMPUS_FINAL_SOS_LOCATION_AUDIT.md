# KAVACH CAMPUS - FINAL SOS & LOCATION AUDIT

## 1. SOS Flow Test
- SOS incidents are generated successfully via `POST /api/sos`.
- The case IDs generate uniquely (`SOS-YYYY-XXXXX`).

## 2. GPS & Live Location
- **Coordinates**: Captures `latitude`, `longitude`, `accuracy` via browser APIs.
- **Initial Location**: Logged safely into `incidents` and `incident_locations` table concurrently.
- **Continuous Stream**: The route `/api/sos/location` accepts follow-up `POST` requests to append new coordinates to `incident_locations` ensuring the breadcrumb trail is maintained as the student moves.
- **No-GPS Edge Case**: If the user blocks location permissions, `latitude` and `longitude` map to `null`, but the SOS incident is still created successfully and routed to staff.

## 3. Privacy
- Polling routes and historical logs are shielded by RLS. 
- Only assigned staff, admins, or the original student can access the coordinate history.

## 4. Conclusion
SOS functionality is highly robust. Fallbacks exist for GPS denial and network failure scenarios.
