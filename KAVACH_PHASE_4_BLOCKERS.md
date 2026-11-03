# KAVACH CAMPUS — PHASE 4 BLOCKERS & REMEDIATION MATRIX

**Project Location:** `D:\Kavach Campus`  
**Audit Scope:** Active Technical & Operational Blockers for Staging and Production Release  
**Date:** 2026-11-03  

---

## 1. Blocker Inventory & Impact Assessment

| Blocker ID | Category | Title | Severity | Status | Release Impact |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **BLK-01** | Security / Secrets | `CRON_SECRET` Rotation & GitHub Secrets Sync | `CRITICAL` | `OWNER ACTION REQUIRED` | Blocks Safe Walk timeout & staff escalation scheduler. Scheduled workflow fails with exit 1 until secret is configured. |
| **BLK-02** | Database / Schema | Pending Database Migrations (015, 016, 017) | `HIGH` | `BLOCKED` | College-scoped student ID uniqueness, Safe Box private notes table, and student college claims are not yet active in live Supabase. |
| **BLK-03** | Infrastructure | Dedicated Staging Database Isolation | `HIGH` | `BLOCKED` | Staging environment shares the production Supabase instance. Direct testing on live DB creates data pollution risks. |
| **BLK-04** | Integrations | Production Twilio SMS Gateway Credentials | `MEDIUM` | `OWNER ACTION REQUIRED` | Real mobile SMS OTP dispatch is paused. Demo SMS ₹0 simulation is currently active and functional for testing. |
| **BLK-05** | Authentication | Production Google OAuth Client Credentials | `MEDIUM` | `OWNER ACTION REQUIRED` | Production OAuth redirect URIs (`https://kavach-campus.vercel.app/api/auth/callback`) must be added to Google Cloud Console. |

---

## 2. Detailed Blocker Breakdown & Remediation Steps

### Blocker BLK-01: `CRON_SECRET` Rotation & Synchronization
* **Root Cause:**
  The development test secret previously used in local development was exposed in reports and must not be used in production. Additionally, GitHub Repository Secrets lacks `CRON_SECRET`, causing GitHub Actions Run #36 to fail.
* **Remediation Action:**
  1. Generate a high-entropy 32-byte secret (64 hex characters):
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
  2. Set `CRON_SECRET` in **Vercel Settings** -> **Environment Variables** (Production, Preview, Development).
  3. Set `CRON_SECRET` in **GitHub Repository Settings** -> **Secrets and variables** -> **Actions**.
  4. Redeploy Vercel to activate the runtime secret.
  5. Run GitHub Actions workflow with `dry_run: false`.

### Blocker BLK-02: Pending Migrations 015, 016, 017
* **Root Cause:**
  Migrations `015_college_scoped_student_id_uniqueness.sql`, `016_safe_box_private_notes.sql`, and `017_student_college_claims.sql` are drafted, idempotent, and verified in code, but have not been executed against Supabase.
* **Remediation Action:**
  Apply migrations in forward sequence (`015 -> 016 -> 017`) in the Supabase SQL Editor.

### Blocker BLK-03: Staging Database Isolation
* **Root Cause:**
  No separate `.env.staging` or secondary Supabase project reference exists. Both staging and production share `polbnvszmvblwenfnqll.supabase.co`.
* **Remediation Action:**
  Create an isolated Supabase project for Staging testing to test migrations and seed test roles without altering production data.

### Blocker BLK-04: Twilio SMS Gateway
* **Root Cause:**
  Production SMS requires active Twilio account credentials.
* **Remediation Action:**
  Configure valid `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` in Vercel when ready for real SMS broadcast. In the interim, Demo SMS (`₹0 simulation`) works completely in development and staging.

### Blocker BLK-05: Google OAuth Production Console
* **Root Cause:**
  Google Cloud Console Authorized Redirect URIs must include `https://kavach-campus.vercel.app/api/auth/callback`.
* **Remediation Action:**
  Add the production callback URL in Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client IDs.
