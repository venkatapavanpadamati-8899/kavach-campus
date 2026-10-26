# Kavach Campus — Batch 20 Baseline Report
**Generated:** October 18, 2026 (Local Context)  
**Project:** Kavach Campus — Safety in One Tap  
**Workspace Path:** `D:\Kavach Campus`  
**Git Branch:** `master`  
**Latest Commit:** `aa96b34 fix(ui): resolve JS SyntaxError and API.user TypeErrors`

---

## 1. Safety and Isolation Declarations

- **Production Database Reference (`polbnvszmvblwenfnqll`):** **STRICT HOLD**. No DDL, migrations, or data modifications will be directed at remote Supabase.
- **Secret Protection:** No API keys, passwords, tokens, OTPs, or connection strings are printed or committed.
- **Local Database Environment:** Local Supabase containers running on Docker (`supabase_db_kavach_campus` at `localhost:54322`, Kong API at `localhost:54321`).
- **Disposable Testing Requirement:** All migration reconciliation experiments and clean bootstrap tests use disposable isolated containers on isolated ports.

---

## 2. Repository and Toolchain Baseline

| Component | Detected Version / Status |
|:---|:---|
| **Operating System** | Windows 11 / PowerShell |
| **Node.js Environment** | Node.js with Next.js 15+ App Router, React 19, TypeScript |
| **Package Manager** | `npm` (verified via `package-lock.json`) |
| **Test Runner** | Vitest (`npm test` -> `vitest run`) |
| **Linter / Formatter** | ESLint (`eslint.config.mjs`) |
| **Docker Engine** | Docker 29.8.2 |
| **Supabase CLI / Stack** | Local Supabase 2.121.0 running 12 containers |

### Available NPM Scripts
- `npm run dev`: Starts Next.js development server
- `npm run build`: Executes production Next.js compilation
- `npm run start`: Starts production Next.js server
- `npm run lint`: Runs ESLint across repository
- `npm test`: Runs Vitest test suites once
- `npm run test:watch`: Runs Vitest in interactive watch mode

---

## 3. Git Status & File Inventory

- **Modified tracked files:**
  - `.env.example`
  - `.gitignore`
  - `package.json`
  - `package-lock.json`
  - `src/app/api/incidents/route.ts`
- **Legacy Files Cleaned Up (Staged Deletions):**
  - Deprecated vanilla HTML/CSS prototypes in `backend/`, `css/`, `pages/`, `js/`
- **Core Active Source Tree:**
  - `src/app/`: 36 pages / 59 compiled routes across student, staff, admin, super-admin, management, and public portals.
  - `src/components/`: Reusable navigation, layout, verification, and incident management widgets.
  - `src/lib/`: Modular services for auth, verification, storage, AI, escalation, notifications.
  - `src/__tests__/`: 22 Vitest test suites covering auth, RBAC, SOS, safe walk, storage, AI, escalation, and rate limiting.
  - `supabase/migrations/`: Migration scripts under reconciliation.

---

## 4. Current Reported Status & Batch 20 Objectives

- **Automated Tests:** 22/22 suites running in background.
- **Storage Authorization:** Student ID card upload path alignment (`src/app/student/verification-status/page.tsx`) to strictly obey RLS `auth.uid()` path requirement.
- **Migration Pipeline:** Canonical 8-step sequence identified; duplicate `001`, `002`, `008` and unreviewed scripts quarantined.
- **Production Readiness:** Local verification complete; production credentials and live endpoints held pending institutional configuration.
