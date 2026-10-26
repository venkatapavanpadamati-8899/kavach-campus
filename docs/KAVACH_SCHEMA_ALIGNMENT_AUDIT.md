# 🛡️ KAVACH CAMPUS — APPLICATION CODE VS. REMOTE DATABASE SCHEMA ALIGNMENT AUDIT

**Project Root:** `D:\Kavach Campus`  
**Endpoint:** `https://polbnvszmvblwenfnqll.supabase.co`  
**Audit Mechanism:** Live Network Field Probing via `@supabase/supabase-js` API & Static TypeScript Query Inspection  
**Alignment Verdict:** `SCHEMA GAPS IDENTIFIED ON REMOTE DATABASE` (Resolved locally in codebase; Pending execution of Migration 008)

---

## 1. Table-by-Table Alignment Audit Matrix

| Table Name | Application Code Usage | Remote DB Existence | Column Alignment Status | Classification |
| :--- | :--- | :---: | :--- | :---: |
| **`profiles`** | Auth, RBAC, User Profiles, Guards | ✅ Present (200 OK) | Columns aligned (`id`, `full_name`, `college_email`, `role`, `is_approved`, `student_id`, `department`, `is_active`) | `CONFIRMED ALIGNED` |
| **`student_profiles`** | Student ID Verification & Details | ✅ Present (200 OK) | ⚠️ Missing: `admission_type`, `admission_year`, `expected_graduation_year`, `id_card_url`, `verification_status`, `verified_at`, `verified_by`, `verification_notes`, `ocr_extracted_data` | `CONFIRMED MISMATCH` |
| **`staff_profiles`** | Guard & Responder Directory | ✅ Present (200 OK) | Columns aligned (`id`, `user_id`, `shift_start`, `shift_end`, `assigned_zone_id`) | `CONFIRMED ALIGNED` |
| **`incidents`** | SOS & Incident Tracking | ✅ Present (200 OK) | Columns aligned (`id`, `case_id`, `student_id`, `category`, `type`, `severity`, `urgency`, `status`, `assigned_to`, `latitude`, `longitude`, `location_accuracy`, `campus_zone_id`) | `CONFIRMED ALIGNED` |
| **`incident_locations`** | Real-time GPS Breadcrumbs | ✅ Present (200 OK) | Columns aligned (`id`, `incident_id`, `latitude`, `longitude`, `accuracy`, `recorded_at`) | `CONFIRMED ALIGNED` |
| **`evidence`** | Incident Evidence Files | ✅ Present (200 OK) | Columns aligned (`id`, `incident_id`, `file_url`, `file_type`, `uploaded_by`) | `CONFIRMED ALIGNED` |
| **`ai_analyses`** | Gemini AI Severity Triage | ✅ Present (200 OK) | Columns aligned (`id`, `incident_id`, `category`, `severity`, `urgency`, `summary`, `actionable_steps`, `raw_response`) | `CONFIRMED ALIGNED` |
| **`escalations`** | Auto-escalation Workflow | ✅ Present (200 OK) | Columns aligned (`id`, `incident_id`, `from_level`, `to_level`, `reason`, `escalated_at`, `notes`) | `CONFIRMED ALIGNED` |
| **`notifications`** | In-App PostgreSQL Alerts | ✅ Present (200 OK) | Columns aligned (`id`, `user_id`, `incident_id`, `title`, `message`, `type`, `is_read`, `created_at`) | `CONFIRMED ALIGNED` |
| **`safe_walks`** | Safe Walk & Auto-SOS Timer | ✅ Present (200 OK) | ⚠️ Missing: `expires_at`, `auto_sos_enabled`, `auto_sos_timeout_mins`, `start_latitude`, `start_longitude`, `last_latitude`, `last_longitude`, `last_location_at`, `escalation_incident_id`, `created_at`, `updated_at` | `CONFIRMED MISMATCH` |
| **`trusted_contacts`** | Emergency Contacts | ✅ Present (200 OK) | Columns aligned (`id`, `student_id`, `name`, `phone`, `relationship`, `is_verified`) | `CONFIRMED ALIGNED` |
| **`audit_logs`** | Security Audit Trail | ✅ Present (200 OK) | Columns aligned (`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`) | `CONFIRMED ALIGNED` |
| **`campus_zones`** | Geofence Boundary Definitions | ✅ Present (200 OK) | Columns aligned (`id`, `name`, `code`, `boundary_polygon`) | `CONFIRMED ALIGNED` |
| **`campus_buildings`** | Building Locations | ✅ Present (200 OK) | Columns aligned (`id`, `name`, `code`, `zone_id`, `latitude`, `longitude`) | `CONFIRMED ALIGNED` |
| **`emergency_configuration`** | Emergency Settings | ✅ Present (200 OK) | Columns aligned (`id`, `key`, `value`) | `CONFIRMED ALIGNED` |
| **`ai_configuration`** | AI Prompt & Model Settings | ✅ Present (200 OK) | Columns aligned (`id`, `key`, `value`) | `CONFIRMED ALIGNED` |
| **`user_otp_verifications`** | Registration OTP Storage | ✅ Present (200 OK) | Columns aligned (`email`, `otp_hash`, `expires_at`, `registration_data`) | `CONFIRMED ALIGNED` |

---

## 2. In-Depth Focus on Critical Column Gaps

### A. `safe_walks` Table
- **`expires_at`**: `CONFIRMED MISSING` on remote DB. (App requires it in `/api/safe-walk/start` and `/api/cron/safe-walk-timeout`).
- **`auto_sos_enabled`**: `CONFIRMED MISSING` on remote DB. (App requires it for automated incident creation).
- **`last_latitude` / `last_longitude`**: `CONFIRMED MISSING` on remote DB. (App requires it for tracking breadcrumbs).
- **`start_latitude` / `start_longitude`**: `CONFIRMED MISSING` on remote DB.
- **`completed_at`**: `CONFIRMED PRESENT` on remote DB (from early schema patch).
- **`escalation_incident_id`**: `CONFIRMED MISSING` on remote DB.
- **Impact:** Until Migration 008 adds these columns, `/api/safe-walk/start` and active tracking return PostgreSQL error `42703 (column does not exist)`. (Cron has been enhanced to return `status: SCHEMA_PENDING` safely).

### B. `student_profiles` Table
- **`admission_type`**: `CONFIRMED MISSING` on remote DB. (App requires it for Regular 4-year vs Lateral Entry 3-year logic).
- **`admission_year`**: `CONFIRMED MISSING` on remote DB.
- **`expected_graduation_year`**: `CONFIRMED MISSING` on remote DB.
- **`id_card_url`**: `CONFIRMED MISSING` on remote DB.
- **`verification_status`**: `CONFIRMED MISSING` on remote DB.
- **`ocr_extracted_data`**: `CONFIRMED MISSING` on remote DB.
- **`verified_at` / `verified_by` / `verification_notes`**: `CONFIRMED MISSING` on remote DB.
- **Impact:** Until Migration 008 adds these columns, student ID card upload at `/api/student/verify-id` fails on upsert.

### C. Storage Buckets (`storage.buckets`)
- **`kavach-evidence`**: `CONFIRMED MISSING` (`NoSuchBucket` HTTP 404 from Supabase Storage API).
- **`kavach-id-cards`**: `CONFIRMED MISSING` (`NoSuchBucket` HTTP 404 from Supabase Storage API).
- **Impact:** Storage uploads fail until Migration 008 executes `INSERT INTO storage.buckets ...` in SQL editor.

---

## 3. Resolution Blueprint

All confirmed mismatches are explicitly addressed in:
📁 `supabase/migrations/008_kavach_campus_complete_production_alignment.sql`

Executing this single migration in the Supabase Dashboard SQL Editor will transition all `CONFIRMED MISMATCH` entries to `CONFIRMED ALIGNED` without disturbing any existing tables or rows.
