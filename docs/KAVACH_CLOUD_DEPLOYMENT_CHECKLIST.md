# KAVACH CAMPUS — CLOUD DEPLOYMENT & PRODUCTION READINESS CHECKLIST

**Project:** Kavach Campus  
**Date:** October 19, 2026  
**Scope:** Phase 15 (Hosting Architecture, Environment Variables, Pre-Flight Verification)  
**Status:** READY FOR DEPLOYMENT (Awaiting College Platform Credentials)

---

## 1. Production Architecture Overview

- **Hosting Platform:** Vercel (Edge Network + Serverless Node.js 20.x runtime) or AWS Amplify / College Private Cloud.
- **Database & Storage:** Supabase Cloud (`polbnvszmvblwenfnqll` in ap-south-1 Mumbai).
- **DNS / Domain:** Target custom domain `kavach.college.edu` with automated SSL (Let's Encrypt / Cloudflare).
- **Automated Escalation:** Vercel Cron Jobs configured via `vercel.json` targeting `/api/cron/escalate` and `/api/cron/safe-walk`.

---

## 2. Pre-Flight Verification Checklist

| Step # | Deployment Requirement | Verification Method | Status |
|---|---|---|---|
| **1** | Production Build Compilation | `npm run build` with Turbopack | **PASS** (63 routes compiled) |
| **2** | TypeScript Type Integrity | `npx tsc --noEmit` | **PASS** (0 errors) |
| **3** | Code Quality & Linting | `npm run lint` | **PASS** (0 warnings/errors) |
| **4** | Security Vulnerability Audit | `npm audit --omit=dev` | **PASS** (0 vulnerabilities) |
| **5** | Automated Test Suite | `npm test` | **PASS** (368/368 tests passed) |
| **6** | Environment Variables Template | `docs/KAVACH_PRODUCTION_ENV_TEMPLATE.md` | **PASS** (Zero secrets leaked) |
| **7** | Production Smoke Test Protocol | `docs/KAVACH_PRODUCTION_SMOKE_TEST.md` | **PASS** (17-point test script ready) |
| **8** | Database Migration Alignment | Supabase Migrations 001 - 010 applied | **PASS** (Remote DB synced) |
| **9** | Storage Bucket Privacy | `kavach-id-cards` & `kavach-evidence` | **PASS** (Strictly private) |
| **10** | Vercel Deployment Trigger | College Vercel Account Linked | **AWAITING USER DEPLOYMENT TRIGGER** |

---

## 3. Step-by-Step Production Deployment Procedure

### Step 1: Connect Git Repository to Vercel
1. Log in to the college Vercel dashboard at [vercel.com](https://vercel.com).
2. Click **Add New Project** and import the `Kavach Campus` repository.
3. Select **Next.js** framework preset.

### Step 2: Configure Environment Variables in Vercel
Under **Project Settings -> Environment Variables**, add the production keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `CRON_SECRET` (Generate a secure 32-character string)
- `NEXT_PUBLIC_APP_URL` (Set to `https://kavach.college.edu` or Vercel URL)

### Step 3: Align Supabase Auth Settings
1. Go to Supabase Dashboard -> **Authentication -> URL Configuration**.
2. Set **Site URL** to `https://kavach.college.edu`.
3. Add `https://kavach.college.edu/auth/callback` to **Redirect URLs**.

### Step 4: Execute Post-Deployment Smoke Test
Run the 17-point verification protocol outlined in `docs/KAVACH_PRODUCTION_SMOKE_TEST.md`.
