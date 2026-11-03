# KAVACH CAMPUS — PHASE 5 SECURE SECRET ROTATION GUIDE

**Project:** Kavach Campus  
**Target Variable:** `CRON_SECRET`  
**Security Classification:** Highly Sensitive — System Life-Safety Token  
**Timestamp:** 2026-11-03T21:35:30+05:30  
**Status:** **OWNER ACTION REQUIRED**

---

## 1. WHY ROTATION IS MANDATORY

The previously referenced test secret is compromised and publicly exposed in past commit logs. Any actor possessing this string could trigger unauthorized timeout scans or flood staff escalation queues. It must be immediately replaced across all environments with a freshly generated, uncommitted cryptographic token.

---

## 2. GENERATING THE NEW SECRET LOCALLY (PROJECT OWNER ONLY)

Execute one of the following commands in your own private terminal to generate a 32-byte (64 hex characters) cryptographic random secret:

### Option A: Using Node.js (Recommended on Windows/Mac/Linux)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option B: Using OpenSSL (Mac/Linux/Git Bash)
```bash
openssl rand -hex 32
```

### Option C: Using PowerShell (Windows)
```powershell
$bytes = New-Object byte[] 32; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [BitConverter]::ToString($bytes) -replace '-'
```

> [!CAUTION]
> **DO NOT** paste or share the generated output into ChatGPT, Antigravity, or public chat. Keep it in your clipboard or local secure password manager.

---

## 3. CONFIGURATION STEPS

### Step 1: Update Vercel Environment Variables
1. Navigate to your Vercel Project Dashboard:
   `https://vercel.com/dashboard -> kavach-campus`
2. Go to **Settings** -> **Environment Variables**.
3. Locate `CRON_SECRET`:
   - Click **Edit** (or Delete and Re-create).
   - Value: Paste the newly generated 64-character hex string.
   - Environments: Ensure **Production** and **Preview** are checked.
4. Click **Save**.
5. Trigger a **Redeploy** of the latest production deployment in Vercel so the running Node.js / Edge containers reload the new environment variable.

### Step 2: Update GitHub Actions Repository Secrets
1. Navigate to your GitHub Repository:
   `https://github.com/venkatapavanpadamati-8899/kavach-campus`
2. Go to **Settings** (tab at top) -> **Secrets and variables** (left sidebar) -> **Actions**.
3. Under **Repository secrets**:
   - If `CRON_SECRET` exists, click **Update**.
   - If not, click **New repository secret**.
   - **Name:** `CRON_SECRET`
   - **Secret:** Paste the exact same 64-character hex string from Step 1.
4. Click **Add secret** / **Update secret**.

### Step 3: (Optional / Recommended) Add Project URL
- In GitHub Repository Secrets:
  - **Name:** `VERCEL_PROJECT_URL`
  - **Secret:** `https://kavach-campus.vercel.app`

### Step 4: Verify with Dry-Run Dispatch
1. Open GitHub Actions tab:
   `https://github.com/venkatapavanpadamati-8899/kavach-campus/actions/workflows/safe-walk-scheduler.yml`
2. Click **Run workflow**.
3. Check the checkbox: **Dry run only (validate configuration without invoking live endpoints)**.
4. Click the green **Run workflow** button.
5. Confirm that the run completes with a **Green Checkmark (Success)** and logs:
   `Configuration validated successfully: Target URL is https://kavach-campus.vercel.app and CRON_SECRET is present.`

---

## 4. LOCAL DEVELOPMENT ENVIRONMENT
In your local `D:\Kavach Campus\.env.local` file:
- Replace `CRON_SECRET=<old_value>` with `CRON_SECRET=<new_value>`.
- Note: `.env.local` is already in `.gitignore` and will never be committed to Git.
