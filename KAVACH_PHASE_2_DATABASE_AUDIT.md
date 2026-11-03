# KAVACH CAMPUS — PHASE 2 DATABASE & MIGRATION AUDIT

**Project:** Kavach Campus  
**Database Engine:** Supabase PostgreSQL with PostGIS & RLS  
**Environment:** Staging / Production Read-Only Audit  
**Audit Date:** 2026-11-03  

---

## 1. Migration Inventory & Reconciliation Table

| Migration | Local File | Applied to DB | Dependencies | Risk | Recommendation |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **001** | `001_kavach_campus.sql` | Applied & Verified | Base core schema | Low | Maintain baseline |
| **001_final** | `001_kavach_campus_final.sql` | Applied & Verified | Replaces initial base | Low | Canonical baseline |
| **002_repair** | `002_kavach_campus_final_repair.sql` | Applied & Verified | Profiles foreign keys | Low | Keep applied |
| **002_schema** | `002_kavach_campus_schema_repair.sql` | Applied & Verified | Enum types | Low | Keep applied |
| **003** | `003_kavach_campus_gps_tracking.sql` | Applied & Verified | Geolocation | Low | Keep applied |
| **004** | `004_kavach_campus_safe_walk_schema.sql` | Applied & Verified | Safe walk sessions | Low | Keep applied |
| **005** | `005_kavach_campus_rls_infinite_recursion_repair.sql`| Applied & Verified | Security definer functions | Low | Keep applied |
| **006** | `006_provision_super_admin.sql` | Applied & Verified | Super admin profile | Low | Keep applied |
| **007** | `007_student_id_card_verification.sql` | Applied & Verified | ID card bucket & table | Low | Keep applied |
| **008_align** | `008_kavach_campus_complete_production_alignment.sql`| Applied & Verified | College IDs | Low | Keep applied |
| **008_safe** | `008_kavach_campus_schema_and_rls_alignment_safe.sql` | Applied & Verified | Scoped read/write | Low | Keep applied |
| **009** | `009_student_id_verification_resubmission.sql` | Applied & Verified | Re-upload flows | Low | Keep applied |
| **010** | `010_service_role_and_audit_alignment.sql` | Applied & Verified | Audit logs | Low | Keep applied |
| **011** | `011_staff_live_locations_and_consent.sql` | Applied & Verified | Staff tracking | Low | Keep applied |
| **012** | `012_profiles_college_tenant.sql` | Applied & Verified | Multi-tenant profiles | Low | Keep applied |
| **013** | `013_cross_college_rls_isolation.sql` | Applied & Verified | Tenant policies | Low | Keep applied |
| **014** | `014_cross_college_rls_hardening.sql` | Applied & Verified | Defense-in-depth RLS | Low | Keep applied |
| **015a** | `015_college_scoped_student_id_uniqueness.sql` | **Pending** | Replaces global unique student_id | Medium | Renumber to `015_...` & apply to Staging |
| **015b** | `015_student_college_claims.sql` | **Pending** | Adds `claimed_college_id` & photo bucket | Low | Renumber to `016_...` & apply to Staging |
| **016** | `016_safe_box_private_notes.sql` | **Pending** | Safe box notes table | Low | Renumber to `017_...` & apply to Staging |

---

## 2. Investigation of Migration 015 Conflict

- **Fact:** Two files exist with prefix `015_`:
  1. `015_college_scoped_student_id_uniqueness.sql` (2288 bytes)
  2. `015_student_college_claims.sql` (1181 bytes)
- **Impact:** Automated migration tools sorting by filename will execute `015_college_scoped_student_id_uniqueness.sql` first, but having two migrations with identical sequence numbers violates strict chronological numbering standards.
- **Remediation Recommendation:**
  In Phase 3, renumber these files cleanly:
  - Keep `015_college_scoped_student_id_uniqueness.sql` as migration 015.
  - Rename `015_student_college_claims.sql` to `016_student_college_claims.sql`.
  - Rename `016_safe_box_private_notes.sql` to `017_safe_box_private_notes.sql`.
- **Safety Policy Confirmed:** No migration was run against production during this Phase 2 read-only audit.
