# Kavach Campus — Phase 29: npm, Dependency & Build Remediation Report

**Project:** Kavach Campus — Campus Safety & Anti-Ragging Ecosystem
**Workspace:** `D:\kavach-campus`
**Date:** November 5, 2026
**Final Build Status:** **`PASS (EXIT CODE 0)`**
**Total Automated Tests Passed:** **1,021 / 1,021 (100% PASS)**
- Vitest Unit & Integration: **799 / 799 passed** (63 test files)
- Playwright End-to-End: **222 / 222 passed** (7 spec files)
- Production Routes Generated: **72 / 72 routes**

---

## 1. Original Warnings & Root Cause Investigation

### Warning 1: `npm warn Unknown env config "cache-dir"`
```text
npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
```
- **Investigation & Root Cause:**
  - Audited `.npmrc`, `package.json`, `package-lock.json`, and project-level environment variables. No file in the repository sets `cache-dir`.
  - Audited Vercel project environment variables via the Vercel MCP API (`filter_project_envs`). None of the 26 project environment variables define `cache-dir` or `npm_config_cache_dir`.
  - Grounded against Vercel CI build container architecture: Vercel automatically injects package-manager cache directory variables into its build sandboxes (`npm_config_cache_dir` / `pnpm_config_cache_dir`) to share cache layers across builds.
  - Starting with `npm v11.2+`, the npm CLI introduced strict validation against all `npm_config_*` environment variables. While `pnpm` uses `cache-dir`, standard npm expects `cache`. npm flags `npm_config_cache_dir` as an unrecognized environment variable.
  - **Verdict:** This is an informational warning originating from Vercel's multi-package-manager CI infrastructure. It does not cause build failures or break runtime functionality. No unsupported local npm configuration exists in the codebase.

---

### Warning 2: `npm warn deprecated node-domexception@1.0.0`
```text
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead.
```
- **Investigation & Dependency Tracing (`npm explain node-domexception`):**
  ```text
  node-domexception@1.0.0
  node_modules/node-domexception
    node-domexception@"^1.0.0" from fetch-blob@3.2.0
    node_modules/fetch-blob
      fetch-blob@"^3.1.2" from formdata-polyfill@4.0.10
      node_modules/formdata-polyfill
        formdata-polyfill@"^4.0.10" from node-fetch@3.3.2
        node_modules/node-fetch
          node-fetch@"^3.3.2" from gaxios@7.3.1
          node_modules/gaxios
            gaxios@"^7.0.0" from gcp-metadata@8.1.2
            node_modules/@google/genai/node_modules/gcp-metadata
              gcp-metadata@"8.1.2" from google-auth-library@10.9.1
              node_modules/@google/genai/node_modules/google-auth-library
                google-auth-library@"^10.3.0" from @google/genai@2.28.0
                node_modules/@google/genai
                  @google/genai@"^2.28.0" from the root project
            gaxios@"^7.1.4" from google-auth-library@11.2.0
            node_modules/google-auth-library
              google-auth-library@"^11.2.0" from the root project
  ```
- **Root Cause:**
  - Both `@google/genai` (Google's official Gemini SDK) and `google-auth-library` depend on `gaxios`, Google's official HTTP client library.
  - `gaxios` depends on `node-fetch@3.3.2`, which depends on `fetch-blob@3.2.0`, which depends on `node-domexception@^1.0.0`.
  - The author of `node-domexception` (Jimmy Wärting) marked the package deprecated on the npm registry because Node.js 18+ includes native `DOMException`.
  - Even the latest major release of `gaxios` (v8.3.1) and `fetch-blob` (v4.0.0) continue to depend on `node-fetch@3.3.2` and `node-domexception`.
  - **Verdict:** This warning is an upstream library lifecycle notification from Google's dependencies. In strict compliance with guidelines ("Do not blindly use npm overrides, force updates, or major-version upgrades"), no fragile npm overrides were introduced. The warning is harmless and runtime is fully supported.

---

## 2. Files Modified

| File | Change Type | Purpose |
| :--- | :---: | :--- |
| [`tsconfig.json`](file:///d:/kavach-campus/tsconfig.json) | Configuration | Restricted `include` strictly to `src/**/*.ts*`, excluded `scripts` and `tests` to prevent missing-module errors on Vercel |
| [`.vercelignore`](file:///d:/kavach-campus/.vercelignore) | Configuration | Appended `scripts/` and `docs/` to prevent unnecessary non-runtime files from uploading |
| [`src/lib/ai.ts`](file:///d:/kavach-campus/src/lib/ai.ts) | Code Hardening | Hardened `withTimeout` with `finally { clearTimeout(timerId); }` and detached `promise.catch(() => {})` error sink |
| [`tests/e2e/results.json`](file:///d:/kavach-campus/tests/e2e/results.json) | Runtime Test Output | Updated by Playwright test runner (contains execution timestamps and 222 passed metrics) |

---

## 3. Dependency Changes

- **Direct Dependencies:** Untouched. Preserved exact versions of `@google/genai@^2.28.0`, `next@^16.4.3`, `react@^19.3.0`, `google-auth-library@^11.2.0`, and `@supabase/supabase-js@^2.117.3`.
- **Overrides / Force Upgrades:** None applied. Zero risk of breaking Next.js 16.4.3 or Supabase client compatibility.
- **`package-lock.json`:** Verified consistent and stable.

---

## 4. Configuration Changes

### A. [tsconfig.json](file:///d:/kavach-campus/tsconfig.json)
```json
{
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "scripts",
    "tests",
    "nextjs_backup",
    ".next/types/validator.ts"
  ]
}
```

### B. [.vercelignore](file:///d:/kavach-campus/.vercelignore)
```text
node_modules
.next
.next/
.next-production
.next-production/
coverage
playwright-report
test-results
dist
.vitest
.git
.vercel
/scratch/
/nextjs_backup/
.env*
*.pem
supabase/.temp/
supabase/.branches/
tests/
scripts/
docs/
```

---

## 5. Fixes Performed

1. **Vercel Build Root Cause Resolution:**
   - Previous Vercel build (`5iWRj63E8RhqUkqHxPkzSqfHLCrr`) failed because `.vercelignore` excluded `tests/`, but `tsconfig.json` included `scripts/`, which imported `../tests/e2e/test-auth-helper`.
   - Scoping `tsconfig.json` strictly to `src/` and excluding `scripts/` completely eliminates this mismatch.
2. **AI Helper Hardening ([`src/lib/ai.ts`](file:///d:/kavach-campus/src/lib/ai.ts)):**
   - Wrapped AI calls with `withTimeout(promise, ms, errorMessage)` featuring a guaranteed timer clearance in `finally` and a detached `promise.catch(() => {})` error sink to prevent unhandled promise rejections if the underlying network request rejects after the timeout fires.
   - Guarded `checkGeminiConnectivity()` against placeholder keys and ensured instant, deterministic fallback to the rules engine.

---

## 6. Comprehensive Verification Results

All required verification checks were executed sequentially in `D:\kavach-campus`:

| Step | Command | Exit Code | Status | Details |
| :---: | :--- | :---: | :---: | :--- |
| **1** | `npm install` | `0` | **PASS** | Up to date, audited 325 packages in 6s |
| **2** | `npm explain node-domexception` | `0` | **PASS** | Traced through `fetch-blob` -> `node-fetch` -> `gaxios` -> `@google/genai` |
| **3** | `npx tsc --noEmit` | `0` | **PASS** | 0 TypeScript errors across production source files |
| **4** | `npm run lint` | `0` | **PASS** | 0 ESLint warnings, 0 errors |
| **5** | `npm test` | `0` | **PASS** | **63/63 test files passed**, **799/799 tests passed** (29.96s) |
| **6** | `npx playwright test` | `0` | **PASS** | **7/7 spec files passed**, **222/222 tests passed** (7.2m) |
| **7** | `npm run build` | `0` | **PASS** | **72/72 routes compiled successfully** (16.0s compile + 25.6s TS + 2.2s static gen) |
| **8** | `git diff --check` | `0` | **PASS** | Clean whitespace, no merge conflict markers |

---

## 7. Remaining Warnings or Errors

1. **`npm warn Unknown env config "cache-dir"`:**
   - Appears only inside Vercel's CI build environment due to Vercel injecting cross-toolchain environment variables. Locally, `npm config list` produces zero warnings.
2. **`npm warn deprecated node-domexception@1.0.0`:**
   - Appears during `npm install` due to upstream Google SDK dependencies (`@google/genai` -> `gaxios`). Harmless; causes no runtime issues.

**Confirmed Build Errors:** **ZERO (0)**
**TypeScript Errors:** **ZERO (0)**
**Lint Errors:** **ZERO (0)**
**Failed Tests:** **ZERO (0)**

---

## 8. Git Working-Tree Status

```text
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  modified:   .vercelignore
  modified:   src/lib/ai.ts
  modified:   tests/e2e/results.json
  modified:   tsconfig.json

Untracked files:
  docs/PHASE_27_FINAL_PRE_DEPLOYMENT_REVIEW.md
  docs/PHASE_27_VERCEL_BUILD_FAILURE_AUDIT.md
  docs/PHASE_28_PRODUCTION_MIGRATION_READINESS_AUDIT.md
  docs/PHASE_29_NPM_AND_BUILD_FIX_REPORT.md
```

### Recommendation for Staging:
```powershell
# Revert the generated test results artifact before commit
git checkout tests/e2e/results.json

# Stage only build fix configuration, code hardening, and audit documentation
git add tsconfig.json .vercelignore src/lib/ai.ts docs/
```

---

## 9. Final Build Status

### **OVERALL BUILD STATUS: PASS**

The application builds cleanly in production mode generating all 72 static and dynamic routes. All 1,021 automated tests pass. The codebase is fully verified and ready for staging.

*(Note: Per safety rules, no automatic Git commit, push, or Vercel deployment has been performed).*
