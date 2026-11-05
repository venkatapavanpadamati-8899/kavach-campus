# Kavach Campus — Phase 4 Database Migration Audit

**Document:** `docs/PHASE_4_DATABASE_MIGRATION_AUDIT.md`  
**Date:** November 4, 2026  
**Auditor:** Senior Full-Stack & Security Systems Engineer (Antigravity Agent)  
**Workspace:** `D:\kavach-campus`  
**Supabase Instance:** Live Remote Project (`dvyiclyyvmsfipzrdowu`)  
**Git Branch / Commit:** `main` / `ce59e5c1fdbe40eb08b72dfa6050b198366ff03b`  

---

## 1. Executive Summary

A comprehensive, non-destructive, read-only audit of the Kavach Campus PostgreSQL database and migration inventory was performed. The audit inspected:
- All 20 SQL migration files (`001` through `017`) in `supabase/migrations/`.
- All 19 core tables on the remote Supabase database.
- Live storage buckets (`kavach-id-cards`, `kavach-evidence`).
- Constraint integrity and potential collision risks for proposed migrations `015`, `016`, and `017`.

---

## 2. Complete Migration History (001 through 017)

| Migration File | Primary Purpose | Tables / Objects Modified | Idempotent | Remote DB Status |
| :--- | :--- | :--- | :---: | :---: |
| `001_kavach_campus.sql` | Baseline Schema | `profiles`, `incidents`, `evidence`, `campus_zones`, `campus_buildings`, `case_actions`, `escalations`, `incident_locations`, `incident_messages`, `notifications`, `trusted_contacts`, `audit_logs`, `ai_analyses` | Yes | **APPLIED** |
| `001_kavach_campus_final.sql` | Baseline Hardening | Standardizes column constraints & foreign keys | Yes | **APPLIED** |
| `002_kavach_campus_final_repair.sql` | Type & Relation Repairs | `student_profiles`, `staff_profiles` | Yes | **APPLIED** |
| `002_kavach_campus_schema_repair.sql` | Column Patches | Resolves missing verification columns | Yes | **APPLIED** |
| `003_kavach_campus_gps_tracking.sql` | Telemetry Schema | Adds `latitude`, `longitude`, `location_accuracy` to `incident_locations` & `incidents` | Yes | **APPLIED** |
| `004_kavach_campus_safe_walk_schema.sql` | Safe Walk Feature | Creates `safe_walks` table with geofencing & expiration | Yes | **APPLIED** |
| `005_kavach_campus_rls_infinite_recursion_repair.sql` | RLS Performance | Eliminates recursive subqueries in `is_staff()` and `is_security_or_admin()` | Yes | **APPLIED** |
| `006_provision_super_admin.sql` | Root Role Provisioning | Adds Super Admin role constraints | Yes | **APPLIED** |
| `007_student_id_card_verification.sql` | Student ID Verification | Adds `id_card_url`, `verification_status`, storage bucket `kavach-id-cards` | Yes | **APPLIED** |
| `008_kavach_campus_complete_production_alignment.sql` | Indexes & Config | Creates `idx_profiles_student_id`, `ai_configuration`, `emergency_configuration` | Yes | **APPLIED** |
| `008_kavach_campus_schema_and_rls_alignment_safe.sql` | Safe Production Constraints | RLS policy alignment on `profiles` | Yes | **APPLIED** |
| `009_student_id_verification_resubmission.sql` | Verification Workflow | Adds resubmission review policies | Yes | **APPLIED** |
| `010_service_role_and_audit_alignment.sql` | Audit Trail Enforcement | Immutable trigger on `audit_logs` | Yes | **APPLIED** |
| `011_staff_live_locations_and_consent.sql` | Staff Duty Tracking | Staff location consent & retention limits | Yes | **APPLIED** |
| `012_profiles_college_tenant.sql` | Multi-Tenant Architecture | Adds `college_id` column to `profiles` | Yes | **APPLIED** |
| `013_cross_college_rls_isolation.sql` | Cross-College Tenant RLS | Adds `college_id` to `incidents` and same-college staff policies | Yes | **APPLIED** |
| `014_cross_college_rls_hardening.sql` | Tenant Hardening | Synchronizes `evidence.case_id` with `incident_id`; hardens profile updates | Yes | **APPLIED** |
| `015_college_scoped_student_id_uniqueness.sql` | Scoped Roll Number Index | Drops global index; adds `(college_id, student_id)` unique index | Yes | **PENDING OWNER ACTION** |
| `016_safe_box_private_notes.sql` | Safe Box Private Notes | Creates `safe_box_private_notes` table with student-only RLS | Yes | **PENDING OWNER ACTION** |
| `017_student_college_claims.sql` | Applicant Institution Claims | Adds `claimed_college_id` to `student_profiles` & profile photo bucket | Yes | **PENDING OWNER ACTION** |

---

## 3. Deep Technical Review of Pending Migrations

### 3.1 Migration 015: `015_college_scoped_student_id_uniqueness.sql`
- **Objective**: In multi-institution deployments (e.g. SRKR vs Vishnu), two institutions can legally issue identical student registration numbers (e.g. `2101201045` or `24B91A05P0`). The previous global unique index `idx_profiles_student_id` blocks valid student enrollments across different colleges.
- **SQL Operations**:
  ```sql
  DROP INDEX IF EXISTS public.idx_profiles_student_id;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id
  ON public.profiles(college_id, student_id)
  WHERE student_id IS NOT NULL AND role = 'STUDENT';
  ```
- **Live Collision Check (Executed on Remote DB)**:
  - Total existing student profiles: **3**
    - `2456765789` (`PENDING_CAMPUS_VERIFICATION`)
    - `24B91A05P0` (`srkr`)
    - `24B91W23` (`PENDING_CAMPUS_VERIFICATION`)
  - Duplicate student IDs within college scope: **0**
- **Data-Loss Risk**: **ZERO**. The migration only swaps an index definition. No data is modified or deleted.

### 3.2 Migration 016: `016_safe_box_private_notes.sql`
- **Objective**: Provides an encrypted personal journal / notes capability tied to uploaded confidential evidence in the Safe Box.
- **SQL Operations**:
  - Creates table `safe_box_private_notes` with primary key `evidence_id UUID REFERENCES public.evidence(id) ON DELETE CASCADE`.
  - Creates foreign key `owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`.
  - Enforces `char_length(private_note) <= 2000`.
  - Enables Row Level Security and creates policy `"Students manage own Safe Box notes"` strictly matching `owner_id = auth.uid()`.
- **Live Foreign Key Check**:
  - `evidence` table exists and is referenced cleanly.
  - `profiles` table exists and is referenced cleanly.
- **Data-Loss Risk**: **ZERO**. This is an additive table creation (`CREATE TABLE IF NOT EXISTS`).

### 3.3 Migration 017: `017_student_college_claims.sql`
- **Objective**: Allows student applicants to specify their intended college during registration without granting immediate tenant privileges until verified by institutional administrators.
- **SQL Operations**:
  - `ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;`
  - `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;`
  - Creates partial index `idx_student_profiles_claimed_college_status`.
  - Provisions private storage bucket `kavach-profile-photos` with a 2 MB size limit and image MIME restrictions.
- **Data-Loss Risk**: **ZERO**. Purely additive column additions with `IF NOT EXISTS`.

---

## 4. Live Database Inventory (19 Core Tables)

| # | Table Name | Primary Key | Foreign Key References | Row Count (Live) | RLS Status |
| :-: | :--- | :--- | :--- | :---: | :---: |
| 1 | `profiles` | `id` (UUID) | `auth.users(id)` | 6 | **ENABLED** |
| 2 | `student_profiles` | `id` (UUID) | `profiles(id)` | 3 | **ENABLED** |
| 3 | `staff_profiles` | `id` (UUID) | `profiles(id)` | 0 | **ENABLED** |
| 4 | `user_otp_verifications` | `id` (UUID) | None | 34 | **ENABLED** |
| 5 | `campus_zones` | `id` (UUID) | None | 0 | **ENABLED** |
| 6 | `campus_buildings` | `id` (UUID) | `campus_zones(id)` | 0 | **ENABLED** |
| 7 | `incidents` | `id` (UUID) | `profiles(id)` | 40 | **ENABLED** |
| 8 | `incident_locations` | `id` (UUID) | `incidents(id)` | 10 | **ENABLED** |
| 9 | `evidence` | `id` (UUID) | `incidents(id)`, `profiles(id)` | 0 | **ENABLED** |
| 10 | `ai_analyses` | `id` (UUID) | `incidents(id)` | 0 | **ENABLED** |
| 11 | `escalations` | `id` (UUID) | `incidents(id)`, `profiles(id)` | 29 | **ENABLED** |
| 12 | `incident_messages` | `id` (UUID) | `incidents(id)`, `profiles(id)` | 0 | **ENABLED** |
| 13 | `case_actions` | `id` (UUID) | `incidents(id)`, `profiles(id)` | 29 | **ENABLED** |
| 14 | `notifications` | `id` (UUID) | `profiles(id)` | 38 | **ENABLED** |
| 15 | `safe_walks` | `id` (UUID) | `profiles(id)` | 0 | **ENABLED** |
| 16 | `trusted_contacts` | `id` (UUID) | `profiles(id)` | 0 | **ENABLED** |
| 17 | `audit_logs` | `id` (UUID) | `profiles(id)` | 481 | **ENABLED** |
| 18 | `ai_configuration` | `id` (UUID) | None | 0 | **ENABLED** |
| 19 | `emergency_configuration` | `id` (UUID) | None | 0 | **ENABLED** |

---

## 5. Storage Buckets Audit

| Bucket ID | Access Level | File Size Limit | Allowed MIME Types | Signed URL Lifespan |
| :--- | :---: | :---: | :--- | :---: |
| `kavach-id-cards` | **PRIVATE** (`public=false`) | 5 MB | JPEG, PNG, WEBP, PDF | 300 seconds (5 mins) |
| `kavach-evidence` | **PRIVATE** (`public=false`) | 25 MB | Images, Video (MP4/WebM), Audio, PDF | 900 seconds (15 mins) |
| `kavach-profile-photos` *(017)* | **PRIVATE** (`public=false`) | 2 MB | JPEG, PNG, WEBP | 300 seconds (5 mins) |

---

## 6. Audit Conclusion & Phase 4 Status

All migrations 001–014 are live and healthy on Supabase. Proposed migrations 015, 016, and 017 have been thoroughly vetted, tested against live data for index collisions (0 duplicates found), and confirmed to carry **zero risk of data corruption or loss**.

**Status:** Ready for Owner Review & Staged Execution.

