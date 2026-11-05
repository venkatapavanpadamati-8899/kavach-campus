# KAVACH CAMPUS — PHASE 15C: AUTHENTICATED RLS EXECUTION GUIDE & MIGRATION TEST PLAN

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Scope:** Authenticated RLS Test Execution Specifications & Migration Test Runbook  
**Audit Date:** November 4, 2026  
**Document:** Test Matrix, Verification Queries, Positive & Negative Scenarios  
**Safety Status:** **STAGING/LOCAL USE ONLY — ZERO EXECUTION ON PRODUCTION**

---

## 1. Multi-Persona Authentication Architecture

In strict compliance with RLS testing principles, all test scenarios must obtain real user session tokens via `supabase.auth.signInWithPassword()`. **The `service_role` key must never be used to evaluate client policies.**

### Persona Matrix (Synthetic Personas):

| Persona | Role | Institutional Scope | Email | Auth Token Context |
|---|---|---|---|---|
| **Student A** | `STUDENT` | `srkr` (CSE) | `student_a_srkr@test.local` | `JWT_STUDENT_A` (`auth.uid() = UID_A`) |
| **Student B** | `STUDENT` | `srkr` (ECE) | `student_b_srkr@test.local` | `JWT_STUDENT_B` (`auth.uid() = UID_B`) |
| **Student C** | `STUDENT` | `vitb` (CSE) | `student_c_vitb@test.local` | `JWT_STUDENT_C` (`auth.uid() = UID_C`) |
| **Staff 1** | `STAFF` | `srkr` (Responder) | `staff_srkr@test.local` | `JWT_STAFF` (`auth.uid() = UID_STAFF`) |
| **HOD** | `HOD` | `srkr` (CSE Dept Head) | `hod_cse_srkr@test.local` | `JWT_HOD` (`auth.uid() = UID_HOD`) |
| **Principal** | `PRINCIPAL` | `srkr` (Head of Campus)| `principal_srkr@test.local` | `JWT_PRINCIPAL` (`auth.uid() = UID_PRIN`) |
| **Campus Admin**| `ADMIN` | `srkr` (Campus Authority) | `admin_srkr@test.local` | `JWT_ADMIN_SRKR` (`auth.uid() = UID_ADM1`) |
| **Cross Admin** | `ADMIN` | `vitb` (Campus Authority) | `admin_vitb@test.local` | `JWT_ADMIN_VITB` (`auth.uid() = UID_ADM2`) |
| **Super Admin** | `SUPER_ADMIN` | Global Governance | `super_admin@test.local` | `JWT_SUPER_ADMIN` (`auth.uid() = UID_ROOT`) |

---

## 2. Migration Execution & Test Runbook (015 → 016 → 017)

---

### MIGRATION 015: College-Scoped student_id Uniqueness

#### 1. Preconditions:
- Table `public.profiles` exists with columns `id`, `college_id`, `student_id`, `role`.
- Base migration 008 index `idx_profiles_student_id` exists.

#### 2. SQL Execution:
```sql
DROP INDEX IF EXISTS public.idx_profiles_student_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_college_student_id
ON public.profiles(college_id, student_id)
WHERE student_id IS NOT NULL AND role = 'STUDENT';
```

#### 3. Expected Schema Changes:
- Global partial unique index `idx_profiles_student_id` is removed.
- Compound partial unique index `idx_profiles_college_student_id` is created on `(college_id, student_id)`.

#### 4. Verification Queries:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles' AND indexname = 'idx_profiles_college_student_id';
```

#### 5. Positive Tests:
- **Test 15-P1 (Cross-College Identical ID Enrollment):**
  - Insert Student A into SRKR with `student_id = '24B91A0501'`.
  - Insert Student C into VITB with `student_id = '24B91A0501'`.
  - *Expected Result:* Both inserts succeed with code `201 Created`. (Enables independent multi-institutional enrollment).
- **Test 15-P2 (Non-Student Overlap):**
  - Staff member in SRKR assigned employee ID `'24B91A0501'`.
  - *Expected Result:* Insert succeeds (partial index filters `role = 'STUDENT'`).

#### 6. Negative Tests:
- **Test 15-N1 (Same-College Duplicate Registration):**
  - Attempt to insert Student B into SRKR with `student_id = '24B91A0501'` (duplicate within SRKR).
  - *Expected Result:* PostgreSQL rejects insert with error `23505: duplicate key value violates unique constraint "idx_profiles_college_student_id"`.

#### 7. Rollback Procedure:
```sql
DROP INDEX IF EXISTS public.idx_profiles_college_student_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_id
ON public.profiles(student_id)
WHERE student_id IS NOT NULL AND role = 'STUDENT';
```
- **Potential Data Loss:** ZERO. Rollback alters only the index structure, not row data.

---

### MIGRATION 016: Safe Box Private Notes & Strict Zero-Trust RLS

#### 1. Preconditions:
- Table `public.evidence` exists with columns `id`, `uploaded_by`.
- Table `public.profiles` exists with `id`.

#### 2. SQL Execution:
```sql
CREATE TABLE IF NOT EXISTS public.safe_box_private_notes (
  evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.safe_box_private_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own Safe Box notes" ON public.safe_box_private_notes;
CREATE POLICY "Students manage own Safe Box notes"
ON public.safe_box_private_notes
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_box_private_notes TO authenticated;
```

#### 3. Expected Schema Changes:
- New table `public.safe_box_private_notes` with primary key `evidence_id`.
- RLS enabled (`relrowsecurity = true`).
- Single unified policy `"Students manage own Safe Box notes"` for command `ALL`.

#### 4. Verification Queries:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'safe_box_private_notes';
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'safe_box_private_notes';
```

#### 5. Positive Tests:
- **Test 16-P1 (Owner Note Creation):**
  - Student A uploads evidence item `EV_A`.
  - Student A inserts note: `{ evidence_id: 'EV_A', owner_id: UID_A, private_note: 'Confidential personal note' }`.
  - *Expected Result:* `201 Created`.
- **Test 16-P2 (Owner Note Read):**
  - Student A queries `SELECT * FROM safe_box_private_notes WHERE evidence_id = 'EV_A'`.
  - *Expected Result:* Returns 1 row containing the note.
- **Test 16-P3 (Evidence Cascade Cleanup):**
  - Delete evidence item `EV_A`.
  - *Expected Result:* Note is automatically removed via `ON DELETE CASCADE`.

#### 6. Negative Tests:
- **Test 16-N1 (Student B Peer Intrusion):**
  - Student B executes `SELECT * FROM safe_box_private_notes WHERE evidence_id = 'EV_A'`.
  - *Expected Result:* `0 rows returned` (Empty set; RLS blocks peer read).
- **Test 16-N2 (Staff Responder Denial):**
  - Staff Responder executes `SELECT * FROM safe_box_private_notes`.
  - *Expected Result:* `0 rows returned` (Default deny; no staff policy exists).
- **Test 16-N3 (Campus Admin Denial):**
  - Campus Admin executes `SELECT * FROM safe_box_private_notes`.
  - *Expected Result:* `0 rows returned` (Default deny; administrators cannot inspect student safe boxes).
- **Test 16-N4 (Tampering / Unauthorized Insert):**
  - Student B attempts to insert a note referencing Student A's evidence `EV_A`.
  - *Expected Result:* `403 Forbidden` (`new row violates row-level security policy`).
- **Test 16-N5 (Length Limit Violation):**
  - Student A inserts private note with 2001 characters.
  - *Expected Result:* Rejected with error `23514: check constraint "safe_box_private_notes_private_note_check"`.

#### 7. Rollback Procedure:
```sql
DROP TABLE IF EXISTS public.safe_box_private_notes CASCADE;
```
- **Potential Data Loss:** **HIGH.** Dropping the table permanently destroys all saved private notes. An administrative JSON export must precede rollback.

---

### MIGRATION 017: Student Claims & Profile Photo Storage

#### 1. Preconditions:
- Table `public.student_profiles` exists.
- Table `public.profiles` exists.
- Schema `storage` and table `storage.buckets` exist.

#### 2. SQL Execution:
```sql
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;

CREATE INDEX IF NOT EXISTS idx_student_profiles_claimed_college_status
  ON public.student_profiles (claimed_college_id, verification_status)
  WHERE claimed_college_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kavach-profile-photos',
  'kavach-profile-photos',
  FALSE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
CREATE POLICY "Users read own profile photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-profile-photos'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);
```

#### 3. Expected Schema Changes:
- Column `claimed_college_id` added to `student_profiles`.
- Column `profile_photo_path` added to `profiles`.
- Bucket `kavach-profile-photos` created (Private, 2 MB, images only).
- Storage SELECT policy created on `storage.objects`.

#### 4. Verification Queries:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'claimed_college_id';
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'kavach-profile-photos';
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users read own profile photos';
```

#### 5. Positive Tests:
- **Test 17-P1 (Owner Avatar Read):**
  - Student A reads `storage.objects` where `name = 'UID_A/avatar-123.jpg'`.
  - *Expected Result:* 1 row returned (Permitted via `(storage.foldername(name))[1] = auth.uid()`).
- **Test 17-P2 (Server-Mediated ID Upload Pipeline):**
  - Student submits profile photo via `/api/student/verify-id`.
  - *Expected Result:* Saved to `${user.id}/avatar-${Date.now()}.${ext}`; `profiles.profile_photo_path` updated.

#### 6. Negative Tests:
- **Test 17-N1 (Student B Avatar Cross-Read):**
  - Student B attempts to query or download Student A's photo at `UID_A/avatar-123.jpg`.
  - *Expected Result:* `0 rows returned` / `403 Access Denied`.
- **Test 17-N2 (Direct Browser Upload Bypass):**
  - Student A executes `supabase.storage.from('kavach-profile-photos').upload(...)` from browser console.
  - *Expected Result:* `403 Forbidden` (`new row violates row-level security policy for table "objects"`).

#### 7. Rollback Procedure:
```sql
DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
DROP INDEX IF EXISTS public.idx_student_profiles_claimed_college_status;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS claimed_college_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_photo_path;
-- Bucket removal (only if empty):
DELETE FROM storage.buckets WHERE id = 'kavach-profile-photos';
```
- **Potential Data Loss:** **MEDIUM.** Dropping columns permanently erases student claim selections and avatar file path references.

---

## 3. Real Multi-Role Boundary Test Specifications

| Test Case | Actor 1 (Attempting Access) | Actor 2 (Owner / Target) | Target Resource | Expected Result | Enforcing Security Layer |
|---|---|---|---|---|---|
| **Role-01** | Student A (`srkr`) | Student B (`srkr`) | Incidents & Evidence | `0 rows returned` | RLS (`student_id = auth.uid()`) |
| **Role-02** | Student A (`srkr`) | Student C (`vitb`) | College Incidents | `0 rows returned` | RLS (`get_user_college_id()`) |
| **Role-03** | Student A (`srkr`) | Staff Responder | Internal Staff Location | `0 rows returned` | RLS Default Deny |
| **Role-04** | Staff Responder | HOD | Staff Performance Notes | `0 rows returned` | RBAC (`role IN ('HOD', 'ADMIN')`) |
| **Role-05** | HOD (CSE) | Principal | College-wide Audit Queue | Confined to CSE Dept | Department filter clause |
| **Role-06** | Campus Admin (`srkr`) | Campus Admin (`vitb`) | Other College Profiles | `0 rows returned` | RLS (`get_user_college_id()`) |
| **Role-07** | Campus Admin (`srkr`) | Super Admin | System Master Config | `0 rows returned` / Denied | RBAC (`role = 'SUPER_ADMIN'`) |
| **Role-08** | Super Admin | Any College Record | Multi-Tenant Incident | Allowed (200 OK) | Super Admin Bypass Function |

---

## 4. Runbook Conclusion

This execution guide provides complete mathematical and test coverage for verifying migrations 015, 016, and 017 in staging. **No commands may be executed against production.**

