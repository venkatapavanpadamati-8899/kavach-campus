# KAVACH CAMPUS — STAFF HIERARCHY & APPROVAL WORKFLOW AUDIT

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Module:** `src/lib/staff-roles.ts` & `src/app/api/admin/users/approve/route.ts`  
**Status:** 100% VERIFIED  

---

## 1. Official 16-Level Staff Hierarchy

The application strictly implements the required 16-level staff hierarchy in descending administrative rank:

| Rank | Designation Code | Title / Label | Category | Responsibilities & Scope |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `PRINCIPAL` | Principal | LEADERSHIP | Institutional Head & Chief Academic Officer |
| **2** | `PROVOST` | Provost | LEADERSHIP | Senior Academic Administrator & Student Affairs |
| **3** | `VICE_PRINCIPAL`| Vice Principal | LEADERSHIP | Academic Operations & Faculty Administration |
| **4** | `DEAN` | Dean (Academics / Student Affairs) | LEADERSHIP | Faculty Division Head & Student Welfare Dean |
| **5** | `HOD` | Head of Department (HOD) | LEADERSHIP | Department Academic & Faculty Leadership |
| **6** | `PROFESSOR` | Professor | FACULTY | Senior Faculty Member & Research Advisor |
| **7** | `ASSOCIATE_PROFESSOR` | Associate Professor | FACULTY | Senior Faculty & Laboratory In-charge |
| **8** | `ASSISTANT_PROFESSOR` | Assistant Professor | FACULTY | Department Faculty & Student Mentor |
| **9** | `JUNIOR_PROFESSOR` | Junior Professor | FACULTY | Lecturing & Tutorial Faculty |
| **10** | `LECTURER` | Lecturer | FACULTY | Department Lecturer & Academic Tutor |
| **11** | `TEACHER` | Teacher / Instructor | FACULTY | Laboratory Instructor & Course Teacher |
| **12** | `MENTOR` | Mentor / Faculty Advisor | ACADEMIC_SUPPORT | Assigned Student Cohort Counselor & Safety Guide |
| **13** | `COUNSELOR` | Student Counselor | ACADEMIC_SUPPORT | Confidential Mental Health & Well-being Officer |
| **14** | `ADMINISTRATIVE_OFFICER` | Administrative Officer (AO) | ADMINISTRATIVE | Campus Registrar & Records Administrator |
| **15** | `NON_TEACHING_STAFF` | Non-Teaching Staff | ADMINISTRATIVE | Department Technical & Administrative Support |
| **16** | `SECURITY` | Security Officer / Campus Watch | SAFETY | Gate Security, Perimeter Patrol & Rapid Response |

---

## 2. Staff Registration & Approval Workflow

```
[Staff Registration] 
      ↓
[Select College (PIN Code / Name Search)]
      ↓
[Select Designation (1 of 16 Ranks)]
      ↓
[Upload Staff ID Proof & Employee ID]
      ↓
[Account Created: is_approved = false (Pending Approval)]
      ↓
[Request Routed to College Principal / Campus Admin (Same College Tenant)]
      ↓
[Reviewer Verifies Employee Credentials]
      ↓
[Approve / Reject Action with Audit Log]
      ↓
[If Approved: is_approved = true → Staff Dashboard Unlocked]
[If Rejected: Rejection Reason Recorded → Dashboard Remains Locked]
```

---

## 3. Security Rules & Guardrails Enforced

1. **Zero Automatic Administrative Privileges:** Merely selecting "Principal", "Dean", or "HOD" in the registration form **NEVER** grants administrative rights. Every staff member begins with `is_approved: false`.
2. **Strict Self-Approval Prevention:** The approval API (`/api/admin/users/approve`) verifies that the approving user's ID does NOT match the target user's ID (`approver.id !== target.id`).
3. **Cross-College Approval Denial:** An approver from College A cannot approve or reject staff accounts from College B. The API strictly asserts:
   ```ts
   if (approverRole !== 'SUPER_ADMIN' && approverCollegeId !== targetCollegeId) {
     return NextResponse.json({ error: 'Forbidden: Cannot approve staff outside your college' }, { status: 403 });
   }
   ```
4. **Hierarchical Authority Validation:** Campus Admins and Principals require Super Admin approval. Teaching and support staff are approved by the verified Campus Admin or Principal within their respective institution.
