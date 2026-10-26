# KAVACH CAMPUS — BATCH 21 REMAINING BLOCKERS & PRODUCTION SIGN-OFF CHECKLIST

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Generated:** October 18, 2026  
**Status:** 🟡 **DEVELOPMENT COMPLETE — PRODUCTION VERIFICATION PENDING**

---

## 1. Executive Summary of Remaining Release Gates

Every local development, code quality, unit test, build, and authorization gate has **PASSED (100%)**. 

To safely promote this application to production without compromising database integrity or student safety, the following four institutional actions are required:

| Gate | Item | Category | Required Action | Status |
|:---:|:---|:---:|:---|:---:|
| **G1** | **Remote Database Schema Audit** | Security / DB | Execute `supabase/verification/kavach_step121_readonly_preflight.sql` in the Supabase Dashboard SQL Editor for project `polbnvszmvblwenfnqll`. Verify `supabase_migrations.schema_migrations` and table RLS. | ⛔ **BLOCKED** |
| **G2** | **Production Migration File Patch Approval** | Database DDL | Approve formal in-place patch to `002_kavach_campus_schema_repair.sql` (ordering drop policies before column alter) and `007_student_id_card_verification.sql` (conforming to `entity_type, metadata`). | ⏳ **PENDING USER APPROVAL** |
| **G3** | **Institutional Notification Credentials** | External Services | Configure production Twilio SMS credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) and FCM push credentials in Vercel. Set `ENABLE_REAL_NOTIFICATIONS=true`. | ⏳ **PENDING CONFIGURATION** |
| **G4** | **Production Gemini AI Key** | AI Services | Configure `GEMINI_API_KEY` in production environment to enable automated complaint classification. | ⏳ **PENDING CONFIGURATION** |

---

## 2. Step-by-Step Instructions for Gate G1: Remote Preflight Audit

The script `supabase/verification/kavach_step121_readonly_preflight.sql` is **100% read-only**. It contains only `SELECT` queries and cannot alter, drop, or mutate any data.

### How to Execute:
1. Open your browser and navigate to:
   `https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new`
2. Copy the entire contents of [kavach_step121_readonly_preflight.sql](file:///D:/Kavach%20Campus/supabase/verification/kavach_step121_readonly_preflight.sql).
3. Paste into the SQL Editor and click **Run**.
4. Check the returned results:
   - Does `audit_logs` have column `metadata`?
   - Are tables `incidents`, `evidence`, `profiles`, `student_profiles` listed with `rls_enabled = true`?
   - Are buckets `kavach-evidence` and `kavach-id-cards` listed with `is_public = false`?

---

## 3. Step-by-Step Instructions for Gate G2: Canonical Migration Reconciliation

To ensure that any new deployment or CI/CD container can bootstrap cleanly without in-memory scripting:

1. **`002_kavach_campus_schema_repair.sql`:**
   Move `DROP POLICY IF EXISTS "Users upload evidence" ON evidence;` to line 5, *before* `ALTER TABLE evidence ALTER COLUMN uploaded_by TYPE UUID;`.
2. **`007_student_id_card_verification.sql`:**
   Change `details` to `entity_type, metadata` on line 78 to match the real schema of `public.audit_logs`.
3. **Quarantine Unused / Dangerous Migrations:**
   Move the following 4 files into `supabase/migrations/archive/`:
   - `001_kavach_campus.sql` (contained unauthenticated profile leak)
   - `002_kavach_campus_final_repair.sql` (redundant monolithic rewrite)
   - `006_provision_super_admin.sql` (contained hardcoded personal email promotion)
   - `008_kavach_campus_complete_production_alignment.sql` (contained hardcoded admin promotion)

---

## 4. Disaster Recovery & Rollback Plan

- **Database RLS Rollback:**
  Execute `supabase/verification/kavach_step115_rollback_candidate.sql` in the remote SQL Editor to instantly restore previous table and storage policies without dropping tables or losing user data.
- **Frontend Rollback:**
  In Vercel dashboard, click **Redeploy previous deployment** for an instantaneous, zero-downtime rollback.
