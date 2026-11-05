# KAVACH CAMPUS — PHASE 16: CRITICAL SAFETY RE-AUDIT DATA CLASSIFICATION

**Project:** Kavach Campus (`D:\kavach-campus`)  
**Audit Date:** November 4, 2026  
**Document:** Forensic Record Classification & Preservation Policy

---

## 1. Forensic Incident Classification (40 Records Inspected Individually)

Every one of the 40 incidents in `public.incidents` was retrieved, individually analyzed against child tables, timestamps, and reporter metadata, and classified according to the four-tier security standard:

| Case ID | Timestamp | Category | Severity | Description | Child Records | Forensic Classification | Action Policy |
|---|---|---|---|---|---|---|---|
| `KC-2026-OAQOZ` | 2026-10-19T10:01:55Z | HARASSMENT | HIGH | "Testing harassment complaint" | None | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-30IRYV` | 2026-10-25T07:20:43Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `SOS-2026-K40L9H` | 2026-10-25T07:26:49Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-RF0LM` | 2026-10-25T07:31:08Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-1P3ZS1` | 2026-10-25T07:31:30Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-2L1Q6` | 2026-10-25T07:32:50Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-IV30CR` | 2026-10-25T07:33:30Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-AM2YV` | 2026-10-25T07:34:31Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-9T2XTE` | 2026-10-25T07:34:35Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-UHMJS` | 2026-10-25T07:35:32Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-6A8A0X` | 2026-10-25T07:35:36Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-B4Q0C` | 2026-10-25T07:39:06Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `KC-2026-413W4` | 2026-10-25T07:41:39Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `KC-2026-29GKH` | 2026-10-25T07:46:32Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-69FU5Q` | 2026-10-25T07:46:37Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-RO847` | 2026-10-25T07:47:23Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-TBD6PA` | 2026-10-25T07:47:27Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-35TDD` | 2026-10-25T07:51:17Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-9P9H8A` | 2026-10-25T07:51:21Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-RISCR` | 2026-10-25T07:52:19Z | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action | `CONFIRMED_TEST` | **PRESERVE** |
| `SOS-2026-D2N8Q7` | 2026-10-25T07:52:23Z | EMERGENCY | CRITICAL | "EMERGENCY SOS ACTIVATED" | 1 Location (16.5448, 81.5212) | `POSSIBLY_TEST` | **PRESERVE** |
| `KC-2026-YFFOV` to `KC-2026-LS0Z8` (19 cases) | 2026-10-25 to 2026-10-27 | SECURITY | MEDIUM | "Test suspicious activity near academic library block." | 1 Escalation, 1 Case Action each | `CONFIRMED_TEST` | **PRESERVE** |

### Incident Classification Summary
- **`CONFIRMED_TEST`:** 30 records
- **`POSSIBLY_TEST`:** 10 records (10 SOS emergency triggers with realistic GPS coordinates)
- **`GENUINE`:** 0 records with active verified student profiles
- **`UNKNOWN`:** 0 records
- **Final Decision:** **ALL 40 INCIDENTS ARE PRESERVED.** No records will be deleted, ensuring zero loss of case history, escalations, or emergency logs.

---

## 2. Audit Log Protection & Breakdown (481 Records)

A complete forensic query of all 481 audit logs revealed that `audit_logs` contains vital system accountability data that must **never** be deleted:

| Event Type / Action | Count | Significance & Risk of Deletion | Action Policy |
|---|---|---|---|
| `LOGIN` | **465** | Historical authentication session logs. Critical for intrusion detection and forensic timelines. | **STRICT RETENTION** |
| `SCHEMA_MIGRATION_009` | **1** | Permanent database proof of migration 009 execution. Deletion destroys database lineage. | **CRITICAL RETENTION** |
| `STUDENT_ID_VERIFICATION_EVALUATED` | **5** | Formal audit entries recorded by OCR and automated verification services during student onboarding. | **CRITICAL RETENTION** |
| `STUDENT_VERIFICATION_DECISION` | **3** | Institutional decisions on student acceptance/rejection. Essential for academic compliance. | **CRITICAL RETENTION** |
| `APPROVE_USER_ROLE` | **7** | Audit logs documenting administrator approvals of user roles. Crucial for RBAC governance. | **CRITICAL RETENTION** |

### Archival Recommendation (Instead of Deletion)
Under no circumstances should `audit_logs` be deleted via blanket SQL queries. If table size optimization is required in future releases:
1. Export logs older than 90 days to Supabase Storage cold archive JSON/CSV.
2. Transfer logs to a partitioned `audit_logs_archive` table with append-only permissions.
3. Keep current table active and untouched.

---

## 3. Ephemeral Verification Records (`user_otp_verifications` — 34 Records)

- **Total Inspected:** 34 records
- **Active Unexpired OTPs:** **0**
- **Expired Historical Attempts:** **34** (expired within 5 minutes of creation between Oct 19 and Nov 4, 2026).
- **Association:**
  - 31 records belong to synthetic test runner domains (`@kavachcampus.test`).
  - 1 record belongs to `@campus.edu`.
  - 2 records belong to Playwright test runs (`student.live.mw228ehb@srkr.edu.in`, `staff.asstprof.mw228ehb@srkr.edu.in`).
  - **Zero** records belong to protected owner or student accounts.
- **Safety Decision:** **PRESERVE ALL RECORDS.** No OTP records will be deleted. The table schema and verification pipeline remain active and unaffected.
- **Demo OTP Protection:** Mobile Demo OTP `123456`, `ENABLE_DEMO_OTP=true`, and `ENABLE_DEMO_SMS=true` are 100% preserved.

---

## 4. User Account Dependency Verification (4 Inspected Accounts)

| Email | User ID | Metadata & Profiles | Associated Assets | Forensic Verdict | Action |
|---|---|---|---|---|---|
| `pavan@gmail.com` | `686310c3-5245-4371-a271-aa01d70aeda4` | Role: STUDENT. Linked `profiles` and `student_profiles` exist. Status: `PENDING_MANUAL_REVIEW`. | **ID Card PDF in Storage:** `kavach-id-cards/686310c3-5245-4371-a271-aa01d70aeda4/1793082130328-DIV_4.pdf`. 2 Audit entries. | **ACTIVE VERIFICATION WORKFLOW WITH STORAGE ASSETS** | **PRESERVE** |
| `nani@gmail.com` | `00bdba57-dc00-4cdd-a1fc-3b6bfc9f29e4` | Role: STAFF. Phone: 9166358899. Linked `profiles` row exists. Last sign-in: 2026-10-27. | Profile record with campus verification state. | **REGISTERED STAFF RECORD** | **PRESERVE** |
| `staff.asstprof.mw228ehb@srkr.edu.in` | `61325648-0ce3-4cd5-bb71-8d773c27686e` | Role: STAFF. Created 2026-11-04. Unconfirmed auth user. | No linked profile. | **TEST RUNNER ACCOUNT** | **PRESERVE (NO DELETION)** |
| `student.live.mw228ehb@srkr.edu.in` | `d2913f09-193a-4288-b396-d44af63919e8` | Role: STUDENT. Created 2026-11-04. Unconfirmed auth user. | No linked profile. | **TEST RUNNER ACCOUNT** | **PRESERVE (NO DELETION)** |

**Conclusion:** Prior proposals to delete `pavan@gmail.com` and `nani@gmail.com` were hazardous. Deleting `pavan@gmail.com` would have destroyed an active verification workflow and orphaned an uploaded PDF document in object storage. All 4 accounts are strictly **PRESERVED**.
