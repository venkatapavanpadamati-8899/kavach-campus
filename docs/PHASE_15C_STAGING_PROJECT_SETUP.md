# KAVACH CAMPUS — PHASE 15C: DEDICATED SUPABASE STAGING PROJECT SETUP

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Scope:** Cloud-Based Isolated Staging Project for Authenticated RLS Penetration Testing  
**Audit Date:** November 4, 2026  
**Document:** Cloud Staging Provisioning, Credential Isolation, & Testing Blueprint  
**Safety Status:** **STRICT ENVIRONMENT SEPARATION — ZERO PRODUCTION OVERLAP**

---

## 1. Architectural Isolation Requirements

If local Docker is not preferred, a dedicated, free-tier Supabase Cloud staging project provides an exact cloud replica without risking production data.

### Absolute Isolation Rules:
1. **Distinct Project Reference:** Must have its own distinct Supabase Project ID (e.g. `kavach-campus-staging`), never sharing the production ID (`dvyiclyyvmsfipzrdowu`).
2. **Dedicated Credential File:** Staging credentials must be placed in a separate file ([`.env.staging`](file:///d:/kavach-campus/.env.staging)), never merged into `.env.local`.
3. **Zero Production Data Import:** Never export or restore production customer records, incidents, audit logs, or storage objects into staging.
4. **Synthetic Identities Only:** Only mock personas (`@test.kavachcampus.local`) may be created in the staging project.
5. **No Production Keys:** Production service-role keys must never be provided to staging test runners.

---

## 2. Owner Setup Steps: Provisioning Cloud Staging Project

### Step 2.1: Create Staging Project in Supabase Dashboard
1. Log in to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Configure settings:
   - **Name:** `kavach-campus-staging`
   - **Database Password:** Generate a secure temporary password.
   - **Region:** `ap-south-1` (Mumbai) or closest available region.
   - **Pricing Plan:** Free tier.
4. Click **Create new project** and wait ~2 minutes for provisioning to complete.

---

### Step 2.2: Obtain Staging API Credentials
1. In the staging project dashboard, navigate to **Project Settings** → **API**.
2. Note the following values:
   - **Project URL:** `https://<staging-ref>.supabase.co`
   - **anon / public key:** `eyJ...` (Staging Anon Key)
   - **service_role key:** `eyJ...` (Staging Service Role Key)

---

### Step 2.3: Configure Staging Environment File (`.env.staging`)
Create the file `.env.staging` in the project root:

```bash
# ==============================================================================
# KAVACH CAMPUS — DEDICATED STAGING ENVIRONMENT
# STRICTLY ISOLATED FROM PRODUCTION (DO NOT USE PRODUCTION VALUES)
# ==============================================================================

NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

# Demo Mode Flags
ENABLE_DEMO_OTP=true
ENABLE_DEMO_SMS=true
```

*(Ensure `.env.staging` is included in `.gitignore` so secrets are never committed).*

---

## 3. Staging Schema Initialization

Initialize the cloud staging project with the baseline schema and test migrations:

### Step 3.1: Apply Baseline Migrations (001–014)
In the Supabase SQL Editor of the **staging project**:
1. Copy and execute migrations `001` through `014` in sequential order.
2. Confirm the 19 core tables (`profiles`, `incidents`, `evidence`, etc.) are created with RLS enabled.

---

### Step 3.2: Seed Synthetic Staging Personas
Execute the staging seed runner using the staging environment file:
```powershell
npx tsx --env-file=.env.staging scripts/seed_local_staging_personas.ts
```

*Synthetic Staging Personas Created:*
- `student_a_srkr@test.local` (College: SRKR)
- `student_b_srkr@test.local` (College: SRKR)
- `student_c_vitb@test.local` (College: VITB)
- `staff_srkr@test.local` (College: SRKR Staff Responder)
- `admin_srkr@test.local` (College: SRKR Campus Admin)
- `admin_vitb@test.local` (College: VITB Campus Admin)
- `super_admin@test.local` (Global Governance)

---

## 4. Migration Execution & Verification on Staging

Once the baseline schema and mock data are active on staging, execute the pending migrations sequentially in the staging SQL editor:

1. **Execute Migration 015:**
   - Run `supabase/migrations/015_college_scoped_student_id_uniqueness.sql`.
   - Test compound uniqueness between SRKR and VITB student registrations.
2. **Execute Migration 016:**
   - Run `supabase/migrations/016_safe_box_private_notes.sql`.
   - Test private notes insertion and verify strict zero-trust denial for staff and admins.
3. **Execute Migration 017:**
   - Run `supabase/migrations/017_student_college_claims.sql`.
   - Verify bucket `kavach-profile-photos` is created and test user folder isolation.

---

## 5. Automated RLS Staging Test Execution

Execute the authenticated RLS test suite against the staging database using user JWTs:
```powershell
npx vitest run src/__tests__/authenticated-staging-rls.test.ts --env-file=.env.staging
```

*Expected Staging Output:*
```text
 ✓ Student A reads own incident (200 OK)
 ✓ Student A blocked from Student B incident (0 rows returned)
 ✓ Student A blocked from updating Student B incident (403 Forbidden)
 ✓ Student A reads own Safe Box note (200 OK)
 ✓ Student B blocked from Student A Safe Box note (0 rows returned)
 ✓ Staff blocked from Student A Safe Box note (0 rows returned / Default Deny)
 ✓ Admin blocked from Student A Safe Box note (0 rows returned / Default Deny)
 ✓ Student A blocked from Student B profile photo (0 rows returned)
 ✓ Direct client upload blocked on storage (403 Access Denied)
 ✓ Cross-college query blocked between SRKR and VITB (0 rows returned)

Test Files  1 passed (1)
     Tests  10 passed (10)
```

---

## 6. Staging Teardown Protocol

When testing is complete:
- The staging project can be paused or deleted in the Supabase Dashboard.
- Delete `.env.staging` from the local workspace.
- **Production database remains untouched, clean, and unaffected.**

