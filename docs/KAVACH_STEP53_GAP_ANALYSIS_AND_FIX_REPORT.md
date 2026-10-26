# 🛡️ KAVACH CAMPUS — STEP 53: GAP ANALYSIS & SAFE BUG FIX REPORT

**Defect Investigation, Code Hardening, Storage Security Review, and Regression Verification**

- **Project:** Kavach Campus — “Safety in One Tap”
- **Workspace:** `D:\Kavach Campus`
- **Audit & Fix Timestamp:** `2026-10-11T19:50:00+05:30`
- **Methodology:** Direct inspection of application source code, API routes, SQL migration scripts, and live regression test suites.

---

## 1. Executive Summary

This phase moves beyond percentage estimates to conduct a ground-truth defect analysis, implement safe application code fixes, verify storage security rules, and re-execute all quality gates.

### 🧪 Fresh Quality Gate Results (Post-Fix):
- **Automated Vitest Regression Tests:** **`143/143 PASS`** (11 test suites in 10.59s — up from 141)
- **ESLint Code Quality:** **`0 errors, 0 warnings`**
- **TypeScript Compiler (`tsc --noEmit`):** **`0 errors`** (Exit code 0)
- **Next.js Production Build:** **`54/54 static/dynamic routes compiled cleanly`** (Exit code 0)
- **Production Dependency Security Audit:** **`0 vulnerabilities found`**

---

## 2. Prioritized Defect & Gap Classification

### [P0] Critical Security & Life-Safety Gaps
- **Defect P0.1 (Unscoped Evidence Upload Policy in Migration):**
  - *Finding:* In `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql`, the policy `Authenticated users upload evidence` had `WITH CHECK (bucket_id = 'kavach-evidence')` without enforcing path prefix isolation. While students could not read other students' files, any authenticated user could upload files to arbitrary paths in the evidence bucket.
  - *Fix Applied:* Updated migration 008 so that `Authenticated users upload evidence` explicitly enforces path ownership:
    `WITH CHECK (bucket_id = 'kavach-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR name LIKE (auth.uid()::text || '%')))`
  - *Status:* **FIXED IN REPO MIGRATION SCRIPT**.

### [P1] Functional & Platform Compatibility Defects
- **Defect P1.1 (Vercel Cron HTTP Method Mismatch):**
  - *Finding:* `vercel.json` configures `/api/cron/escalate` and `/api/cron/safe-walk-timeout` for 1-minute execution (`* * * * *`). Vercel Cron sends HTTP `GET` requests by default, but both route handlers previously only exported `POST`. Any Vercel Cron invocation would fail with HTTP `405 Method Not Allowed`.
  - *Fix Applied:* Exported `export const GET = POST;` in both `src/app/api/cron/escalate/route.ts` and `src/app/api/cron/safe-walk-timeout/route.ts`. Both routes now seamlessly accept both `GET` and `POST` with `Bearer <CRON_SECRET>`.
  - *Regression Test:* Added 2 new tests in `src/__tests__/cron-workflows.test.ts`. Total tests increased from 141 to 143; both passed.
  - *Status:* **FIXED & VERIFIED**.

- **Defect P1.2 (Storage Bucket Size & MIME Constraints Unconfigured on DB Level):**
  - *Finding:* In Check G2 from the user's Supabase dashboard, `storage.buckets` showed `file_size_limit = NULL` and `allowed_mime_types = NULL` for `kavach-evidence` and `kavach-id-cards`. While application-level validation strictly checks file signatures (magic bytes) and 5MB size limits in `src/lib/verification/id-card.ts`, the database storage bucket lacked these constraints.
  - *Fix Applied:* Updated `008_kavach_campus_schema_and_rls_alignment_safe.sql` Section 6 to set:
    - `kavach-id-cards`: 5MB limit (`5242880` bytes), allowed MIME types: `['image/jpeg', 'image/png', 'image/webp', 'application/pdf']`.
    - `kavach-evidence`: 10MB limit (`10485760` bytes), allowed MIME types: `['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']`.
  - *Status:* **HARDENED IN MIGRATION SCRIPT**.

### [P2] Usability & Obsolete Reference Maintenance
- **Defect P2.1 (Status of `identity-documents` Bucket):**
  - *Finding:* Check G2 confirmed `identity-documents` was missing. Codebase inspection across all TypeScript/JavaScript files in `src/` revealed **zero references** to `identity-documents`. The active application exclusively uses `kavach-id-cards` for ID card verification and `kavach-evidence` for incident attachments.
  - *Resolution:* `identity-documents` is an obsolete artifact from earlier architectural iterations. No new bucket creation is needed.
  - *Status:* **VERIFIED NOT NEEDED**.

---

## 3. Deep Verification Across 5 Core Domains

### Phase 2: Storage Security Verification
1. **Student Ownership:**
   - On upload: `WITH CHECK` enforces `auth.uid()::text = (storage.foldername(name))[1] OR name LIKE (auth.uid()::text || '%')`.
   - On download: `USING` permits only file owner or authorized staff (`public.is_staff()`).
2. **Path Selection Isolation:** Users cannot target or pollute another user's storage directory.
3. **Staff Access Scope:** Reviewers obtain temporary 300-second (5 minute) signed URLs via `createSignedUrl(cleanPath, 300)` in `/api/admin/verifications`.
4. **UPDATE / DELETE Protection:** There are zero UPDATE and zero DELETE policies on `storage.objects`. RLS default-deny prevents clients from altering or deleting evidence.
5. **Private Access Guarantee:** Both buckets have `public = false`. Direct unauthenticated URL access is blocked.

### Phase 3: Database Security Verification
1. **Infinite Recursion Prevention (42P17):** Functions `is_admin()`, `is_staff()`, and `get_user_role()` use `SECURITY DEFINER` and `SET search_path = public`, breaking circular RLS evaluation.
2. **Anti-Self-Promotion Trigger:** Trigger `trg_prevent_self_role_escalation` on `public.profiles` prevents non-admins from changing `role` or `is_approved`.
3. **Student ID Uniqueness:** Check B confirmed 0 duplicate student IDs in live database. Unique index `idx_profiles_student_id` prevents duplicate registrations.
4. **Audit Log Anti-Tampering:** `audit_logs` has RLS enabled with 0 client policies (secure default-deny for client, server-only writes).

### Phase 4: Authentication & RBAC
1. **Reviewer Self-Approval Guard:** `src/app/api/admin/verifications/route.ts` line 141 explicitly checks `if (targetStudentId === user.id) return 403 Forbidden`.
2. **Student ID Upload & Auto-Approval:** OCR output is treated as untrusted; default decision without official roster verification is `PENDING_MANUAL_REVIEW`. Students never auto-approve themselves.
3. **Session Invalidation:** Logout flushes Supabase cookies and clears active tokens.

### Phase 5: GPS, Emergency SOS & Safe Walk
1. **Zero-AI-Latency Invariant:** SOS route (`/api/sos`) synchronously creates `CRITICAL` incidents and notifies guards; it **never waits for or calls AI**.
2. **GPS Denial Degraded Mode:** If location is unavailable or permission is denied, incident is recorded with `null` coordinates; no fabricated coordinates are used.
3. **Safe Walk Timeout:** Overdue walks are atomically transitioned from `ACTIVE` to `OVERDUE`; auto-SOS incident is created; audit log written.

---

## 4. Summary of Files Changed

| File | Change Description | Impact |
| :--- | :--- | :--- |
| `src/app/api/cron/escalate/route.ts` | Added `export const GET = POST;` | Resolves Vercel Cron 405 error; enables GET & POST triggers. |
| `src/app/api/cron/safe-walk-timeout/route.ts` | Added `export const GET = POST;` | Resolves Vercel Cron 405 error; enables GET & POST triggers. |
| `src/__tests__/cron-workflows.test.ts` | Added 2 new tests for GET invocation with valid Bearer secret. | Test suite grew from 141 to 143 tests (100% PASS). |
| `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` | Added bucket size limits (5MB/10MB), MIME types, and path ownership to evidence upload policy. | Hardens database against oversized uploads and path hijacking. |

---

## 5. Blocked Remote Checks & Exact Next Actions

The codebase is clean, tested, and hardened. The following read-only manual check in Supabase completes remote storage verification:

### 📌 Check G1: Storage Policies Review
Run in [Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new):
```sql
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
ORDER BY policyname;
```
*Expected: 4 policies on `storage.objects` (`Authenticated users upload evidence`, `Students read own ID card`, `Students upload own ID card`, `Users and staff read evidence`).*

### 📌 Check G2: Storage Bucket Privacy
Run in Supabase SQL Editor:
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name IN ('kavach-evidence', 'kavach-id-cards') 
ORDER BY name;
```
*Confirmed in screenshot: `public = false` for both buckets.*

---

## 6. Final Safe Next Step

1. **Local State:** 143/143 tests PASS, TypeScript clean, ESLint clean, 54 routes compiled.
2. **Ready For:** Controlled Campus Pilot on staging or local environment (`http://localhost:3000`).
3. **To Promote Migration Changes to Supabase:** When ready to enforce bucket size limits on the live database, run Section 6 of `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` in Supabase SQL Editor.
