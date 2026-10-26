# KAVACH CAMPUS — FINAL MANUAL TEST CHECKLIST

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Purpose:** Comprehensive guide for manual verification of critical flows in Staging and Pre-production environments before lifting the release hold.

---

## 1. Authentication & Session Security Checklist

| Check # | Test Scenario | Procedure | Expected Result | Result |
|:---:|:---|:---|:---|:---:|
| **AUTH-01** | **New Student Registration** | Fill `/register` with `@campus.edu` email, username, mobile, and password. | Account created in `pending_verification` state. OTP sent. | [ ] |
| **AUTH-02** | **Demo OTP in Development** | On `/verify-otp`, enter `123456` with test student account in local dev. | Verification succeeds. Account transitions to `active`. | [ ] |
| **AUTH-03** | **Demo OTP in Production** | Set `NODE_ENV=production` or test on production URL using `123456`. | Verification is **REJECTED** with "Invalid or expired OTP". | [ ] |
| **AUTH-04** | **Demo OTP Privileged Account Block** | Attempt to verify an `ADMIN` or `SECURITY` account with `123456` in local dev. | Verification is **DENIED**. Privileged accounts must use real email OTP. | [ ] |
| **AUTH-05** | **Invalid OTP Attempt Limit** | Enter incorrect OTP 5 consecutive times on `/verify-otp`. | Account locks verification for cooldown period (15 minutes). | [ ] |
| **AUTH-06** | **Google OAuth One-Tap** | Click "Continue with Google" on `/login`. | Completes OAuth round-trip, creates student profile, redirects to `/student/dashboard`. | [ ] |
| **AUTH-07** | **Forgot Password Recovery** | Submit valid campus email on `/forgot-password`. Enter OTP on `/reset-password`. | Password is reset. Previous sessions invalidated. Login with new password works. | [ ] |
| **AUTH-08** | **Session Logout & Back-Button** | Click "Logout" from student dashboard. Press browser "Back" button. | Redirects immediately to `/login`. No cached protected profile data visible. | [ ] |

---

## 2. Geolocation & Emergency SOS Checklist

| Check # | Test Scenario | Procedure | Expected Result | Result |
|:---:|:---|:---|:---|:---:|
| **SOS-01** | **One-Tap Emergency SOS** | Log in as Student. Click the big red "SOS" button on `/student/sos`. | Emergency incident created with `severity: CRITICAL` in <50ms. Incident ID returned. | [ ] |
| **SOS-02** | **GPS Coordinate Capture** | Allow browser geolocation when triggering SOS. | Incident record contains exact `latitude`, `longitude`, and `accuracy`. | [ ] |
| **SOS-03** | **Indoor / Denied GPS Fallback** | Deny browser geolocation permission and trigger SOS. | Incident is created without crashing; assigns `campus_zone: UNKNOWN_CAMPUS_ZONE`. | [ ] |
| **SOS-04** | **Nearby Staff Assignment** | Log in as `SECURITY` staff with active location near the student. | Staff dashboard (`/staff/dashboard`) displays incoming critical SOS alert within 5s. | [ ] |
| **SOS-05** | **Staff Distance Calculation** | Verify incident card on staff dashboard. | Displays accurate straight-line distance (in meters/km) to the student. | [ ] |
| **SOS-06** | **Gemini AI Decoupling** | Disable internet connection to Gemini or set bad API key. Trigger SOS. | SOS succeeds immediately. Emergency persistence does not block on AI. | [ ] |

---

## 3. Safe Walk System Checklist

| Check # | Test Scenario | Procedure | Expected Result | Result |
|:---:|:---|:---|:---|:---:|
| **WALK-01** | **Start Safe Walk** | Select destination and estimated duration (e.g., 10 mins) on `/student/safe-walk`. | Active Safe Walk session started. Countdown timer begins. | [ ] |
| **WALK-02** | **Heartbeat Keep-Alive** | Allow periodic heartbeat location updates while walking. | Location history updates in database every 60 seconds. | [ ] |
| **WALK-03** | **Normal Safe Arrival** | Click "I Have Arrived Safely" before timer expires. | Session status changes to `COMPLETED`. No alerts triggered. | [ ] |
| **WALK-04** | **Timeout Escalation** | Let countdown timer reach zero without checking in. | System automatically escalates session to a `CRITICAL` incident; notifies security staff. | [ ] |

---

## 4. Role-Based Access Control (RBAC) & Storage Checklist

| Check # | Test Scenario | Procedure | Expected Result | Result |
|:---:|:---|:---|:---|:---:|
| **RBAC-01** | **Cross-Student Incident Isolation** | Student A logs in and navigates to `/student/incidents/{student_B_incident_id}`. | Returns HTTP 403 / 404. Student A cannot view Student B's incident details. | [ ] |
| **RBAC-02** | **Student Access to Admin Portal** | Log in as Student. Attempt to directly load `/admin/dashboard`. | Middleware blocks access and redirects to `/student/dashboard`. | [ ] |
| **RBAC-03** | **Unapproved Staff Portal Block** | Log in as newly registered Staff whose `is_approved = false`. | Redirects to `/pending-approval`. Cannot view incidents or campus map. | [ ] |
| **STOR-01** | **Private Evidence Storage** | Upload photo evidence on `/student/report`. Try opening raw storage URL in incognito. | Access denied (403 Forbidden). File only accessible via short-lived signed URL. | [ ] |
| **STOR-02** | **Storage Path Traversal Defense** | Attempt to upload to a path outside the authenticated user's UUID prefix. | Supabase storage RLS policy rejects the upload. | [ ] |

---

## 5. Production Sign-Off Signature

Once all checks above have been performed on the staging environment:

- **Staging Verification Date:** ____________________
- **Verified By (Lead Security Engineer):** ____________________
- **Authorized For Production Release:** [ ] YES  /  [ ] NO
