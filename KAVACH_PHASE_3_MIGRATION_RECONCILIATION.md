# KAVACH CAMPUS — PHASE 3 MIGRATION RECONCILIATION

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Status:** MIGRATION SEQUENCE STRICTLY RECONCILED  

---

## 1. Sequence Reconciliation

To eliminate the numeric collision between the two 015 migrations without breaking dependencies:
1. **Migration 015 (`015_college_scoped_student_id_uniqueness.sql`):** Retained as 015. Created on 26-10-2026.
2. **Migration 016 (`016_safe_box_private_notes.sql`):** Retained as 016. Created on 03-11-2026.
3. **Migration 017 (`017_student_college_claims.sql`):** Resequenced from `015_student_college_claims.sql`. Created on 03-11-2026.

```
014_cross_college_rls_hardening.sql (Applied in Production)
      ↓
015_college_scoped_student_id_uniqueness.sql (Pending Staging / SQL Editor)
      ↓
016_safe_box_private_notes.sql (Pending Staging / SQL Editor)
      ↓
017_student_college_claims.sql (Pending Staging / SQL Editor)
```

---

## 2. Reconciled Migration Table

| Sequence | File Name | Target Object | Impact Type | Execution Gate |
| :---: | :--- | :--- | :---: | :--- |
| **015** | `015_college_scoped_student_id_uniqueness.sql` | `idx_profiles_college_student_id` | Compound Unique Index | Safe / Idempotent |
| **016** | `016_safe_box_private_notes.sql` | `public.safe_box_private_notes` | Table + RLS Policy | Safe / Idempotent |
| **017** | `017_student_college_claims.sql` | `student_profiles.claimed_college_id`, `kavach-profile-photos` | Column + Storage Bucket | Safe / Idempotent |

> [!CAUTION]
> As per strict database safety instructions, NO production migrations are executed automatically. These 3 migrations are staged and ready for operator execution in the Supabase SQL Editor.

