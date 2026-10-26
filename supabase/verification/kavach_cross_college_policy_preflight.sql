-- Read-only staging preflight for migration 014.
-- This inspects catalog state and aggregate counts only. It does not prove
-- authenticated-user RLS behavior; perform the SRKR/Vishnu API tests separately.

WITH target_tables(schema_name, table_name) AS (
  VALUES
    ('public', 'profiles'),
    ('public', 'student_profiles'),
    ('public', 'staff_profiles'),
    ('public', 'incidents'),
    ('public', 'incident_locations'),
    ('public', 'evidence'),
    ('public', 'incident_messages'),
    ('public', 'safe_walks'),
    ('public', 'escalations'),
    ('public', 'notifications'),
    ('public', 'audit_logs'),
    ('public', 'user_otp_verifications'),
    ('storage', 'objects')
)
SELECT
  target_tables.schema_name,
  target_tables.table_name,
  COALESCE(pg_class.relrowsecurity, FALSE) AS rls_enabled,
  COALESCE(pg_class.relforcerowsecurity, FALSE) AS force_rls
FROM target_tables
LEFT JOIN pg_namespace
  ON pg_namespace.nspname = target_tables.schema_name
LEFT JOIN pg_class
  ON pg_class.relnamespace = pg_namespace.oid
  AND pg_class.relname = target_tables.table_name
ORDER BY target_tables.schema_name, target_tables.table_name;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  (qual IN ('true', '(true)')) AS unconditional_using,
  (with_check IN ('true', '(true)')) AS unconditional_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN (
    'profiles',
    'student_profiles',
    'staff_profiles',
    'incidents',
    'incident_locations',
    'evidence',
    'incident_messages',
    'safe_walks',
    'escalations',
    'notifications',
    'audit_logs',
    'user_otp_verifications'
  ))
  OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- Counts only: use these results to identify pending or potentially mismapped
-- tenant data for authorized manual review; do not infer campus from this query.
SELECT college_id, COUNT(*) AS profile_count
FROM public.profiles
GROUP BY college_id
ORDER BY college_id;

SELECT
  'profiles_with_email_domain_outside_assigned_college' AS check_name,
  COUNT(*) AS row_count
FROM public.profiles
WHERE (college_id = 'srkr-bhimavaram'
       AND college_email !~* '^[^@]+@(srkr\.edu\.in|srkrec\.ac\.in)$')
   OR (college_id = 'vishnu-bhimavaram'
       AND college_email !~* '^[^@]+@(vishnu\.edu\.in|svecw\.edu\.in)$');

SELECT
  'incidents_with_college_id_mismatching_student_profile' AS check_name,
  COUNT(*) AS row_count
FROM public.incidents i
JOIN public.profiles p ON p.id = i.student_id
WHERE i.college_id IS DISTINCT FROM p.college_id;
