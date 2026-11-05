# Phase 21: Production Readiness & Release Checklist

**Phase:** 21J — Read-Only Production Readiness Assessment  
**Timestamp:** 2026-11-05T11:09:15+05:30  
**Overall Release Gate:** STRICTLY GATED (Owner Actions Required Before Production Deployment)

---

## 1. Readiness Dimension Matrix

| Dimension | Scope / Component | Local Environment | Production Remote | Gate Status | Responsible Party |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Code Quality & Build** | Turbopack 71 routes, TS 0 errors, ESLint clean | ✅ 100% Passed | Ready for deployment | ✅ PASS | Automated Pipeline |
| **Automated Testing** | Vitest (791/791), Playwright (172/172) | ✅ 100% Passed | Verified locally | ✅ PASS | Automated Pipeline |
| **Database Migrations** | Schema migrations 009–018 | ✅ Applied to 018 | ⚠️ Stalled at 008 | ⏸️ OWNER ACTION REQUIRED | Project Owner |
| **Database Backup** | Remote database point-in-time snapshot | N/A (Docker container) | ⚠️ Pending snapshot | ⏸️ OWNER ACTION REQUIRED | Project Owner |
| **RLS Multi-Tenant Isolation**| Cross-college leakage remediation (Mig 018)| ✅ 32/32 tests pass | ⚠️ Mig 018 not deployed | ⏸️ OWNER ACTION REQUIRED | Project Owner |
| **Google Cloud OAuth** | Web Client ID & Client Secret | ✅ Mock & PKCE tested | ⚠️ Redirect URIs pending | 🛑 BLOCKED (ACTION REQ.) | Project Owner |
| **SMS & Phone Auth** | Twilio SMS API / Demo OTP fallback | ✅ Demo OTP verified | Live SMS configured | ✅ PASS / READY | Project Owner |
| **Storage Buckets** | 3 private buckets (evidence, id-cards, photos)| ✅ Verified local S3 | Needs remote verification | ⏸️ OWNER ACTION REQUIRED | Project Owner |
| **GitHub Release** | Push commit to `origin/main` | ✅ Working tree clean | Pending push | ⏸️ GATED (Awaiting Owner) | Project Owner / Antigravity |
| **Vercel Production Deploy** | Trigger build on Vercel | ✅ Local build 100% | Pending GitHub sync | ⏸️ GATED (Awaiting Owner) | Project Owner / Vercel CI |

---

## 2. Step-by-Step Owner Action Items Before Production Release

### Step 1: Remote Supabase Database Snapshot (Mandatory Backup)
1. Navigate to the Supabase Dashboard for project `dvyiclyyvmsfipzrdowu`.
2. Go to **Settings** > **Database** > **Backups**.
3. Create a manual Point-In-Time (PITR) backup snapshot before executing any SQL migrations.

### Step 2: Apply Migrations 009 Through 018 on Remote Supabase
Execute migrations in strict numerical order using the Supabase SQL Editor:
1. `supabase/migrations/009_auth_security_fixes.sql`
2. `supabase/migrations/010_incident_sla_tracking.sql`
3. `supabase/migrations/011_parent_portal.sql`
4. `supabase/migrations/012_system_health.sql`
5. `supabase/migrations/013_security_hardening.sql`
6. `supabase/migrations/014_college_branding.sql`
7. `supabase/migrations/015_college_isolation_rls.sql`
8. `supabase/migrations/016_college_admin_scoping.sql`
9. `supabase/migrations/017_super_admin_cross_tenant_audit.sql`
10. `supabase/migrations/018_remediate_permissive_incident_policies.sql` *(Crucial security patch preventing cross-college data leaks)*

### Step 3: Google Cloud Console OAuth Configuration
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit OAuth 2.0 Client ID for Kavach Campus Web Application.
3. Add to **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://192.168.1.7:3000`
   - `https://kavach-campus.vercel.app`
4. Add to **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback`
   - `http://192.168.1.7:3000/api/auth/callback`
   - `https://kavach-campus.vercel.app/api/auth/callback`
5. Save changes and verify in Supabase Authentication > URL Configuration > Redirect URLs that these URIs are listed in the redirect whitelist.

### Step 4: Storage Bucket Verification on Production
Ensure the following 3 buckets exist in the production Supabase storage dashboard and are set to **Private** (`public = false`):
- `kavach-id-cards`
- `kavach-evidence`
- `kavach-profile-photos`

---

## 3. Rollback & Disaster Recovery Plan

If unexpected failures occur after production deployment:
1. **Database Rollback:** Restore the database snapshot taken in Step 1 via the Supabase Dashboard.
2. **Vercel Rollback:** If Vercel deployment encounters runtime errors, instantly promote the previous successful production deployment via Vercel Dashboard > Deployments > Promote to Production.
3. **Emergency Secret Rotation:** In case of credential leakage, immediately cycle `SUPABASE_SERVICE_ROLE_KEY` and Google Client Secret.

