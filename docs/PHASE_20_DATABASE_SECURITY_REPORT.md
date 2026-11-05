# KAVACH CAMPUS — PHASE 20 DATABASE SECURITY & RLS AUDIT REPORT

**Workspace:** `D:\kavach-campus`  
**Database Environment:** Isolated Local Supabase (`127.0.0.1:54322`)  
**Production Remote Database (`dvyiclyyvmsfipzrdowu`):** STRICTLY OUT OF SCOPE / UNMODIFIED  
**Date:** 2026-11-05  

---

## 1. Database Architecture & Schema Integrity

### 1.1 Table Inventory (21 Public Tables)
1. `public.profiles` — Core institutional profiles, roles, college ID, approval flags.
2. `public.student_profiles` — Admission type, student registration number, verification state.
3. `public.student_residences` — Hostel block, room number, or day-scholar commute path.
4. `public.colleges` — Institutional tenant configurations, geofences, domain mappings.
5. `public.incidents` — Incident records tagged with `college_id`, severity, category, status.
6. `public.incident_locations` — Coordinates, accuracy, timestamp of incident locations.
7. `public.incident_notes` — Internal confidential responder notes.
8. `public.incident_timeline` — Automated lifecycle transition audit entries.
9. `public.evidence` — Attachment metadata pointing to `kavach-evidence` bucket.
10. `public.safe_walks` — Safe walk route tracking sessions.
11. `public.safe_walk_locations` — Sequential GPS route waypoints.
12. `public.staff_locations` — On-duty responder GPS coordinates and consent flags.
13. `public.trusted_contacts` — Student emergency contacts for automated notifications.
14. `public.emergency_helplines` — Campus-specific emergency hotline telephone directory.
15. `public.notifications` — In-app notifications with delivery tracking.
16. `public.fcm_tokens` — Registered Firebase Cloud Messaging mobile device tokens.
17. `public.otp_verifications` — Temporary hashed verification codes.
18. `public.audit_logs` — Tamper-evident administrative audit ledger.
19. `public.safe_box_private_notes` — Student encrypted personal notes (`<= 2000` chars).
20. `public.safety_zones` — Campus safe zones, guard posts, and emergency booths.
21. `public.schema_migrations` — Migration tracking registry (001–018 applied locally).

### 1.2 Storage Buckets (3 Private Buckets)
* `kavach-evidence` — Incident media. 25 MB limit. Restricted to student owner and authorized campus responders.
* `kavach-id-cards` — Student institutional identity cards. Restricted to student owner and campus administrators.
* `kavach-profile-photos` — Student profile avatars. Restricted to student owner and campus administrators.

---

## 2. Row Level Security (RLS) Policy Remediation (Migration 018)

In Phase 15J/15K, forensic analysis discovered that PostgreSQL evaluates multiple `PERMISSIVE` RLS policies with logical `OR`. An un-scoped historical policy (`Authorized users can view incidents`) created in Migration 001 allowed any authenticated student from SRKR to view Vishnu student incidents.

### Remediation Applied (`018_legacy_rls_policy_remediation.sql`)
1. **Purged Legacy Permissive Leaks:**
   - Dropped `Authorized users can view incidents` on `public.incidents`.
   - Dropped legacy un-scoped location policies on `public.incident_locations`.
   - Dropped legacy un-scoped evidence policies on `public.evidence`.
   - Dropped legacy un-scoped profile policies on `public.student_profiles`.
   - Purged un-scoped read policies in `storage.objects`.
2. **Re-established Strict Tenant-Scoped Policies:**
   - Same-college student viewing of non-confidential incidents (`is_same_college_student()`).
   - Same-college staff responder incident handling (`is_campus_staff()`).
   - Confidential case privacy: Harassment and anonymous cases visible only to assigned specialist staff.

---

## 3. Real Authenticated RLS Testing Results (Phase 15K Verification)

32 empirical RLS tests were executed against local PostgreSQL using real signed JWT sessions across 9 distinct personas:

| Test Category | Target Table | Persona Tested | Expected Action | Result |
| :--- | :--- | :--- | :--- | :---: |
| **Cross-College Student Isolation** | `incidents` | SRKR Student vs Vishnu Incident | SELECT | **✅ BLOCKED (0 Rows)** |
| **Cross-College Student Isolation** | `incidents` | Vishnu Student vs SRKR Incident | SELECT | **✅ BLOCKED (0 Rows)** |
| **Cross-College Staff Isolation** | `incidents` | SRKR Staff vs Vishnu Incident | SELECT | **✅ BLOCKED (0 Rows)** |
| **Cross-College Staff Isolation** | `incidents` | Vishnu Staff vs SRKR Incident | SELECT | **✅ BLOCKED (0 Rows)** |
| **Same-College Staff Access** | `incidents` | SRKR Staff vs SRKR Incident | SELECT | **✅ ALLOWED** |
| **Same-College Staff Access** | `incidents` | Vishnu Staff vs Vishnu Incident | SELECT | **✅ ALLOWED** |
| **Student Safe Box Privacy** | `safe_box_private_notes`| Student A vs Student B Notes | SELECT | **✅ BLOCKED (0 Rows)** |
| **Student Safe Box Privacy** | `safe_box_private_notes`| Student vs Own Private Note | SELECT | **✅ ALLOWED** |
| **Staff Safe Box Denial** | `safe_box_private_notes`| Campus Staff vs Student Note | SELECT | **✅ BLOCKED (0 Rows)** |
| **Admin Safe Box Denial** | `safe_box_private_notes`| College Admin vs Student Note| SELECT | **✅ BLOCKED (0 Rows)** |
| **Super Admin Cross-Tenant** | `incidents` | Super Admin vs All Incidents | SELECT | **✅ ALLOWED** |
| **Cross-College Evidence Storage**| `kavach-evidence` | Student vs Other College Object| SELECT | **✅ BLOCKED (0 Rows)** |

**Total RLS Empirical Assertions:** **32/32 PASSED (100%)**

---

## 4. Data Preservation Reconciliation

* Initial Baseline Accounts: 8 accounts preserved (0 modified destructively).
* Initial Incidents: 40 incidents preserved (0 deleted).
* Audit Logs: 481 logs preserved (0 deleted).
* OTP Verifications: 34 records preserved (0 deleted).
* **Verdict:** Phase 16 Data Cleanup remains **PERMANENTLY CLOSED**. Zero data loss occurred.

