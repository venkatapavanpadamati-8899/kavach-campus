# KAVACH CAMPUS — PHASE 3 STAFF WORKFLOW & HIERARCHY REPORT

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Status:** 100% IMPLEMENTED & VERIFIED  

---

## 1. Staff Hierarchy & Designation Ordering

The 16 hierarchical staff designations are strictly implemented in `src/lib/staff-roles.ts` in exact requested order:
1. `Principal`
2. `Provost`
3. `Vice Principal`
4. `Dean`
5. `Head of Department (HOD)`
6. `Professor`
7. `Associate Professor`
8. `Assistant Professor`
9. `Junior Professor`
10. `Lecturer`
11. `Teacher / Instructor`
12. `Mentor / Faculty Advisor`
13. `Student Counselor`
14. `Administrative Officer`
15. `Non-Teaching Staff`
16. `Security Officer`

---

## 2. Staff Registration & Approval Lifecycle

1. **Registration:** Applicant accesses `/register?role=STAFF`, searches college by PIN or name, selects designation, and enters employee ID.
2. **Initial State:** Account created with `account_status = pending_approval`, `is_approved = false`.
3. **Review & Approval:** Routed to verified Campus Admin or Principal within the same college tenant.
4. **Self-Approval Blocked:** Approver cannot approve their own account.
5. **Cross-College Protection:** Approver cannot approve applicants from other institutions.
6. **Audit Trail:** Every approval or rejection is logged with approver ID, timestamp, and optional reason.

