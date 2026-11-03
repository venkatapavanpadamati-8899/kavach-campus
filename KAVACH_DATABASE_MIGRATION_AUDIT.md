# KAVACH CAMPUS — DATABASE MIGRATION AUDIT REPORT

**Date:** 2026-11-03
**Project:** Kavach Campus
**Database Engine:** Supabase PostgreSQL with PostGIS & RLS
**Environment:** Staging / Production
**Audit Status:** COMPLETE & VERIFIED

---

## 1. Migration Inventory & Classification

| Migration ID | File Name | Purpose / Scope | Safety Impact | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **001** | `001_kavach_campus.sql` | Base schema: profiles, incidents, responders, audit logs | Non-destructive initial DDL | **Applied & Verified** |
| **001b** | `001_kavach_campus_final.sql` | Consolidated tables, triggers, helper functions | Non-destructive | **Applied & Verified** |
| **002** | `002_kavach_campus_final_repair.sql` | Profile foreign key repairs and constraints | Non-destructive | **Applied & Verified** |
| **002b** | `002_kavach_campus_schema_repair.sql` | PostGIS point geometry & safe walk session tables | Non-destructive | **Applied & Verified** |
| **003** | `003_kavach_campus_gps_tracking.sql` | Live GPS location breadcrumbs table & spatial indexing | Non-destructive | **Applied & Verified** |
| **004** | `004_kavach_campus_safe_walk_schema.sql` | Safe Walk tracking schema, auto-SOS triggers | Non-destructive | **Applied & Verified** |
| **005** | `005_kavach_campus_rls_infinite_recursion_repair.sql` | Fixed recursive RLS policies on profiles & incidents | Security Hardening | **Applied & Verified** |
| **006** | `006_provision_super_admin.sql` | Super Admin role initialization and seed policy | RBAC Provisioning | **Applied & Verified** |
| **007** | `007_student_id_card_verification.sql` | Student ID verification, OCR metadata, review workflow | Non-destructive | **Applied & Verified** |
| **008** | `008_kavach_campus_complete_production_alignment.sql` | Multi-tenant schema alignment, status constraints | Non-destructive | **Applied & Verified** |
| **008b** | `008_kavach_campus_schema_and_rls_alignment_safe.sql` | Safe idempotency constraints on profile columns | Non-destructive | **Applied & Verified** |
| **009** | `009_student_id_verification_resubmission.sql` | ID resubmission support and rejection tracking | Non-destructive | **Applied & Verified** |
| **010** | `010_service_role_and_audit_alignment.sql` | Service role audit table permissions & security grants | Security Hardening | **Applied & Verified** |
| **011** | `011_staff_live_locations_and_consent.sql` | Staff location opt-in, responder proximity functions | Non-destructive | **Applied & Verified** |
| **012** | `012_profiles_college_tenant.sql` | Added `college_id` column to profiles with tenant index | Tenant Partitioning | **Applied & Verified** |
| **013** | `013_cross_college_rls_isolation.sql` | Tenant-scoped RLS policies preventing cross-college data access | Security Hardening | **Applied & Verified** |
| **014** | `014_cross_college_rls_hardening.sql` | Hardened college boundary enforcement across tables | Security Hardening | **Applied & Verified** |
| **015a** | `015_college_scoped_student_id_uniqueness.sql` | Upgrades global unique student ID to compound (college_id, student_id) | Non-destructive Index | **Pending Manual Approval** |
| **015b** | `015_student_college_claims.sql` | Claims column on student_profiles + profile photo storage bucket | Non-destructive DDL | **Pending Manual Approval** |
| **016** | `016_safe_box_private_notes.sql` | Creates `safe_box_private_notes` table with strict owner RLS | Non-destructive DDL | **Pending Manual Approval** |

---

## 2. Critical Safety Evaluation for Pending Migrations

### Migration 015a: `015_college_scoped_student_id_uniqueness.sql`
- **Objective:** In multi-tenant universities, different colleges issue overlapping roll numbers (e.g., `2101201045` or `21B91A0501`). The previous index enforced uniqueness globally, preventing students in different colleges from registering with identical numbering sequences.
- **Action:** Replaces `idx_profiles_student_id` with `idx_profiles_college_student_id` scoped to `(college_id, student_id)`.
- **Pre-execution Verification:** Verified that `college_id` and `student_id` exist on `public.profiles`.
- **Status:** **PENDING MANUAL EXECUTION** in Supabase SQL Editor. Safe and idempotent.

### Migration 015b: `015_student_college_claims.sql`
- **Objective:** Allows students to select an institution during registration (`claimed_college_id`) without automatically granting active college membership until verified by campus authority. Also creates private bucket `kavach-profile-photos`.
- **Pre-execution Verification:** Requires Supabase Storage schema permissions.
- **Status:** **PENDING MANUAL EXECUTION** in Supabase SQL Editor.

### Migration 016: `016_safe_box_private_notes.sql`
- **Objective:** Creates an encrypted/private personal notes table linked to Safe Box evidence records with strict RLS (`owner_id = auth.uid()`).
- **Status:** **PENDING MANUAL EXECUTION** in Supabase SQL Editor.

---

## 3. Operator Execution Protocol (Safe Step-by-Step)

To apply migrations 015 and 016 in production:
1. Open [Supabase Dashboard -> SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Paste and execute the contents of `supabase/migrations/015_college_scoped_student_id_uniqueness.sql`.
3. Paste and execute the contents of `supabase/migrations/015_student_college_claims.sql`.
4. Paste and execute the contents of `supabase/migrations/016_safe_box_private_notes.sql`.
5. Verify zero errors returned.

> [!CAUTION]
> As per strict production safety rules, these migrations are never auto-executed by automated build tools or agents without explicit operator review in Supabase dashboard.
