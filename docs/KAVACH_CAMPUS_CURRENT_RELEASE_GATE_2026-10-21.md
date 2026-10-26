# Kavach Campus — Current Release Gate

**Date:** 2026-10-21  
**Scope:** Current local workspace evidence only. No remote Supabase project,
provider dashboard, Vercel project, or physical Android device was accessed.

## Local results

| Gate | Status | Evidence |
| --- | --- | --- |
| Vitest | PASS | `npm test` exited 0: 36 files and 453 tests passed. |
| Student ID verification API | PASS | `npx vitest run src/__tests__/student-id-verification-api.test.ts` previously exited 0: 18 tests passed. |
| TypeScript | PASS | `npx tsc --noEmit` exited 0. |
| ESLint | PASS | `npm run lint` exited 0. |
| Production dependency audit | PASS | `npm audit --omit=dev` exited 0: 0 vulnerabilities. |
| Production build | PASS | `npm run build` exited 0. It compiled, type checked, and generated 64 routes. |
| Git diff whitespace check | PASS | `git diff --check` exited 0; only CRLF conversion notices were printed. |

## Local fixes in this pass

- `vitest.config.mts` uses an ignored workspace-local temporary directory for
  Vitest SSR transforms, avoiding the Windows sandbox `ENOENT` import failure.
- `src/app/layout.tsx` and `src/app/globals.css` no longer require Google Font
  downloads during builds. They use system font fallback stacks instead.
- `next.config.ts` disables unused Cache Components configuration and constrains
  static generation to one worker. This avoids Windows `EPERM` collisions while
  generated `.next` segment directories are created.

## Release blockers

| Gate | Status | Required evidence |
| --- | --- | --- |
| Migration history reconciliation | BLOCKED | Compare duplicate `001`, `002`, and `008` local files with an authorized staging migration history. |
| Supabase RLS and cross-college Storage | BLOCKED | Authenticated SRKR and Vishnu staging negative tests; service-role tests are insufficient. |
| Google OAuth, real email OTP, SMS, push | NOT TESTED | Authorized staging providers, test recipients, and observed delivery/callback results. |
| GPS, SOS, camera, microphone, Safe Walk | NOT TESTED | HTTPS staging tests on an authorized physical device, without real emergency dispatch. |
| Vercel preview | NOT TESTED | Authorized preview deployment and authenticated smoke-test evidence. |
| Android APK | NOT IMPLEMENTED | No `android/` directory or Capacitor configuration exists. |

## Decision

**LOCAL RELEASE CANDIDATE: PASS.**  
**PRODUCTION RELEASE: BLOCKED.**

Do not apply migrations to production or announce production readiness until
the listed staging, provider, device, and deployment gates have evidence.
