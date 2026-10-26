# Kavach Campus — Step 114: Final RLS Security Review & Verification

**Project Ref:** `polbnvszmvblwenfnqll` (Region: `ap-northeast-1`)  
**Quality Gates Status:** Automated tests: **222/222 PASS** | TypeScript: **PASS (0 errors)** | ESLint: **PASS (0 warnings)** | Build: **PASS (55/55 routes compiled)**  
**Remote DDL Execution Status:** **`HOLD`** *(No changes were made to the remote database).*

---

## 1. Live Database Policy Outputs (Inspection Results)

### Check 1 — `public.student_profiles`
```json
[
  {
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "policyname": "Staff read student profiles",
    "qual": "is_staff()",
    "roles": "{public}",
    "with_check": null
  },
  {
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "policyname": "Students read own private profile",
    "qual": "(auth.uid() = id)",
    "roles": "{public}",
    "with_check": null
  },
  {
    "cmd": "UPDATE",
    "permissive": "PERMISSIVE",
    "policyname": "Students update own profile",
    "qual": "(auth.uid() = id)",
    "roles": "{public}",
    "with_check": null
  }
]
```

### Check 2 — `public.evidence`
```json
[
  {
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "policyname": "Staff view evidence",
    "qual": "is_staff()",
    "roles": "{public}",
    "with_check": null
  },
  {
    "cmd": "INSERT",
    "permissive": "PERMISSIVE",
    "policyname": "Users upload evidence",
    "qual": null,
    "roles": "{public}",
    "with_check": "(auth.uid() = uploaded_by)"
  },
  {
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "policyname": "Users view own evidence",
    "qual": "(auth.uid() = uploaded_by)",
    "roles": "{public}",
    "with_check": null
  }
]
```

---

## 2. Confirmation of Current Gaps

1. **Broad Policy Still Active on `student_profiles`:**
   - `"Staff read student profiles"` USING `(is_staff())` is currently live.
   - It grants full read access across all student profiles to `STAFF`, `COUNSELLOR`, `WOMENS_CELL`, `HOD`, and `PRINCIPAL`.
   - Because `PERMISSIVE` policies combine with `OR`, this policy **must be dropped** before security is achieved.

2. **Broad Policy Still Active on `evidence`:**
   - `"Staff view evidence"` USING `(is_staff())` is currently live.
   - It grants full read access across all evidence rows to unassigned staff.
   - It **must be dropped** and replaced with a case-isolated policy.

---

## 3. Streamlined & Hardened Candidate SQL

The revised script in [`supabase/verification/kavach_step114_hardened_rls_candidate.sql`](file:///d:/Kavach%20Campus/supabase/verification/kavach_step114_hardened_rls_candidate.sql):
- **Eliminates unnecessary `SECURITY DEFINER` functions** to minimize attack surface.
- Directly grants `student_profiles` SELECT strictly to the student owner and approved reviewers (`ADMIN`, `SUPER_ADMIN`, `SECURITY`).
- Prevents row-level exposure of sensitive columns (`medical_conditions`, `hostel_room`, `blood_group`, `emergency_contact_phone`, `id_card_url`) to general responders.
- Correctly matches `evidence.case_id` against `incidents.id::text` and `incidents.case_id`.
- **Provides a safe rollback** that never restores broad `is_staff()` policies.
