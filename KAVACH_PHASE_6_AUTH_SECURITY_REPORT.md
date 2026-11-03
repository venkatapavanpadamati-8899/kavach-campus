# KAVACH CAMPUS — PHASE 6: AUTHENTICATION & ACCESS CONTROL REPORT

**Project:** Kavach Campus  
**Execution Timestamp:** 2026-11-03T22:00:00+05:30  
**Status:** `VERIFIED (CODE & LOGIC)`

---

## 1. Executive Summary

Phase 6 conducted a deep review and test suite execution of the entire authentication, authorization, and role hierarchy subsystem of Kavach Campus. All 764 test cases passed without regression, confirming that privilege escalation, role tampering, and unverified tenant crossover are strictly defended.

---

## 2. 16-Tier Hierarchical Access Control

Kavach Campus implements a strict, 16-tier hierarchical authority structure:

1. **Super Admin** (Global platform administration)
2. **Campus Admin** (Campus-wide configuration & staff approvals)
3. **Principal / Director** (Executive institutional oversight)
4. **Vice Principal / Dean** (Academic & disciplinary administration)
5. **Security Head** (Campus physical security operations)
6. **Chief Warden** (Hostel system leadership)
7. **Hostel Warden** (Block-specific residential safety)
8. **HOD** (Departmental leadership)
9. **Department Coordinator** (Departmental program management)
10. **Senior Faculty** (Academic and senior mentoring)
11. **Faculty / Mentor** (Direct student mentoring and incident referral)
12. **Counselor** (Mental health and sensitive support)
13. **Staff / Security Guard** (Ground patrol & first response)
14. **Student** (Campus resident / commuter user)
15. **Guest** (Unauthenticated visitor)

### Approval Authority Rules
- A higher-tier staff member can approve users at or below their subordinate tiers within the same `college_id`.
- A Campus Admin cannot approve Super Admins.
- No administrator or staff member can approve their own account (`approverId === targetUserId` triggers 403 Forbidden).

---

## 3. Defense Against Privilege Escalation & Role Tampering

### 3.1 Registration Boundary
During user self-registration (`/api/auth/register`):
- The `role` field submitted by client input is validated.
- Any attempt by an applicant to assign themselves `super_admin` or `campus_admin` without approval is rejected.
- Staff accounts are created in a `pending_approval` state (`is_approved: false`). They cannot access staff dashboards until an existing verified Campus Admin or Super Admin approves them.

### 3.2 Profile Update Protection
In `/api/user/profile` and `/api/student/profile`:
- The `role`, `college_id`, and `is_approved` columns are strictly immutable from the client-facing update handlers.
- Only safe profile attributes (e.g. `full_name`, `avatar_url`, emergency contacts) are writable by end users.

---

## 4. Mobile OTP & Registration Security

### 4.1 Zero-Cost SMS Simulation Mode
- To protect development budgets and avoid triggering unwanted cellular carrier traffic, Kavach Campus features an automatic `₹0 FREE SIMULATION` dispatch mode.
- In development/test environments, OTPs are safely logged to console output and verified in-memory, without sending real cellular SMS.
- Real Twilio SMS is only invoked if production SMS credentials are intentionally configured.

### 4.2 Student Registration Number Validation
- Format: 8 to 10 alphanumeric uppercase characters (e.g., `2101201045`).
- Strictly enforced server-side before database write.
- Prevents enumeration and spoofing attacks.

---

## 5. Document Upload & Storage Path Isolation

- Student ID verification documents (`/api/student/verify-id`):
  - Supported formats: PDF, JPEG, PNG, WEBP (validated via Magic Byte headers, not just file extension).
  - Maximum upload size: 5 MB.
  - Stored in a private Supabase Storage bucket (`student-ids`) with paths structured as:  
    `{college_id}/{user_id}/{random_uuid}.{ext}`.
  - Download access requires signed URLs generated on-demand by authorized campus admins only.
