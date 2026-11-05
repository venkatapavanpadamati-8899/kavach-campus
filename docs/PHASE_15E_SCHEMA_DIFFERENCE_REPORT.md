# KAVACH CAMPUS — PHASE 15E: SCHEMA DIFFERENCE REPORT

**Project:** Kavach Campus  
**Workspace:** `D:\kavach-campus`  
**Comparison Baseline:** Expected Schema (Migrations 001 through 014) vs Actual Local Database (`127.0.0.1:54322`)  
**Generated At:** 2026-11-04  
**Audit Purpose:** Pinpoint exact schema deltas before local alignment execution  

---

## 1. Executive Summary

This report delivers a granular, object-by-object differential analysis between the **Expected Schema** (defined by migrations `001_` through `014_`) and the **Actual Local Schema** currently running in the local Docker Supabase PostgreSQL container.

The comparison proves that the local database is synchronized with early baseline versions (`001`–`008`), but is missing the tenant-isolation layer introduced in migrations `009` through `014`. All missing objects have been cataloged with their exact migration origins, severity classifications, and alignment requirements.

---

## 2. Comprehensive Schema Differential Matrix

| Object Type | Object Identifier | Expected State (Post-014) | Actual Local State | Difference Classification | Migration Origin | Impact on Migrations 015–017 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Table** | `public.staff_locations` | Table exists with spatial coordinates & consent fields | Table does not exist | **MISSING** | `011_staff_live_locations_and_consent.sql` | Low direct impact on 015–017; required for complete responder features |
| **Column** | `profiles.college_id` | `TEXT`, nullable, indexed (`idx_profiles_college_id`) | Column does not exist | **MISSING (CRITICAL BLOCKER)** | `012_profiles_college_tenant.sql` | **FATAL BLOCKER for 015**: Migration 015 requires `profiles.college_id` for composite unique index |
| **Column** | `incidents.college_id` | `TEXT`, nullable, indexed (`idx_incidents_college_id`) | Column does not exist | **MISSING (HIGH)** | `013_cross_college_rls_isolation.sql` | Blocks cross-college incident isolation testing |
| **Column** | `evidence.case_id` | `TEXT`, indexed (`idx_evidence_case_id`) | Present (`TEXT`) | **ALIGNED** | `014_cross_college_rls_hardening.sql` | Ready |
| **Column** | `evidence.file_path` | `TEXT` | Present (`TEXT`) | **ALIGNED** | `014_cross_college_rls_hardening.sql` | Ready |
| **Column** | `audit_logs.actor_id` | `UUID`, references `profiles(id)` | Present (`UUID`) | **ALIGNED** | `010_service_role_and_audit_alignment.sql` | Ready |
| **Column** | `audit_logs.entity_type` | `TEXT` | Present (`TEXT`) | **ALIGNED** | `010_service_role_and_audit_alignment.sql` | Ready |
| **Column** | `audit_logs.entity_id` | `UUID` | Present (`UUID`) | **ALIGNED** | `010_service_role_and_audit_alignment.sql` | Ready |
| **Constraint** | `check_verification_status` | Includes `'RESUBMISSION_REQUIRED'` | 5 status values only (missing `'RESUBMISSION_REQUIRED'`) | **UNALIGNED (MEDIUM)** | `009_student_id_verification_resubmission.sql` | Causes constraint violation if resubmission flow is tested |
| **Function** | `is_security_or_admin()` | Hardened for `service_role` and JWT role claim | Baseline definition (checks `profiles.role` only) | **UNALIGNED (HIGH)** | `010_service_role_and_audit_alignment.sql` | Can misidentify service_role automated operations |
| **Function** | `prevent_student_self_verification()` | Defined, `SECURITY DEFINER` | Function does not exist | **MISSING (MEDIUM)** | `009_student_id_verification_resubmission.sql` | Student self-verification prevention inactive |
| **Function** | `get_user_college_id()` | Defined, `SECURITY DEFINER`, `STABLE` | Function does not exist | **MISSING (CRITICAL)** | `012_profiles_college_tenant.sql` | Tenant isolation helper unavailable; blocks RLS evaluation |
| **Function** | `trg_fn_assign_incident_college_id()` | Defined, auto-derives `college_id` from student | Function does not exist | **MISSING (HIGH)** | `013_cross_college_rls_isolation.sql` | Incident tenant auto-population inactive |
| **Function** | `is_campus_staff()` | Defined, checks 10 staff roles | Function does not exist | **MISSING (HIGH)** | `014_cross_college_rls_hardening.sql` | Required by hardened RLS policies |
| **Function** | `sync_evidence_incident_reference()` | Defined, keeps `incident_id`/`case_id` synchronized | Function does not exist | **MISSING (MEDIUM)** | `014_cross_college_rls_hardening.sql` | Evidence foreign key sync trigger inactive |
| **Trigger** | `trg_prevent_student_self_verification` | BEFORE UPDATE ON `student_profiles` | Trigger does not exist | **MISSING (MEDIUM)** | `009_student_id_verification_resubmission.sql` | Security gate missing |
| **Trigger** | `trg_assign_incident_college_id` | BEFORE INSERT OR UPDATE ON `incidents` | Trigger does not exist | **MISSING (HIGH)** | `013_cross_college_rls_isolation.sql` | Incidents will have NULL `college_id` on insert |
| **Trigger** | `trg_sync_evidence_incident_reference` | BEFORE INSERT/UPDATE ON `evidence` | Trigger does not exist | **MISSING (MEDIUM)** | `014_cross_college_rls_hardening.sql` | Discrepancy between `case_id` and `incident_id` possible |
| **Storage Bucket** | `kavach-evidence` Config | Size limit `26,214,400` bytes (25MB), audio MIME types allowed | Size limit `10,485,760` (10MB), audio MIME types omitted | **UNALIGNED (MEDIUM)** | `012_profiles_college_tenant.sql` | Voice note / audio uploads fail file limit or MIME validation |
| **RLS Policies** | `profiles` Tenant Scoping | Scoped to same-college staff or super-admin | Global `"Staff can read all profiles"` policy | **UNALIGNED (CRITICAL)** | `013_cross_college_rls_isolation.sql` | Cross-college data leakage occurs locally |
| **RLS Policies** | `incidents` Tenant Scoping | Scoped to same-college staff or student owner | Permissive `"Authorized users view incidents"` | **UNALIGNED (CRITICAL)** | `013_cross_college_rls_isolation.sql` | Cross-college incident leakage occurs locally |
| **RLS Policies** | `safe_walks` Tenant Scoping | Scoped to same-college staff | Global / baseline policy | **UNALIGNED (HIGH)** | `013_cross_college_rls_isolation.sql` | Cross-college SafeWalk telemetry leakage |
| **RLS Policies** | `storage.objects` Tenant Scoping | Scoped to same-college staff or uploader | Baseline storage policy | **UNALIGNED (HIGH)** | `013_cross_college_rls_isolation.sql` | Cross-college evidence files accessible to all staff |

---

## 3. Pending Migrations (015–017) Objects Currently Absent

For completeness, the following objects belong to pending migrations `015`, `016`, and `017` and are **intentionally not present** at this stage:

| Object | Expected Migration | Current Local State | Note |
| :--- | :--- | :--- | :--- |
| `idx_profiles_college_student_id_unique` | `015_college_scoped_student_id_uniqueness.sql` | Absent | **Must only be applied in Phase 15G** after baseline alignment |
| `evidence.private_notes` | `016_safe_box_private_notes.sql` | Absent | **Must only be applied in Phase 15G** |
| `student_profiles.claimed_college_id` | `017_student_college_claims.sql` | Absent | **Must only be applied in Phase 15G** |
| `kavach-claim-id-cards` Bucket | `017_student_college_claims.sql` | Absent | **Must only be applied in Phase 15G** |

---

## 4. Conclusion & Actionable Finding

The local database requires a strictly orchestrated, non-destructive alignment with migrations `009`, `010`, `011`, `012`, `013`, and `014`. 
Without this alignment, executing Migration `015` will fail immediately with:
```
ERROR: column "college_id" does not exist (SQLSTATE 42703)
```
Applying the baseline alignment plan first is mathematically mandatory.

