# KAVACH CAMPUS — PHASE 15E: BASELINE MIGRATION INVENTORY

**Project:** Kavach Campus  
**Workspace:** `D:\kavach-campus`  
**Phase:** 15E — Baseline Migrations 001–014 Verification & Local Schema Alignment  
**Generated At:** 2026-11-04  
**Audit Status:** COMPLETE — READ-ONLY INVENTORY  

---

## 1. Executive Summary

A comprehensive inventory of all baseline migration files located in `supabase/migrations/` covering sequence `001_` through `014_` was conducted. A total of **17 baseline migration files** (amounting to ~168 KB of SQL DDL/DML) were inspected, classified, and analyzed.

The analysis confirms the historical evolution of the codebase schema across multiple hardening phases. Specifically, multiple versions of early migrations exist (e.g., `001_` base vs `final`, `002_` final repair vs schema repair, and `008_` alignment variants), followed by incremental linear hardening migrations from `009_` through `014_`.

---

## 2. Complete Baseline Migration Inventory Table (001–014)

| Sequence | Migration File Name | Size (Bytes) | Category / Type | Primary DDL / Operations | Key Objects Created / Modified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **001** | `001_kavach_campus.sql` | 12,003 | Initial Schema | `CREATE TABLE` (19 tables), `CREATE EXTENSION "uuid-ossp"` | Base 19 tables, enum types (`app_role`, `incident_status`, `priority_level`), 17 RLS policies |
| **001** | `001_kavach_campus_final.sql` | 16,849 | Hardened Initial Schema | `CREATE TABLE IF NOT EXISTS` (19 tables) | Base 19 tables with idempotent guards, 28 RLS policies, audit logs |
| **002** | `002_kavach_campus_final_repair.sql` | 20,164 | Schema & Constraint Repair | `CREATE TABLE IF NOT EXISTS`, Storage inserts | 19 tables, `kavach-evidence` & `kavach-id-cards` buckets, 31 RLS policies |
| **002** | `002_kavach_campus_schema_repair.sql` | 2,866 | Repair Patch | `ALTER TABLE`, `CREATE INDEX` | Adds `ocr_extracted_data`, `id_card_url`, `verification_status` to `student_profiles` |
| **003** | `003_kavach_campus_gps_tracking.sql` | 4,281 | Feature Extension | `CREATE TABLE`, `CREATE INDEX` | Responder live GPS telemetry, spatial coordinates |
| **004** | `004_kavach_campus_safe_walk_schema.sql` | 7,162 | Feature Extension | `CREATE TABLE`, `CREATE POLICY` | SafeWalk session tracking, companion assignment, companion RLS |
| **005** | `005_kavach_campus_rls_infinite_recursion_repair.sql` | 3,925 | Security Patch | `CREATE OR REPLACE FUNCTION`, `DROP/CREATE POLICY` | Fixes RLS infinite recursion on `profiles` by introducing `get_user_role()` function |
| **006** | `006_provision_super_admin.sql` | 1,489 | Provisioning | Seed DML | Seeds root super-admin account into `auth.users` and `public.profiles` |
| **007** | `007_student_id_card_verification.sql` | 5,612 | Security & Storage | `ALTER TABLE`, Storage policies, Triggers | Private storage bucket `kavach-id-cards`, `trg_prevent_student_profile_tampering` |
| **008** | `008_kavach_campus_complete_production_alignment.sql` | 41,200 | Comprehensive Production Snapshot | `CREATE TABLE IF NOT EXISTS`, Triggers, Functions | Full unified schema baseline, sync triggers, storage buckets, 35 RLS policies |
| **008** | `008_kavach_campus_schema_and_rls_alignment_safe.sql` | 28,140 | Non-Destructive Production Alignment | `DO $$ ... $$`, `ALTER TABLE ADD COLUMN IF NOT EXISTS` | Idempotent non-destructive repair of all 19 tables, indexes, and core RLS |
| **009** | `009_student_id_verification_resubmission.sql` | 3,124 | Security & Constraint Patch | `ALTER TABLE`, `CREATE OR REPLACE FUNCTION`, Trigger | Adds `RESUBMISSION_REQUIRED` to `check_verification_status`, trigger `trg_prevent_student_self_verification` |
| **010** | `010_service_role_and_audit_alignment.sql` | 2,130 | Security & Service Role | `ALTER TABLE`, `CREATE OR REPLACE FUNCTION` | Adds `actor_id`, `entity_type`, `entity_id` to `audit_logs`, hardens `is_security_or_admin()` |
| **011** | `011_staff_live_locations_and_consent.sql` | 2,363 | Table & Security Extension | `CREATE TABLE IF NOT EXISTS`, Indexes, RLS | Dedicated `staff_locations` table, explicit consent timestamps, on-duty RLS |
| **012** | `012_profiles_college_tenant.sql` | 4,217 | Multi-Tenant Architecture | `ALTER TABLE`, `CREATE INDEX`, Function, Storage update | Adds `profiles.college_id`, function `get_user_college_id()`, updates `kavach-evidence` (25MB, audio) |
| **013** | `013_cross_college_rls_isolation.sql` | 7,105 | Tenant RLS Isolation | `ALTER TABLE`, Triggers, RLS replacement | Adds `incidents.college_id`, auto-assign trigger, replaces global policies with tenant-isolated RLS |
| **014** | `014_cross_college_rls_hardening.sql` | 26,827 | Production RLS Hardening | `ALTER TABLE`, Functions, Triggers, RLS rewrite | Hardens multi-tenant isolation, adds `is_campus_staff()`, `prevent_self_role_escalation()`, evidence sync triggers |

---

## 3. Detailed File Analysis

### 3.1 Migration 001–002 Variants (Base Schema Creation)
- **Files:** `001_kavach_campus.sql`, `001_kavach_campus_final.sql`, `002_kavach_campus_final_repair.sql`, `002_kavach_campus_schema_repair.sql`
- **Purpose:** Defined the initial database schema consisting of 19 core tables (`profiles`, `student_profiles`, `staff_profiles`, `incidents`, `evidence`, etc.), standard PostgreSQL extensions (`uuid-ossp`, `pgcrypto`), and initial baseline RLS.
- **Local Application Status:** Applied. All 19 public tables exist in the local Docker PostgreSQL database.

### 3.2 Migrations 003–007 (Feature Enhancements & Security Fixes)
- **Files:** 
  - `003_kavach_campus_gps_tracking.sql`: Location telemetry schema.
  - `004_kavach_campus_safe_walk_schema.sql`: SafeWalk session support.
  - `005_kavach_campus_rls_infinite_recursion_repair.sql`: Introduced `get_user_role()` function to eliminate RLS recursion between `profiles` and child tables.
  - `006_provision_super_admin.sql`: Administrative seeding.
  - `007_student_id_card_verification.sql`: Student ID verification metadata columns and `kavach-id-cards` private storage bucket.
- **Local Application Status:** Applied. Tables and basic functions exist locally.

### 3.3 Migration 008 Variants (Comprehensive Production Alignment)
- **Files:** `008_kavach_campus_complete_production_alignment.sql`, `008_kavach_campus_schema_and_rls_alignment_safe.sql`
- **Purpose:** Unified all schema elements, resolved missing columns, ensured idempotent structure across tables, and solidified initial RLS policies.
- **Local Application Status:** Applied. The local database reflects the schema state established by migration 008.

### 3.4 Migration 009: Student ID Verification Resubmission
- **File:** `009_student_id_verification_resubmission.sql`
- **Purpose:** 
  1. Updates `check_verification_status` check constraint on `student_profiles` to permit `'RESUBMISSION_REQUIRED'`.
  2. Creates trigger `trg_prevent_student_self_verification` executing `prevent_student_self_verification()` to block students from self-approving to `'VERIFIED'`.
  3. Enforces private storage bucket `kavach-id-cards` RLS.
- **Local Application Status:** **NOT APPLIED**.
  - Local constraint `check_verification_status` only permits `['PENDING_UPLOAD', 'PENDING_VERIFICATION', 'PENDING_MANUAL_REVIEW', 'VERIFIED', 'REJECTED']`.
  - Trigger `trg_prevent_student_self_verification` is absent.

### 3.5 Migration 010: Service Role & Audit Log Alignment
- **File:** `010_service_role_and_audit_alignment.sql`
- **Purpose:**
  1. Adds `actor_id`, `entity_type`, and `entity_id` columns to `public.audit_logs`.
  2. Hardens `is_security_or_admin()` function to recognize `service_role` and JWT claims securely without relying on `current_user`.
  3. Updates `prevent_student_self_verification()` trigger function.
- **Local Application Status:** **PARTIALLY APPLIED / PENDING**.
  - Columns exist on `audit_logs`, but the hardened `is_security_or_admin()` function definition requires validation and alignment.

### 3.6 Migration 011: Staff Live Locations & Consent Schema
- **File:** `011_staff_live_locations_and_consent.sql`
- **Purpose:**
  1. Creates dedicated `staff_locations` table with foreign key to `public.profiles(id)`.
  2. Adds spatial telemetry, duty status (`is_on_duty`), and explicit consent fields (`is_location_sharing_enabled`, `consent_recorded_at`, `consent_withdrawn_at`).
  3. Creates indexes and dedicated RLS policies (`staff_locations_self_manage`, `staff_locations_dispatch_read`).
- **Local Application Status:** **NOT APPLIED**.
  - Table `staff_locations` does NOT exist in the local database.

### 3.7 Migration 012: Profiles College Tenant & Multi-Tenancy Architecture
- **File:** `012_profiles_college_tenant.sql`
- **Purpose:**
  1. Adds tenant identifier `college_id TEXT` to `public.profiles`.
  2. Safely maps official email domains (`@srkr.edu.in`, `@srkrec.ac.in` -> `'srkr-bhimavaram'`, `@vishnu.edu.in`, `@svecw.edu.in` -> `'vishnu-bhimavaram'`).
  3. Flags ambiguous profiles as `'PENDING_CAMPUS_VERIFICATION'`.
  4. Creates helper function `get_user_college_id()` (`SECURITY DEFINER`, `STABLE`).
  5. Updates `kavach-evidence` storage bucket: increases size limit to 25 MB and allows audio MIME types (`audio/webm`, `audio/ogg`, `audio/mpeg`, `audio/mp4`).
- **Local Application Status:** **NOT APPLIED**.
  - Column `profiles.college_id` is MISSING.
  - Function `get_user_college_id()` is MISSING.
  - Bucket `kavach-evidence` remains at 10 MB limit without audio MIME types.

### 3.8 Migration 013: Cross-College RLS Isolation & Data Partitioning
- **File:** `013_cross_college_rls_isolation.sql`
- **Purpose:**
  1. Adds `college_id TEXT` to `public.incidents`.
  2. Backfills `incidents.college_id` from reporting student profile.
  3. Creates auto-assignment trigger `trg_assign_incident_college_id`.
  4. Enforces strict tenant-isolated RLS on `profiles`, `incidents`, `safe_walks`, `escalations`, `evidence`, and storage objects.
- **Local Application Status:** **NOT APPLIED**.
  - Column `incidents.college_id` is MISSING.
  - Policies on `profiles` and `incidents` remain permissive baseline policies (`Staff can read all profiles`, `Authorized users view incidents`).

### 3.9 Migration 014: Cross-College RLS Hardening
- **File:** `014_cross_college_rls_hardening.sql`
- **Purpose:**
  1. Adds `case_id` and `file_path` to `public.evidence` with bi-directional synchronization trigger `sync_evidence_incident_reference()`.
  2. Creates helper function `is_campus_staff()`.
  3. Creates security trigger `prevent_self_role_escalation()` on `public.profiles`.
  4. Hardens `trg_fn_assign_incident_college_id()` trigger.
  5. Purges legacy permissive policies and installs strict, multi-tenant hardened RLS policies across all tables.
- **Local Application Status:** **PARTIALLY APPLIED / PENDING**.
  - `evidence.case_id` and `evidence.file_path` exist.
  - Function `is_campus_staff()` is MISSING.
  - Multi-tenant RLS policies are NOT active.

---

## 4. Key Takeaway

The baseline migrations `001` through `008` constitute the structural foundation currently present in the local Docker Supabase database. The subsequent hardening migrations (`009`, `010`, `011`, `012`, `013`, `014`) represent the essential multi-tenant isolation layer that must be applied locally before testing migrations `015`, `016`, and `017`.

