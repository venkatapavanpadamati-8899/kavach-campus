# KAVACH CAMPUS — GPS, GEO COORDINATES & LIVE LOCATION REPORT

**Project:** Kavach Campus  
**Date:** October 19, 2026  
**Scope:** Phase 6 (GPS Validation, Geolocation Handling, Live Location Sharing)  
**Status:** PASS (Verified)

---

## 1. Coordinate Validation Engine

All latitude and longitude inputs pass through strict server-side validation (`src/lib/validation/location.ts` and API Zod schemas).

### Validation Rules:
- **Latitude Range:** `-90.000000` to `+90.000000`
- **Longitude Range:** `-180.000000` to `+180.000000`
- **Type Checking:** Must be finite numeric floats. `NaN`, `Infinity`, `null`, strings, and malformed inputs are strictly rejected.
- **Missing Coordinate Rule:** Unavailable location is preserved explicitly as `null`. Under no circumstances is `(0, 0)` (Null Island) fabricated as a default fallback.

```typescript
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
```

---

## 2. Browser Geolocation Lifecycle

In the frontend (`src/components/location/LocationPicker.tsx` and Safe Walk hook):
1. **Permission Request:** User is presented with a clear modal explaining why location is required (e.g., *"Emergency responders require your location to dispatch campus security to your precise location"*).
2. **Permission Denied Handling:**
   - Graceful fallback: System allows emergency SOS and complaint filing even if GPS permission is denied.
   - User is presented with a manual campus landmark dropdown (e.g., *"Library 2nd Floor"*, *"Girls Hostel Quadrangle"*).
3. **Timeout & High Accuracy:**
   - Geolocation options: `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }`.
   - In case of GPS lock timeout, uses last known cached position if within 60s, else requests manual building selection.

---

## 3. Live Location Sharing Protocol (Safe Walk & Active SOS)

- **Explicit Activation:** Sharing begins ONLY after the user clicks *"Start Safe Walk"* or *"Trigger Emergency SOS"*.
- **Active Visual Indicator:** A prominent pulsing status banner (*"LIVE GPS STREAMING ACTIVE"*) is displayed at the top of the interface.
- **Recipients Restriction:** Location coordinates are only queryable by:
  1. The user themselves.
  2. The assigned campus safety responder / security control room.
  3. Pre-configured trusted emergency contacts during active distress.
- **Session Termination & Expiry:**
  - When the student clicks *"I Have Arrived Safely"*, location streaming immediately ceases.
  - Periodic heartbeat ping stops.
  - Stale coordinate rule: Responders only see locations updated within the last 15 minutes.

---

## 4. Test Matrix & Results

| Test Scenario | Input Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **Valid Campus Coordinates** | `lat: 17.385044, lng: 78.486671` | Accepted & persisted | Validated, saved to incident | PASS |
| **Out-of-Range Latitude** | `lat: 95.1234, lng: 78.4866` | Rejected (HTTP 400) | Validation error: `Invalid latitude` | PASS |
| **Out-of-Range Longitude** | `lat: 17.3850, lng: -192.5000` | Rejected (HTTP 400) | Validation error: `Invalid longitude` | PASS |
| **NaN / String Injection** | `lat: "alert('xss')", lng: NaN` | Rejected (HTTP 400) | Zod schema parse rejection | PASS |
| **GPS Permission Denied** | `error.code == PERMISSION_DENIED` | Shows campus building selector | UI renders landmark selector | PASS |
| **Map Deep-Link Construction** | `lat: 17.385044, lng: 78.486671` | Generates safe OpenStreetMap URL | `https://www.openstreetmap.org/?mlat=...` | PASS |
