# Phase 25 — Production Readiness Checklist & Deployment Runbook

**Project:** Kavach Campus (Women & Campus Safety Platform)  
**Workspace:** `D:\kavach-campus`  
**Target Repository:** `https://github.com/venkatapavanpadamati-8899/kavach-campus`  
**Production Supabase:** `dvyiclyyvmsfipzrdowu`  
**Production Hosting:** Vercel Production (`https://kavach-campus.vercel.app`)  
**Execution Date:** 2026-11-05  

---

## 1. Production Release Gating Status

> [!CAUTION]
> **PRODUCTION DEPLOYMENT GATED (PENDING OWNER AUTHORIZATION):**  
> In accordance with strict release safety rules, no remote production databases have been touched, no migrations have been executed against `dvyiclyyvmsfipzrdowu`, no code has been pushed to GitHub (`git push` held), and no deployment has been triggered on Vercel.  
> Release execution requires prior owner backup confirmation and formal sign-off.

---

## 2. Pre-Release Verification Checklist

### 2.1 Remote Supabase Database Gate
- [ ] **Owner Backup Confirmation:** Confirm in Supabase Dashboard that project `dvyiclyyvmsfipzrdowu` has an active PITR or daily snapshot.
- [ ] **Zero Data Deletion Policy:** Confirm all 40 incidents, 481 audit logs, and 8 Auth accounts in production remain permanently preserved.
- [ ] **Sequential Migration Execution Order:**
  1. `010_service_role_and_audit_alignment.sql`
  2. `009_student_id_verification_resubmission.sql`
  3. `011_staff_live_locations_and_consent.sql`
  4. `012_profiles_college_tenant.sql`
  5. `013_cross_college_rls_isolation.sql`
  6. `014_cross_college_rls_hardening.sql`
  7. `015_college_scoped_student_id_uniqueness.sql`
  8. `016_safe_box_private_notes.sql`
  9. `017_student_college_claims.sql`
  10. `018_legacy_rls_policy_remediation.sql` (**CRITICAL REMEDIATION**)
  11. `019_ap_statewide_colleges_registry.sql` (**STATEWIDE COLLEGE EXPANSION**)

### 2.2 GitHub Push Gate
- [ ] **Working Tree Cleanliness:** `git diff --check` must report 0 conflicts or whitespace violations.
- [ ] **Secret Leak Prevention:** Verify `.env.local`, API keys, passwords, and service role keys are excluded by `.gitignore`.
- [ ] **Owner Authorization:** Execute `git push origin main` only after production database migrations are verified.

### 2.3 Vercel Environment Configuration Gate
Verify that the following variables are configured in Vercel Project Settings for Production:

| Environment Variable | Scope | Production Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | `https://dvyiclyyvmsfipzrdowu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Production Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Production Service Role Key |
| `GEMINI_API_KEY` | **Server-Only** | Production Gemini API Key |
| `NEXT_PUBLIC_APP_URL` | Public / Client | `https://kavach-campus.vercel.app` |
| `ENABLE_DEMO_OTP` | **Server-Only** | **`false`** (Disabled in production) |
| `ENABLE_DEMO_SMS` | **Server-Only** | **`false`** (Disabled in production) |

