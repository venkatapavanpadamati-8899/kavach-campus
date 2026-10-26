-- ==============================================================================
-- KAVACH CAMPUS — STEP 65: DATABASE-BACKED ANALYTICS VIEWS (FOR REVIEW ONLY)
-- Workspace: D:\Kavach Campus
-- Purpose: Non-destructive SQL views to support real-time aggregate analytics
-- NOTE: Do NOT run automatically. For administrator review and manual application.
-- ==============================================================================

-- 1. Daily Incident Counts View (Zero PII)
CREATE OR REPLACE VIEW public.v_daily_incident_counts AS
SELECT
    DATE_TRUNC('day', created_at)::DATE AS incident_date,
    COUNT(*) AS total_incidents,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_incidents,
    COUNT(*) FILTER (WHERE status = 'ESCALATED') AS escalated_incidents
FROM public.incidents
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY incident_date DESC;

-- 2. Incident Severity & Category Aggregation View (Zero PII)
CREATE OR REPLACE VIEW public.v_incident_category_severity_summary AS
SELECT
    category,
    severity,
    status,
    COUNT(*) AS total_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60)::NUMERIC, 1) AS avg_ack_minutes,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)::NUMERIC, 1) AS avg_res_minutes
FROM public.incidents
GROUP BY category, severity, status;

-- 3. Incident Campus Hotspot Aggregates (Zero Student PII)
CREATE OR REPLACE VIEW public.v_campus_hotspot_aggregates AS
SELECT
    COALESCE(location_name, 'Campus Zone') AS location_label,
    COUNT(*) AS incident_count,
    MAX(created_at) AS last_incident_at
FROM public.incidents
WHERE location_name IS NOT NULL OR (latitude IS NOT NULL AND longitude IS NOT NULL)
GROUP BY COALESCE(location_name, 'Campus Zone')
ORDER BY incident_count DESC;

-- Grant SELECT only to authenticated admins/security chiefs
-- (Supabase default RLS or explicit grants can be applied by DBA)
