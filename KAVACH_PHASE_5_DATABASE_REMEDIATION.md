# KAVACH CAMPUS — PHASE 5 DATABASE REMEDIATION & PRECONDITION AUDIT

**Project:** Kavach Campus  
**Workspace:** `D:\Kavach Campus`  
**Target Migrations:** 015, 016, 017  
**Execution Environment:** Staging Supabase SQL Editor  
**Status:** **CODE VERIFIED ONLY — STAGING PLAN READY**

---

## 1. MIGRATION RECONCILIATION SUMMARY

The previous historical collision where two migration files shared the prefix `015_` has been resolved in the local repository:
1. `supabase/migrations/015_college_scoped_student_id_uniqueness.sql` (Index upgrade)
2. `supabase/migrations/016_safe_box_private_notes.sql` (Safe Box table & RLS)
3. `supabase/migrations/017_student_college_claims.sql` (Claims column & profile photo bucket)

---

## 2. PRECONDITION SAFETY CHECKS BEFORE RUNNING MIGRATIONS

### Precondition Check for Migration 015
Before executing `015_college_scoped_student_id_uniqueness.sql`, run this diagnostic query in Supabase SQL Editor:
```sql
-- Diagnostic 015-A: Check for intra-college student ID collisions
SELECT college_id, student_id, COUNT(*)
FROM public.profiles
WHERE student_id IS NOT NULL AND role = 'STUDENT'
GROUP BY college_id, student_id
HAVING COUNT(*) > 1;

-- Diagnostic 015-B: Check for students with null college_id
SELECT id, full_name, college_email
FROM public.profiles
WHERE role = 'STUDENT' AND college_id IS NULL;
```
- **Expected Result:** 0 rows returned for both queries.
- **Safety Guarantee:** If both return 0 rows, the compound index `idx_profiles_college_student_id` is guaranteed to apply smoothly without failure.

---

### Precondition Check for Migration 016
Before executing `016_safe_box_private_notes.sql`, confirm prerequisite tables exist:
```sql
-- Diagnostic 016-A: Confirm base tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('evidence', 'profiles');
```
- **Expected Result:** Exactly 2 rows (`evidence`, `profiles`).
- **RLS Verification:** The migration explicitly executes `ALTER TABLE public.safe_box_private_notes ENABLE ROW LEVEL SECURITY;` and creates the owner policy enforcing `owner_id = auth.uid()`.

---

### Precondition Check for Migration 017
Before executing `017_student_college_claims.sql`, verify the Supabase `storage` schema is enabled:
```sql
-- Diagnostic 017-A: Confirm storage extension schema
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'storage';
```
- **Expected Result:** 1 row (`storage`).
- **Bucket Security:** Bucket `kavach-profile-photos` is created with `public = FALSE`. Access is strictly governed by the foldername RLS policy (`auth.uid()::TEXT = (storage.foldername(name))[1]`).

---

## 3. STAGING-ONLY EXECUTION PROCEDURE

1. **Safety Rule:** Never execute these migrations directly on Production during this phase.
2. Open the **Staging Supabase SQL Editor**.
3. Run Diagnostics 015-A and 015-B. If clean, execute `015_college_scoped_student_id_uniqueness.sql`.
4. Run Diagnostic 016-A. If clean, execute `016_safe_box_private_notes.sql`.
5. Run Diagnostic 017-A. If clean, execute `017_student_college_claims.sql`.
6. Verify all 3 scripts complete with `Success: No rows returned`.
