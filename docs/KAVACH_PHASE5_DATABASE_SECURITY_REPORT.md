# KAVACH CAMPUS — PHASE 5: DATABASE SCHEMA, RLS, GRANTS & FUNCTIONS AUDIT

**Project:** Kavach Campus — Safety in One Tap (`D:\Kavach Campus`)  
**Scope:** Complete Catalog Audit of 19 Tables, RLS Policies, Grants, Triggers, and SECURITY DEFINER Functions  
**Execution Environment:** Isolated Disposable PostgreSQL Container (`kavach_batch19_disposable_db`)  
**Date:** October 18, 2026

---

## 1. Table Schema & RLS Status (19 Base Tables Verified)

| Table Name | Columns Count | RLS Enabled | Primary Key | Foreign Keys | Triggers | Access Boundaries Verified |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `profiles` | 9 | ✅ YES | `id` | `auth.users(id)` | `trg_prevent_self_role_escalation` | Users read/update own; Staff read all; Self role escalation blocked |
| `student_profiles` | 13 | ✅ YES | `id` | `profiles(id)` | `trg_prevent_student_profile_tampering` | Student read own; Tampering with verification or batch years blocked |
| `staff_profiles` | 8 | ✅ YES | `id` | `profiles(id)` | `update_staff_updated_at` | Staff read own; Admin manage |
| `incidents` | 16 | ✅ YES | `id` | `student_id`, `assigned_to` | None | Student view own; Assigned responders view assigned cases |
| `incident_locations` | 6 | ✅ YES | `id` | `incident_id` | None | Case-bound; Responders only view assigned locations |
| `incident_messages` | 7 | ✅ YES | `id` | `incident_id`, `sender_id` | None | Incident participants view messages |
| `evidence` | 9 | ✅ YES | `id` | `incident_id`, `uploaded_by` | None | Case-bound; Unassigned responders blocked |
| `safe_walks` | 15 | ✅ YES | `id` | `student_id`, `escalation_id`| None | Student manage own; Security responders view |
| `trusted_contacts` | 6 | ✅ YES | `id` | `student_id` | None | Student manage own; Zero cross-student access |
| `escalations` | 9 | ✅ YES | `id` | `incident_id` | None | Staff and admin only; Default-deny to students |
| `case_actions` | 7 | ✅ YES | `id` | `incident_id`, `actor_id` | None | Staff and admin only |
| `notifications` | 7 | ✅ YES | `id` | `user_id`, `incident_id` | None | User view own notifications |
| `user_otp_verifications`| 7 | ✅ YES | `id` | None | None | Service-role only; Default-deny to anon/authenticated |
| `audit_logs` | 9 | ✅ YES | `id` | `actor_id` | None | Admin view; Insert via trusted functions |
| `ai_analyses` | 9 | ✅ YES | `id` | `incident_id` | None | Staff view; Default-deny to students |
| `ai_configuration` | 6 | ✅ YES | `id` | `updated_by` | None | Admin manage; Read by system |
| `campus_zones` | 6 | ✅ YES | `id` | None | None | Public read for safety; Admin manage |
| `campus_buildings` | 6 | ✅ YES | `id` | `zone_id` | None | Public read; Admin manage |
| `emergency_configuration`| 6 | ✅ YES | `id` | `updated_by` | None | Public read for emergency dial; Admin manage |

---

## 2. SECURITY DEFINER Functions Audit

| Function Name | Return Type | Owner | search_path | Execute Grants | Security Posture |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `get_user_role()` | `app_role` | `postgres` | `public` | `authenticated` | ✅ Safe (No recursion, non-dynamic) |
| `is_staff()` | `boolean` | `postgres` | `public` | `authenticated` | ✅ Safe (Solves 42P17 recursion) |
| `is_admin()` | `boolean` | `postgres` | `public` | `authenticated` | ✅ Safe (Restricted to ADMIN/SUPER_ADMIN) |
| `is_reviewer()` | `boolean` | `postgres` | `public` | `authenticated` | ✅ Safe (Requires is_approved=true) |
| `is_security_or_admin()` | `boolean` | `postgres` | `public` | `authenticated` | ✅ Safe |
| `prevent_self_role_escalation()` | `trigger` | `postgres` | `public` | None (Trigger) | ✅ Safe (Blocks non-admin role/approval changes) |
| `prevent_student_profile_tampering()` | `trigger` | `postgres` | `public` | None (Trigger) | ✅ Safe (Protects verification & batch credentials) |

---

## 3. Dynamic Access Boundary Verification
- **Student Privacy:** Tested in isolated disposable DB; Student A querying Student B's profile returned 0 rows.
- **Role Escalation Protection:** Executed `UPDATE profiles SET role = 'ADMIN'`; thrown exception: `Access Denied: Only administrators can modify roles or approval status.`
- **Profile Tampering Protection:** Executed `UPDATE student_profiles SET verification_status = 'VERIFIED'`; thrown exception: `Access Denied: verification_status can only be modified by authorized institutional reviewers.`
- **GPS Breadcrumb Privacy:** Staff responder queried `incident_locations`; saw 1 assigned location, 0 unassigned locations.
- **Evidence Isolation:** Staff responder queried `evidence`; saw 1 assigned item, 0 unassigned items.
- **Anonymous Blocking:** Anonymous queries returned 0 rows across `incidents` and `profiles`.
