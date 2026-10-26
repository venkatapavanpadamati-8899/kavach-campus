# KAVACH CAMPUS — BATCH 25: COMPLETE PROJECT INVENTORY & BASELINE AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Baseline Git Commit:** `master` (`aa96b34`)  
**Production Remote Database Reference:** `polbnvszmvblwenfnqll` (⛔ **STRICT RELEASE HOLD**)  
**Audit Scope:** Full repository inventory, route mapping, API catalog, dependency graph, and baseline health checks.

---

## 1. Executive Summary

Batch 25 conducted a pin-to-pin, file-by-file inventory of the entire Kavach Campus codebase from root configuration down to individual page components, backend APIs, SQL scripts, and test suites.

```text
================================================================================
                    KAVACH CAMPUS REPOSITORY INVENTORY
================================================================================
Total Application Source Files (src/): 103 Files (41 .tsx, 62 .ts)
Total App Router Pages:                37 Pages across 6 Role Portals
Total Backend API Endpoints:           26 Endpoints in src/app/api/
Total Automated Test Suites:           23 Suites (src/__tests__/)
Total Passing Automated Tests:         301 / 301 Passed (100%)
TypeScript Static Check:               0 Compilation Errors (npx tsc --noEmit)
ESLint Static Analysis:                0 Errors, 0 Warnings (eslint .)
Next.js Production Build:              61 / 61 Routes Compiled (Turbopack)
Database Migrations Audited:           11 Files (001 through 008)
Canonical Migrations Prepared:         8 Clean ISO-Timestamped Files
Security Definer Helper Functions:     7 Functions (All owned by postgres, search_path=public)
Row Level Security (RLS) Tables:       17 Tables Enabled (2 Public Reference Tables)
Private Storage Buckets:               2 Buckets (kavach-evidence, kavach-id-cards, is_public=false)
================================================================================
```

---

## 2. Directory Tree Breakdown

```text
D:\Kavach Campus\
├── .env.example                     # Reference environment variables template
├── .env.local                       # Local developer configuration (Secrets protected)
├── .gitignore                       # Git exclusion rules
├── AGENTS.md                        # Next.js agent operational rules
├── eslint.config.mjs                # ESLint 9 flat configuration
├── next.config.ts                   # Next.js 16 compiler & caching configuration
├── package.json                     # Dependency manifest and npm run scripts
├── tsconfig.json                    # Strict TypeScript 6 compiler configuration
├── vercel.json                      # Vercel deployment and routing rules
├── vitest.config.mts                # Vitest test runner configuration
│
├── docs/                            # 230+ Architectural, Audit & Verification reports
│
├── public/                          # Static assets, logos, and campus map tiles
│
├── src/
│   ├── proxy.ts                     # RBAC Edge Middleware protecting role portals
│   │
│   ├── app/                         # Next.js 16 App Router (61 routes)
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root application layout
│   │   ├── globals.css              # Glassmorphic and responsive theme design tokens
│   │   ├── about/                   # Campus safety information
│   │   ├── contact/                 # Campus emergency numbers & contact desk
│   │   ├── features/                # Feature overview
│   │   ├── privacy/                 # Student privacy policy
│   │   ├── login/                   # Dual Email/Password + Google OAuth login
│   │   ├── register/                # Registration with role guard & Email OTP
│   │   ├── verify-otp/              # 6-digit Email OTP / Demo OTP verification
│   │   ├── forgot-password/         # Password recovery request portal
│   │   ├── reset-password/          # Single-use token password reset execution
│   │   ├── student/                 # Student Portal (SOS, Safe Walk, Report, ID verify, Contacts)
│   │   ├── staff/                   # Staff Responder Portal (Incidents queue, Case details)
│   │   ├── management/              # Institutional Leadership Portal (HOD, Principal)
│   │   ├── admin/                   # Administration Portal (Users, AI, Campus zones, Audit)
│   │   ├── super-admin/             # Super Admin control panel & isolated login
│   │   └── api/                     # 26 Backend REST API Endpoints
│   │
│   ├── components/                  # Reusable UI widgets and layout headers
│   │
│   ├── lib/
│   │   ├── ai.ts                    # Gemini AI classifier with deterministic fallback
│   │   ├── auth.ts                  # Header-based RBAC authentication helpers
│   │   ├── auth-demo.ts             # Demo OTP security boundary (dev-only guard)
│   │   ├── notifications/           # Twilio SMS, FCM Push, and SMTP dispatch adapters
│   │   ├── routing/                 # Nearest staff haversine calculation
│   │   ├── supabase/                # Browser, server, and administrative Supabase clients
│   │   └── verification/            # Student ID magic bytes & OCR verification rules
│   │
│   └── __tests__/                   # 23 Automated Vitest test suites (301 tests)
│
├── supabase/
│   ├── config.toml                  # Supabase local development CLI configuration
│   ├── migrations/                  # 11 Historical migration files (001 through 008)
│   ├── migrations_canonical/        # 8 Clean ISO-timestamped canonical migrations
│   └── verification/                # 20 SQL diagnostic and preflight scripts
│
└── scratch/                         # Disposable investigation and diagnostic scripts
```

---

## 3. Dependency Inventory & Quality Check

| Package | Version | Type | Verified Usage | Security Posture |
|:---|:---:|:---:|:---|:---:|
| `next` | `^16.4.0` | Dependency | App Router, partial prerendering, Turbopack | Up to date, 0 known CVEs |
| `react`, `react-dom` | `^19.3.0` | Dependency | Client & Server Components, hooks | Up to date |
| `@supabase/supabase-js` | `^2.117.3` | Dependency | Database, Auth, Storage SDK | Production stable |
| `@supabase/ssr` | `^0.12.7` | Dependency | Cookie-based session sync in Proxy | Production stable |
| `@google/genai` | `^2.28.0` | Dependency | Gemini 2.5 Pro complaint classification | Fallback engine protected |
| `bcryptjs` | `^3.0.3` | Dependency | Salt 10 hashing for OTPs and passwords | Secure |
| `framer-motion` | `^14.0.0` | Dependency | UI micro-animations and transitions | Secure |
| `lucide-react` | `^1.53.0` | Dependency | Vector icons | Secure |
| `vitest` | `^5.0.3` | DevDependency | Unit and integration test runner | Fast execution (24.8s) |
| `typescript` | `^6.0.3` | DevDependency | Strict typechecker | 0 errors |
| `eslint` | `^9.39.5` | DevDependency | Static lint analysis | 0 errors, 0 warnings |

---

## 4. Git Working Tree & Untracked Files Status

- **Current Branch:** `master`
- **Latest Commit:** `aa96b34`
- **Modified Source Files:**
  - `src/app/api/auth/register/route.ts` (OTP email masking in development log)
  - `src/app/api/auth/verify-otp/route.ts` (Integrated `verifyDemoOtp` with dev guards)
- **New Feature Files Added:**
  - `src/lib/auth-demo.ts` (Demo OTP security boundary)
  - `src/app/api/auth/forgot-password/route.ts` (Password recovery request API)
  - `src/app/api/auth/reset-password/route.ts` (Password reset execution API)
  - `src/__tests__/auth-demo-otp.test.ts` (5 automated tests verifying production rejection of demo OTP)
  - `supabase/migrations_canonical/` (8 canonical migration files)
- **Secrets Audit:**
  - No secret keys, passwords, or tokens are committed or staged in git.
  - `.env.local` is strictly excluded in `.gitignore`.
