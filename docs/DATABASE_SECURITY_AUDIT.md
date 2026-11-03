# KAVACH CAMPUS — DATABASE & RLS SECURITY AUDIT

**Date:** 2026-11-03  
**Auditor:** Database Administrator & Application Security Engineer  
**Database Platform:** Supabase (PostgreSQL 15+)  
**Row Level Security (RLS) Status:** Active across all primary tables.

---

## 1. Table-by-Table Policy & RLS Verification Matrix

| Table Name | RLS Active | Primary Key | Foreign Key Relations | Policy Coverage (SELECT / INSERT / UPDATE / DELETE) | Security Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `profiles` | **YES** | `id` (UUID) | `auth.users(id)` | Users view/edit own profile; Admins view all; cross-college filtered. | **PASS** |
| `student_profiles` | **YES** | `id` (UUID) | `profiles(id)` | Students manage own ID card; Staff view campus students; verified status protected. | **PASS** |
| `incidents` | **YES** | `id` (UUID) | `profiles(id)`, `colleges(id)` | Students view own; Assigned staff view assigned; Security views emergency alerts; Cross-college blocked. | **PASS** |
| `evidence` | **YES** | `id` (UUID) | `incidents(id)`, `profiles(id)` | Users view own uploaded evidence; Assigned responders & security view case evidence; Owner-only delete. | **PASS** |
| `incident_notes` | **YES** | `id` (UUID) | `incidents(id)`, `profiles(id)` | Staff add notes to assigned incidents; Students view public notes; Internal notes protected. | **PASS** |
| `incident_audit_logs` | **YES** | `id` (UUID) | `incidents(id)` | System append-only; Read restricted to Admins & Super Admins; Modifying/Deleting prohibited. | **PASS** |
| `safe_walk_sessions` | **YES** | `id` (UUID) | `profiles(id)` | Student manages own session; Staff/contacts view active session upon emergency timeout. | **PASS** |
| `trusted_contacts` | **YES** | `id` (UUID) | `profiles(id)` | Strict student-only CRUD on own emergency contacts. | **PASS** |
| `colleges` | **YES** | `id` (TEXT) | — | Public read for directory registration; Admin-only write/update. | **PASS** |

---

## 2. Cross-Institution & Privacy Protections

1. **Cross-College Data Isolation:**
   * Handled by RLS check: `user_college_id = record_college_id`.
   * Non-super-admin queries attempting to retrieve data across college boundaries return zero rows.
2. **Student Location Masking:**
   * In `/api/incidents/[id]/route.ts`, precise latitude and longitude coordinates are masked with `null` unless the requester is:
     * The student incident owner.
     * The assigned emergency responder.
     * An approved campus security officer.
     * A platform super administrator.
3. **Anonymous Incident Masking:**
   * When `is_anonymous` is true, the student UUID is stripped from API outputs, and personal fields are masked (`[PROTECTED ANONYMOUS REPORT]`).
4. **Storage Bucket Hardening:**
   * `kavach-evidence` is a private bucket.
   * Access requires short-lived (15-minute) signed URLs issued strictly by authenticated, authorized route handlers.
