# KAVACH CAMPUS — PHASE 3 MASTER REMEDIATION PLAN

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Status:** PHASE 3 COMPREHENSIVE AUDIT & VERIFICATION  

---

## 1. Master Remediation Plan & Issue Resolution Matrix

| Issue ID | Module / File | Root Cause | Implemented Resolution | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **REM-01** | `supabase/migrations/` | Two migration files shared the prefix `015_`, creating tooling sorting ambiguity. | Resequenced `015_student_college_claims.sql` to `017_student_college_claims.sql`. Preserved `015_college_scoped_student_id_uniqueness.sql` and `016_safe_box_private_notes.sql`. | **FIXED & RECONCILED** |
| **REM-02** | `src/components/layouts/DashboardLayout.tsx` | Sidebar was not fixed; scrolled alongside long content, displacing user profile. | Sidebar set to `position: fixed; left: 0; width: 270px; zIndex: 50`. Content offset by `marginLeft: 270px`. Profile pinned at bottom-left corner. | **VERIFIED** |
| **REM-03** | `src/lib/staff-roles.ts` | 16-level staff hierarchy lacked unified typed registry and server helpers. | Created `STAFF_HIERARCHY` with all 16 levels in exact order; added `isStaffRole` and `isManagementRole` helpers. | **VERIFIED** |
| **REM-04** | `src/components/ui/CollegeSearchInput.tsx` | Applicants needed search by College Name and 6-Digit Indian PIN code. | Built debounced search supporting both text query and 6-digit regex detection with multi-college display and Request modal. | **VERIFIED** |
| **REM-05** | `src/proxy.ts` | `/admin/campus/register` was captured by `/admin/*` protected route guard, blocking new applicants. | Whitelisted `/admin/campus/register` as public in middleware. | **VERIFIED** |
| **REM-06** | `src/app/globals.css` | Font blurriness and inconsistent contrast on dark overlays. | Added `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, and verified WCAG contrast. | **VERIFIED** |
| **REM-07** | `.github/workflows/safe-walk-scheduler.yml` | Run #36 failed due to missing `CRON_SECRET` in repo secrets. | Defaulted target URL to `https://kavach-campus.vercel.app`, added dry-run option, masked secrets, and documented exact owner secret requirement. | **CONFIG PENDING** |

