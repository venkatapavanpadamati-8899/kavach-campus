# Kavach Campus — Confirmed Defects, Fixes, and Open Risks

This report documents code-level evidence from the current audit. It supersedes earlier versions that stated all defects were fixed or described migrations/providers as live-validated.

## Confirmed defects fixed locally

| ID | Severity | Finding | Change | Verification |
|---|---|---|---|---|
| FIX-01 | HIGH | The admin approval API used a service-role client without checking whether an ordinary ADMIN and target user belonged to the same campus. Missing targets could also produce success-shaped responses. | The caller's `college_id` is read; non-SUPER_ADMIN callers are restricted to targets in the same recognized campus (including supported aliases). Missing targets return 404. Action and requested role values are allowlisted; SUPER_ADMIN remains unavailable through this route. | Cross-campus denial and same-campus alias regression tests in `src/__tests__/authenticated-security-verification.test.ts`; full suite passed (450 tests). |
| FIX-02 | HIGH | College email resolution accepted deceptive substring matches rather than a complete institutional email domain. | Domain resolution and migration 012 matching now use exact domain boundaries. | College-directory and migration-shape tests; full suite passed (450 tests). |
| FIX-03 | HIGH | Cron endpoints authenticated by `CRON_SECRET` but used the session/anon client for privileged database work. | Cron routes require a plausibly configured server-only service-role key and use the admin client; missing config returns 503. Missing Safe Walk schema is no longer reported as a successful run. | Cron workflow and integration regression tests; full suite passed (450 tests). |
| FIX-04 | HIGH | Registration trusted a client-selected campus for tenant assignment and auto-approved student accounts even for unmapped/personal email domains. | The server now derives campus from the recognized email domain. Unmapped email addresses are assigned `PENDING_CAMPUS_VERIFICATION`, remain unapproved after OTP verification, and receive a clear user-facing notice. | Regression tests cover client-campus mismatch and pending/unapproved unmapped email; full suite passed (450 tests). |
| FIX-05 | HIGH | The service-role student-ID verification queue exposed all students' verification records and signed ID-card URLs to any approved ADMIN/SECURITY reviewer; POST decisions likewise lacked a campus check. | GET now scopes profile IDs to the reviewer's recognized campus (including the supported Vishnu aliases); POST verifies the target's campus and student-profile record before changing status. SUPER_ADMIN retains global oversight. | Regression tests verify campus-scoped GET filtering and deny a cross-campus verification decision. |
| FIX-06 | MEDIUM | The frontend login and middleware dropped deep-link redirect targets on unauthenticated bounce; `/login` and `/super-admin/login` ignored URL search params (`error`, `verified`, `notice`, `redirect`). | Both login pages now utilize `Suspense` and `useSearchParams` to display informative feedback banners (verified success, pending accreditation, or unauthorized). The middleware proxy retains `?redirect=` on unauthenticated route intercepts, and the login handler safely validates and routes to the preserved local destination. | Full suite passed (450 tests across 34 test files). |
| FIX-07 | HIGH | Students whose institutional accreditation was pending or unapproved were blocked on `/login` and in `/api/auth/login` with an exception, preventing them from accessing the ID verification portal or emergency SOS. | Unapproved students are now permitted to establish a session and are redirected directly to `/student/verification-status?notice=verification_required` to upload their ID credentials. Unapproved staff/management accounts continue to be strictly revoked with a 403 response. | Verified across login route and full regression suite (450 tests). |
| FIX-08 | HIGH | Users with unmapped email domains remained in `PENDING_CAMPUS_VERIFICATION` with no in-app campus assignment process. | Added a SUPER_ADMIN-only queue and assignment API/UI. It requires independent verification confirmation and a review note, updates only still-pending/unapproved accounts, logs the decision, and does not approve the account. | `super-admin-pending-campus.test.ts` covers authorization, bounded listing, invalid input, campus assignment, stale targets, and audit failure. Local tests only; staging behavior remains unverified. |
| FIX-09 | HIGH | First-time Google OAuth user provisioning automatically set `is_approved: true` even when the user's email was unmapped/personal and assigned `college_id = 'PENDING_CAMPUS_VERIFICATION'`. This bypassed pending-campus verification and hid the accounts from the Super Admin review queue (`.eq('is_approved', false)`). | `src/app/api/auth/callback/route.ts` now sets `is_approved: false` for unmapped domains, redirects unapproved students to `/student/verification-status?notice=verification_required`, and grants `is_approved: true` only for recognized institutional domains (`srkr.edu.in`, `vishnu.edu.in`). | `src/__tests__/auth-callback.test.ts` updated and verified; full test suite (453 tests across 36 test files) passed. |

## Database/RLS work that is not yet a verified fix

Migration `014_cross_college_rls_hardening.sql` is a **candidate**, not a completed database change. It attempts to address tenant-derived incident ownership, profile privilege changes, legacy permissive policies, evidence field/path alignment, and storage access. It has not been parsed/executed against PostgreSQL, reviewed against the actual staging catalog, or tested with authenticated SRKR and Vishnu accounts. Do not apply it to production or assume tenant isolation is live.

Migration 013 alone is not sufficient evidence: PostgreSQL OR-combines permissive policies, so legacy global policies can defeat narrower policies. Migration ordering is also ambiguous because versions `001`, `002`, and `008` each have duplicate filenames. Resolve migration history before applying anything.

The read-only [policy preflight](../supabase/verification/kavach_cross_college_policy_preflight.sql) inspects catalog state and aggregate counts only. It is not an authenticated RLS test.

## Remaining risks

- Registration and campus assignment are implemented locally but have not been tested against staging accounts or through live OTP delivery. The SUPER_ADMIN review workflow depends on a configured service-role key and an available `audit_logs` schema; verify both in staging before use.
- Database tenant isolation is not established until migration review/validation and authenticated cross-college staging tests pass.
- External providers, physical-device behavior, and deployment remain unverified.

## External integrations and live checks

- The source contains Google/Supabase authentication handling and a conditional SMTP email-dispatch path. Provider credentials, redirect allowlists, actual delivery, and callback behavior were not tested.
- No successful real SMS delivery was established.
- Demo OTP behavior has automated coverage, but that does not prove production provider setup or live delivery.
- Mobile GPS/camera/microphone, evidence upload to a real bucket, and Vercel deployment were not tested.

## Final status

**Local confirmed fixes: implemented and regression-tested.**  
**Remote RLS hardening: candidate only / NOT VALIDATED.**  
**Production readiness: NOT ESTABLISHED.**
