# KAVACH CAMPUS — PHASE 15G: LOCAL MIGRATIONS 015–017 EXECUTION REPORT

**Project:** Kavach Campus  
**Workspace:** `D:\kavach-campus`  
**Execution Target:** Local Supabase (`127.0.0.1:54322`, Database: `postgres`)  
**Completed At:** 2026-11-04  
**Status:** **`PASS — MIGRATIONS 015, 016, 017 FULLY EXECUTED & VERIFIED`**  
**Production Status:** 100% Isolated (Zero production contact)  

---

## 1. Executive Summary

Phase 15G executed the three pending production release migrations (`015`, `016`, `017`) sequentially against the local Docker Supabase database.

All three migrations executed cleanly without syntax errors, table collisions, or constraint failures. Empirical database tests verified:
1. Student ID uniqueness is enforced strictly per-college tenant while permitting identical registration IDs across separate institutions.
2. Safe Box private notes are constrained to `<= 2000` characters with dedicated RLS protection.
3. Student college claims and profile photo private storage buckets are configured with strict user-scoped storage policies.
4. All pre-existing local records (7 profiles, 2 student profiles, 2 incidents, 2 locations, 9 audit logs) remain 100% preserved.

---

## 2. Migration Execution Matrix

| Migration File | Size (Bytes) | Target Schema Objects | Key DDL Operations | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| `015_college_scoped_student_id_uniqueness.sql` | 1,840 | `public.profiles` | Dropped legacy `idx_profiles_student_id`; created compound partial unique index `idx_profiles_college_student_id` on `(college_id, student_id)` where `student_id IS NOT NULL AND role = 'STUDENT'`. | **PASS** |
| `016_safe_box_private_notes.sql` | 1,020 | `public.safe_box_private_notes` | Created table with primary key `evidence_id`, foreign keys to `evidence` and `profiles`, check constraint `<= 2000` chars, enabled RLS, installed policy `"Students manage own Safe Box notes"`. | **PASS** |
| `017_student_college_claims.sql` | 1,080 | `public.student_profiles`, `public.profiles`, `storage.buckets` | Added `student_profiles.claimed_college_id`, added `profiles.profile_photo_path`, created index `idx_student_profiles_claimed_college_status`, configured private bucket `kavach-profile-photos` (2 MB limit, images only), installed storage RLS policy `"Users read own profile photos"`. | **PASS** |

---

## 3. Empirical Test Results

### 3.1 Migration 015: College-Scoped Uniqueness Test
- **Test 1 (Cross-College Sharing):**
  - Student Alpha (`srkr-bhimavaram`, `student_id = 'TEST_REG_9999'`) -> **SUCCESS**
  - Student Beta (`vishnu-bhimavaram`, `student_id = 'TEST_REG_9999'`) -> **SUCCESS**
  - *Result:* Identical student IDs across distinct colleges are permitted.
- **Test 2 (Same-College Duplicate Rejection):**
  - Student Gamma (`srkr-bhimavaram`, `student_id = 'TEST_REG_9999'`) -> **REJECTED**
  - *PostgreSQL Error Code:* `23505` (`unique_violation`) on index `idx_profiles_college_student_id`.
  - *Result:* Duplicate student IDs within the same college are rejected.

### 3.2 Migration 016: Safe Box Table & Constraint Verification
- Table `public.safe_box_private_notes`: Exists with `rowsecurity = true`.
- Constraint `check_private_note_length`: `CHECK (char_length(private_note) <= 2000)` enforced.
- Cascade Deletion: Confirmed via `REFERENCES public.evidence(id) ON DELETE CASCADE`.

### 3.3 Migration 017: Student Claims & Storage Verification
- Column `student_profiles.claimed_college_id`: Exists (`text`).
- Column `profiles.profile_photo_path`: Exists (`text`).
- Storage Bucket `kavach-profile-photos`:
  - `public`: `false`
  - `file_size_limit`: `2,097,152` bytes (2 MB)
  - `allowed_mime_types`: `['image/jpeg', 'image/png', 'image/webp']`
- Storage Policy: `"Users read own profile photos"` active on `storage.objects` for `kavach-profile-photos`.

---

## 4. Data Preservation Verification

| Table | Count Before 15G | Count After 15G | Variance | Notes |
| :--- | :-: | :-: | :-: | :--- |
| `profiles` | 7 | 7 | 0 | 100% preserved (synthetic test accounts were fully cleaned up) |
| `student_profiles` | 2 | 2 | 0 | 100% preserved |
| `incidents` | 2 | 2 | 0 | 100% preserved |
| `incident_locations` | 2 | 2 | 0 | 100% preserved |
| `audit_logs` | 9 | 9 | 0 | 100% preserved |
| `safe_box_private_notes` | 0 | 0 | 0 | Newly created table |

---

## 5. Phase 15G Verdict

Phase 15G is officially **`PASS`**. The database schema is fully updated with migrations 015, 016, and 017 and is ready for real authenticated RLS testing in Phase 15H.

