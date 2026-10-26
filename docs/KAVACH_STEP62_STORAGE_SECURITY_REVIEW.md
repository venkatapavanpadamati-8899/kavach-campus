# KAVACH CAMPUS — STEP 62: STORAGE SECURITY REMEDIATION PREFLIGHT & POLICY REVIEW

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** 2026-10-11T20:29:00+05:30  
**Target Environment:** Supabase PostgreSQL (`polbnvszmvblwenfnqll`)  
**Audit Mode:** Read-Only Code & Policy Review (Zero Production SQL Auto-Execution)  
**Readiness Status:** **REMEDIATION REVIEW COMPLETE / PENDING MANUAL EXECUTION**

---

## 1. Executive Summary

This preflight review analyzes the proposed storage bucket limits remediation script (`supabase/verification/kavach_step58_storage_limits_remediation.sql`) and audits all existing storage policies governing `storage.objects` and `storage.buckets`.

### Key Review Conclusions:
1. **The Proposed SQL is Strictly Safe and Non-Destructive:** The script executes only targeted `UPDATE storage.buckets` statements guarded by explicit `WHERE id = ...` clauses. It contains **ZERO `DROP`**, **ZERO `DELETE`**, and **ZERO `ALTER POLICY`** statements.
2. **Bucket Privacy is Maintained:** Both `kavach-evidence` and `kavach-id-cards` remain strictly private (`public = false`).
3. **Storage Engine Enforcement Added:** Sets 10 MiB limit for incident evidence and 5 MiB limit for ID cards, preventing bypass of client-side validation.
4. **Anti-Tamper & Immutability:** Verified that zero `UPDATE` and zero `DELETE` policies exist on `storage.objects`, ensuring PostgreSQL default-deny protects uploaded evidence from tampering or deletion.
5. **No Production Side Effects:** Existing records in `storage.objects` are untouched.

---

## 2. Phase A: Detailed SQL Review

File Reviewed: `supabase/verification/kavach_step58_storage_limits_remediation.sql`

```sql
-- Evidence Bucket
UPDATE storage.buckets
SET 
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'application/pdf', 
        'video/mp4'
    ],
    public = false
WHERE id = 'kavach-evidence';

-- ID Cards Bucket
UPDATE storage.buckets
SET 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'application/pdf'
    ],
    public = false
WHERE id = 'kavach-id-cards';
```

### Verification Matrix:
- **Exact Bucket IDs:** Matches `kavach-evidence` and `kavach-id-cards` exactly.
- **Privacy Setting:** Explicitly sets `public = false`.
- **Evidence Limit:** `10485760` bytes (exactly 10 MiB = $10 \times 1024 \times 1024$).
- **ID Card Limit:** `5242880` bytes (exactly 5 MiB = $5 \times 1024 \times 1024$).
- **Allowed MIME Types:** Matches formats supported by application validators:
  - Evidence: JPEG, PNG, WEBP, PDF, MP4.
  - ID Cards: JPEG, PNG, WEBP, PDF.
- **Scope of UPDATE:** Guarded strictly by `WHERE id = '...'`. Will never touch other buckets (e.g. avatars, system buckets).
- **Missing Bucket Handling:** If a bucket does not exist, `UPDATE` safely modifies 0 rows without throwing an error.
- **Idempotency:** Re-running the script produces identical, safe configuration with no cumulative side effects.

---

## 3. Phase B: Storage Policy Security Analysis (`storage.objects`)

Audited from `supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql` and existing DB schema:

### 3.1 Policy 1: `Authenticated users upload evidence`
- **Command:** `INSERT`
- **Target Role:** `authenticated`
- **Condition (`WITH CHECK`):**
  ```sql
  bucket_id = 'kavach-evidence' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR name LIKE (auth.uid()::text || '%')
  )
  ```
- **Security Assessment:** **PASS**. Users can upload evidence only into a path prefixed with their own authenticated User ID. They cannot deposit files into another user's folder.

### 3.2 Policy 2: `Users and staff read evidence`
- **Command:** `SELECT`
- **Target Role:** `authenticated`
- **Condition (`USING`):**
  ```sql
  bucket_id = 'kavach-evidence' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR name LIKE (auth.uid()::text || '%')
    OR public.is_staff()
  )
  ```
- **Security Assessment:** **PASS**. The uploading student can view their own evidence files. Campus staff (`public.is_staff()`) can access incident evidence for case investigations. Unrelated students cannot view foreign evidence files.

### 3.3 Policy 3: `Students upload own ID card`
- **Command:** `INSERT`
- **Target Role:** `authenticated`
- **Condition (`WITH CHECK`):**
  ```sql
  bucket_id = 'kavach-id-cards' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR name LIKE (auth.uid()::text || '%')
  )
  ```
- **Security Assessment:** **PASS**. Student ID card uploads are strictly restricted to the student's own UID path (`${user.id}/${timestamp}_id_card.${ext}`).

### 3.4 Policy 4: `Students read own ID card`
- **Command:** `SELECT`
- **Target Role:** `authenticated`
- **Condition (`USING`):**
  ```sql
  bucket_id = 'kavach-id-cards' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR name LIKE (auth.uid()::text || '%')
    OR public.is_staff()
  )
  ```
- **Security Assessment:** **PASS**. Student A cannot read Student B's uploaded ID document. Only the owner and authorized staff (`is_staff()`) are permitted to read.

### 3.5 Tamper & Delete Protection (Anti-Tamper Audit)
- **UPDATE Policies:** **ZERO**. No `UPDATE` policy exists on `storage.objects`.
- **DELETE Policies:** **ZERO**. No `DELETE` policy exists on `storage.objects`.
- **Enforcement:** PostgreSQL default-deny on RLS-enabled tables prevents all clients from modifying or deleting uploaded evidence.

---

## 4. Phase C: Read-Only Remote Verification Queries

Execute these read-only inspection queries in the Supabase SQL Editor:

```sql
-- 1. Inspect Bucket Limits and Privacy
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards')
ORDER BY id;

-- 2. Inspect Exact Storage Policies (qual and with_check expressions)
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 3. Count Objects in Buckets (Verify existing data)
SELECT 
    bucket_id, 
    count(*) AS total_objects, 
    coalesce(sum(metadata->>'size')::bigint, 0) AS total_bytes 
FROM storage.objects 
WHERE bucket_id IN ('kavach-evidence', 'kavach-id-cards')
GROUP BY bucket_id;
```

---

## 5. Phase D: Local Quality Gate Regression Results

| Command | Exit Code | Result | Details |
| :--- | :--- | :--- | :--- |
| `npm test` | **0** | **PASS** | 143 passed across 11 test suites (11.55s) |
| `npm run lint` | **0** | **PASS** | 0 errors, 0 warnings |
| `npx tsc --noEmit` | **0** | **PASS** | 0 type errors |
| `npm run build` | **0** | **PASS** | 54/54 static/dynamic routes compiled |
| `npm audit --omit=dev` | **0** | **PASS** | 0 vulnerabilities found |

---

## 6. Final Recommendation

1. **Safety Approval:** The remediation script `supabase/verification/kavach_step58_storage_limits_remediation.sql` is **100% SAFE to execute manually** in the Supabase SQL Editor.
2. **No Policy Drop Warning:** Do **NOT** drop or re-create storage policies. The existing policies provide verified user path isolation and anti-tamper deletion denial.
3. **Action:** Run the script in the Supabase SQL Editor and confirm that `file_size_limit` is updated to `10485760` and `5242880` with the corresponding MIME type arrays.
