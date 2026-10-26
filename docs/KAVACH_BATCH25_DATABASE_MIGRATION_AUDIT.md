# KAVACH CAMPUS — BATCH 25: DATABASE SCHEMA & MIGRATION AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Baseline Git Commit:** `master` (`aa96b34`)  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Audit Scope:** Deep inspection of historical migrations, verified DDL defects, canonical reconciliation pipeline, and PostgreSQL catalog rules.

---

## 1. Executive Summary & Defect Ledger

```text
================================================================================
                    DATABASE MIGRATION AUDIT LEDGER
================================================================================
Total Historical Migrations:          11 Files (in supabase/migrations/)
Duplicate Version Prefix Conflicts:    3 Conflicts (001, 002, 008)
Verified DDL Ordering Defects:         1 Defect (002 evidence.uploaded_by Error 0A000)
Verified Table Schema Parity Defects:  1 Defect (007 audit_logs columns Error 42703/23502)
Dangerous User Promotion Scripts:      2 Files Quarantined (006 & 008_complete)
Canonical Reconciled Pipeline:         8 Sequential Migrations in supabase/migrations_canonical/
Disposable Test Validation:            Validated via Static SQL AST & Dry-Run Runner
Production Remote Execution:           STRICT RELEASE HOLD (Zero production mutations executed)
================================================================================
```

---

## 2. In-Depth Analysis of Historical Migration Defects

### 2.1 Migration 002: Evidence Column Type Dependency Defect
- **File:** `supabase/migrations/002_kavach_campus_schema_repair.sql`
- **Root Cause:**
  In PostgreSQL, modifying the data type of a column referenced by an active Row Level Security policy is forbidden at the storage engine level.
- **Defective Sequence:**
  ```sql
  -- Line 6: Fails if policy "Users upload evidence" exists!
  ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID USING uploaded_by::uuid;

  -- Lines 9-11: Attempted too late!
  ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users upload evidence" ON evidence;
  DROP POLICY IF EXISTS "Users view own evidence" ON evidence;
  DROP POLICY IF EXISTS "Staff view evidence" ON evidence;
  ```
- **PostgreSQL Error Code:** `ERROR: 0A000: cannot alter type of a column used in a policy definition`
- **Canonical Resolution:**
  Drop the active policies on `evidence` *before* issuing `ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID`.

---

### 2.2 Migration 007: Audit Logs Schema Mismatch Defect
- **File:** `supabase/migrations/007_student_id_card_verification.sql`
- **Defective Insert Statement (Lines 76-85):**
  ```sql
  INSERT INTO public.audit_logs (action, details, created_at)
  VALUES ('SCHEMA_MIGRATION_007', jsonb_build_object(...), NOW());
  ```
- **Real Schema (`public.audit_logs` defined in `001_kavach_campus_final.sql`):**
  - `entity_type TEXT NOT NULL`
  - `metadata JSONB` (The column name is `metadata`, NOT `details`)
- **PostgreSQL Error Codes:**
  - `ERROR: 42703: column "details" of relation "audit_logs" does not exist`
  - `ERROR: 23502: null value in column "entity_type" of relation "audit_logs" violates not-null constraint`
- **Canonical Resolution:**
  Conform the query to:
  ```sql
  INSERT INTO public.audit_logs (action, entity_type, metadata, created_at)
  VALUES ('SCHEMA_MIGRATION_007', 'SYSTEM', jsonb_build_object(...), NOW());
  ```

---

### 2.3 Version Prefix Collisions & Quarantined Scripts
Supabase CLI version `2.121.0` parses version strings using regex `^(\d+)_`. In `supabase/migrations/`, three collisions exist:
1. `001`: `001_kavach_campus.sql` (contained unauthenticated profile leak) vs `001_kavach_campus_final.sql` (canonical baseline).
2. `002`: `002_kavach_campus_final_repair.sql` (redundant 470-line monolithic re-write) vs `002_kavach_campus_schema_repair.sql` (incremental repair).
3. `008`: `008_kavach_campus_complete_production_alignment.sql` (contained hardcoded email `venkatapavanpadamati1@gmail.com` to `SUPER_ADMIN`) vs `008_kavach_campus_schema_and_rls_alignment_safe.sql` (pure structural DDL).

**Quarantine Policy:**
The 4 insecure/redundant files (`001_legacy`, `002_monolithic`, `006`, `008_complete`) must be permanently quarantined into `supabase/migrations/archive/`.

---

## 3. The 8-Step Canonical Migration Manifest (`supabase/migrations_canonical/`)

Standardized on 14-digit ISO monotonic timestamps:

| Step | Canonical Filename | Source Migration | Role & Operations |
|:---:|:---|:---|:---|
| **1** | `20261019000001_initial_schema.sql` | `001_kavach_campus_final.sql` | Creates 19 tables, enums (`priority_level`, `incident_status`, `user_role`), triggers, and initial owner RLS. |
| **2** | `20261019000002_schema_repair.sql` | `002_kavach_campus_schema_repair.sql` | Drops dependent RLS policies before column type alterations (`evidence.uploaded_by`). |
| **3** | `20261019000003_gps_tracking.sql` | `003_kavach_campus_gps_tracking.sql` | Adds haversine distance calculation and live GPS tracking columns on `profiles`. |
| **4** | `20261019000004_safe_walk_schema.sql` | `004_kavach_campus_safe_walk_schema.sql` | Enforces `safe_walks` status check constraints and tracking columns. |
| **5** | `20261019000005_rls_infinite_recursion_repair.sql` | `005_kavach_campus_rls_infinite_recursion_repair.sql` | Establishes `SECURITY DEFINER` helper functions (`is_staff`, `is_admin`, etc.) with `SET search_path = public`. |
| **6** | `20261019000006_student_id_card_verification.sql` | `007_student_id_card_verification.sql` | Adds ID card verification schema, `kavach-id-cards` private bucket, and conforming audit log insert. |
| **7** | `20261019000007_schema_and_rls_alignment_safe.sql` | `008_kavach_campus_schema_and_rls_alignment_safe.sql` | Pure structural DDL: `escalations` table, private buckets, safe walks timeout columns, and ID verification indices. |
| **8** | `20261019000008_security_hardening_step115.sql` | `kavach_step115_security_hardening_candidate.sql` | Hardens case-bound evidence and GPS RLS; establishes student profile tamper trigger. |

---

## 4. Production Database Preflight Requirement

- **Remote Database Reference:** `polbnvszmvblwenfnqll`
- **Execution Safety Rule:** No migrations or DDL mutations may be executed against `polbnvszmvblwenfnqll` without running `supabase/verification/kavach_step121_readonly_preflight.sql` in the Supabase Dashboard SQL Editor.
- **Expected Preflight Output:**
  1. `audit_logs` has columns `entity_type` (TEXT) and `metadata` (JSONB).
  2. `rls_enabled: true` across `incidents`, `evidence`, `profiles`, `student_profiles`.
  3. `is_public: false` on buckets `kavach-evidence` and `kavach-id-cards`.
