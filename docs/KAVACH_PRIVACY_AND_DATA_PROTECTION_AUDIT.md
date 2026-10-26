# Kavach Campus — Student Privacy & Personal Data Protection Audit

**Date:** 2026-10-19  
**System:** Kavach Campus Institutional Safety Platform  
**Scope:** PII Protection, Telemetry Security, Evidence Privacy, and Least-Privilege Data Governance

---

## 1. Privacy Principles & Governance Framework

Student safety and data privacy are foundational to the Kavach Campus platform. Student personally identifiable information (PII), academic identifiers, incident testimony, uploaded media, and real-time geospatial telemetry are treated as strictly confidential.

| Data Asset | Sensitivity | Storage Location | Access Controls | Retention & Redaction Policy |
|---|:---:|---|---|---|
| **Student Name & Email** | HIGH | `profiles` | Own student + Staff assigned to active case + Admin | Stored securely; email never exposed in public lookups. |
| **Student ID Number** | HIGH | `student_profiles`, `profiles` | Own student + Admin/Security verification queue | 10-digit ID validated server-side; not indexed publicly. |
| **Academic Department & Batch** | MEDIUM | `student_profiles` | Own student + Academic admin | Used exclusively for peer routing and verification. |
| **Emergency Contacts** | HIGH | `trusted_contacts` | Own student only | Max 5 contacts; phone numbers masked in logs (`+91 *** 3210`). |
| **Uploaded ID Card Image** | CRITICAL | Private bucket `kavach-id-cards` | Own student + Authorized reviewer via 300s signed URL | Strictly private; never public; path isolated (`${uid}/*`). |
| **Incident Narrative & Category** | CRITICAL | `incidents` | Student complainant + Assigned responder + Admin | Anonymous reporting supported; protected by DB RLS. |
| **Incident Evidence Files** | CRITICAL | Private bucket `kavach-evidence` | Student complainant + Assigned responder + Security/Admin | Short-lived 900s signed URLs; direct object access denied. |
| **Live GPS Telemetry** | CRITICAL | `incident_locations`, `safe_walks` | Student + Assigned responder + Security coordinator | Requires explicit user initiation; terminated upon incident closure. |
| **Blood Group & Medical Flags** | HIGH | `student_profiles` | Voluntary donor search | Contact phone only revealed upon donor consent. |

---

## 2. Location Tracking & Geospatial Privacy

1. **Explicit Student Activation Required:**
   - Real-time GPS tracking is **NEVER** initiated in the background without user interaction.
   - GPS telemetry begins only upon active SOS trigger (`/api/sos`) or explicit Safe Walk initiation (`/api/safe-walk/start`).
2. **Safe Fallback When Location Denied:**
   - If a student denies browser geolocation permissions, the SOS emergency request still completes successfully without throwing an error. The incident is flagged with `location_accuracy = null` and auto-routed to security dispatch via campus broadcast.
3. **Tracking Termination:**
   - Once an SOS is deactivated or an incident is resolved/closed, `is_tracking_active` is set to `false`. Subsequent location updates are rejected with HTTP 400.
4. **Geospatial Telemetry Access Boundary:**
   - `GET /api/sos/location` permits telemetry reads only to:
     - The student who activated the SOS.
     - The specific responder assigned to the case (`incident.assigned_to = auth.uid()`).
     - Campus Security and Administrators.
     All other users receive HTTP 403 Forbidden.

---

## 3. Evidence Privacy & Secure Media Handling

1. **No Permanent Public URLs:**
   - All photos, audio recordings, video clips, and documents attached to incident reports are stored in private Supabase Storage buckets.
   - Public URLs (`/object/public/...`) return HTTP 400/404.
2. **Short-Lived Signed Tokens:**
   - All evidence downloads require the server to issue a signed URL with a maximum validity of 15 minutes (900 seconds).
   - Storage URLs are never persisted in public database columns.
3. **Cross-Student Isolation:**
   - Student A cannot download or view evidence uploaded by Student B.
   - An attacker attempting to query `/api/incidents/[id]/evidence` for another student's case receives HTTP 403 Forbidden.

---

## 4. Anonymity & PII Minimization in Logs

1. **Audit Logs:**
   - `audit_logs` record event actions (e.g. `SOS_ACTIVATED`, `STUDENT_VERIFICATION_DECISION`), actor UUIDs, and timestamps.
   - Sensitive fields such as passwords, OTP hashes, private medical details, and raw biometric tokens are strictly excluded from audit payloads.
2. **Notification Dispatch Logs:**
   - Phone numbers and recipient emails in server logs are masked:
     - `Recipient: a***@campus.edu`
     - `Recipient: +91 *** 3210`
3. **Anti-Enumeration Protections:**
   - `/api/auth/forgot-password` returns identical responses regardless of whether the email is registered in the database, preventing attackers from scraping registered student emails.
