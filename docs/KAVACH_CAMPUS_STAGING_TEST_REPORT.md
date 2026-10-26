# Kavach Campus — Local and Staging Verification Report

**Environment actually exercised:** local repository test/build environment.  
**Remote staging services:** NOT TESTED.  
**Production deployment or migration:** NOT PERFORMED.

## Local automated checks

| Command | Result |
|---|---|
| `npm test` | PASS — 36 test files, 453 tests passed, 0 failed |
| `npm run lint` | PASS — ESLint exited successfully |
| `npm run build` | PASS — Next.js 16.4.0 build and TypeScript completed; static generation reached 71/71 |
| `npx tsc --noEmit` | PASS — no TypeScript errors |
| `npm audit --omit=dev` | PASS — 0 production dependency vulnerabilities |
| `git diff --check` | PASS — no whitespace errors; Git reports existing LF-to-CRLF working-copy warnings |
| `npm test -- --run src\__tests__\authenticated-security-verification.test.ts` | PASS — 19 tests passed |

Automated tests use local code and mocks where applicable. They do not prove remote Postgres policy behavior, provider configuration, actual email/SMS delivery, or physical device support.

## External and staging status

| Capability | Local evidence | Live/staging status |
|---|---|---|
| Supabase tenant RLS: SRKR vs Vishnu | SQL source/static regression checks only; migration 014 is a candidate | NOT TESTED; migration 014 not PostgreSQL-validated or applied |
| Google OAuth | Application flow exists in source | NOT TESTED; Google Cloud/Supabase configuration and real callback not verified |
| Registration email OTP | Conditional SMTP dispatch path exists | NOT TESTED; no real message delivery verified |
| SMS OTP | Demo behavior has automated coverage | NOT CONFIGURED/NOT TESTED; real SMS delivery not established |
| GPS, camera, microphone | Browser/API mocks and code paths only | NOT TESTED on physical Android/iOS device |
| Evidence upload | Local code/tests only | NOT TESTED against staging storage |
| Vercel Preview/Production | Build passes locally | NOT DEPLOYED |

## Database validation limitation

No working local PostgreSQL/Docker service was available for SQL execution. Consequently, migration 014 syntax and behavior were not validated against a PostgreSQL server. The read-only policy preflight script can inspect a staging catalog but cannot prove authenticated RLS enforcement. Migration versions `001`, `002`, and `008` are duplicated and must be reconciled with the actual migration history before application.

## Required live staging evidence

Before marking staging acceptance PASS:

1. Capture a staging database backup and verify the exact project/environment.
2. Resolve duplicate migration versions and review the complete migration history.
3. Validate migration 014 against a disposable/local PostgreSQL or Supabase test environment; review it against staging schema and existing policies.
4. Apply only to an authorized staging database after review. Record migration output and catalog preflight results.
5. Use separate authenticated SRKR and Vishnu student/staff accounts to test direct API reads and writes for profiles, incidents, messages, evidence, safe walks, escalations, and storage.
6. Verify an ordinary campus ADMIN cannot approve or modify a user from another campus; verify intended SUPER_ADMIN behavior.
7. Verify registration maps a recognized email domain to the authoritative campus despite a different client selection; verify unmapped addresses remain pending and unapproved.
8. Use the SUPER_ADMIN pending-campus page to assign only independently verified campuses; confirm audit logs are created and accounts remain unapproved. Test stale queue entries and audit failure handling.
9. Test OAuth and real email/SMS OTP with provider credentials stored only in server-side environment configuration. Verify invalid, expired, and rate-limited OTPs fail.
10. On a physical phone over HTTPS, test GPS allow/deny, camera and microphone allow/deny, upload failure, offline handling, and SOS status.
11. Deploy a Vercel Preview only after the code and database gates are reviewed; run smoke tests and inspect sanitized logs.

No live staging test has been claimed as passing in this report.
