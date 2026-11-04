# KAVACH CAMPUS — STAFF REGISTRATION END-TO-END AUDIT REPORT
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer & QA Architect  
**Scope:** Complete Staff Registration Lifecycle: Onboarding → ID Verification → Multi-Tier Approval → Portal Access  

---

## 1. Step 1 — Staff Registration Interface & Form Validation

The staff registration workflow was audited against the 16 institutional staff designations:

### 16 Staff Designations & Category Distribution
```text
1. Academic Faculty
   - Professor
   - Associate Professor
   - Assistant Professor
   - Lecturer / Teacher
   - Academic Mentor / Faculty Advisor

2. Student Affairs & Welfare
   - Student Counsellor / Psychological Counselor
   - Student Welfare Officer
   - Women's Cell Representative
   - Hostel Warden / Resident Rector

3. Administrative & Operational
   - Administrative Officer
   - Office Superintendent / Assistant
   - Accounts & Finance Officer
   - Non-Teaching Staff / Lab Assistant

4. Campus Security & Emergency Safety
   - Campus Security Guard / Officer
   - Security In-Charge / Supervisor
   - Campus Watch Responder
```

### Form Validations Audited
- **College Tenant Selection:** Dynamic search across known college tenants (e.g. SRKR Engineering College, Vishnu, DNR).
- **Designation Selection:** Live category filtering with fuzzy search across designations and aliases.
- **Department Association:** Auto-filled for academic roles or custom entry for operational units.
- **Employee ID & Contact Checks:** Validated 10-digit mobile number, formatted email, minimum 8-character password.
- **Duplicate Prevention:** Server rejects existing registered emails and duplicate student/employee IDs with `400 Bad Request`.

---

## 2. Step 2 — Server-Side Registration Request & Security

1. **Privilege Elevation Prevention:**
   - Any public attempt to register with `ADMIN`, `SUPER_ADMIN`, `PRINCIPAL`, or `HOD` is blocked by server validation or safely down-scoped to a pending `STAFF` approval request.
2. **Password Security:**
   - Client passwords are never stored as plaintext in `user_otp_verifications`.
   - Passwords are encrypted directly via bcrypt/Supabase Auth credentials management.
3. **Approval Status Default:**
   - All newly registered staff members are flagged with `is_approved = false` in `profiles`.
   - Access to responder endpoints and incident queues is blocked until authorized approval is recorded.

---

## 3. Step 3 — Identity Verification & Private Storage

- **Storage Bucket:** `kavach-id-cards`
- **Access Policy:** Private (`public = false`). Direct anonymous downloads are blocked.
- **Upload Restrictions:**
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
  - Maximum size: 5 MB limit.
- **Audit Logging:** Every verification evaluation and status change writes an entry to `audit_logs` with actor metadata and timestamp.

---

## 4. Step 4 — Head of Department (HOD) Approval

- **Endpoint:** `POST /api/admin/users/approve`
- **Department Boundary Enforcement:**
  - HOD can approve or reject faculty and staff strictly within their matching department.
  - Attempting to approve a staff member from another department returns `403` with error code `CROSS_DEPARTMENT_APPROVAL_FORBIDDEN`.
- **Reason Requirement:** Rejections require an audit explanation.

---

## 5. Step 5 — Principal & Campus Admin Approval

- **Institution Boundary Enforcement:**
  - Principal / Campus Admin can review and approve all staff and HODs within their verified `college_id`.
  - Cross-college actions return `403` with code `CROSS_COLLEGE_FORBIDDEN`.
- **Super Admin Protection:**
  - Neither Principal nor Campus Admin can elevate any account to `SUPER_ADMIN`.
  - Self-approval is rejected (`SELF_APPROVAL_BLOCKED`).

---

## 6. Step 6 — Super Admin Oversight

- Super Admin retains platform-wide authority across all institutions.
- Super Admin is required to approve Institutional Leadership (`PRINCIPAL`, `DIRECTOR`, `DEAN`, `CAMPUS_ADMIN`).

---

## 7. Step 7 — Staff Login & Dynamic Routing

- After approval (`is_approved = true`), staff members authenticate via `/login` with email and password or mobile login.
- Central router (`/dashboard`) invokes `isManagementRole()` and `isStaffRole()`:
  - Department HODs & Principals route to `/management`.
  - Operational and Security staff route to `/staff`.
  - Unauthorized portals remain blocked by layout guards and API authentication checks.

