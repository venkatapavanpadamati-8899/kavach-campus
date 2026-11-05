# KAVACH CAMPUS — PHASE 16: CRITICAL SAFETY RE-AUDIT DATA INVENTORY

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Database:** Supabase Cloud (`https://dvyiclyyvmsfipzrdowu.supabase.co`)  
**Audit Date:** November 4, 2026  
**Execution Mode:** READ-ONLY FORENSIC RE-AUDIT (ZERO MUTATIONS APPLIED)  
**Status:** **RE-AUDIT COMPLETE — PRESERVATION MANDATED FOR ALL SYSTEM RECORDS**

---

## 1. Executive Summary & Inventory Reconciliation

Following an in-depth security re-audit, the exact inventory of the remote Supabase database has been reconciled.

### Resolution of Table Count Discrepancy
- **PostgreSQL `auth` Schema:** Exactly **1 table** (`auth.users`, 8 user accounts).
- **PostgreSQL `public` Schema:** Exactly **19 tables** currently exist in the database.
- **Pending Migration Tables:** 3 tables (`safe_boxes`, `safe_box_private_notes`, `in_app_notifications`) defined in migrations 015 & 016 that have not yet been executed. (`staff_locations` from migration 011 was also not applied remotely).
- **Total Records in Database:** **678 records** (670 rows in `public` schema + 8 accounts in `auth.users`).

---

## 2. Table-by-Table Reconciled Inventory

| # | Schema | Table Name | Live Row Count | Schema Cache Status | Classification & Action Policy |
|---|--------|------------|----------------|---------------------|--------------------------------|
| 1 | `auth` | `users` | **8** | Active | 4 Protected Production Users, 2 Registered Users, 2 Test Runners — **PRESERVE ALL** |
| 2 | `public` | `profiles` | **6** | Active | 4 Protected, 2 Registered (nani@, pavan@) — **PRESERVE ALL** |
| 3 | `public` | `student_profiles` | **3** | Active | 2 Protected, 1 Active Review Profile (pavan@ with ID Card) — **PRESERVE ALL** |
| 4 | `public` | `staff_profiles` | **0** | Active | Clean production-ready state |
| 5 | `public` | `campus_zones` | **0** | Active | Clean production-ready state |
| 6 | `public` | `campus_buildings` | **0** | Active | Clean production-ready state |
| 7 | `public` | `incidents` | **40** | Active | 30 Confirmed Test Cases, 10 SOS Emergency Cases — **PRESERVE ALL** |
| 8 | `public` | `incident_locations` | **10** | Active | 10 Coordinates (Bhimavaram campus) linked to SOS incidents — **PRESERVE ALL** |
| 9 | `public` | `evidence` | **0** | Active | Clean production-ready state |
| 10 | `public` | `ai_analyses` | **0** | Active | Clean production-ready state |
| 11 | `public` | `escalations` | **29** | Active | 29 Case escalation logs linked to incidents — **PRESERVE ALL** |
| 12 | `public` | `incident_messages` | **0** | Active | Clean production-ready state |
| 13 | `public` | `case_actions` | **29** | Active | 29 Audit action trails on incidents — **PRESERVE ALL** |
| 14 | `public` | `notifications` | **38** | Active | 38 Historical notification records (Oct 3, 2026) — **PRESERVE ALL** |
| 15 | `public` | `safe_walks` | **0** | Active | Clean production-ready state |
| 16 | `public` | `trusted_contacts` | **0** | Active | Clean production-ready state |
| 17 | `public` | `user_otp_verifications` | **34** | Active | 34 Expired OTP attempts (31 test domain, 3 test runners) — **PRESERVE ALL** |
| 18 | `public` | `audit_logs` | **481** | Active | 465 Logins, 1 Migration Log, 5 ID Evaluations, 3 Verification Decisions, 7 Role Approvals — **STRICT PRESERVATION (DO NOT DELETE)** |
| 19 | `public` | `ai_configuration` | **0** | Active | Clean production-ready state |
| 20 | `public` | `emergency_configuration` | **0** | Active | Clean production-ready state |
| — | `public` | `safe_boxes` | — | Pending (015) | Table not yet created in remote DB |
| — | `public` | `safe_box_private_notes` | — | Pending (015/016) | Table not yet created in remote DB |
| — | `public` | `in_app_notifications` | — | Pending (016) | Table not yet created in remote DB |
| — | `public` | `staff_locations` | — | Pending (011) | Table not yet created in remote DB |

---

## 3. Storage Bucket Inventory

| Bucket Name | File Count / Folders | Key Contents | Status |
|---|---|---|---|
| `kavach-id-cards` | **5 folders** | Contains active student verification upload `686310c3-5245-4371-a271-aa01d70aeda4/1793082130328-DIV_4.pdf` (`pavan@gmail.com`) and 4 historical evaluation records (`108a013b...`, `8531a25e...`, `e7551acf...`, `fb59f105...`). | **PRESERVE (CRITICAL USER DATA)** |
| `kavach-evidence` | **0 files** | Clean production-ready bucket. | **PRESERVE** |

---

## 4. Comprehensive Inventory Conclusion

The remote database contains **670 rows** in the `public` schema across 19 tables, **8 user accounts** in `auth.users`, and **5 storage objects** in `kavach-id-cards`.

Zero deletions or data modifications have been applied.
