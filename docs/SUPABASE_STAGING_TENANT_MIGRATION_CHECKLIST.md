# KAVACH CAMPUS: SUPABASE STAGING TENANT MIGRATION & RLS VERIFICATION CHECKLIST

> [!CAUTION]
> **DO NOT EXECUTE MIGRATION 012 DIRECTLY IN PRODUCTION.**
> Every migration and RLS policy change must be executed and validated in a designated Staging environment before production deployment.

---

## 1. Staging Pre-Flight Environment Checklist

- [ ] **Staging Database Provisioned**: Independent Supabase staging project created.
- [ ] **Schema Baseline Verified**: Tables `profiles`, `incidents`, `evidence`, `student_profiles`, `user_otp_verifications`, and storage bucket `kavach-evidence` exist.
- [ ] **Database Backup Generated**: Full pg_dump or Supabase dashboard snapshot taken before applying migration.
- [ ] **No Production Credentials in Staging**: Verify `.env` points exclusively to the staging Supabase URL and keys.

---

## 2. Staging Execution Sequence for Migration 012

1. Open **Supabase Dashboard -> SQL Editor -> New Query** in the Staging project.
2. Paste and execute `supabase/migrations/012_profiles_college_tenant.sql`.
3. Confirm the execution output returns:
   ```text
   Migration 012 executed: college_id column created, verified domains mapped, ambiguous accounts flagged for review, and storage aligned.
   ```
4. Verify column creation and indexing:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'college_id';

   SELECT indexname FROM pg_indexes WHERE tablename = 'profiles' AND indexname LIKE '%college%';
   ```

---

## 3. Post-Migration Administrative Audit

Execute this query immediately after applying migration 012 to inspect any accounts that need manual campus verification:

```sql
SELECT id, full_name, college_email, student_id, department, role, college_id
FROM public.profiles
WHERE college_id = 'PENDING_CAMPUS_VERIFICATION';
```

> [!NOTE]
> Do NOT guess or auto-assign ambiguous profiles. Only campus administrators may update `college_id` following verified student/staff roster validation.

---

## 4. SQL Verification Queries for Critical Security Scenarios

Execute these tests in the Supabase SQL Editor simulating authenticated sessions using `SET LOCAL request.jwt.claim.sub = '<user_uuid>';` and `SET LOCAL ROLE authenticated;`.

### Scenario 1: Student Accessing Their Own Incident
- **Expectation**: PASS (Record returned).
```sql
-- Simulate Student A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'student-a-srkr-uuid';

SELECT id, case_id, description, status
FROM public.incidents
WHERE student_id = auth.uid();
```

### Scenario 2: Student Attempting to Access Another Student's Incident
- **Expectation**: PASS (0 rows returned or denied by RLS).
```sql
-- Simulate Student A attempting to query Student B's incident
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'student-a-srkr-uuid';

SELECT *
FROM public.incidents
WHERE student_id = 'student-b-srkr-uuid';
-- Must return 0 rows.
```

### Scenario 3: SRKR User Attempting to Access Vishnu Incidents
- **Expectation**: PASS (0 rows returned).
```sql
-- Simulate SRKR staff member querying incidents from Vishnu campus students
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'staff-srkr-uuid';

SELECT i.id, i.case_id, p.college_id
FROM public.incidents i
JOIN public.profiles p ON i.student_id = p.id
WHERE p.college_id = 'vishnu-bhimavaram';
-- Must return 0 rows.
```

### Scenario 4: Vishnu User Attempting to Access SRKR Incidents
- **Expectation**: PASS (0 rows returned).
```sql
-- Simulate Vishnu staff member querying incidents from SRKR campus students
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'staff-vishnu-uuid';

SELECT i.id, i.case_id, p.college_id
FROM public.incidents i
JOIN public.profiles p ON i.student_id = p.id
WHERE p.college_id = 'srkr-bhimavaram';
-- Must return 0 rows.
```

### Scenario 5: Unauthorized Staff Attempting to Access an Unassigned Case
- **Expectation**: PASS (Only assigned responder or intake security can access).
```sql
-- Simulate unassigned departmental counselor querying private case assigned to another responder
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'unassigned-counselor-uuid';

SELECT id, case_id, student_id, description
FROM public.incidents
WHERE assigned_to IS NOT NULL AND assigned_to != auth.uid();
-- Unassigned non-admin staff must not inspect detailed private records of other responders.
```

### Scenario 6: Unauthorized User Attempting Self-Role or College ID Escalation
- **Expectation**: PASS (Query aborts with trigger exception).
```sql
-- Simulate student trying to elevate their role to ADMIN or change their college_id
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'student-a-srkr-uuid';

UPDATE public.profiles
SET role = 'ADMIN', college_id = 'vishnu-bhimavaram'
WHERE id = auth.uid();
-- Must fail with: "Unauthorized: Only administrators can modify roles or approval status."
```

### Scenario 7: Unauthorized User Attempting to Download Evidence
- **Expectation**: PASS (Access denied / 0 rows returned).
```sql
-- Simulate Student B trying to query evidence attached to Student A's incident
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'student-b-srkr-uuid';

SELECT *
FROM storage.objects
WHERE bucket_id = 'kavach-evidence'
  AND name LIKE 'student-a-srkr-uuid/%';
-- Must return 0 rows. Direct storage URL downloads must fail without valid signed URL.
```

---

## 5. Storage Bucket Verification Checklist

- [ ] Inspect bucket metadata in `storage.buckets`:
  ```sql
  SELECT id, name, public, file_size_limit, allowed_mime_types
  FROM storage.buckets
  WHERE id = 'kavach-evidence';
  ```
- [ ] Confirm `file_size_limit` is `26214400` (25 MB).
- [ ] Confirm `public` is `false` (private bucket, accessible only via short-lived signed URLs).
- [ ] Confirm `allowed_mime_types` contains:
  - `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - `video/mp4`, `video/quicktime`, `video/webm`
  - `audio/webm`, `audio/ogg`, `audio/mpeg`, `audio/mp4`
  - `application/pdf`

---

## 6. Rollback Contingency Plan

If any unexpected schema conflict or regression occurs during staging execution, run the rollback commands:

```sql
-- Rollback Migration 012
ALTER TABLE public.profiles DROP COLUMN IF EXISTS college_id;
DROP INDEX IF EXISTS public.idx_profiles_college_id;
DROP INDEX IF EXISTS public.idx_profiles_college_role;
DROP FUNCTION IF EXISTS public.get_user_college_id();
```

---

## 7. Approval Sign-Off Matrix

| Role | Name / Email | Staging Verification Date | Decision (APPROVE / REJECT) | Signature |
| ---- | ------------ | ------------------------- | --------------------------- | --------- |
| Campus Security Lead | | | | |
| Institutional Admin | | | | |
| Lead Developer | | | | |
