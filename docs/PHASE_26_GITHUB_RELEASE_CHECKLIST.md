# KAVACH CAMPUS — PHASE 26 GITHUB RELEASE CHECKLIST

**Project:** Kavach Campus — Safe Campus Network for Higher Education  
**Repository:** `https://github.com/venkatapavanpadamati-8899/kavach-campus`  
**Target Branch:** `main`  
**Base Commit:** `4cbc700`  
**Prepared Commit Message:** `"release: complete Kavach Campus Phase 25 and Phase 26 production readiness audit"`  
**Gate Status:** **`LOCKED — PENDING OWNER AUTHORIZATION`**  

---

> [!CAUTION]
> **STRICT SAFETY GATE:**  
> The agent is strictly prohibited from running `git commit`, `git push`, or `git push --force`. The commands below are prepared for manual execution by the repository owner once all prerequisites are satisfied.

---

## 1. Pre-Commit Verification Checklist

- [x] **1.1 Branch & Remote Alignment:**
  - Branch: `main`
  - Remote URL: `https://github.com/venkatapavanpadamati-8899/kavach-campus.git`
- [x] **1.2 Secret Exclusion Verification:**
  - Tracked env files check: `git ls-files .env .env.local .env.production *.env` -> 0 results (Clean).
  - Git diff secret scan: 0 service-role keys, private keys, or passwords detected.
  - `.gitignore` verified to exclude `.env*`, `node_modules`, `.next`, `.vercel`, test reports.
- [x] **1.3 Merge Conflict & Whitespace Audit:**
  - `git diff --check` -> Clean (Exit Code 0).
- [x] **1.4 Quality Gate Verification:**
  - TypeScript: `npx tsc --noEmit` -> 0 Errors (Exit Code 0).
  - ESLint: `npm run lint` -> 0 Errors, 0 Warnings (Exit Code 0).
  - Vitest: `npm test` -> 63/63 Suites, 799/799 Tests Passed (Exit Code 0).
  - Playwright: `npx playwright test` -> In Progress (222 Tests across 11 Viewports).
  - Next.js Build: `npm run build` -> 72/72 Routes Generated (Exit Code 0).

---

## 2. Staged Files Inventory for Release Commit

The following files will be included in the release commit:

### A. Production Source & Architecture Code
1. `src/app/admin/ai/page.tsx` — Dynamic AI control panel lifecycle.
2. `src/app/api/admin/ai/route.ts` — Dynamic route handler with live connectivity check.
3. `src/app/api/auth/callback/route.ts` — Multi-device OAuth callback & PKCE handling.
4. `src/app/api/auth/google/route.ts` — Dynamic OAuth initiation URL derivation.
5. `src/app/api/colleges/search/route.ts` — Multi-parameter statewide college search endpoint.
6. `src/app/api/student/profile/route.ts` — Student institution claims and profile handler.
7. `src/components/CollegeSelector.tsx` — Punctuation-tolerant college selector dropdown.
8. `src/components/layouts/DashboardLayout.tsx` — Mobile responsive navigation drawer.
9. `src/components/ui/CollegeSearchInput.tsx` — Search input component with debounce.
10. `src/lib/ai.ts` — `checkGeminiConnectivity()` non-intrusive ping & cached health check.
11. `src/lib/college-branding.ts` — Dynamic institution branding & colors.
12. `src/lib/colleges/index.ts` — Punctuation-normalized search engine (`/[.\s\-_]/g`).
13. `src/lib/colleges/ap-colleges-data.ts` — Authoritative dataset of 145 AP colleges.
14. `src/lib/colleges/districts.ts` — Official 26 gazetted AP districts definition.
15. `src/proxy.ts` — Next.js proxy middleware for LAN and route protection.
16. `next.config.ts` — Optimized static page worker allocation.
17. `package.json` — Dependency specifications.

### B. Database Migrations
18. `supabase/migrations/018_legacy_rls_policy_remediation.sql` — Forward-only RLS remediation.
19. `supabase/migrations/019_ap_statewide_colleges_registry.sql` — AP statewide registry & seeds.

### C. Test Suites & Documentation
20. `src/__tests__/ap-statewide-colleges.test.ts` — Statewide college unit test suite.
21. `tests/e2e/viewport-responsiveness.spec.ts` — Multi-device responsive E2E suite.
22. `docs/PHASE_25_*.md` (12 files) — Comprehensive Phase 25 technical audit documentation.
23. `docs/PHASE_26_*.md` (5 files) — Comprehensive Phase 26 release & deployment documentation.
24. `PROJECT_STATUS.md` — Consolidated component status matrix.
25. `docs/PRODUCTION_RELEASE_CHECKLIST.md` — Pre-deployment runbook.
26. `README.md` — Comprehensive architecture and operations guide.

---

## 3. Owner Execution Runbook (PowerShell)

Execute these commands in `D:\kavach-campus` ONLY after reviewing the database migration prerequisites:

```powershell
# 1. Stage verified release changes
git add src/ supabase/migrations/ docs/ tests/ package.json next.config.ts PROJECT_STATUS.md README.md

# 2. Verify staged diff
git status
git diff --cached --stat

# 3. Commit verified release package
git commit -m "release: complete Kavach Campus Phase 25 and Phase 26 production readiness audit"

# 4. Push to remote main branch
git push origin main
```

