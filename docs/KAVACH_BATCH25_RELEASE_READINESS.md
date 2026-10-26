# KAVACH CAMPUS — BATCH 25: DEPLOYMENT & GITHUB RELEASE READINESS

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Baseline Git Commit:** `master` (`aa96b34`)  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Scope:** Git repository hygiene, secret leakage scan, build artifact verification, hosting environment variable configuration, and pre-deployment sign-off checklist.

---

## 1. Executive Summary & Readiness Verdict

```text
================================================================================
                    RELEASE READINESS SUMMARY
================================================================================
Local Code & Build Readiness:          100% READY (0 errors, 301/301 tests pass)
Git Working Tree & Secrets Hygiene:    100% CLEAN (Zero secrets tracked in git)
Production Hosting Environment:        PENDING CONFIGURATION (Vercel keys required)
Remote Database Migration Preflight:   STRICT RELEASE HOLD (Pending SQL Editor run)
GitHub Push Status:                    PENDING USER EXPLICIT APPROVAL
Production Deployment Status:          STRICT RELEASE HOLD
================================================================================
```

---

## 2. GitHub & Version Control Hygiene Audit

### 2.1 Git Status & Staging Security Check
- **Current Branch:** `master`
- **Latest Commit Hash:** `aa96b34`
- **Secrets Tracking Scan:**
  - `.env.local` is listed in `.gitignore` and is **NOT tracked** by git.
  - `kavach.db`, `kavach.db-wal`, `kavach.db-shm` are excluded.
  - Temporary files and scratch directories are excluded.
- **Rule of Engagement:**
  In accordance with safety mandates, **no automatic `git push` has been performed**. Any commit or push requires explicit user review and command approval.

### 2.2 Proposed Git Commit Scope
When the user approves pushing to GitHub, the following files should be committed:
1. `src/lib/auth-demo.ts` (Demo OTP security boundary)
2. `src/app/api/auth/register/route.ts` (Sanitized debug logs)
3. `src/app/api/auth/verify-otp/route.ts` (Demo OTP integration)
4. `src/app/api/auth/forgot-password/route.ts` (Password recovery request API)
5. `src/app/api/auth/reset-password/route.ts` (Password reset execution API)
6. `src/__tests__/auth-demo-otp.test.ts` (Automated demo OTP security tests)
7. `supabase/migrations_canonical/` (8 canonical migration files)
8. `docs/KAVACH_BATCH25_*.md` (Comprehensive audit reports)

---

## 3. Deployment Configuration & Environment Variables

### 3.1 Hosting Platform: Vercel
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node.js Runtime:** Node.js 20.x or 22.x
- **Build Cache:** Turbopack enabled

### 3.2 Required Environment Variables (Vercel Project Settings)

| Variable Name | Exposure | Purpose / Description | Status in Production |
|:---|:---:|:---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client) | URL of Supabase project (`https://polbnvszmvblwenfnqll.supabase.co`) | Present |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client) | Public anonymous key for client SDK initialization | Present |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only (Secret)** | Privileged key for administrative operations (user creation, OCR) | Required |
| `NEXT_PUBLIC_SITE_URL` | Public (Client) | Canonical URL of deployment (e.g. `https://kavach-campus.vercel.app`) | Required |
| `CRON_SECRET` | **Server-Only (Secret)** | Bearer token protecting timeout and escalation cron endpoints | Required |
| `TWILIO_ACCOUNT_SID` | **Server-Only (Secret)** | Twilio account identifier for emergency SOS SMS | Required for SMS |
| `TWILIO_AUTH_TOKEN` | **Server-Only (Secret)** | Twilio authentication token | Required for SMS |
| `TWILIO_PHONE_NUMBER` | **Server-Only (Secret)** | Twilio outgoing phone number (`+1...`) | Required for SMS |
| `ENABLE_REAL_NOTIFICATIONS` | **Server-Only (Flag)** | Must be set to `true` to enable real telecom dispatches | Set in Production |
| `FCM_PROJECT_ID` | **Server-Only (Secret)** | Firebase project ID for push alerts | Required for Push |
| `FCM_CLIENT_EMAIL` | **Server-Only (Secret)** | Firebase service account client email | Required for Push |
| `FCM_PRIVATE_KEY` | **Server-Only (Secret)** | Firebase service account RSA private key | Required for Push |
| `GEMINI_API_KEY` | **Server-Only (Secret)** | Google GenAI API key for complaint classification | Required for AI |
| `ENABLE_DEMO_OTP` | **Server-Only (Flag)** | **DO NOT SET in production!** (Must be omitted or false) | STRICTLY DISABLED |

---

## 4. Disaster Recovery & Instant Rollback Strategy

1. **Frontend Zero-Downtime Rollback:**
   In the Vercel dashboard, navigate to **Deployments** and click **Promote to Production** on the prior known-good deployment. The rollback takes effect globally in under 2 seconds.
2. **Database Schema Rollback:**
   If a newly applied RLS policy causes unexpected permission denials, execute `supabase/verification/kavach_step115_rollback_candidate.sql` in the Supabase SQL Editor to restore previous baseline policies without data loss.
3. **Database Snapshot:**
   Before running any DDL against `polbnvszmvblwenfnqll`, navigate to **Supabase Dashboard > Database > Backups** and trigger a manual database backup.
