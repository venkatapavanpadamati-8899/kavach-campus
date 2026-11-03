# KAVACH CAMPUS — PHASE 5 STAGING SUPABASE SETUP GUIDE

**Project:** Kavach Campus  
**Target Architecture:** Isolated Multi-Tenant Staging Environment  
**Timestamp:** 2026-11-03T21:35:45+05:30  
**Current Status:** **OWNER ACTION REQUIRED / STAGING BLOCKED**

---

## 1. WHY AN ISOLATED STAGING PROJECT IS MANDATORY

Executing unverified database migrations (such as modifying student ID uniqueness constraints or creating storage policies) or running destructive RLS penetration tests directly against the Production Supabase instance risks:
- Unintended downtime for live students and faculty.
- Accidental corruption or loss of existing registration records.
- Cross-contamination between simulated test alerts and genuine emergency cases.

Therefore, testing must occur on a separate, dedicated Supabase project.

---

## 2. HOW TO CREATE A SEPARATE STAGING PROJECT (OWNER STEP-BY-STEP)

1. Log into your Supabase Dashboard:
   `https://supabase.com/dashboard`
2. Click **New Project**.
3. Fill in the project details:
   - **Organization:** Select your existing organization.
   - **Name:** `kavach-campus-staging`
   - **Database Password:** Generate and securely save a strong database password.
   - **Region:** Select the same region as Production (e.g. `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
   - **Pricing Plan:** Free tier is completely sufficient for staging validation.
4. Click **Create new project** and wait 2 minutes for provisioning to complete.

---

## 3. STAGING CONFIGURATION CHECKLIST

Once the staging project is ready, copy its configuration parameters from **Project Settings -> API**:

| Variable Name | Description | Environment Scope |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project API URL (`https://<project-ref>.supabase.co`) | Frontend & Backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous API key for staging | Frontend (Browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged secret service role key for staging | Backend Server only |
| `CRON_SECRET` | 32+ byte random token (same as rotated staging secret) | Backend & GitHub Actions |
| `GEMINI_API_KEY` | Google Gemini API key for AI complaint classification | Backend Server only |

> [!IMPORTANT]
> **DO NOT** paste connection strings, passwords, or service role keys into ChatGPT or public chat.
> Keep these credentials in your local `.env.staging` file or configure them in Vercel's **Preview** environment.

---

## 4. APPLYING MIGRATIONS TO STAGING

Once the staging project is provisioned:
1. Open the Staging Supabase **SQL Editor**.
2. Run the baseline migrations (001 through 014) to establish the base schema.
3. Then execute the pending Phase 5 remediation migrations:
   - Step 1: `supabase/migrations/015_college_scoped_student_id_uniqueness.sql`
   - Step 2: `supabase/migrations/016_safe_box_private_notes.sql`
   - Step 3: `supabase/migrations/017_student_college_claims.sql`
4. Staging database is now ready for the Phase 6 Live RLS Security Validation.
