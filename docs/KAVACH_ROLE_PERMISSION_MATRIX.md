# KAVACH CAMPUS — ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION MATRIX
**Document Identifier:** `KAVACH-DOC-RBAC-001`  
**Classification:** Security Architecture & Access Control Specification  
**Effective Date:** 2026-10-11  

---

## 1. PURPOSE & PRINCIPLES

The Kavach Campus Role-Based Access Control matrix enforces **Least-Privilege Separation of Duties** across student safety, case management, and administrative oversight. 

### Core Access Principles:
1. **Student Data Isolation:** Students can access only their own profile, submitted cases, and private ID proof. Students cannot access other students' files or staff portals.
2. **Assigned Case Boundary:** Mentors, counselors, and staff can access case details **ONLY** for incidents assigned to them or routed to their specialized responder role. General staff cannot browse all student records.
3. **Evidence Privacy:** Incident evidence files and student ID cards in Supabase Storage require authenticated, authorized signed URLs; public access is permanently disabled.
4. **Administrative Role Protection:** Public registration cannot self-assign `ADMIN`, `SUPER_ADMIN`, or management roles. All privileged accounts require institutional verification.

---

## 2. SYSTEM ROLES DEFINITION

| Role Name | Scope & Organizational Responsibility | Approval Required | Portal Route |
| :--- | :--- | :---: | :--- |
| **`STUDENT`** | Enrolled undergraduate/postgraduate student. Can file complaints, activate SOS, initiate Safe Walk. | Self-Register + ID Verification | `/student/*` |
| **`MENTOR`** | Faculty academic advisor. Assigned to departmental student complaints (L1/L2 severity). | Admin Review | `/staff/*` |
| **`COUNSELLOR`** | Professional student psychologist / counselor. Handles mental health, distress, and counseling cases. | Admin Review | `/staff/*` |
| **`SECURITY`** | Campus security officer / Quick Response Team guard. Receives emergency SOS and high-severity alerts. | Admin Review | `/staff/*` |
| **`WOMENS_CELL`**| Women's Development Cell (WDC) / Internal Complaints Committee (ICC) officer. Handles harassment reports. | Admin Review | `/staff/*` |
| **`HOD`** | Head of Academic Department. Oversees departmental incident escalation and staff duty status. | Admin Review | `/management/*` |
| **`PRINCIPAL`** | College Head / Executive Director. Oversees institutional campus safety KPIs and critical escalations. | Super Admin Review | `/management/*` |
| **`ADMIN`** | Campus Safety Officer / System Administrator. Manages user approvals, geofences, and audit logs. | Super Admin Review | `/admin/*` |
| **`SUPER_ADMIN`** | Institutional Chief / System Owner. Global configuration, super admin controls, and audit oversight. | Root Provisioning | `/super-admin/*` |

---

## 3. PERMISSION MATRIX BY FUNCTIONAL AREA

| Functional Capability | `STUDENT` | `MENTOR` | `COUNSELLOR` | `SECURITY` | `HOD` | `ADMIN` | `SUPER_ADMIN` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **File Incident / Complaint** | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Activate One-Tap SOS** | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Initiate Safe Walk** | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Own Submitted Cases** | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Upload / View Own ID Card** | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Acknowledge Assigned Case** | ❌ | ✅ Assigned | ✅ Assigned | ✅ Assigned | ✅ Assigned | ✅ All | ✅ All |
| **View Assigned Case Details**| ❌ | ✅ Assigned | ✅ Assigned | ✅ Assigned | ✅ Assigned | ✅ All | ✅ All |
| **Browse All Student Profiles**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Approved | ✅ All |
| **Review Student ID Card Proof**| ❌ | ❌ | ❌ | ✅ Reviewer | ❌ | ✅ Reviewer | ✅ Reviewer |
| **Approve / Reject Student ID**| ❌ | ❌ | ❌ | ✅ Reviewer | ❌ | ✅ Reviewer | ✅ Reviewer |
| **Approve Staff Role Requests**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Staff Roles | ✅ All Roles |
| **Modify User Roles / Approvals**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Staff/Student | ✅ All Roles |
| **View System Audit Logs** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Read-Only | ✅ Full |
| **Configure Geofences & AI** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Full | ✅ Full |
| **Execute Background Cron Jobs**| ❌ | ❌ | ❌ | ❌ | ❌ | 🔒 Cron Secret | 🔒 Cron Secret |

---

## 4. STORAGE BUCKET ACCESS POLICIES

### A. Bucket: `kavach-evidence` (`public = false`)
- **INSERT (Upload):** Authenticated students and responders for assigned cases.
- **SELECT (Read):**
  - Owner of the evidence (`auth.uid() = storage.foldername[1]` OR `name LIKE auth.uid()-%`).
  - Authorized staff and security officers (`public.is_staff() = true`).
  - Public anonymous access: **DENIED (403)**.

### B. Bucket: `kavach-id-cards` (`public = false`)
- **INSERT (Upload):** Authenticated student uploading to their own user path (`auth.uid()`).
- **SELECT (Read):**
  - Student reading their own ID card (`auth.uid()`).
  - Authorized security reviewers and administrators (`public.is_staff() = true`).
  - Other students: **DENIED (403)**.
  - Public anonymous access: **DENIED (403)**.
