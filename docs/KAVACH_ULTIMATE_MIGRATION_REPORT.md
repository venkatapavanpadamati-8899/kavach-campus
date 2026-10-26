# KAVACH CAMPUS — ULTIMATE DATABASE MIGRATIONS REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Canonical Migrations Directory:** `supabase/migrations_canonical/`  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  

---

## 1. Investigation of Historical Migration Defects

Previous batches identified three primary failure vectors in `supabase/migrations/`:

1. **Migration 002 Policy Dependency (Error 0A000):**
   - *Failure:* Attempting to execute `ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE uuid` failed because PostgreSQL prevents column type changes on columns referenced in active RLS policies (`evidence_insert_own`, `evidence_select_staff`).
   - *Remediation:* Reordered DDL to drop dependent policies prior to altering column types, followed by recreating hardened policies.
2. **Migration 007 Audit Logs Schema Mismatch (Error 42703 / 23502):**
   - *Failure:* Migration 007 attempted to insert into non-existent column `details` and omitted required `NOT NULL` column `entity_type`.
   - *Remediation:* Corrected insert statement to target `(action, entity_type, metadata, created_at)`.
3. **CLI Version Prefix Collisions (Error 23505):**
   - *Failure:* Duplicate numerical prefixes (`001`, `002`, `008`) cause unique constraint violations in Supabase CLI migration tracker.
   - *Remediation:* Standardized on 14-digit ISO monotonic timestamps (`YYYYMMDDHHMMSS_name.sql`).
4. **Hardcoded Account Promotions:**
   - *Failure:* Migrations 006 and 008 contained queries automatically escalating specific personal emails to `SUPER_ADMIN`.
   - *Remediation:* Quarantined these files to `supabase/migrations/archive/`. Canonical migrations contain zero hardcoded user elevations.

---

## 2. Reconciled 8-Step Canonical Migration Sequence

The following clean sequence is staged in [`supabase/migrations_canonical/`](file:///D:/Kavach%20Campus/supabase/migrations_canonical/):

```text
1. 20261019000001_initial_schema.sql
   - Core ENUMs, profiles, student_profiles, incidents, audit_logs tables.
2. 20261019000002_evidence_and_rls_fix.sql
   - Drops dependent policies first, alters uploaded_by to UUID, rebuilds RLS.
3. 20261019000003_safe_walk_and_sos.sql
   - Safe walk sessions, heartbeat locations, campus zones.
4. 20261019000004_storage_buckets.sql
   - Private buckets (kavach-evidence, kavach-id-cards) and upload policies.
5. 20261019000005_tamper_proofing_triggers.sql
   - Prevent self-role escalation and student profile tampering.
6. 20261019000006_audit_logs_alignment.sql
   - Corrected audit_logs schema with entity_type and metadata JSONB.
7. 20261019000007_nearby_staff_routing.sql
   - Haversine distance function and active staff location indexes.
8. 20261019000008_production_alignment.sql
   - Hardened RBAC helper functions (is_admin, is_staff, is_security).
```

---

## 3. Remote Database Release Gate (Gate G1)

The live production database (`polbnvszmvblwenfnqll`) remains protected under **STRICT RELEASE HOLD**.

Before applying any schema changes to production, the administrator must run the 100% read-only verification query in [kavach_step121_readonly_preflight.sql](file:///D:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql) via the Supabase Dashboard SQL Editor.
