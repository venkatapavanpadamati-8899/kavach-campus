# KAVACH CAMPUS — CANONICAL DATABASE MIGRATION PIPELINE

**Generated for:** Supabase CLI `2.121.0`  
**Standard:** 14-digit ISO Monotonic Timestamping (`YYYYMMDDHHMMSS_name.sql`)  
**Status:** VALIDATED & READY FOR REVIEW

---

## Overview

This directory contains the reconciled, sequentially numbered canonical database migrations for Kavach Campus.

These migrations resolve the three major defects identified during Batch 19-24 audits:
1. **CLI Version Prefix Collisions:** Standardized on 14-digit timestamps, eliminating duplicate key conflicts in `supabase_migrations.schema_migrations`.
2. **Migration 002 Dependency Order Defect:** Active RLS policies on `evidence` and `safe_walks` are dropped *prior* to altering column data types, eliminating PostgreSQL error `0A000`.
3. **Migration 007 Audit Logs Schema Parity:** Insert statement into `public.audit_logs` specifies `(action, entity_type, metadata, created_at)` conforming to the actual schema, eliminating PostgreSQL errors `42703` and `23502`.
4. **Dangerous User Promotion Scripts Quarantined:** Monolithic rewrites and hardcoded personal email promotions (`001_legacy`, `002_monolithic`, `006`, and `008_complete`) are excluded.

---

## Canonical Sequence

| Step | Canonical Filename | Source Migration | Description |
|:---:|:---|:---|:---|
| **1** | `20261019000001_initial_schema.sql` | `001_kavach_campus_final.sql` | 19 core tables, enums, triggers, and baseline RLS policies. |
| **2** | `20261019000002_schema_repair.sql` | `002_kavach_campus_schema_repair.sql` | Policy drop order corrected before column alterations. |
| **3** | `20261019000003_gps_tracking.sql` | `003_kavach_campus_gps_tracking.sql` | Haversine formula and profile location tracking columns. |
| **4** | `20261019000004_safe_walk_schema.sql` | `004_kavach_campus_safe_walk_schema.sql` | Safe walk status constraints and timeout triggers. |
| **5** | `20261019000005_rls_infinite_recursion_repair.sql` | `005_kavach_campus_rls_infinite_recursion_repair.sql` | SECURITY DEFINER functions with fixed `public` search path. |
| **6** | `20261019000006_student_id_card_verification.sql` | `007_student_id_card_verification.sql` | Audit log schema parity (`entity_type`, `metadata`). |
| **7** | `20261019000007_schema_and_rls_alignment_safe.sql` | `008_kavach_campus_schema_and_rls_alignment_safe.sql` | Structural DDL, `is_reviewer()` definition, private buckets. |
| **8** | `20261019000008_security_hardening_step115.sql` | `kavach_step115_security_hardening_candidate.sql` | Case-bound evidence & GPS RLS, tamper triggers. |
