# KAVACH CAMPUS — FINAL BUG FIX REPORT

**Date:** 2026-11-03  
**Workspace:** `D:\Kavach Campus`  
**Git Branch & Commit:** `main` (`57835c86b86bbf3d38e3de813d7c7638c1c46835`)  

---

## Verified Defects & Root-Cause Resolutions

### Bug 1: GitHub Actions Scheduler Workflow Run #32 Failure
* **Root Cause:** `.github/workflows/safe-walk-scheduler.yml` aborted because `VERCEL_PROJECT_URL` or `CRON_SECRET` was unpopulated in GitHub repository secrets.
* **Fix Applied:** Hardened the workflow with early parameter validation, dual secret/variable fallback (`${{ secrets.VERCEL_PROJECT_URL || vars.VERCEL_PROJECT_URL }}`), Node.js HTTPS origin checking, `::add-mask::` secret masking, and safe manual dry-run mode (`workflow_dispatch`).
* **Verification:** Validated via 4 automated unit tests in `src/__tests__/safe-walk-scheduler-workflow.test.ts`.

### Bug 2: Google OAuth Localhost Loop (ERR_CONNECTION_REFUSED)
* **Root Cause:** Supabase Authentication redirected users back to `http://localhost:3000` because callback URLs were not dynamically bound to the current host origin in production.
* **Fix Applied:** Created `src/lib/oauth.ts` with `getAuthCallbackUrl()` dynamically resolving `window.location.origin`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, and `VERCEL_URL`. Installed defensive OAuth code-recovery bridge in `src/proxy.ts` to capture any OAuth code landing on `/` or `/login` and redirect to `/api/auth/callback`.
* **Verification:** Validated via 22 automated tests in `src/__tests__/auth-google-oauth.test.ts`.

### Bug 3: Missing Safe Box Student Evidence Vault
* **Root Cause:** Students had no private encrypted media vault to preserve evidence before submitting official grievance reports.
* **Fix Applied:** Built full Safe Box backend API (`src/app/api/student/safe-box/route.ts`) and UI (`src/app/student/safe-box/page.tsx`) with camera capture, voice memo, PDF preview modal, 25MB limits, and owner-only delete.
* **Verification:** Validated via 12 automated unit tests in `src/__tests__/safe-box.test.ts`.

### Bug 4: Emergency Reports Blocked by Student ID Card Verification
* **Root Cause:** `/api/incidents` rejected unverified students from submitting any incident, including life-threatening emergency situations.
* **Fix Applied:** Updated `src/app/api/incidents/route.ts` to allow `category === 'EMERGENCY'` or `priority === 'CRITICAL'` to bypass the unverified check safely while preserving audit logging.
* **Verification:** Automated verification passed in incident test suite.

### Bug 5: Inaccessible Evidence Attachments on Incident Detail Page
* **Root Cause:** File names were rendered as plain text strings without links to view or download files.
* **Fix Applied:** Added secure **"View / Download ↗"** buttons backed by 15-minute temporary signed URLs in `src/app/student/incidents/[id]/page.tsx`.
* **Verification:** Automated verification passed.

### Bug 6: TypeScript Build TS6053 Error in `tsconfig.json`
* **Root Cause:** Non-existent development type paths (`.next/dev/types/**/*.ts`, `.next-production/`) caused `npx tsc --noEmit` and `next build` to fail during production builds.
* **Fix Applied:** Cleaned `tsconfig.json` to standard Next.js specification (`next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`).
* **Verification:** `npx tsc --noEmit` and `npm run build` both exit with Code 0.

### Bug 7: Role-Based College Name Leakage & Neutrality Defect
* **Root Cause:** Platform Administrators (`SUPER_ADMIN` and `ADMIN`) had college names or "Campus verification pending" displayed in their dashboard header and sidebar.
* **Fix Applied:** Updated `src/components/layouts/DashboardLayout.tsx` to suppress college branding for `role="ADMIN"` and show `Platform Administration` with a `ShieldAlert` icon. Updated `src/app/management/page.tsx` and `src/app/management/incidents/page.tsx` to strictly filter incident queries by `profile.college_id` and display verified college name. Added `src/app/management/layout.tsx`.
* **Verification:** Validated via 12 unit and API tests in `src/__tests__/role-college-visibility-and-isolation.test.ts`.

### Bug 8: Git Binary Diff Anomaly on `README.md`
* **Root Cause:** An earlier commit appended UTF-16 bytes with null characters at the end of `README.md`, causing Git to treat the file as binary.
* **Fix Applied:** Created `.gitattributes` specifying `*.md text diff`.
* **Verification:** `git diff --stat README.md` now outputs normal text additions/deletions.

