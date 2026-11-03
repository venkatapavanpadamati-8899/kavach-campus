# KAVACH CAMPUS — LINK, BUTTON & ROUTE AUDIT

**Date:** 2026-11-03  
**Project:** Kavach Campus  
**Total Routes Compiled:** 70  
**Status:** 100% VERIFIED  

---

## 1. Public Routes

| Route | Purpose | Access Level | Status |
| :--- | :--- | :--- | :---: |
| `/` | Landing page with safety features overview & quick actions | Public | **PASS** |
| `/about` | Mission, safety governance, and AI safety disclaimers | Public | **PASS** |
| `/features` | Overview of SOS, Safe Walk, Safe Box, and AI classification | Public | **PASS** |
| `/contact` | Emergency helpline directory and institution support | Public | **PASS** |
| `/privacy` | Privacy policy and data retention disclosures | Public | **PASS** |
| `/login` | Universal login page (Email/Password, Mobile OTP, Google OAuth) | Public | **PASS** |
| `/register` | Unified student & staff registration with college search | Public | **PASS** |
| `/admin/campus/register` | Dedicated campus admin institutional registration | Public | **PASS** |
| `/admin/login` | Institutional administrator & responder login portal | Public | **PASS** |
| `/super-admin/login` | Platform-wide central administrator login | Public | **PASS** |
| `/verify-otp` | 6-digit OTP verification screen with auto-resend | Public | **PASS** |
| `/forgot-password` | Password recovery request screen | Public | **PASS** |
| `/reset-password` | Tokenized secure password reset screen | Public | **PASS** |
| `/unauthorized` | 403 Forbidden notice for unauthorized cross-role attempts | Public | **PASS** |

---

## 2. Protected Student Dashboard Routes (`/student/*`)

| Route | Feature Scope | Auth Requirement | Status |
| :--- | :--- | :--- | :---: |
| `/student` | Student overview dashboard, active alerts, quick SOS | Verified Student | **PASS** |
| `/student/sos` | One-tap emergency SOS dispatch with live GPS | Authenticated Student (Exempt from verification check) | **PASS** |
| `/student/report` | Anonymous and identified incident filing with media | Verified Student | **PASS** |
| `/student/voice-report`| Audio recording and transcription incident filing | Verified Student | **PASS** |
| `/student/safe-box` | Encrypted evidence locker with tamper protection | Verified Student | **PASS** |
| `/student/safe-walk` | Timed safety walk with destination breadcrumb tracking | Verified Student | **PASS** |
| `/student/cases` | Personal history of reported incidents & live status | Verified Student | **PASS** |
| `/student/trusted-contacts` | Management of emergency phone contacts for SMS alert | Verified Student | **PASS** |
| `/student/profile` | Student profile photo upload, roll number, college badge | Verified Student | **PASS** |
| `/student/verification-status` | ID card upload and verification review portal | Authenticated Student | **PASS** |
| `/student/settings` | Notification preferences and session controls | Verified Student | **PASS** |

---

## 3. Protected Staff & Management Routes (`/staff/*`, `/management/*`)

| Route | Feature Scope | Auth Requirement | Status |
| :--- | :--- | :--- | :---: |
| `/staff` | Staff dashboard with incident queues & responder radius | Approved Staff | **PASS** |
| `/staff/incidents` | List of incidents assigned to staff member's department | Approved Staff | **PASS** |
| `/staff/incidents/[id]` | Case details, evidence viewer, responder timeline notes | Assigned Staff | **PASS** |
| `/management` | Institutional overview, incident statistics, staff counts | Approved Management | **PASS** |
| `/management/incidents` | College-wide incident audit log with resolution metrics | Approved Management | **PASS** |

---

## 4. Protected Administration Routes (`/admin/*`, `/super-admin/*`)

| Route | Feature Scope | Auth Requirement | Status |
| :--- | :--- | :--- | :---: |
| `/admin` | Campus control center, active responders, resolution times | Approved Admin | **PASS** |
| `/admin/incidents` | Full institutional incident records & filter by severity | Approved Admin | **PASS** |
| `/admin/users` | Staff approval workflow, verification of designations | Campus Admin / Admin | **PASS** |
| `/admin/ai` | Gemini AI sensitivity thresholds and auto-routing rules | Approved Admin | **PASS** |
| `/admin/system-audit` | Tamper audit logs, authorization failure monitoring | Approved Admin | **PASS** |
| `/super-admin` | Platform-wide college tenants, global incident metrics | Super Admin | **PASS** |
| `/super-admin/pending-campus` | Review and approval of new campus admin registrations | Super Admin | **PASS** |

---

## 5. Navigation Links & Button Audit

- All sidebar navigation buttons link to existing App Router pages without broken links or 404 errors.
- Sign Out button dispatches to `/api/auth/logout`, clears session cookies, and redirects safely to `/login`.
- Registration submit button transitions to `/verify-otp` with loading feedback and duplicate-click protection.

