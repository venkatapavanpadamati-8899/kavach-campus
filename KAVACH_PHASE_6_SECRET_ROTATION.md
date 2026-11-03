# KAVACH CAMPUS — PHASE 6: ZERO-TRUST SECRET ROTATION GUIDE

**Project:** Kavach Campus  
**Target Variable:** `CRON_SECRET`  
**Execution Timestamp:** 2026-11-03T22:00:00+05:30  
**Status:** `OWNER ACTION REQUIRED`

---

## 1. Context & Incident Rationale

The hardcoded test token `kavach_campus_cron_secret_test_2026` was previously exposed in verification logs. 

> [!CAUTION]
> The previous secret is permanently compromised. It MUST NOT be reused under any circumstances. Any request signed with the old token must be rejected by production and staging environments.

This document outlines the strict, zero-trust protocol for the repository owner to generate, configure, and synchronize a cryptographically secure replacement secret across Vercel and GitHub Actions.

---

## 2. Cryptographic Secret Generation (Zero-Knowledge)

The assistant does **not** generate or store this secret. The repository owner must generate it directly on a private workstation using standard cryptographic utilities:

### Option A: Using OpenSSL (Recommended)
Run in PowerShell / Terminal:
```bash
openssl rand -hex 32
```
*Output: 64-character high-entropy hexadecimal string (256 bits of entropy).*

### Option B: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Deployment Targets & Synchronized Configuration

To prevent scheduler downtime and unauthorized requests, the secret must be updated across all deployment environments in the following order:

```
[ Generate Secret (Owner Private Terminal) ]
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
 [ Step 1: Vercel ]        [ Step 2: GitHub Actions ]
 Environment Variables     Repository Secrets
 (Production & Preview)    (CRON_SECRET)
```

### Step 1: Update in Vercel Dashboard
1. Navigate to: `https://vercel.com/venkatapavanpadamati-8899/kavach-campus/settings/environment-variables`
2. Locate the existing `CRON_SECRET` variable.
3. Click **Edit** and paste the newly generated 64-character secret.
4. Ensure the variable is enabled for:
   - [x] **Production**
   - [x] **Preview**
   - [x] **Development**
5. Click **Save**.
6. **Redeploy Production Deployment:**
   - In Vercel, go to the **Deployments** tab.
   - On the current production deployment, click `...` -> **Redeploy** (without cache) so the serverless functions receive the updated environment variable.

### Step 2: Update in GitHub Actions Repository Secrets
1. Navigate to: `https://github.com/venkatapavanpadamati-8899/kavach-campus/settings/secrets/actions`
2. Under **Repository secrets**, locate `CRON_SECRET` (or click **New repository secret**).
3. Paste the identical 64-character secret generated in Section 2.
4. Click **Update secret** (or **Add secret**).

---

## 4. Verification & Validation Protocol

After updating both Vercel and GitHub:

1. **Verify Rejection of Old Compromised Secret:**
   Using curl or an API tester against production:
   ```bash
   curl -i -X POST "https://kavach-campus.vercel.app/api/cron/safe-walk-timeout" \
     -H "Authorization: Bearer kavach_campus_cron_secret_test_2026"
   ```
   *Expected Response:* `HTTP/1.1 401 Unauthorized` with `{ "error": "Unauthorized" }`.

2. **Trigger Configuration-Only Dry Run in GitHub Actions:**
   - Go to: `https://github.com/venkatapavanpadamati-8899/kavach-campus/actions/workflows/safe-walk-scheduler.yml`
   - Click **Run workflow**.
   - Check `dry_run: true`.
   - Verify that the step **Validate Scheduler Configuration** succeeds and outputs `Configuration validated successfully: Target URL is https://kavach-campus.vercel.app and CRON_SECRET is present.` without invoking the live endpoints.

3. **Verify Masking in GitHub Actions Logs:**
   - Inspect the workflow run logs.
   - Confirm that any mention of the secret is completely replaced with `***`.
