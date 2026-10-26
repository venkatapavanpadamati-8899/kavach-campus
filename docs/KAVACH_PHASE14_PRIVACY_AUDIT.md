# KAVACH CAMPUS — PHASE 14: PRIVACY, AUDIT LOGS & DATA RETENTION AUDIT

**Project:** Kavach Campus — Safety in One Tap (`D:\Kavach Campus`)  
**Scope:** Privacy Boundaries, GPS Minimization, ID Card Protection, and Immutable Audit Trails  
**Date:** October 18, 2026

---

## 1. Student Privacy & Data Isolation Guarantees

| Category | Protection Mechanism | Verification Evidence | Posture |
| :--- | :--- | :--- | :---: |
| **Personal Profiles** | RLS: `auth.uid() = id` on `profiles` and `student_profiles` | Student A querying Student B returns 0 rows | ✅ **VERIFIED** |
| **GPS Breadcrumbs** | Case-bound RLS on `incident_locations` | Unassigned responders receive 0 rows | ✅ **VERIFIED** |
| **Incident Evidence** | Dual-path RLS on `evidence` and `kavach-evidence` | Unrelated callers receive 0 rows / 404 | ✅ **VERIFIED** |
| **Government/Student IDs** | Private bucket + RLS + 5-minute signed URLs | Direct public requests receive HTTP 404 | ✅ **VERIFIED** |
| **Emergency Contacts** | RLS: `auth.uid() = student_id` on `trusted_contacts` | Complete cross-student isolation | ✅ **VERIFIED** |
| **Medical / Blood Group** | Student profile isolation | Only visible to student and verified responder | ✅ **VERIFIED** |

---

## 2. Immutable Audit Logging Architecture
- **Table:** `public.audit_logs` (Columns: `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `ip_address`, `user_agent`, `created_at`).
- **Access Control:** `ENABLE ROW LEVEL SECURITY;` Default-deny on INSERT/UPDATE/DELETE for ordinary authenticated students.
- **Audit Coverage:**
  - `STUDENT_ID_VERIFICATION_EVALUATED`: Recorded whenever student credentials are submitted or reviewed.
  - `STAFF_APPROVAL_STATE_CHANGED`: Recorded when administrator approves or rejects staff registrations.
  - `INCIDENT_ESCALATED`: Recorded automatically when incident SLA breaches trigger escalation.
  - `SAFE_WALK_AUTO_ESCALATED`: Recorded when overdue journey triggers emergency SOS.
