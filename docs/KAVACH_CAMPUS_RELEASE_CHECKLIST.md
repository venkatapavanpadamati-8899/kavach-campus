# Kavach Campus — Safe Staging and Release Checklist

**Current release state: BLOCKED.** Local tests/build pass and account-campus assignment is guarded locally, but database tenant policy, migration ordering, external provider setup, real-device tests, and Preview deployment remain unverified. This checklist is a procedure, not evidence that any item has passed.

## Gate 0 — Protect the environment

- [ ] Confirm the target is the Kavach Campus **staging** Supabase project and staging Vercel Preview environment.
- [ ] Take and verify a staging database backup.
- [ ] Do not paste or log secrets. Store service-role keys, OAuth client secrets, SMTP/SMS credentials, and cron secrets only in server-side environment settings.
- [ ] Do not run a migration against production as part of this checklist.
- [ ] Resolve the duplicate migration versions `001`, `002`, and `008` against the actual deployed migration history before using the CLI or applying SQL.

## Gate 1 — Review and validate database changes

- [ ] Review migrations 012, 013, and the local candidate 014, along with every existing policy on affected tables and `storage.objects`.
- [ ] Validate the candidate migration against PostgreSQL in a disposable environment. Current audit environment did not have a working local PostgreSQL/Docker service.
- [ ] Compare expected schema and policies with the staging catalog. Do not assume policy names or table columns based only on source files.
- [ ] Run [the read-only policy preflight](../supabase/verification/kavach_cross_college_policy_preflight.sql) on staging after authorized review. Its output is diagnostic only and is not an RLS pass.
- [ ] Apply the reviewed migration to staging only. Record the project, migration version, date, and result. Stop on any unexpected error.
- [ ] Test with distinct SRKR and Vishnu authenticated accounts. Verify both allowed and denied direct API requests, including child rows and evidence/storage objects.
- [ ] Verify ordinary ADMIN actions cannot cross their assigned campus; separately test intended SUPER_ADMIN permissions.

## Gate 2 — Resolve registration tenant policy

- [x] Policy chosen: derive campus from recognized institutional email domains; unmapped addresses remain `PENDING_CAMPUS_VERIFICATION` and unapproved.
- [x] Server-side campus derivation is implemented; the client's selected campus is not authoritative.
- [x] Local SUPER_ADMIN-only workflow at `/super-admin/pending-campus` lists pending unapproved accounts and assigns a recognized campus only after an explicit independent-verification confirmation and review note. Assignment does not approve the account; successful changes are audit-logged.
- [ ] Test the campus-assignment workflow with staging SUPER_ADMIN and pending-account fixtures. The code and local regression tests do not establish live staging behavior.
- [ ] Verify the registration behavior with staging accounts and real OTP delivery.
- [ ] Test valid SRKR/Vishnu domains, deceptive suffixes, unrelated institutional domains, and personal email addresses.

## Gate 3 — Configure and test identity/OTP providers

- [ ] Configure Google OAuth on Google Cloud and Supabase using the exact staging callback/redirect settings for this application's actual flow.
- [ ] Store OAuth secrets only in server-side settings. Complete a real staging sign-in and callback test.
- [ ] Configure a verified email sender and test actual registration OTP delivery, expiry, invalid-code rejection, and retry limits.
- [ ] Configure SMS provider credentials server-side only if real SMS is required; test using an authorized phone number and confirm rate limits and cost controls.
- [ ] Confirm demo OTP is not accepted or exposed in production mode.

## Gate 4 — Physical-device acceptance

- [ ] Open the HTTPS Preview URL on a physical Android and/or iOS device.
- [ ] Test GPS permission allow/deny and fallback behavior.
- [ ] Test camera and microphone permission allow/deny; verify evidence preview and upload.
- [ ] Test upload errors, connectivity loss/recovery, and clear user-facing messages.
- [ ] Run a controlled test SOS only with an explicitly authorized test team; verify location, evidence, incident status, and escalation behavior. Do not generate real emergency dispatches during testing.

## Gate 5 — Vercel Preview and release decision

- [ ] Configure only variables used by the code, with environment scope set to Preview and staging resources.
- [ ] Keep secrets out of `NEXT_PUBLIC_*` variables and client bundles.
- [ ] Create a Preview deployment; do not promote to Production automatically.
- [ ] Run login, registration, OTP, role dashboards, tenant isolation, SOS, safe-walk, evidence upload, and provider smoke tests.
- [ ] Inspect sanitized build/runtime logs for authentication/database errors.
- [ ] Obtain campus/security sign-off and retain evidence for every PASS.
- [ ] Production is a separate approval and deployment step. Do not proceed while any critical gate is BLOCKED or NOT TESTED.

## Current local gate results

- [x] `npm test`: 36 files / 453 tests passed.
- [x] `npm run lint`: passed.
- [x] `npm run build`: passed; 71/71 pages generated.
- [x] `npx tsc --noEmit`: passed.
- [x] `npm audit --omit=dev`: 0 vulnerabilities.
- [x] `git diff --check`: passed; only line-ending warnings.
- [ ] Migration 014 PostgreSQL validation and staging application: NOT DONE.
- [ ] Authenticated SRKR/Vishnu RLS testing: NOT DONE.
- [ ] Live Google/email/SMS provider tests: NOT DONE.
- [ ] Physical-device tests: NOT DONE.
- [ ] Vercel Preview deployment: NOT DONE.
