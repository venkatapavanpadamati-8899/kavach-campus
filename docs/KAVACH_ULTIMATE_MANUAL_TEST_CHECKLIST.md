# KAVACH CAMPUS — ULTIMATE MANUAL TEST CHECKLIST

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Purpose:** Pre-deployment manual verification matrix for staging and pre-production testing.

---

## 1. Authentication & Session Verification

| ID | Test Scenario | Steps | Expected Result | Verified |
|:---:|:---|:---|:---|:---:|
| **AUTH-01** | **Student Registration** | Navigate to `/register`. Submit valid `@campus.edu` email and password. | Account created in `pending_verification` state. OTP sent. | [ ] |
| **AUTH-02** | **Demo OTP in Development** | Enter `123456` on `/verify-otp` in local development. | Account verified successfully. Status set to `active`. | [ ] |
| **AUTH-03** | **Demo OTP in Production** | Enter `123456` with `NODE_ENV=production` active. | Server returns `400 Bad Request` ("Invalid or expired OTP"). | [ ] |
| **AUTH-04** | **Demo OTP Admin Block** | Attempt to verify an `ADMIN` account with `123456`. | Verification is **DENIED**. Admin must use real email OTP. | [ ] |
| **AUTH-05** | **Google OAuth Sign-In** | Click "Continue with Google" on `/login`. | Completes OAuth callback and provisions student dashboard. | [ ] |
| **AUTH-06** | **Forgot & Reset Password**| Submit email on `/forgot-password`. Enter OTP on `/reset-password`. | Password updated. Old sessions revoked. | [ ] |
| **AUTH-07** | **Logout Session Revocation**| Click "Logout" and click browser "Back" button. | Redirects immediately to `/login`. No cached data shown. | [ ] |

---

## 2. Emergency SOS & Staff Proximity

| ID | Test Scenario | Steps | Expected Result | Verified |
|:---:|:---|:---|:---|:---:|
| **SOS-01** | **One-Tap SOS Trigger** | Tap emergency SOS button on `/student/sos`. | Incident created with `severity: CRITICAL` in sub-50ms. | [ ] |
| **SOS-02** | **GPS Proximity Matching** | Allow browser geolocation when triggering SOS. | Incident assigned to nearest 5 active security guards. | [ ] |
| **SOS-03** | **Indoor / No-GPS Fallback**| Deny browser geolocation and trigger SOS. | Incident assigned to `UNKNOWN_CAMPUS_ZONE` broadcast. | [ ] |
| **SOS-04** | **Gemini AI Decoupling** | Trigger SOS with simulated AI API failure. | SOS persists immediately without delay. | [ ] |
| **SOS-05** | **Guard Incident Dispatch** | Log in as Security Guard. Check `/staff/dashboard`. | Incoming emergency alert displayed within 5 seconds. | [ ] |

---

## 3. Safe Walk System

| ID | Test Scenario | Steps | Expected Result | Verified |
|:---:|:---|:---|:---|:---:|
| **WALK-01** | **Start Safe Walk** | Select destination and start journey on `/student/safe-walk`. | Journey marked `ACTIVE`. Countdown timer initiates. | [ ] |
| **WALK-02** | **Location Heartbeat** | Move across campus while journey is active. | Location history updates in `safe_walk_locations` every 60s. | [ ] |
| **WALK-03** | **Arrived Safely** | Click "I Have Arrived Safely" before timer expires. | Status set to `COMPLETED`. No alarm triggered. | [ ] |
| **WALK-04** | **Timeout Escalation** | Let timer expire without checking in. | Automatically creates `CRITICAL` incident for security. | [ ] |

---

## 4. RBAC & Data Privacy

| ID | Test Scenario | Steps | Expected Result | Verified |
|:---:|:---|:---|:---|:---:|
| **RBAC-01** | **Cross-Student Isolation** | Student A visits `/student/incidents/{student_B_id}`. | HTTP 403 / 404. Student A cannot view Student B's data. | [ ] |
| **RBAC-02** | **Student Access to Admin** | Logged-in student navigates to `/admin/dashboard`. | Proxy middleware redirects immediately to `/student/dashboard`.| [ ] |
| **STOR-01** | **Private Evidence Bucket** | Try accessing an uploaded evidence URL in an incognito window. | HTTP 403 Forbidden. File only accessible via signed URL. | [ ] |
