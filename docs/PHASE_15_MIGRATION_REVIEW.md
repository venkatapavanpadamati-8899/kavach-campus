# Phase 15 — Supabase Database Migration Audit & Compatibility Review

**Date:** November 4, 2026  
**Auditor / DBA Lead:** Senior Supabase Database Administrator & Security Engineer (Antigravity Agent)  
**Project Workspace:** `D:\kavach-campus`  
**Database URL:** `https://dvyiclyyvmsfipzrdowu.supabase.co`  
**Status:** READ-ONLY AUDIT COMPLETE — PENDING EXPLICIT OWNER APPROVAL  

---

## 1. Executive Summary

A comprehensive, non-destructive, read-only audit of the Supabase PostgreSQL database architecture and proposed migrations `015`, `016`, and `017` was conducted.
Live inspection confirms that all 19 core tables exist, anonymous writes are strictly blocked by RLS policies, and no duplicate records exist in the live database that would block migration execution.

---

## 2. Live Database Inventory (Verified via Read-Only Scan)

| Table Name | Row Count | Primary Key | RLS Status | Verified Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `profiles` | 6 | `id` (UUID) | **ENABLED** | 6 verified accounts (1 Super Admin, 1 Campus Admin, 1 Staff, 3 Students) |
| `student_profiles` | 3 | `id` (UUID) | **ENABLED** | Student registration details and ID card claims |
| `staff_profiles` | 0 | `id` (UUID) | **ENABLED** | Department and duty allocations |
| `user_otp_verifications`| 34 | `id` (UUID) | **ENABLED** | Ephemeral registration and password reset OTP hashes |
| `incidents` | 40 | `id` (UUID) | **ENABLED** | Safety incidents and emergency alerts |
| `incident_locations` | 10 | `id` (UUID) | **ENABLED** | Telemetry coordinates for incidents |
| `evidence` | 0 | `id` (UUID) | **ENABLED** | Uploaded evidence metadata |
| `escalations` | 29 | `id` (UUID) | **ENABLED** | Hierarchical workflow escalation logs |
| `case_actions` | 29 | `id` (UUID) | **ENABLED** | Audit timeline for incident actions |
| `notifications` | 38 | `id` (UUID) | **ENABLED** | Dispatch queue and delivery status logs |
| `audit_logs` | 481 | `id` (UUID) | **ENABLED** | Immutable security event log |
| `safe_walks` | 0 | `id` (UUID) | **ENABLED** | Active and scheduled walk sessions |
| `trusted_contacts` | 0 | `id` (UUID) | **ENABLED** | Student emergency contact records |
| `campus_zones` | 0 | `id` (UUID) | **ENABLED** | Institutional boundary geo-fences |
| `campus_buildings` | 0 | `id` (UUID) | **ENABLED** | Building centroids and floor metadata |
| `ai_analyses` | 0 | `id` (UUID) | **ENABLED** | Incident AI severity scores |
| `incident_messages` | 0 | `id` (UUID) | **ENABLED** | Chat timeline between student and responders |
| `ai_configuration` | 0 | `id` (UUID) | **ENABLED** | AI provider thresholds |
| `emergency_configuration`| 0 | `id` (UUID) | **ENABLED** | Campus emergency switch toggles |

---

## 3. Migration-by-Migration Deep Analysis

### Migration 015: `015_college_scoped_student_id_uniqueness.sql`
- **Purpose**: Replaces global `student_id` unique index (`idx_profiles_student_id`) with a compound index `(college_id, student_id)` scoped for `role = 'STUDENT'`.
- **Rationale**: Different universities (e.g. SRKR vs Vishnu) issue similar roll number patterns (`21B91A0501`). Global uniqueness prevents multi-tenant onboarding. Compound scoping supports true institutional isolation.
- **Pre-Migration Duplicate Check**:
  - Profiles scanned: 6 total rows (3 students: `2456765789`, `24B91A05P0`, `24B91W23`).
  - **Duplicates found**: **0**.
  - **Risk**: Low. Safe to execute.
- **Rollback SQL Provided**: Included in migration file comments.

### Migration 016: `016_safe_box_private_notes.sql`
- **Purpose**: Creates dedicated `safe_box_private_notes` table to store private, student-only context on uploaded evidence without exposing notes to staff or admins.
- **Schema**:
  - `evidence_id UUID PRIMARY KEY REFERENCES evidence(id) ON DELETE CASCADE`
  - `owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
  - `private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000)`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **RLS Policy**: `"Students manage own Safe Box notes"` strictly checks `owner_id = auth.uid()` and validates that the underlying evidence row was uploaded by `auth.uid()`.
- **Cascade Behavior**: Deleting an evidence item automatically cleans up its private note. Deleting a student profile cleans up all associated private notes.
- **Compatibility**: The application API already contains fallback handling (Phase 13A). Once this table is created, `notesServiceAvailable` becomes `true`.
- **Risk**: Low. New isolated table with foreign keys to existing tables.

### Migration 017: `017_student_college_claims.sql`
- **Purpose**:
  1. Adds `claimed_college_id TEXT` to `student_profiles` to record an applicant's chosen institution before administrative approval without granting premature tenant access.
  2. Adds `profile_photo_path TEXT` to `profiles`.
  3. Creates storage bucket `kavach-profile-photos` (private, 2MB size limit, JPEG/PNG/WebP).
  4. Configures storage RLS policy `"Users read own profile photos"` (`auth.uid()::TEXT = (storage.foldername(name))[1]`).
- **Compatibility**: Live storage scan confirms `kavach-id-cards` and `kavach-evidence` exist. Adding `kavach-profile-photos` introduces no collisions.
- **Risk**: Low. Additive columns and new isolated private bucket.

