# KAVACH CAMPUS — STAFF REGISTRATION E2E REPORT
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer & Access Control Specialist  
**Scope:** Staff Registration with 16-Designation Catalog, Department Routing, Unapproved Default State, HOD/Principal Approval Lifecycle, and Access Transition  

---

## 1. Executive Summary

The staff onboarding lifecycle was audited and verified against the local Next.js server (`http://localhost:3000`) and the live Supabase staging database.

All staff accounts properly default to unapproved (`is_approved = false`), preventing premature access to incident management and emergency dispatch tools until verified by department heads or campus leadership.

---

## 2. 16-Designation Catalog Implementation

The 16 designations defined in `src/app/register/page.tsx` and `src/lib/staff-roles.ts` are categorized as follows:

| Category | Designations | System Role Mapping |
| :--- | :--- | :---: |
| **Academic Faculty** | Assistant Professor, Associate Professor, Professor, Lab Assistant, Teaching Assistant | `STAFF` |
| **Student Affairs & Welfare** | Student Counselor, Hostel Warden, Physical Director, NSS / NCC Officer | `WARDEN` / `COUNSELLOR` / `STAFF` |
| **Administrative & Operational** | Administrative Officer, Estate Officer, Campus Maintenance Staff, Bus In-Charge | `STAFF` |
| **Campus Security & Safety** | Chief Security Officer, Security Guard, Night Patrol Officer | `SECURITY` / `CAMPUS_WATCH` |

---

## 3. Live Workflow Verification Matrix

| Step | Operation | Endpoint | Details | Result | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | Staff Registration | `POST /api/auth/register` | Selected designation: `Assistant Professor`, Department: `CSE`, Employee ID: `EMP-CSE-8910` | HTTP 201 | **PASS** |
| **2** | Default State Validation | Database probe | Query `profiles.is_approved` immediately after registration | `is_approved = false` | **PASS** |
| **3** | Unapproved Staff Access Gate | `GET /staff` / `/management` | Access attempt prior to approval | Redirect to `/pending-approval` | **PASS** |
| **4** | Cross-Department Approval Guardrail | `POST /api/admin/users/approve` | Mechanical HOD attempting to approve CSE staff member | HTTP 403 `CROSS_DEPARTMENT_APPROVAL_FORBIDDEN` | **PASS** |
| **5** | Authorized Departmental Approval | `POST /api/admin/users/approve` | CSE HOD approving CSE staff member | HTTP 200 `User approved successfully` | **PASS** |
| **6** | Approved Staff Dashboard Access | SSR Login & Route Access | Login as approved staff member and access `/staff` | HTTP 200 / Accessible | **PASS** |

---

## 4. Key Fixes Applied

1. **Catalog Role Normalization in Approval API:**  
   Updated `canUserApproveRole` in `src/lib/staff-roles.ts` to allow HODs and Principals to approve all catalog designations (`isStaffRole(targetRole)` fallback).
2. **Registration Role Passthrough:**  
   Updated `src/app/api/auth/register/route.ts` to accept all catalog designations without falling back to `'STUDENT'`.
3. **Database Schema Resilience:**  
   Updated `src/app/api/admin/users/approve/route.ts` to gracefully fallback when `can_manage_staff` column is not yet present on remote DB.

---

## 5. Final Verdict

- **Automated API & RBAC Logic:** `PASS`
- **Manual Interactive Visuals:** `NOT VERIFIED` (Requires manual browser verification of designation dropdown search and UI selection).

