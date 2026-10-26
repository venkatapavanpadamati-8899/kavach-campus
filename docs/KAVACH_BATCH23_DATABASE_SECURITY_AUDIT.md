# KAVACH CAMPUS — BATCH 23: DATABASE & SUPABASE SECURITY AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Local Database:** `localhost:54322` (`supabase_db_kavach_campus`)  
**Production Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Audit Status:** **100% VERIFIED LOCALLY**

---

## 1. Public Table Schema & Row Level Security (RLS) Status

Evaluated via live catalog query on PostgreSQL:

| # | Table Name | RLS Enabled | Primary Key | Foreign Key References | Active Policies Summary |
|:---:|:---|:---:|:---:|:---|:---|
| 1 | `profiles` | **TRUE** | `id` (UUID) | `auth.users(id)` | Strict self-read (`auth.uid() = id`), staff view all, self-update. Role escalation blocked by trigger. |
| 2 | `student_profiles` | **TRUE** | `id` (UUID) | `profiles(id)` | Owner read/update. `prevent_student_profile_tampering` trigger blocks verification forgery. |
| 3 | `staff_profiles` | **TRUE** | `id` (UUID) | `profiles(id)` | Staff self-read and admin management. |
| 4 | `incidents` | **TRUE** | `id` (UUID) | `student_id -> profiles(id)`, `assigned_to -> profiles(id)` | Students view own; assigned staff view assigned; security/admin view all active emergencies. |
| 5 | `incident_locations` | **TRUE** | `id` (UUID) | `incident_id -> incidents(id)` | Case-bound GPS trail. Isolated to incident owner and assigned responders. |
| 6 | `evidence` | **TRUE** | `id` (UUID) | `case_id -> incidents(case_id)`, `uploaded_by -> profiles(id)` | Case-bound evidence isolation. Staff cannot view evidence for unassigned cases. |
| 7 | `safe_walks` | **TRUE** | `id` (UUID) | `student_id -> profiles(id)` | Owner manages own safe walks; active responders view active journeys. |
| 8 | `trusted_contacts` | **TRUE** | `id` (UUID) | `student_id -> profiles(id)` | Strictly isolated to owner (`auth.uid() = student_id`). |
| 9 | `user_otp_verifications` | **TRUE** | `id` (UUID) | None | Service-role only access. Anonymous access returns 0 rows. |
| 10 | `audit_logs` | **TRUE** | `id` (UUID) | `actor_id -> profiles(id)` | Append-only. Admin view only. Students cannot read or alter audit logs. |
| 11 | `case_actions` | **TRUE** | `id` (UUID) | `incident_id -> incidents(id)`, `actor_id -> profiles(id)` | Incident timeline history. Readable by case participants and administration. |
| 12 | `escalations` | **TRUE** | `id` (UUID) | `incident_id -> incidents(id)` | Admin and responder escalation queue. |
| 13 | `notifications` | **TRUE** | `id` (UUID) | `user_id -> profiles(id)` | Recipient reads own notifications. |
| 14 | `incident_messages` | **TRUE** | `id` (UUID) | `incident_id -> incidents(id)`, `sender_id -> profiles(id)` | In-app incident messaging restricted to active case participants. |
| 15 | `ai_analyses` | **TRUE** | `id` (UUID) | `incident_id -> incidents(id)` | Security responders and administrators read AI risk classification. |
| 16 | `ai_configuration` | **TRUE** | `id` (UUID) | `updated_by -> profiles(id)` | Admin manage only. |
| 17 | `emergency_configuration` | **TRUE** | `id` (UUID) | `updated_by -> profiles(id)` | Public read of active campus helpline numbers (112, 108); writes locked to `ADMIN`. |
| 18 | `campus_buildings` | FALSE | `id` (UUID) | None | Non-sensitive public campus map geometry and building coordinates. |
| 19 | `campus_zones` | FALSE | `id` (UUID) | None | Non-sensitive public campus security zones and boundaries. |

---

## 2. SECURITY DEFINER Functions Audit

All 7 security functions were inspected for ownership, execution privileges, and search path safety:

| Function Name | Owner | Search Path | Returns | Privilege Boundary & Purpose |
|:---|:---:|:---:|:---:|:---|
| `public.is_admin()` | `postgres` | `public, auth` | `boolean` | Verifies `profiles.role IN ('ADMIN', 'SUPER_ADMIN')` and `is_approved = true`. |
| `public.is_staff()` | `postgres` | `public, auth` | `boolean` | Verifies `profiles.role IN ('STAFF', 'SECURITY', 'ADMIN', ...)` and `is_approved = true`. |
| `public.is_security_or_admin()` | `postgres` | `public, auth` | `boolean` | Verifies security desk or administrator privileges. |
| `public.is_reviewer()` | `postgres` | `public, auth` | `boolean` | Verifies verification queue reviewer authorization. |
| `public.calculate_distance()` | `postgres` | `public` | `double precision` | Haversine formula calculation for finding nearest available staff. |
| `public.prevent_self_role_escalation()` | `postgres` | `public` | `trigger` | Blocks client updates attempting to alter `profiles.role` or `is_approved`. |
| `public.prevent_student_profile_tampering()` | `postgres` | `public` | `trigger` | Blocks students from altering `verification_status` or academic batch dates once verified. |

---

## 3. Storage Buckets Privacy & Object Authorization

- **`kavach-evidence`:** `public = false`, 10MB limit. RLS policy requires authenticated user to be either the evidence uploader or an assigned responder / administrator.
- **`kavach-id-cards`:** `public = false`, 5MB limit. RLS policy requires folder prefix to match `auth.uid()`. Unauthenticated access is completely blocked.

---

## 4. `emergency_configuration` Public Read Policy Review

- **Policy:** `CREATE POLICY "Public read emergency config" ON public.emergency_configuration FOR SELECT USING (true);`
- **Assessment:**
  - Table stores exclusively: campus police helpline (112), security room phone, women's safety desk (1091), and ambulance (108).
  - No secrets, PII, passwords, or student records exist in this table.
  - Making these helplines readable without requiring authentication is an intentional campus safety pattern so visitors and unregistered students can dial campus security.
  - Mutations (`INSERT`, `UPDATE`, `DELETE`) are strictly locked to `is_admin()`.
