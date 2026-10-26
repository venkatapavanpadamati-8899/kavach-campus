# KAVACH CAMPUS — COMPLAINT ANALYTICS & RESOLUTION REPORTING AUDIT
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 11, 2026  
**Dashboards Audited:** `/admin` (Command Center), `/management` (Executive SLA Overview)

---

## 1. Analytics & Reporting Architecture

Kavach Campus delivers aggregated, executive-level safety telemetry without compromising student anonymity or exposing victim identities:

### A. Core Metrics & Aggregation Engine
1. **Temporal Trends:**
   - Daily, Monthly, and Yearly complaint velocity.
   - Calculated dynamically using PostgreSQL server-side date truncation (`DATE_TRUNC('day', created_at)`, `DATE_TRUNC('month', created_at)`).
   - Timezone-aware boundaries prevent double-counting or shifting day borders.
2. **Category-Wise Distribution:**
   - Breakdown across `HARASSMENT`, `RAGGING`, `THEFT`, `SECURITY`, `MEDICAL`, `MAINTENANCE`, `COUNSELING`, and `GENERAL`.
   - Special tracking for high-priority institutional compliance areas (Anti-Ragging Committee, Internal Complaints Committee / Women's Cell).
3. **Severity & Urgency Matrices:**
   - Proportional view of `CRITICAL` vs `HIGH` vs `MEDIUM` vs `LOW` incidents.
   - Highlights ratio of emergency SOS triggers to routine campus facility reports.
4. **Resolution SLA & Performance:**
   - **Mean Time to Acknowledge (MTTA):** Time from `RECEIVED` to `ASSIGNED`.
   - **Mean Time to Resolution (MTTR):** Time from `ASSIGNED` to `RESOLVED`.
   - Tracked across designated departments and security teams.
5. **Geographic Hotspots (Campus Zones):**
   - Incident counts grouped by `campus_zone_id` (e.g., North Gate, Girls Hostel Pathway, Sports Complex, Main Library).
   - Enables proactive patrol allocation and lighting/security asset deployment.

---

## 2. Privacy Safeguards for Harassment & Ragging Analytics
- **Identity Masking:** High-level analytics dashboards (`/admin`, `/management`) display **aggregate metrics only** (e.g., "7 Harassment Reports this month, 6 Resolved, 1 In Investigation").
- **Victim Protection:** Student names, contact details, and initial complaint narratives are **redacted** from overview cards. Only authorized investigators assigned to the case can view the unmasked victim record.
- **Role Isolation:** Routine maintenance staff and general responders cannot view harassment or counseling analytics.

---

## 3. Data Integrity & Anti-Fabrication Standard
- Kavach Campus does **not use hardcoded mock statistics** in its production database queries.
- Analytics reflect genuine database records stored in PostgreSQL.
- Test scenarios created during synthetic benchmarks are isolated or marked with `case_id` prefixes to avoid distorting institutional records.
