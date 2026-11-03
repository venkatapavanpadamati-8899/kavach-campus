# KAVACH CAMPUS — PHASE 6: STAGING DATABASE PROVISIONING GUIDE

**Project:** Kavach Campus  
**Execution Timestamp:** 2026-11-03T22:00:00+05:30  
**Status:** `OWNER ACTION REQUIRED` | `STAGING PREREQUISITE`

---

## 1. Safety Mandate: Isolation from Production

> [!IMPORTANT]
> Running unverified database migrations (specifically `015_campus_admin_registration_request.sql`, `016_college_admin_and_staff_roles.sql`, and `017_student_college_claims.sql`) or mock test scripts directly against the Production Supabase instance (`https://uvyokrqlpvwuwfudskvg.supabase.co`) introduces severe risk of schema regression, constraint failures, and student data corruption.

A completely isolated Staging Supabase project must be provisioned before any live database validation or migration execution takes place.

---

## 2. Step-by-Step Staging Supabase Setup

The repository owner must perform the following setup:

### Step 1: Create a Free Staging Project in Supabase
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project** within your organization.
3. Configure the project:
   - **Name:** `kavach-campus-staging`
   - **Database Password:** Generate and securely save a strong database password.
   - **Region:** Select the same region as Production (e.g., `ap-south-1` - Mumbai).
   - **Pricing Plan:** Free Tier.
4. Click **Create new project** and wait ~2 minutes for provisioning to complete.

### Step 2: Retrieve API Keys & Connection Strings
From the new staging project settings (`Settings -> API`):
1. Copy **Project URL**: `https://<staging-ref>.supabase.co`
2. Copy **anon / public key**: `eyJh...`
3. Copy **service_role key**: `eyJh...` (Secret - keep private)
4. From `Settings -> Database`:
   - Copy **Direct Connection URI** / Transaction Pooler string for CLI migrations.

---

## 3. Staging Environment Variables Checklist

Prepare a dedicated `.env.staging` file on the deployment/runner host (DO NOT commit to git):

| Environment Variable | Description | Source / Location |
|:---|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Project API URL | Supabase Dashboard -> Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging Anonymous Public Key | Supabase Dashboard -> Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging Privileged Service Role Key | Supabase Dashboard -> Settings -> API (Secret) |
| `CRON_SECRET` | 64-char Hex Secret for Staging | Generated via `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | Staging Base URL | e.g., `https://kavach-campus-staging.vercel.app` |
| `NEXT_PUBLIC_ENABLE_SMS_SIMULATION` | `true` (Ensures ₹0 test SMS) | Application Configuration |
| `GEMINI_API_KEY` | Gemini API Key for AI routing | Google AI Studio |
| `ENABLE_PRODUCTION_CRON` | `false` | Explicitly disables live production cron |

---

## 4. Migration Execution Plan for Staging

Once the staging project is available:
1. Apply baseline migrations `001` through `014` to reproduce production baseline.
2. Apply pending migrations sequentially:
   - `supabase/migrations/015_campus_admin_registration_request.sql`
   - `supabase/migrations/016_college_admin_and_staff_roles.sql`
   - `supabase/migrations/017_student_college_claims.sql`
3. Execute live RLS policy verification against Staging (see `KAVACH_PHASE_6_LIVE_RLS_REPORT.md`).
4. Validate zero data collisions and schema integrity.
