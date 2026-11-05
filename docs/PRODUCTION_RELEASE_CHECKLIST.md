# KAVACH CAMPUS — PRODUCTION RELEASE CHECKLIST & DEPLOYMENT RUNBOOK

**Target Repository:** `https://github.com/venkatapavanpadamati-8899/kavach-campus`  
**Production Supabase Project:** `dvyiclyyvmsfipzrdowu`  
**Production Hosting:** Vercel Production (`https://kavach-campus.vercel.app`)  
**Local Development Status:** **`COMPLETED & VERIFIED`**  
**Production Release Status:** **`NOT COMPLETED — GATED (OWNER AUTHORIZATION REQUIRED)`**  

---

> [!CAUTION]
> **Production migrations 009–018 have not been authorized or executed. Before any production migration, the owner must verify a restorable backup, review the migration sequence, inspect production schema differences, and provide explicit authorization. Local migration success does not authorize production execution.**


## 1. Production Supabase Database Readiness & Security Gate

> [!WARNING]
> **Production migrations 009–018 have not been authorized or executed. Before any production migration, the owner must verify a restorable backup, review the migration sequence, inspect production schema differences, and provide explicit authorization. Local migration success does not authorize production execution.**

- [ ] **1.1 Remote Backup Confirmation (Mandatory Owner Action):**
  - Navigate to Supabase Dashboard: `https://supabase.com/dashboard/project/dvyiclyyvmsfipzrdowu/settings/database`
  - Verify that a point-in-time recovery (PITR) or daily snapshot is available and restorable.
  - Confirm restore capability before scheduling or approving any DDL operations.

- [ ] **1.2 Pre-Migration Cleanup Gate:**
  - Confirm Phase 16 Data Cleanup remains **PERMANENTLY CLOSED**.
  - All 40 existing incidents, 481 audit logs, 34 OTP records, and 8 Auth accounts must be preserved. No cleanup authorized.

- [ ] **1.3 Production Migration Review (Approval Pending — DO NOT EXECUTE):**
  *The following sequence is for review only. It must not be executed without separate, explicit owner authorization:*
  1. `010_service_role_and_audit_alignment.sql`: Aligns `audit_logs` schema (adds `entity_type`, `actor_id`) and hardens `is_security_or_admin()`.
  2. `009_student_id_verification_resubmission.sql`: Updates status constraint to include `'RESUBMISSION_REQUIRED'` and installs self-approval prevention trigger.
  3. `011_staff_live_locations_and_consent.sql`: Creates `staff_locations` table and consent tracking.
  4. `012_profiles_college_tenant.sql`: Adds `profiles.college_id`, maps official institutional domains, flags ambiguous accounts as `PENDING_CAMPUS_VERIFICATION`, upgrades `kavach-evidence` bucket (25 MB, audio types).
  5. `013_cross_college_rls_isolation.sql`: Adds `incidents.college_id` and establishes tenant-scoped RLS.
  6. `014_cross_college_rls_hardening.sql`: Installs `is_campus_staff()`, sync triggers, and role escalation guards.
  7. `015_college_scoped_student_id_uniqueness.sql`: Drops global index and creates composite partial unique index `idx_profiles_college_student_id` on `(college_id, student_id)`.
  8. `016_safe_box_private_notes.sql`: Creates `safe_box_private_notes` with `<= 2000` char limit and student-only RLS.
  9. `017_student_college_claims.sql`: Adds `claimed_college_id`, `profile_photo_path`, and creates private bucket `kavach-profile-photos`.
  10. `018_legacy_rls_policy_remediation.sql`: **CRITICAL SECURITY REMEDIATION** — Purges un-scoped historical permissive policies across `incidents`, `incident_locations`, `evidence`, `student_profiles`, and `storage.objects`; hardens `staff_locations` dispatch.
  11. `019_ap_statewide_colleges_registry.sql`: **PHASE 23-25 AP STATEWIDE EXPANSION** — Seeds 26 official gazetted AP districts (`college_districts`), verified institutions (`colleges` - 145 AP colleges, 152 in total DB benchmark), and onboarding request queue (`college_onboarding_requests`) with public/admin RLS.

- [ ] **1.4 Post-Migration Verification Query (For Post-Approval Use Only):**
  Execute in Supabase SQL Editor:
  ```sql
  SELECT 'MIGRATIONS_009_TO_018_VERIFIED' AS status,
         (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables_count,
         (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS active_policies_count,
         (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Authorized users%') AS legacy_leaks_count;
  ```
  *Expected:* 21 public tables, 32 public policies (37 total including storage), 0 legacy leaks.

---

## 2. GitHub Release Checklist (Phase 17 Gate)

- [ ] **2.1 Branch & Commit Verification:**
  - Active Branch: `main`
  - Release Commit: `a8e4636` ("security: complete Phase 13A remediation and final review")
  - Tracked File Diff: 0 modified files (`git diff` clean).

- [ ] **2.2 Secret Leak Prevention Audit:**
  - Verify `.gitignore` contains:
    - `.env`
    - `.env.local`
    - `.env.*.local`
    - `node_modules`
    - `.next`
  - Confirm no credentials, passwords, JWT secrets, or service-role keys exist in staged or untracked documentation.

- [ ] **2.3 Push Authorization (Owner Action):**
  - Execute only after production database migrations are verified:
    ```bash
    git push origin main
    ```

---

## 3. Vercel Production Deployment Checklist (Phase 18 Gate)

- [ ] **3.1 Environment Variable Audit (Vercel Project Settings):**
  Ensure the following variables are configured in the Vercel Dashboard for the Production Environment:

  | Variable Name | Exposure | Production Requirement |
  | :--- | :--- | :--- |
  | `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | `https://dvyiclyyvmsfipzrdowu.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Production Anon Key |
  | `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Production Service Role Key |
  | `GEMINI_API_KEY` | **Server-Only** | Production Google Gemini API Key |
  | `NEXT_PUBLIC_APP_URL` | Public / Client | `https://kavach-campus.vercel.app` |
  | `ENABLE_DEMO_OTP` | **Server-Only** | **STRICTLY OMIT OR SET TO `false`** |
  | `ENABLE_DEMO_SMS` | **Server-Only** | **STRICTLY OMIT OR SET TO `false`** |

- [ ] **3.2 Production Build Verification:**
  - Build Command: `next build --experimental-app-only`
  - Node.js Version: `20.x`
  - Production Build Output: 72 routes compiled cleanly in Next.js 16.4.3 Turbopack (including dynamic `/api/admin/ai` and static `/admin/ai`).

- [ ] **3.3 Production Deployment Trigger:**
  - Deploy via Vercel Dashboard or Git integration upon owner authorization.

