# KAVACH CAMPUS — MASTER STEP 61: ANALYTICS AUDIT

**Modules Audited:** `src/app/admin/page.tsx` (Control Center) & `src/app/management/page.tsx` (Management Overview)  
**Execution Timestamp:** 2026-10-11T20:21:20+05:30  
**Overall Verdict:** **PARTIAL** (Real-time counts active; Time-series & category aggregations require SQL-backed views)

---

## 1. Current State of Application Analytics

### 1.1 Verified Live Database Metrics
In `src/app/admin/page.tsx` and `src/app/management/page.tsx`, the following KPI tiles execute direct SQL count queries against Supabase tables:

| Metric Card | Source Table | Query Clause | Live Database Status |
| :--- | :--- | :--- | :--- |
| **Total Users** | `profiles` | `select('*', { count: 'exact', head: true })` | **PASS (Live count from DB)** |
| **Active Guards / On-Duty Staff** | `staff_profiles` | `.eq('is_on_duty', true)` | **PASS (Live count from DB)** |
| **Critical Incidents** | `incidents` | `.eq('severity', 'CRITICAL')` | **PASS (Live count from DB)** |
| **Active Incidents** | `incidents` | `.neq('status', 'RESOLVED')` | **PASS (Live count from DB)** |
| **Critical Escalations Feed** | `incidents` | `.eq('severity', 'CRITICAL').neq('status', 'RESOLVED').limit(5)` | **PASS (Live list from DB)** |

### 1.2 Identified Placeholders & Missing Time-Series Aggregations
Inspection of the admin and management source code revealed areas where hardcoded values or static placeholders are currently present:

1. **System Health:** Hardcoded as `'99.9%'` string instead of computing from `/api/system/health` database ping latency.
2. **AI Insight Cards:** Static strings (`"Pattern detected: Increased reports near North Gate after 8 PM"`) instead of dynamic anomaly detection over time-bucketed coordinates.
3. **Campus Heatmap:** Contains a placeholder `<div>Campus Zone Monitoring Active</div>` rather than rendering incident coordinate clusters.
4. **Time-Series Charts:** Daily, Monthly, and Yearly complaint trends, resolution time averages, and category breakdowns are not yet surfaced as dynamic interactive chart components.

---

## 2. Gap Analysis vs. Enterprise Safety Dashboards

The user provided reference images of modern safety command centers (e.g. EduSafe360, Inform Incident Command, JHU SEAM Executive Summary). Comparing Kavach Campus against these benchmarks:

| Desired Metric | EduSafe360 / Reference Standard | Current Kavach Campus Implementation | Gap / Required Action |
| :--- | :--- | :--- | :--- |
| **Daily Complaints** | Bar chart showing today vs. 7-day trend | Not implemented in UI | Needs `date_trunc('day', created_at)` query |
| **Monthly Complaints** | 30-day incident velocity line chart | Not implemented in UI | Needs `date_trunc('month', created_at)` query |
| **Yearly Complaints** | Annual comparison bar charts | Not implemented in UI | Needs yearly SQL view |
| **Category Breakdown** | Donut chart (Harassment, Ragging, Theft) | Basic text category display | Needs `group by category` aggregation |
| **Resolution Rate** | Average response & closure time | Static label (`< 3 mins`) | Needs `avg(resolved_at - created_at)` |
| **Campus Hotspots** | GeoJSON interactive map with pins & zones | Static text banner | Needs Map component with incident coordinates |

---

## 3. Proposed Safe SQL Aggregation Views for Production

To provide real, database-backed analytics without inventing mock numbers, the following SQL aggregation views should be created in Supabase:

```sql
-- 1. Daily Incident Summary View
CREATE OR REPLACE VIEW public.v_daily_incident_analytics AS
SELECT 
    date_trunc('day', created_at) AS report_date,
    count(*) AS total_incidents,
    count(*) FILTER (WHERE severity = 'CRITICAL') AS critical_count,
    count(*) FILTER (WHERE severity = 'HIGH') AS high_count,
    count(*) FILTER (WHERE status = 'RESOLVED') AS resolved_count,
    avg(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_minutes
FROM public.incidents
GROUP BY 1
ORDER BY 1 DESC;

-- 2. Category Distribution View
CREATE OR REPLACE VIEW public.v_incident_category_breakdown AS
SELECT 
    category,
    count(*) AS incident_count,
    round(count(*) * 100.0 / sum(count(*)) OVER (), 1) AS percentage
FROM public.incidents
GROUP BY category
ORDER BY incident_count DESC;

-- 3. Campus Zone Hotspot View
CREATE OR REPLACE VIEW public.v_incident_campus_hotspots AS
SELECT 
    location_name,
    count(*) AS incident_count,
    max(created_at) AS last_incident_at
FROM public.incidents
WHERE location_name IS NOT NULL
GROUP BY location_name
ORDER BY incident_count DESC;
```

---

## 4. Privacy & Authorization Controls

- **Access Level:** Only users with `ADMIN`, `SUPER_ADMIN`, or verified `MANAGEMENT` roles may query aggregate analytics.
- **PII Protection:** Aggregate analytics views must **never include student names, enrollment numbers, phone numbers, or exact residential addresses**.
- **Empty States:** When zero incidents exist for a given time window, charts must gracefully display a clean empty state (`"No incidents recorded for this period"`) rather than breaking or displaying false demo metrics.
