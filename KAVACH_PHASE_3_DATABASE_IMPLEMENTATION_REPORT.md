# KAVACH CAMPUS — PHASE 3 DATABASE IMPLEMENTATION REPORT

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Engine:** Supabase PostgreSQL with PostGIS  
**Status:** SCHEMA AUDITED & VERIFIED  

---

## 1. Core Database Tables & Constraints Verification

| Table Name | Primary Key | Foreign Key Relations | Tenant Scoping Column | Key Constraints & Indexes | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `profiles` | `id (UUID)` | `auth.users(id)` | `college_id (TEXT)` | Role check enum, student_id index, college index | **VERIFIED** |
| `student_profiles` | `id (UUID)` | `profiles(id)` | `college_id (TEXT)` | Verification status enum (`PENDING`, `VERIFIED`, `REJECTED`) | **VERIFIED** |
| `staff_profiles` | `id (UUID)` | `profiles(id)` | `college_id (TEXT)` | Designation text, department, employee ID | **VERIFIED** |
| `colleges` | `id (TEXT)` | Independent | `id` (Tenant Key) | Unique code, name, city, state, pincode | **VERIFIED** |
| `incidents` | `id (UUID)` | `student_id -> profiles(id)` | `college_id (TEXT)` | PostGIS point geometry, severity enum, status enum | **VERIFIED** |
| `incident_notes` | `id (UUID)` | `incident_id`, `author_id` | Derived from incident | Author check, creation timestamp | **VERIFIED** |
| `evidence` | `id (UUID)` | `uploaded_by -> profiles(id)`| Derived from incident | Storage path, mime-type check, sha256 hash | **VERIFIED** |
| `safe_walks` | `id (UUID)` | `student_id -> profiles(id)` | `college_id (TEXT)` | Start/end times, ETA check, auto-SOS flag | **VERIFIED** |
| `safe_box_private_notes`| `evidence_id (UUID)`| `evidence(id)`, `profiles(id)` | User owner scope | Length check <= 2000 chars, owner foreign key | **PREPARED (016)** |
| `trusted_contacts` | `id (UUID)` | `student_id -> profiles(id)` | User owner scope | 10-digit phone check, priority order | **VERIFIED** |
| `audit_logs` | `id (UUID)` | `actor_id -> profiles(id)` | `college_id (TEXT)` | Action text, payload JSONB, immutable created_at | **VERIFIED** |

---

## 2. Integrity & Referential Safety
- Cascading deletes (`ON DELETE CASCADE`) are strictly scoped to user child records (such as trusted contacts or private notes) while incident evidence and audit logs are preserved for legal and safety compliance.
- No orphan foreign keys detected across schema definitions.

