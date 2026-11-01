# KAVACH CAMPUS — DATABASE, RLS & STORAGE SECURITY REPORT

**Audit Date:** October 31, 2026  
**Target Environment:** Staging Supabase Project `polbnvszmvblwenfnqll` (AWS `ap-south-1`)  
**SQL Migration Bundle:** `supabase/staged_migrations_013_014_combined.sql`  
**Preflight Verification Queries:**  
- `supabase/verification/kavach_step121_readonly_preflight.sql`  
- `supabase/verification/kavach_cross_college_policy_preflight.sql`

---

## 1. ACTUAL SCHEMA DISCOVERED ON STAGING (LIVE INTROSPECTION)

| Table Name | Staging Status | Present Columns | Notes & Discrepancies |
| :--- | :---: | :--- | :--- |
| `profiles` | **EXISTS** | `id`, `full_name`, `phone`, `role`, `college_email`, `student_id`, `department`, `year`, `section`, `is_approved`, `is_active`, `college_id`, timestamps | All required user & tenant fields present. |
| `student_profiles` | **EXISTS** | `id`, `course`, `hostel_room`, `blood_group`, `medical_conditions`, `emergency_contact_name`, `emergency_contact_phone`, `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data`, timestamps | All ID card and OCR verification fields present. Accommodations stored as `hostel_room`. |
| `incidents` | **EXISTS** | `id`, `case_id`, `student_id`, `college_id`, `category`, `description`, `severity`, `urgency`, `status`, `is_anonymous`, `latitude`, `longitude`, `location_accuracy`, `campus_zone_id`, `building_id`, `assigned_to`, timestamps | Full 12 core incident columns present including `college_id`. |
| `evidence` | **EXISTS** | `id`, `case_id`, `file_path`, `file_name`, `file_size`, `mime_type`, `uploaded_by`, `created_at` | **Pending Migration:** `incident_id` UUID and `storage_path` TEXT are missing on staging. Staged migration 013/014 adds these columns. |
| `incident_locations` | **EXISTS** | `id`, `incident_id`, `latitude`, `longitude`, `accuracy`, `recorded_at` | Used for breadcrumb location tracking. |
| `safe_walks` | **EXISTS** | `id`, `student_id`, `status`, `destination`, `estimated_duration`, `started_at`, `completed_at` | Active sessions tracked for safety timers. |
| `trusted_contacts` | **EXISTS** | `id`, `student_id`, `name`, `phone`, `relation`, `is_emergency_contact` | Student emergency guardian and peer directory. |
| `audit_logs` | **EXISTS** | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at` | Immutable security audit trail. |
| `notifications` | **EXISTS** | `id`, `user_id`, `type`, `title`, `message`, `case_id`, `is_read`, `created_at` | In-app alerts queue. |
| `user_otp_verifications` | **EXISTS** | `id`, `email`, `otp_hash`, `expires_at`, `attempts`, `max_attempts`, `verified`, `registration_data`, `created_at` | Atomic registration & password reset records. |
| `incident_notes` | **STAGED** | Table not yet created on staging (PGRST205) | Created in Section 4 of staged migration bundle. |
| `pending_campuses` | **STAGED** | Managed in code / pending migration | Super admin onboarding queue. |

---

## 2. ROW-LEVEL SECURITY (RLS) STATUS & POLICY MATRIX

All tables have RLS enabled in PostgreSQL (`relrowsecurity = true`). Unauthenticated (anon) access is completely blocked across all sensitive tables.

### Comprehensive RLS Policy Matrix (Post-Migration Target State)

| Table | RLS Active | SELECT Scoping | INSERT Scoping | UPDATE Scoping | DELETE Scoping | Tenant Multi-Isolation |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `profiles` | **YES** | Own profile OR same-college staff / super admin | User during registration | Own profile (restricted) OR campus admin | Blocked (Soft delete via `is_active = false`) | Isolated by `college_id` |
| `student_profiles` | **YES** | Own profile OR same-college staff / super admin | Own profile upon onboarding | Same-college admin (verification status) | Blocked | Inherited via `profiles.college_id` |
| `incidents` | **YES** | Reporter (own cases) OR same-college staff / super admin | Authenticated students / reporters | Assigned responder, same-college admin | Blocked (Audit preservation) | Strict `college_id` match; `PENDING_CAMPUS_VERIFICATION` isolated |
| `evidence` | **YES** | Case reporter OR same-college staff / super admin | Case reporter / assigned responder | Case reporter / assigned responder | Case reporter (before case closure) | Bound to incident `college_id` & `case_id` |
| `incident_notes` | **YES** | Assigned responder, same-college staff / admin | Assigned responder, same-college staff / admin | Author only | Blocked | Scoped to parent incident tenant |
| `incident_locations` | **YES** | Reporter OR assigned responder / same-college staff | Incident reporter during active tracking | Blocked | Blocked | Scoped to parent incident |
| `safe_walks` | **YES** | Session owner OR same-college security | Authenticated students | Session owner (heartbeat/end) OR security | Blocked | Scoped to student campus |
| `trusted_contacts` | **YES** | Contact owner only | Contact owner only | Contact owner only | Contact owner only | Scoped strictly to `student_id = auth.uid()` |
| `audit_logs` | **YES** | Campus admin (own campus) OR super admin | System / Authenticated actors | Blocked (Immutable) | Blocked (Immutable) | Scoped to `college_id` metadata |
| `notifications` | **YES** | Recipient only (`user_id = auth.uid()`) | System / Service role | Recipient only (`is_read = true`) | Recipient only | User-level boundary |
| `storage.objects` | **YES** | File owner OR authorized same-college staff | File owner (folder = `auth.uid()`) | File owner | File owner | Isolated via bucket & path prefix |

---

## 3. STORAGE BUCKET PRIVACY & CONFIGURATION

Introspection verified via Supabase Storage API:
- `kavach-evidence`:
  - `public: false` (**STRICTLY PRIVATE**)
  - File access requires signed URLs generated with `createSignedUrl` with 15–60 minute TTLs.
  - Path structure: `<case_id>/<file_name>`
- `kavach-id-cards`:
  - `public: false` (**STRICTLY PRIVATE**)
  - Access restricted to verified student (`auth.uid()`) and same-campus administrators.
  - Path structure: `<user_id>/<file_name>`

---

## 4. `SECURITY DEFINER` FUNCTION AUDIT

The staged migration bundle defines 4 PostgreSQL helper functions to ensure tenant boundaries cannot be spoofed:

```sql
-- 1. Get User Role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role;

-- 2. Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role()::TEXT IN ('ADMIN', 'SUPER_ADMIN'), FALSE);
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3. Get User College ID
CREATE OR REPLACE FUNCTION public.get_user_college_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT college_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_college_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_college_id() TO authenticated, service_role;

-- 4. Is Campus Staff
CREATE OR REPLACE FUNCTION public.is_campus_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    public.get_user_role()::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY', 'STAFF', 'WARDEN', 'COUNSELOR', 'MANAGEMENT'),
    FALSE
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_campus_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_campus_staff() TO authenticated, service_role;
```

### Security Audit Findings:
1. **Search Path Hijacking Protection:** All functions explicitly include `SET search_path = public`, preventing malicious user-defined search paths from invoking Trojaned functions.
2. **Privilege Demarcation:** `REVOKE ... FROM PUBLIC` ensures anonymous users cannot probe role or college information.
3. **Immutability & Safety:** Functions are marked `STABLE` to allow the PostgreSQL query optimizer to cache results within an execution query without executing redundant subqueries.

---

## 5. MIGRATION RISKS & OPERATOR PRE-CONDITIONS

Before executing `supabase/staged_migrations_013_014_combined.sql` in the Supabase Dashboard:

1. **Pre-Migration Backup:**
   - Log into Supabase Dashboard -> Project `polbnvszmvblwenfnqll` -> Database -> Backups.
   - Click **Create Backup**.
2. **Transaction Rollback Protection:**
   - The entire bundle is wrapped in `BEGIN ... COMMIT`. If any single policy or index fails, the database automatically rolls back with zero partial corruption.
3. **Zero Data Loss Guarantee:**
   - The script uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, preventing accidental dropping of existing records or columns.
   - Evidence records will automatically populate `incident_id` and `storage_path` from existing `case_id` and `file_path`.

---

## 6. POST-MIGRATION VERIFICATION CHECKLIST

After the operator applies the migration in the SQL Editor:
1. Run `supabase/verification/kavach_step121_readonly_preflight.sql` to confirm:
   - Zero tables with `rls_enabled = false`.
   - `incident_id` and `storage_path` are present in `information_schema.columns` for `evidence`.
   - `trg_sync_evidence_incident_reference` is active on `evidence`.
2. Run `scripts/test_live_cross_college_isolation.ts` to confirm cross-college boundaries between SRKR and Vishnu institutions.
