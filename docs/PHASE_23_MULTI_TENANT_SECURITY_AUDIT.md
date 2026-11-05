# Phase 23 — Multi-Tenant Security & Tenant Isolation Audit

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Multi-Tenant Threat Model

In a statewide multi-college deployment supporting hundreds of institutions across 26 districts:
- **Primary Risk:** Cross-tenant leakage of sensitive student safety data, confidential grievance reports, SOS triggers, SafeWalk sessions, or student identities.
- **Regulatory Requirement:** Under Indian data protection principles, institutional data (SRKR, Vishnu, Andhra University, AUCE, etc.) must remain strictly isolated. A staff member or warden from College A must never view or query incidents from College B.

---

## 2. RLS Tenant Isolation Architecture

### 2.1 The Core Tenant Key: `college_id`
Every student profile (`public.profiles`) and every safety incident (`public.incidents`) is partitioned by `college_id`.

```sql
-- Migration 017 Hardened Permissive Elimination Predicate:
CREATE POLICY "incidents_college_staff_access"
ON public.incidents
FOR ALL
TO authenticated
USING (
  college_id = (
    SELECT p.college_id FROM public.profiles p WHERE p.id = auth.uid()
  )
  AND (
    SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
  ) IN ('admin', 'management', 'staff', 'warden', 'security_head')
);
```

### 2.2 Student Privacy Boundary
Students can only access incidents where they are the reporter (`user_id = auth.uid()`), regardless of their campus:
```sql
CREATE POLICY "incidents_student_self_access"
ON public.incidents
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
);
```

### 2.3 Quarantine of Unverified Campuses (`PENDING_CAMPUS_VERIFICATION`)
When a student registers with a personal email domain (Gmail, Yahoo, Outlook) or requests an unverified institution:
1. `profiles.college_id` is assigned the quarantined sentinel value `'PENDING_CAMPUS_VERIFICATION'`.
2. Institutional staff of legitimate colleges cannot see or access these quarantined profiles.
3. Incidents reported under quarantined status are routed exclusively to the Super Admin review queue until institutional verification is complete.

---

## 3. Audit Verification Results

| Security Test Case | Test File | Result |
| :--- | :--- | :---: |
| Staff from College A cannot query College B incidents | `src/__tests__/tenant-migration-hardening.test.ts` | ✅ **PASS** |
| Student cannot escalate privileges to view cross-campus logs | `src/__tests__/student-privacy-rls-boundaries.test.ts`| ✅ **PASS** |
| Unrecognized email domain assigns `PENDING_CAMPUS_VERIFICATION` | `src/__tests__/google-pending-campus.test.ts` | ✅ **PASS** |
| Verified domains (e.g. `srkr.edu.in`) map strictly to institutional ID | `src/__tests__/colleges-directory.test.ts` | ✅ **PASS** |
| All 26 districts enforce public read / super-admin write RLS | `src/__tests__/ap-statewide-colleges.test.ts` | ✅ **PASS** |

Zero permissive policy leaks exist in the schema.

