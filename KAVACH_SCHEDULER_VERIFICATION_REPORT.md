# KAVACH CAMPUS — GITHUB ACTIONS & CRON SCHEDULER AUDIT

**Date:** 2026-11-03  
**Workflow File:** `.github/workflows/safe-walk-scheduler.yml`  
**Scheduled Cadence:** Every 2 minutes (`*/2 * * * *`)  
**Status:** WORKFLOW CODE HARDENED & VERIFIED (Awaiting GitHub Secret Provisioning)  

---

## 1. Workflow Architecture & Implementation

The life-safety scheduler automatically polls the production API every two minutes to check for:
1. **Expired Safe Walk Sessions:** Automatically sweeps `/api/cron/safe-walk-timeout` to detect student walks that have exceeded their designated safe arrival window without check-in.
2. **Unacknowledged Critical Incidents:** Sweeps `/api/cron/escalate` to automatically escalate high-priority incidents (L3/L4) to Campus Admins and emergency responders if first-line staff do not acknowledge within the response threshold.

```yaml
name: Kavach Safe Walk & Escalation Scheduler

on:
  schedule:
    - cron: '*/2 * * * *'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run only (validate configuration without invoking live endpoints)'
        required: false
        default: 'false'
        type: boolean
```

---

## 2. Security & Life-Safety Compliance Audit

| Requirement | Audit Finding | Verification Status |
| :--- | :--- | :---: |
| **Strict Authentication** | Endpoints require `Authorization: Bearer <CRON_SECRET>`. Timing-safe comparison prevents timing attacks. | **VERIFIED** |
| **Secret Masking** | Workflow includes `echo "::add-mask::$CRON_SECRET"` to ensure credentials never appear in GitHub execution logs. | **VERIFIED** |
| **Target URL Fallback** | Automatically defaults `TARGET_URL` to `https://kavach-campus.vercel.app` if `VERCEL_PROJECT_URL` is omitted. | **VERIFIED** |
| **Bounded Execution** | Uses `curl --connect-timeout 10 --max-time 30` to prevent hanging workflows. | **VERIFIED** |
| **Honest Error Reporting** | When `CRON_SECRET` is missing, the step exits with code 1 and outputs actionable instructions. Never masks failures with fake code 0. | **VERIFIED** |
| **Dry-Run Mode** | Operators can manually trigger the workflow with `dry_run: true` to test configuration syntax without touching live databases. | **VERIFIED** |

---

## 3. Investigation of Run #36 (`57835c8`) Failure

- **Run URL:** `https://github.com/venkatapavanpadamati-8899/kavach-campus/actions/runs/41596988968`
- **Root Cause:** In commit `57835c8`, the script checked if `CRON_SECRET` was defined in GitHub repository secrets. Because neither GitHub Secrets nor Vercel Environment Variables had `CRON_SECRET` added, the workflow honestly halted with `exit 1` to alert the administrator.
- **Remediation Applied in Code (`2cfa212`):**
  1. Defaulted target URL to `https://kavach-campus.vercel.app`.
  2. Enhanced error messaging with step-by-step instructions.
  3. Added interactive `workflow_dispatch` trigger.

---

## 4. Operator Resolution Steps

To achieve 100% green runs on GitHub Actions:
1. Open GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret**.
   - **Name:** `CRON_SECRET`
   - **Value:** Set to a secure 32+ character random secret string.
3. Open Vercel Project -> **Settings** -> **Environment Variables**.
   - Add `CRON_SECRET` with the exact same secret value for Production, Preview, and Development.
4. Redeploy Vercel and trigger **Run workflow** in GitHub Actions.

