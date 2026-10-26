# KAVACH CAMPUS — BATCH 25: REMAINING BLOCKERS & PRE-DEPLOYMENT CHECKLIST

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Baseline Git Commit:** `master` (`aa96b34`)  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Current Release Status:** 🟡 **DEVELOPMENT 100% COMPLETE — PRODUCTION ON STRICT HOLD**

---

## 1. Executive Summary of Remaining Release Gates

Every local development, code quality, unit test, build, and authorization gate has **PASSED (100%)**:
- **Automated Tests:** 23/23 suites, 301/301 tests passing.
- **TypeScript & ESLint:** 0 errors, 0 warnings.
- **Next.js Production Build:** 61/61 routes cleanly compiled.
- **Demo OTP:** Fully guarded, rejected in production mode.
- **Security & RLS Architecture:** 17 tables RLS-enabled, 2 private storage buckets, tamper-proofing triggers active.

To safely promote this application to production, the following four institutional actions are required:

| Gate | Category | Description | Exact Required Action | Current Status |
|:---:|:---|:---|:---|:---:|
| **G1** | **Remote Database Preflight** | Verification of remote tables, RLS flags, and schema parity on production reference `polbnvszmvblwenfnqll`. | Execute `supabase/verification/kavach_step121_readonly_preflight.sql` in the Supabase Dashboard SQL Editor for project `polbnvszmvblwenfnqll`. | ⛔ **BLOCKED** |
| **G2** | **Canonical Migration Adoption & Git Commit** | Adopting clean 14-digit ISO migrations, quarantining 4 legacy files, and committing changes. | Review proposed commit files and approve committing `supabase/migrations_canonical/` to git. | ⏳ **PENDING USER APPROVAL** |
| **G3** | **Institutional Notification Credentials** | Real-time SMS and Push delivery for campus emergency SOS broadcasts. | Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and FCM credentials in Vercel. Set `ENABLE_REAL_NOTIFICATIONS=true`. | ⏳ **PENDING CONFIGURATION** |
| **G4** | **Production Gemini AI Key** | Automated multilingual complaint classification and severity suggestions. | Configure active `GEMINI_API_KEY` in production hosting dashboard (Vercel). | ⏳ **PENDING CONFIGURATION** |

---

## 2. Step-by-Step Instructions for Gate G1: Remote Preflight Audit

The script `supabase/verification/kavach_step121_readonly_preflight.sql` is **100% read-only**. It contains only `SELECT` queries from PostgreSQL system catalogs and cannot alter, drop, or mutate any data.

### How to Execute:
1. Open your browser and navigate to:
   `https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new`
2. Copy the entire contents of [kavach_step121_readonly_preflight.sql](file:///D:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql).
3. Paste into the SQL Editor and click **Run**.
4. Check the returned results:
   - Does `audit_logs` have columns `entity_type` (TEXT) and `metadata` (JSONB)?
   - Are tables `incidents`, `evidence`, `profiles`, `student_profiles` listed with `rls_enabled = true`?
   - Are buckets `kavach-evidence` and `kavach-id-cards` listed with `is_public = false`?
   - Are functions `is_admin()`, `is_staff()`, `prevent_self_role_escalation()` listed with `owner = postgres`?

---

## 3. Step-by-Step Instructions for Gate G2: Canonical Migration Reconciliation

1. **Adopt Canonical Manifest:**
   The 8 canonical migration files in `supabase/migrations_canonical/` represent the validated, clean migration sequence with zero version prefix collisions.
2. **Quarantine Dangerous Legacy Files:**
   Move the following 4 files in `supabase/migrations/` to `supabase/migrations/archive/`:
   - `001_kavach_campus.sql` (insecure legacy profile leak)
   - `002_kavach_campus_final_repair.sql` (redundant monolithic rewrite)
   - `006_provision_super_admin.sql` (hardcoded personal email promotion)
   - `008_kavach_campus_complete_production_alignment.sql` (hardcoded personal email promotion)
3. **Commit Approval:**
   User approves committing `supabase/migrations_canonical/` into version control.

---

## 4. Disaster Recovery & Rollback Plan

- **Database RLS Rollback:**
  Execute `supabase/verification/kavach_step115_rollback_candidate.sql` in the remote SQL Editor to instantly restore previous table and storage policies without dropping tables or losing user data.
- **Frontend Rollback:**
  In the Vercel dashboard, click **Redeploy previous deployment** for an instantaneous, zero-downtime rollback to the prior known-good commit.
