# KAVACH CAMPUS — PHASE 6: DATABASE MIGRATION RECONCILIATION & AUDIT

**Project:** Kavach Campus  
**Execution Timestamp:** 2026-11-03T22:00:00+05:30  
**Status:** `CODE VERIFIED ONLY` | `PRODUCTION EXECUTION BLOCKED`

---

## 1. Executive Summary

A comprehensive preflight audit of all database migration files in `supabase/migrations/` was conducted to reconcile naming collisions, assess idempotency, inspect column dependencies, and guarantee zero regressions.

No migrations were executed against the live Production database during this audit.

---

## 2. Migration Sequence & Reconciliation

### 2.1 File Renaming & Conflict Resolution
Prior to this phase, two separate migrations used the prefix `015`:
1. `015_campus_admin_registration_request.sql` (Authored for campus admin registration requests & hierarchy).
2. `015_student_college_claims.sql` (Authored for student college onboarding claims).

**Reconciliation Action Taken:**
- Staged rename applied: `015_student_college_claims.sql` -> `017_student_college_claims.sql`.
- Current clean sequential order:
  - `015_campus_admin_registration_request.sql` (Sequence 15)
  - `016_college_admin_and_staff_roles.sql` (Sequence 16)
  - `017_student_college_claims.sql` (Sequence 17)

### 2.2 Detailed File Analysis

#### Migration 015: `015_campus_admin_registration_request.sql`
- **Purpose:** Creates `campus_admin_registration_requests` table to support self-service campus admin applications pending Super Admin review.
- **Idempotency:** Uses `CREATE TABLE IF NOT EXISTS`, conditional policy creation (`DROP POLICY IF EXISTS`), and `CREATE INDEX IF NOT EXISTS`.
- **Foreign Keys:** References `colleges(id)` with `ON DELETE CASCADE`.
- **RLS:** Enables RLS on `campus_admin_registration_requests`. Only Super Admins can SELECT/UPDATE; unauthenticated/registered applicants can INSERT their own requests.
- **Audit Assessment:** Clean, non-destructive, safe to apply.

#### Migration 016: `016_college_admin_and_staff_roles.sql`
- **Purpose:** Introduces granular staff roles (`campus_admin`, `principal`, `security_head`, `counselor`, `warden`, `faculty`) and sets up hierarchical approval permissions.
- **Idempotency:** 
  - Uses `DO $$ BEGIN ... EXCEPTION ... END $$;` blocks for enum modifications.
  - Employs `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_by UUID;` and `ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;`.
- **Constraints:** Foreign key constraints are safely guarded against duplicate addition.
- **Audit Assessment:** Well-guarded, backward compatible with existing student profiles.

#### Migration 017: `017_student_college_claims.sql`
- **Purpose:** Tracks student self-declared college affiliations and document verification status (`student_college_claims`).
- **Idempotency:** Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- **RLS:** Students can view their own claims; only verified Campus Admins and Super Admins of that specific college can view or update claim statuses.
- **Audit Assessment:** Fully isolated, prevents cross-college leakages.

---

## 3. Rollback & Forward Migration Strategy

| Migration | Forward SQL Safety | Rollback Limitations / Risks |
|:---|:---|:---|
| `015` | Fully idempotent via `IF NOT EXISTS` | Dropping table will delete pending campus registration requests. Keep backup before rollback. |
| `016` | Additive columns and enum expansions | Enum values in PostgreSQL cannot be easily dropped without recreating the type. Schema is forward-only. |
| `017` | Additive table and RLS policies | Dropping table loses pending claim audit logs. Safe to drop if unpopulated. |

---

## 4. Execution Precondition

> [!WARNING]
> These migrations must **FIRST** be applied to the isolated Staging database (`kavach-campus-staging`). Live production application is strictly deferred until staging verification is complete.
