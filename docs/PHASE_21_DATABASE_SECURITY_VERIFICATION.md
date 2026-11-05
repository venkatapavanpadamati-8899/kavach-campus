# KAVACH CAMPUS — PHASE 21 DATABASE SECURITY & RLS REPORT

**Workspace:** `D:\kavach-campus`  
**Database Environment:** Isolated Local Supabase (`127.0.0.1:54322`)  
**Production Remote Database (`dvyiclyyvmsfipzrdowu`):** STRICTLY OUT OF SCOPE / UNMODIFIED  
**Date:** 2026-11-05  

---

## 1. Schema & Security Architecture Verification (Local Probe Evidence)

Direct PostgreSQL probe (`node scripts/phase21_db_probe.js`) verified:
* **Public Tables (21 Tables):** `ai_analyses`, `ai_configuration`, `audit_logs`, `campus_buildings`, `campus_zones`, `case_actions`, `emergency_configuration`, `escalations`, `evidence`, `incident_locations`, `incident_messages`, `incidents`, `notifications`, `profiles`, `safe_box_private_notes`, `safe_walks`, `staff_locations`, `staff_profiles`, `student_profiles`, `trusted_contacts`, `user_otp_verifications`.
* **Public RLS Policies:** **32 Active Policies**.
* **Legacy Permissive Leak Policies:** **0 (Zero)**. Verified that the historical un-scoped policy `Authorized users can view incidents` was dropped by Migration 018.
* **Storage Buckets (3 Buckets):**
  - `kavach-id-cards` (public: false)
  - `kavach-evidence` (public: false)
  - `kavach-profile-photos` (public: false)

---

## 2. Authenticated RLS Testing Results (Phase 15K Script Evidence)

Executed `npx tsx scripts/run_phase15k_authenticated_tests.ts` using real signed JWT sessions across 9 distinct personas:

| Test Assertion | Persona | Target Table / Bucket | Result |
| :--- | :--- | :--- | :---: |
| **1.1 Student A reads own incident** | Student A (SRKR) | `public.incidents` | **✅ PASS (1 row)** |
| **1.2 Peer Student B blocked from Student A incident** | Student B (SRKR) | `public.incidents` | **✅ PASS (0 rows)** |
| **1.3 Peer Student B blocked from updating Student A** | Student B (SRKR) | `public.incidents` | **✅ PASS (0 rows)** |
| **1.4 College B staff blocked from College A incident** | Staff B (VITB) | `public.incidents` | **✅ PASS (0 rows)** |
| **1.5 College A staff blocked from College B incident** | Staff A (SRKR) | `public.incidents` | **✅ PASS (0 rows)** |
| **1.6 Same-College staff reads same-college incident** | Staff A (SRKR) | `public.incidents` | **✅ PASS (1 row)** |
| **2.1 Student A reads own incident GPS location** | Student A (SRKR) | `public.incident_locations`| **✅ PASS (1 row)** |
| **2.2 Peer Student B blocked from incident GPS** | Student B (SRKR) | `public.incident_locations`| **✅ PASS (0 rows)** |
| **2.3 Cross-College staff blocked from incident GPS** | Staff B (VITB) | `public.incident_locations`| **✅ PASS (0 rows)** |
| **2.4 Same-College staff reads incident GPS** | Staff A (SRKR) | `public.incident_locations`| **✅ PASS (1 row)** |
| **3.1 Student A reads own evidence metadata** | Student A (SRKR) | `public.evidence` | **✅ PASS (1 row)** |
| **3.2 Peer Student B blocked from evidence metadata** | Student B (SRKR) | `public.evidence` | **✅ PASS (0 rows)** |
| **3.3 Cross-College staff blocked from evidence** | Staff B (VITB) | `public.evidence` | **✅ PASS (0 rows)** |
| **3.4 Cross-College staff blocked from evidence file** | Staff B (VITB) | `storage.objects` (`kavach-evidence`)| **✅ PASS (0 rows)** |
| **3.5 Same-College staff reads evidence file** | Staff A (SRKR) | `storage.objects` (`kavach-evidence`)| **✅ PASS (1 row)** |
| **4.1 Student A reads own student profile** | Student A (SRKR) | `public.student_profiles` | **✅ PASS (1 row)** |
| **4.2 Peer Student B blocked from student profile** | Student B (SRKR) | `public.student_profiles` | **✅ PASS (0 rows)** |
| **4.3 Cross-College staff blocked from student profile**| Staff B (VITB) | `public.student_profiles` | **✅ PASS (0 rows)** |
| **4.4 Same-College staff reads student profile** | Staff A (SRKR) | `public.student_profiles` | **✅ PASS (1 row)** |
| **5.1 Student A reads own Safe Box private note** | Student A (SRKR) | `public.safe_box_private_notes` | **✅ PASS (1 row)** |
| **5.2 Peer Student B blocked from Safe Box note** | Student B (SRKR) | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |
| **5.3 Campus Staff blocked from Safe Box note** | Staff A (SRKR) | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |
| **5.4 HOD blocked from Safe Box note** | HOD A (SRKR) | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |
| **5.5 Principal blocked from Safe Box note** | Principal A (SRKR) | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |
| **5.6 Campus Admin blocked from Safe Box note** | Admin A (SRKR) | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |
| **5.7 Peer Student B blocked from updating Safe Box** | Student B (SRKR) | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |
| **6.1 Campus Admin A blocked from College B student**| Admin A (SRKR) | `public.student_profiles` | **✅ PASS (0 rows)** |
| **6.2 Super Admin can oversee multi-college incidents**| Super Admin | `public.incidents` | **✅ PASS (2 rows)** |
| **7.1 Anonymous user blocked from incidents** | Anonymous | `public.incidents` | **✅ PASS (0 rows)** |
| **7.2 Anonymous user blocked from profiles** | Anonymous | `public.profiles` | **✅ PASS (0 rows)** |
| **7.3 Anonymous user blocked from evidence** | Anonymous | `public.evidence` | **✅ PASS (0 rows)** |
| **7.4 Anonymous user blocked from Safe Box** | Anonymous | `public.safe_box_private_notes` | **✅ PASS (0 rows)** |

**Total Empirical RLS Assertions:** **32/32 PASSED (100%)**

---

## 3. Data Preservation Audit

* `public.profiles`: 7 accounts intact (0 modified destructively).
* `public.incidents`: 2 records intact.
* `public.audit_logs`: 10 entries intact.
* **Verdict:** Phase 16 Data Cleanup remains **PERMANENTLY CLOSED**. Zero data loss occurred.

