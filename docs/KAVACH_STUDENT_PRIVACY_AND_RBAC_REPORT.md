# KAVACH CAMPUS — STUDENT DATA PRIVACY & RBAC ENFORCEMENT AUDIT
**Project:** Kavach Campus — “Safety in One Tap”  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 11, 2026  
**Privacy Standard:** Student Data Protection, FERPA/DPDP Compliance, Need-to-Know Principle

---

## 1. Core Privacy Boundaries & The 10 Inviolable Rules

| # | Privacy Rule | Technical Enforcement Mechanism | Verification Status |
| :-: | :--- | :--- | :---: |
| **1** | Student can access only their own records | PostgreSQL RLS: `auth.uid() = student_id` on `incidents`, `student_profiles` | **VERIFIED** |
| **2** | Student cannot view other students' records | RLS policy denies cross-student SELECT queries; returns empty set | **VERIFIED** |
| **3** | Staff cannot freely browse all student profiles | `student_profiles` SELECT restricted to admins or assigned case officers | **VERIFIED** |
| **4** | Case-related student details disclosed on need-to-know | Incident student identity is unmasked only when officer claims case | **VERIFIED** |
| **5** | Authorized case reviewer access | Audit log records officer ID, timestamp, and incident accessed | **VERIFIED** |
| **6** | Access to sensitive details is audited | Every status change, assignment, and view logs to `audit_logs` | **VERIFIED** |
| **7** | Resolved cases retain access restrictions | Case remains private post-resolution; no public case archives | **VERIFIED** |
| **8** | Anonymous reporting protection | Student ID is decoupled or marked anonymous in public reports | **VERIFIED** |
| **9** | Evidence URLs are strictly private | Storage buckets `kavach-evidence` have private RLS policies | **VERIFIED** |
| **10**| Direct API calls cannot bypass restrictions | API routes re-verify JWT claims and user role server-side | **VERIFIED** |

---

## 2. Role-Based Access Control (RBAC) Matrix

| User Role | Can File Complaint | Can Trigger SOS | Can Start Safe Walk | Can View Assigned Incidents | Can View All Incidents | Can Approve Staff | Can Modify Geofence | Can View Audit Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Anonymous** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **STUDENT** | ✅ | ✅ | ✅ | ❌ (Own only) | ❌ | ❌ | ❌ | ❌ |
| **STAFF / MENTOR** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **SECURITY** | ❌ | ❌ | ❌ | ✅ | ✅ (Campus emergency) | ❌ | ❌ | ❌ |
| **COUNSELOR** | ❌ | ❌ | ❌ | ✅ (Counseling) | ❌ | ❌ | ❌ | ❌ |
| **MANAGEMENT** | ❌ | ❌ | ❌ | ✅ | ✅ (Aggregated/Review) | ❌ | ❌ | ❌ |
| **ADMIN** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SUPER_ADMIN** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Defense Against Direct API Bypass
- If a student makes a direct `GET` request using `curl` or Postman to `/api/incidents`:
  - The API verifies `supabase.auth.getUser()`.
  - The database RLS policy automatically appends `WHERE student_id = auth.uid()` to the query.
  - The student **only receives their own incidents** and cannot retrieve other students' data even if they know their UUIDs.
- If a student attempts to call `/api/admin/users/approve`:
  - The API checks `profiles.role`.
  - Because role is `STUDENT`, the API immediately rejects the request with `403 Forbidden`.
