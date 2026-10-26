# KAVACH CAMPUS — ULTIMATE GEOLOCATION & NEARBY STAFF REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Test Suite Reference:** `src/__tests__/nearby-staff-and-incident-management.test.ts` (14 tests passed)

---

## 1. Geolocation Validation Rules

1. **Coordinate Boundaries:**
   - Latitude validated strictly within `[-90.0, 90.0]`.
   - Longitude validated strictly within `[-180.0, 180.0]`.
   - Precision capped to 6 decimal places (~0.1m accuracy) to mitigate timing and precision attacks.
2. **Freshness & Stale Coordinate Rejection:**
   - Security staff locations recorded in `staff_locations` must have `updated_at > NOW() - INTERVAL '30 minutes'`. Any staff coordinates older than 30 minutes are discarded during emergency assignment.
3. **Missing / Indoor GPS Fallback:**
   - When a student triggers an emergency inside a building where GPS reception is unavailable or browser permissions are denied, the system assigns the incident to `UNKNOWN_CAMPUS_ZONE` and broadcasts to all active campus security units.

---

## 2. Nearest Staff Assignment Workflow

```text
[Student Triggers SOS]
         │
         ▼
[Extract (lat, lng)] ──► Missing/Denied? ──► [Fallback to Campus Zone Broadcast]
         │
    Valid GPS
         │
         ▼
[Query staff_locations] ──► Filter: role = 'SECURITY' AND is_active = true AND updated_at > NOW() - 30m
         │
         ▼
[Calculate Haversine Distance: d = 2R × asin(sqrt(...))]
         │
         ▼
[Order by distance ASC LIMIT 5] ──► Assign Primary Responder ──► [Dispatch Alert]
```

### Distance Calculation Formula (PostgreSQL Function):
```sql
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) RETURNS double precision AS $$
  SELECT 6371000 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
    POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
  ));
$$ LANGUAGE sql IMMUTABLE;
```
