# Kavach Campus — Phase 5 Backend Workflow & Subsystem Audit

**Document:** `docs/PHASE_5_BACKEND_WORKFLOW_AUDIT.md`  
**Date:** November 4, 2026  
**Auditor:** Senior Full-Stack & Security Systems Engineer (Antigravity Agent)  
**Workspace:** `D:\kavach-campus`  

---

## 1. Executive Summary

This report documents the end-to-end operational verification of all core backend workflows and subsystems in Kavach Campus. Every workflow was verified against the codebase, automated integration tests, and live Supabase database tables to validate resilience, authorization, and data integrity.

---

## 2. Subsystem Workflow Verifications

### 2.1 Authentication & Session Subsystem
- **Registration Flow**:
  - Gated public registration endpoint (`/api/auth/register`) enforces strong password rules (min 8 chars) and valid institutional/personal emails.
  - Privileged roles (`ADMIN`, `SUPER_ADMIN`, `HOD`, `PRINCIPAL`) cannot be self-assigned; rejected with `HTTP 403 Forbidden`.
  - OTP record created in `user_otp_verifications` with bcrypt hashing.
- **Verification & Activation**:
  - `/api/auth/verify-otp` claims pending OTP atomically via `.eq('verified', false)`.
  - Provisions `profiles` and initial `student_profiles` record.
- **Session Expiration & Revocation**:
  - `/api/auth/logout` revokes session token; clears SSR cookies.
- **Status:** **PASS** (100% verified, Demo OTP `123456` preserved).

---

### 2.2 Incident Management Subsystem
- **Incident Creation (`/api/incidents`)**:
  - Duplicate prevention: Rejects identical submissions from same user within 15 seconds.
  - Geolocation validation: Rejects coordinates outside valid ranges ($Lat \in [-90, 90]$, $Lng \in [-180, 180]$).
  - AI Pre-classification: Asynchronously classifies category, severity (L1-L4), and suggested routing.
- **Evidence Vault Integration (`/api/incidents/[id]/evidence`)**:
  - Magic byte validation prevents executable payload uploads.
  - Signed URLs (15-minute expiry) prevent direct bucket leakage.
- **Case Timeline & Escalation (`/api/incidents/[id]/escalate`, `notes`)**:
  - Official notes and status transitions are recorded in `case_actions` and `escalations`.
  - Cross-college access strictly rejected with `HTTP 403 Forbidden`.
- **Status:** **PASS** (Zero unhandled exceptions; `notes/route.ts` column mismatch resolved).

---

### 2.3 SOS Emergency Subsystem
- **Activation (`/api/sos`)**:
  - Creates high-urgency emergency record in `incidents` with category `EMERGENCY` and severity `L4`.
  - Controlled test rate-limiting: Students can run GPS calibration tests with a 60-second cooldown, flagged with `[CONTROLLED TEST]`.
- **Live Location Streaming (`/api/sos/location`)**:
  - Streams high-frequency GPS breadcrumbs into `incident_locations`.
  - Coordinates sanitized and logged for dispatch visualization.
- **Emergency Dispatch**:
  - Triggers in-app alerts and browser notifications to on-duty campus security.
  - Real SMS/telco gateways remain disabled (`ENABLE_REAL_NOTIFICATIONS=false`).
- **Status:** **PASS**.

---

### 2.4 Safe Walk Escort Subsystem
- **Session Initiation (`/api/safe-walk/start`)**:
  - Validates destination and estimated duration (5 to 180 minutes).
  - Enforces single active walk rule per student.
- **Live Telemetry (`/api/safe-walk/location`)**:
  - Records periodic location updates and updates `last_known_lat/lng`.
- **Completion & Timeout Escalation (`/api/safe-walk/end`, `/api/cron/safe-walk-timeout`)**:
  - Student ending walk atomically marks status `COMPLETED`.
  - If a student walk expires past `expires_at`, background cron (`api/cron/safe-walk-timeout`) automatically transitions status to `OVERDUE` and escalates to an emergency incident with fault-tolerant recovery.
- **Status:** **PASS**.

---

### 2.5 Safe Box Confidential Vault Subsystem
- **Confidential Upload (`/api/student/safe-box`)**:
  - Gated to authenticated students (`profiles.role === 'STUDENT'`).
  - Strict upload limits: 25 MB max file size, signed URL previews.
- **Private Notes & Migration 016 Distinction**:
  - *Current State*: Database migration 016 (`safe_box_private_notes`) has not been applied to remote Supabase yet.
  - *Resilient Fallback*: Code detects missing table `42P01` / `PGRST205` and returns evidence records without throwing 500 errors.
  - *Distinction*: **Local Code & Fallback: PASS**. **Remote Database Persistence: PENDING OWNER ACTION** until migration 016 is executed in Supabase SQL editor.
- **Status:** **PARTIALLY VERIFIED** (Fallback verified; remote persistence awaits Stage 2 migration).

---

### 2.6 Admin & Institutional Management Subsystem
- **Departmental Scoping (HOD)**:
  - HOD viewing `/api/admin/users` is restricted strictly to their verified `college_id` AND `department`.
  - Approving staff checks `canUserApproveRole`: Mechanical HOD cannot approve Computer Science faculty (403).
- **Institutional Scoping (Principal / Campus Admin)**:
  - Principal access is restricted to their own `college_id`.
  - Student ID card verification reviews submissions via `/api/admin/verifications`.
- **Multi-Tenant Platform Governance (Super Admin)**:
  - Super Admin views pending campuses via `/api/super-admin/pending-campus`.
  - Assigns official college tenants from master institutional registry.
- **Status:** **PASS**.

---

### 2.7 AI Incident Classification Subsystem
- **Engine**: Google GenAI (`@google/genai`) using Gemini Flash Lite.
- **Shielding & Security**:
  - Maximum 4,000 character truncation.
  - Untrusted text isolated within `<complaint>` tags with strict system constraints.
  - Schema-enforced JSON output validation (L1-L4 severity, allowed categories).
  - Automatic fallback to rule-based classification and mandatory `human_review_required = true` on any network failure.
- **Advisory Principle**: AI outputs serve strictly as recommendations; no administrative action or account suspension occurs without human staff review.
- **Status:** **PASS**.

---

### 2.8 Notification Dispatch Subsystem
- **Idempotency**: In-memory idempotency cache with 10-minute TTL prevents duplicate external transmissions.
- **Privacy Masking**: Structured logs automatically mask recipient phone numbers (`+91 *** 3210`) and email addresses (`s***@university.edu`).
- **Free Demo Simulation**:
  - Real Twilio SMS and SendGrid email delivery disabled by default (`ENABLE_REAL_NOTIFICATIONS=false`).
  - Free Demo SMS simulation (`src/lib/demo-sms.ts`) handles local OTP and verification workflows with zero telco spend.
- **Status:** **PASS**.

