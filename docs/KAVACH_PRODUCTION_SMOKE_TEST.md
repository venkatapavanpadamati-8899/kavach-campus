# KAVACH CAMPUS — PRODUCTION SMOKE-TEST CHECKLIST & PROTOCOL

**Protocol Version:** 1.0.0  
**Environment:** Post-Deployment Staging / Production Smoke Testing  
**Tester Role:** QA Auditor / System Administrator  
**Safety Mandate:** Use synthetic demo accounts ONLY (e.g., `smoke.student@campus.edu`). Never use real student identities or trigger actual emergency services during smoke tests.

---

## 1. SMOKE-TEST EXECUTION PROTOCOL

| Step # | Verification Item | Test Action | Expected Result | Pass Criteria |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **System Health Probe** | `GET /api/system/health` via browser or curl | Returns HTTP 200 with `status: "healthy"`, DB status `PASS` | `status: "healthy"` |
| **02** | **Student Registration** | Register synthetic student `smoke.student@campus.edu` with phone `+919999900001` | Account created; verification prompt displayed | HTTP 200 / Redirect |
| **03** | **Phone OTP Verification** | Submit verification OTP | Phone status verified; JWT session cookie established | Cookie `sb-access-token` set |
| **04** | **Student Dashboard Access** | Navigate to `/student` | Dashboard loads with student name, zero errors | HTTP 200, clean UI |
| **05** | **File Complaint (Harassment)** | Submit complaint at `/student/report` with description and synthetic GPS | Case created with tracking ID (e.g., `KC-2026-XXXXX`) | Status `RECEIVED` |
| **06** | **AI / Fallback Urgency** | Check incident record in staff view | AI or fallback classifies category & assigns initial priority | Priority `HIGH` or `CRITICAL` |
| **07** | **Evidence Attachment** | Upload synthetic test image (`test_evidence.png`, < 2MB) | File uploaded to private bucket; signed URL generated | Signed URL accessible |
| **08** | **Student A/B Isolation** | Log in as Student B; attempt `GET /api/incidents/[idA]` | Request rejected; Student A's case details hidden | **HTTP 404 Not Found** |
| **09** | **Cross-Student File Access** | Student B attempts to access Student A's storage object URL | Access denied by Supabase Storage RLS | HTTP 403 / Access Denied |
| **10** | **Staff Case Review** | Log in as Staff (`staff.review@campus.edu`); open `/staff/incidents` | Assigned case visible; staff can review evidence | Case details displayed |
| **11** | **Status Transition** | Staff changes status: `RECEIVED` -> `ACKNOWLEDGED` -> `IN_PROGRESS` | Case status updates; audit log entry recorded | Audit log updated |
| **12** | **Unauthorized Status Change** | Student attempts `PATCH /api/incidents/[id]` to set `RESOLVED` | Request rejected; only authorized staff may transition status | **HTTP 403 Forbidden** |
| **13** | **Safe Walk Simulation** | Student starts 15-minute Safe Walk with destination | Session saved in `safe_walks` table; active timer starts | Active walk UI shown |
| **14** | **SOS Emergency Trigger** | Trigger SOS via `/student/sos` (in safe staging mode) | SOS incident created; responders notified in dashboard | Status `RECEIVED` |
| **15** | **Mobile Responsive Audit** | Open application in Chrome DevTools Device Mode (iPhone 14 / Pixel 7) | Bottom navigation visible; no horizontal scroll or layout break | 100% responsive |
| **16** | **Session Termination** | Click **Logout** (`POST /api/auth/logout`) | Cookies purged; protected route redirects to `/login` | Redirect to `/login` |
| **17** | **Test Data Cleanup** | Delete synthetic test incident and user via admin panel or cleanup script | Zero orphaned records left in database or storage buckets | Database clean |

---

## 2. REAL-DEVICE MOBILE AUDIT CHECKLIST

When testing on an actual physical Android or iOS device:

- [ ] **HTTPS Verification:** Browser displays lock icon (Valid TLS certificate).
- [ ] **Location Permission Dialog:** Browser prompts *"kavach.college.edu wants to know your location"*.
- [ ] **Permission Denied Test:** Clicking "Block" allows user to submit report with manual landmark entry without crashing.
- [ ] **Camera / Gallery Attachment:** Mobile file picker allows photo/document selection directly from device storage.
- [ ] **Touch Target Sizing:** Emergency SOS and report buttons are easily tappable (min 48x48px).

---

## 3. INCIDENT ESCALATION & CRON SMOKE TEST

Run a manual authorization test against the cron endpoint:

```bash
# 1. Unauthenticated call (must be rejected)
curl -X GET "https://kavach.college.edu/api/cron/escalate"
# Expected: HTTP 401 Unauthorized

# 2. Authenticated call with correct secret
curl -X GET "https://kavach.college.edu/api/cron/escalate" \
  -H "Authorization: Bearer <CRON_SECRET>"
# Expected: HTTP 200 OK with {"success":true,"escalated":N}
```
