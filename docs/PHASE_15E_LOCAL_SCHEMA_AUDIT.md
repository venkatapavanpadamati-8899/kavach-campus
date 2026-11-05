# KAVACH CAMPUS — PHASE 15E: LOCAL SCHEMA AUDIT REPORT

**Project:** Kavach Campus  
**Workspace:** `D:\kavach-campus`  
**Target Environment:** Local Docker Supabase (`127.0.0.1:54322`, Database: `postgres`)  
**Audit Executed:** 2026-11-04  
**Audit Method:** Direct PostgreSQL Protocol Query via `pg` client (Read-Only)  
**Security Status:** 100% Isolated from Production  

---

## 1. Executive Summary

A comprehensive, non-invasive forensic schema audit was performed against the active local Supabase PostgreSQL container (`supabase_db_kavach_campus` running on port `54322`). 

The inspection revealed that the local database is currently structured around the **Migration 008 Baseline**. It possesses 19 core application tables, 2 storage buckets, 8 public stored procedures/functions, 3 triggers, 51 database constraints, 3 enumerated types, and 27 Row Level Security (RLS) policies.

Crucially, the migration tracker table (`supabase_migrations.schema_migrations`) does NOT exist locally because `supabase/config.toml` has `[db.migrations] enabled = false` to prevent startup collisions. Consequently, the local schema has not yet received migrations `009` through `014`.

---

## 2. Table Inventory and Row Counts

All 19 tables in the `public` schema were inspected for Row Level Security status and active record counts:

| # | Table Name | RLS Enabled | Row Count | Primary Key | Description / Purpose |
| :-: | :--- | :-: | :-: | :--- | :--- |
| 1 | `ai_analyses` | Yes | 0 | `id (UUID)` | AI incident categorization and risk scores |
| 2 | `ai_configuration` | Yes | 0 | `id (UUID)` | AI model settings and fallback switches |
| 3 | `audit_logs` | Yes | 8 | `id (UUID)` | Security and administrative audit trail |
| 4 | `campus_buildings` | No | 0 | `id (UUID)` | Institutional building reference data |
| 5 | `campus_zones` | No | 0 | `id (UUID)` | Campus security geofencing zones |
| 6 | `case_actions` | Yes | 0 | `id (UUID)` | Incident lifecycle workflow transitions |
| 7 | `emergency_configuration` | Yes | 0 | `id (UUID)` | Campus emergency hotline numbers |
| 8 | `escalations` | Yes | 0 | `id (UUID)` | Incident management escalation logs |
| 9 | `evidence` | Yes | 0 | `id (UUID)` | Media attachments and incident files |
| 10 | `incident_locations` | Yes | 2 | `id (UUID)` | GPS location logs for incidents |
| 11 | `incident_messages` | Yes | 0 | `id (UUID)` | Secure two-way incident messaging |
| 12 | `incidents` | Yes | 2 | `id (UUID)` | Student safety reports and incident records |
| 13 | `notifications` | Yes | 0 | `id (UUID)` | In-app user notifications |
| 14 | `profiles` | Yes | 7 | `id (UUID)` | Core user accounts linked to `auth.users` |
| 15 | `safe_walks` | Yes | 0 | `id (UUID)` | Real-time companion walking sessions |
| 16 | `staff_profiles` | Yes | 0 | `id (UUID)` | Security, counselor, and staff credentials |
| 17 | `student_profiles` | Yes | 2 | `id (UUID)` | Student admission, ID verification details |
| 18 | `trusted_contacts` | Yes | 0 | `id (UUID)` | Emergency SOS contact numbers |
| 19 | `user_otp_verifications` | Yes | 0 | `id (UUID)` | Mobile OTP verification records |

**Total Records Preserved Locally:** 19 records (7 profiles, 2 student profiles, 2 incidents, 2 locations, 8 audit logs, 0 others).

---

## 3. Storage Bucket Configuration

The `storage.buckets` table was inspected directly:

| Bucket ID | Public Access | File Size Limit | Allowed MIME Types | Migration Origin | Alignment Status |
| :--- | :-: | :-: | :--- | :--- | :--- |
| `kavach-evidence` | `false` | `10,485,760` bytes (10 MB) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `video/mp4` | Migration 002 / 008 | Needs upgrade to 25 MB and audio MIME types (Migration 012) |
| `kavach-id-cards` | `false` | `5,242,880` bytes (5 MB) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | Migration 007 / 009 | Aligned with Migration 007/009 spec |
| `kavach-claim-id-cards` | — | — | — | Migration 017 | **MISSING** (to be added in Phase 15G / Migration 017) |

---

## 4. Public Functions & Stored Procedures

Eight stored procedures and helper functions currently exist in the `public` schema:

| Routine Name | Routine Type | Return Type | Security Context | Purpose / Origin |
| :--- | :--- | :--- | :--- | :--- |
| `get_user_role` | FUNCTION | `app_role` | SECURITY DEFINER | Returns caller's profile role without recursion (Migration 005) |
| `is_admin` | FUNCTION | `boolean` | SECURITY DEFINER | Checks if caller has ADMIN or SUPER_ADMIN role |
| `is_reviewer` | FUNCTION | `boolean` | SECURITY DEFINER | Checks if caller is authorized to review incident cases |
| `is_security_or_admin` | FUNCTION | `boolean` | SECURITY DEFINER | Baseline version from Migration 001/008 (requires service_role hardening from 010) |
| `is_staff` | FUNCTION | `boolean` | SECURITY DEFINER | Checks if caller has any campus staff role |
| `prevent_self_role_escalation` | FUNCTION | `trigger` | SECURITY DEFINER | Prevents non-admins from altering their own role (Migration 008) |
| `prevent_student_profile_tampering` | FUNCTION | `trigger` | SECURITY DEFINER | Blocks students from altering approved admission metadata (Migration 007) |
| `update_updated_at_column` | FUNCTION | `trigger` | VOLATILE | Standard timestamp maintenance trigger (Migration 001) |

### Missing Functions (Introduced in Hardening Migrations 009–014):
1. `prevent_student_self_verification()`: Missing (Migration 009/010).
2. `get_user_college_id()`: Missing (Migration 012).
3. `trg_fn_assign_incident_college_id()`: Missing (Migration 013/014).
4. `is_campus_staff()`: Missing (Migration 014).
5. `sync_evidence_incident_reference()`: Missing (Migration 014).

---

## 5. Active Database Triggers

Three database triggers are actively configured in the `public` schema:

| Target Table | Trigger Name | Action Timing | Event Manipulation | Function Called |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | `trg_prevent_self_role_escalation` | BEFORE | UPDATE | `prevent_self_role_escalation()` |
| `profiles` | `update_profiles_updated_at` | BEFORE | UPDATE | `update_updated_at_column()` |
| `student_profiles` | `trg_prevent_student_profile_tampering` | BEFORE | UPDATE | `prevent_student_profile_tampering()` |

### Missing Triggers:
1. `student_profiles.trg_prevent_student_self_verification`: Missing (Migration 009).
2. `incidents.trg_assign_incident_college_id`: Missing (Migration 013/014).
3. `evidence.trg_sync_evidence_incident_reference`: Missing (Migration 014).

---

## 6. Constraints and Enumerations

### 6.1 Enumerated Types
- `app_role`: `['STUDENT', 'STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'ADMIN', 'SUPER_ADMIN']`
- `incident_status`: `['RECEIVED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED', 'FALSE_ALARM']`
- `priority_level`: `['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']`

### 6.2 Key Check Constraints
- `student_profiles.check_admission_type`: `CHECK (admission_type = ANY (ARRAY['REGULAR'::text, 'LATERAL_ENTRY'::text]))` — **ALIGNED**
- `student_profiles.check_verification_status`: `CHECK (verification_status = ANY (ARRAY['PENDING_UPLOAD'::text, 'PENDING_VERIFICATION'::text, 'PENDING_MANUAL_REVIEW'::text, 'VERIFIED'::text, 'REJECTED'::text]))` — **UNALIGNED** (lacks `'RESUBMISSION_REQUIRED'`, introduced in Migration 009).

---

## 7. Row Level Security Policies (27 Active Policies)

The local database currently enforces 27 baseline RLS policies across the tables.
Inspection of these policies confirms they represent the **pre-tenant-isolation** model:
- `profiles`: Has `"Staff can read all profiles"` with condition `is_staff()` (Global, permissive).
- `incidents`: Has `"Authorized users view incidents"` with condition `((student_id = auth.uid()) OR (assigned_to = auth.uid()) OR is_reviewer())` (Lacks `college_id` isolation).
- `escalations`: Has `"Staff and admin view escalations"` (Lacks `college_id` filter).
- `evidence`: Has `"Authorized users view incident evidence"` (Lacks `college_id` filter).

These global policies will be cleanly upgraded to multi-tenant scoped policies during the controlled local alignment plan (applying 012, 013, 014).

