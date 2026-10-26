# Kavach Campus — Database & Migration Audit Report

**Date:** 2026-10-21  
**Target:** Supabase PostgreSQL Database (Staging: `polbnvszmvblwenfnqll`)  
**Status:** 🟡 **MIGRATIONS 001–012 APPLIED | MIGRATIONS 013 & 014 PENDING IN SQL EDITOR**

---

## 1. Migration Inventory & History Reconciliation

The repository contains 17 migration files in `supabase/migrations/`. A historical collision audit was performed to establish the single deterministic sequence:

### 1.1 Resolution of Conflicting Migration Prefixes
1. **Prefix 001:**
   - `001_kavach_campus.sql` (11,629 bytes): Raw unhandled DDL.
   - `001_kavach_campus_final.sql` (16,437 bytes): **CANONICAL**. Idempotent, wraps enums in `EXCEPTION WHEN duplicate_object THEN null;` blocks and uses `CREATE TABLE IF NOT EXISTS`.
2. **Prefix 002:**
   - `002_kavach_campus_final_repair.sql` (19,695 bytes): Monolithic re-creation script from scratch.
   - `002_kavach_campus_schema_repair.sql` (4,132 bytes): **CANONICAL**. Incremental repair that drops policies before column alterations, avoiding PostgreSQL error `0A000`.
3. **Prefix 008:**
   - `008_kavach_campus_complete_production_alignment.sql` (11,632 bytes): Rejected because Section 6 hardcoded a personal email promotion to `SUPER_ADMIN`.
   - `008_kavach_campus_schema_and_rls_alignment_safe.sql` (10,967 bytes): **CANONICAL**. Pure structural alignment without hardcoded user identities or elevated privilege grants.

---

## 2. Live Remote Database Probe Evidence

On October 21, 2026, automated probes directly queried the remote staging database (`https://polbnvszmvblwenfnqll.supabase.co`) with the following empirical findings:

1. **Table Existence (19/19 Tables Present):**
   - `profiles`, `student_profiles`, `staff_profiles`, `user_otp_verifications`, `campus_zones`, `campus_buildings`, `incidents`, `incident_locations`, `evidence`, `ai_analyses`, `escalations`, `incident_messages`, `case_actions`, `notifications`, `safe_walks`, `trusted_contacts`, `audit_logs`, `ai_configuration`, `emergency_configuration`.
   - All 19 tables return HTTP 200 via authenticated REST probes.
2. **Anonymous Write Protection:**
   - Anonymous insert probes to 8 critical tables (`audit_logs`, `trusted_contacts`, `case_actions`, `notifications`, `user_otp_verifications`, `campus_zones`, `campus_buildings`, `ai_analyses`) were all rejected with PostgreSQL RLS policy violation errors.
3. **Profiles Tenant Column (`profiles.college_id`):**
   - **PROBE RESULT:** `EXISTS`. Returned status 200 with value `'PENDING_CAMPUS_VERIFICATION'`.
   - **CONCLUSION:** Migration 012 has already been executed on the remote database.
4. **Incidents Tenant Column (`incidents.college_id`):**
   - **PROBE RESULT:** `ERROR 42703: column incidents.college_id does not exist`.
   - **CONCLUSION:** Migration 013 and Migration 014 have **NOT YET BEEN APPLIED** to the staging database.

---

## 3. Staging Migration Execution Package

To reconcile the remaining gap safely without multi-script ordering mistakes, a consolidated, transaction-wrapped SQL migration script was prepared:

**File:** `supabase/staged_migrations_013_014_combined.sql`  
**Execution Environment:** [Supabase Dashboard SQL Editor (polbnvszmvblwenfnqll)](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new)

### What the Combined Bundle Executes:
1. `ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS college_id TEXT;`
2. Creates performance index `idx_incidents_college_id`.
3. Backfills `incidents.college_id` from existing reporting student profiles.
4. Adds anti-spoofing trigger `trg_assign_incident_college_id` to enforce server-side campus assignment.
5. Synchronizes `evidence` table `case_id` and `file_path` columns with trigger `trg_sync_evidence_incident_reference`.
6. Enforces role-escalation prevention trigger `trg_prevent_self_role_escalation` on `public.profiles`.
7. Purges all 28 legacy permissive policies that could permit cross-tenant access.
8. Installs hardened, strictly scoped RLS policies on `profiles`, `incidents`, `evidence`, `safe_walks`, and `storage.objects`.
9. Entire migration executes inside a single `BEGIN ... COMMIT` transaction.

---

## 4. Rollback & Recovery Strategy

If an unexpected condition occurs during staging execution:
1. **Automated Rollback:** Because the script is wrapped in `BEGIN ... COMMIT`, any syntax or constraint error causes PostgreSQL to immediately roll back all changes made during the session.
2. **Pre-Execution Backup:** Before clicking **RUN**, create a manual point-in-time snapshot via **Database ➔ Backups ➔ Create Backup** in the Supabase Dashboard.
3. **Emergency Rollback Script:** `supabase/verification/kavach_step115_rollback_candidate.sql` is retained in the workspace for manual disaster recovery if required.
