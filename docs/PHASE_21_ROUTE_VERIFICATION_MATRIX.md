# KAVACH CAMPUS — PHASE 21 ROUTE VERIFICATION MATRIX

**Workspace:** `D:\kavach-campus`  
**Total Routes Discovered & Compiled:** 71 Routes (Next.js 16.4.3 Turbopack)  
**Live Testing Environment:** Port `3000` (`http://localhost:3000` & `http://192.168.1.7:3000`)  
**E2E Evidence:** Playwright Chrome Engine (`pages.spec.ts`, `api-live-runtime.spec.ts`, `protected-routes-auth-redirect.spec.ts`)  
**Date:** 2026-11-05  

---

## 1. Public & Authentication Pages (12 Routes)

| Route Path | HTTP Status | Auth Req | Role Req | Actual Result | Console Errors | Status |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: |
| `/` | 200 OK | None | Public | Hero, mascot, features, mobile hamburger | None | **PASS** |
| `/_not-found` | 404 | None | Public | 404 error page with Home recovery link | None | **PASS** |
| `/about` | 200 OK | None | Public | Safety mission and college partner charter | None | **PASS** |
| `/features` | 200 OK | None | Public | Complete platform capabilities breakdown | None | **PASS** |
| `/contact` | 200 OK | None | Public | Emergency hotline numbers & feedback form | None | **PASS** |
| `/privacy` | 200 OK | None | Public | Zero-knowledge audit & student data charter | None | **PASS** |
| `/login` | 200 OK | None | Public | Email/Password, Mobile OTP, Google OAuth | None | **PASS** |
| `/register` | 200 OK | None | Public | Registration with institutional domain check | None | **PASS** |
| `/forgot-password` | 200 OK | None | Public | Anti-enumeration password recovery dispatch | None | **PASS** |
| `/reset-password` | 200 OK | None | Public | Token-verified password reset interface | None | **PASS** |
| `/verify-otp` | 200 OK | None | Public | Multi-factor and mobile OTP verification | None | **PASS** |
| `/unauthorized` | 200 OK | None | Public | Access denied recovery screen | None | **PASS** |

---

## 2. Student Portal Routes (14 Routes)

| Route Path | HTTP Status | Auth Req | Role Req | Actual Result | Console Errors | Status |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: |
| `/student` | 200 (Authed) / 307 | Yes | STUDENT | Safety hub: SOS, Safe Walk card, stats | None | **PASS** |
| `/student/cases` | 200 (Authed) / 307 | Yes | STUDENT | Confidential student case list and history | None | **PASS** |
| `/student/contacts` | 200 (Authed) / 307 | Yes | STUDENT | Campus security numbers & police helplines | None | **PASS** |
| `/student/incidents` | 200 (Authed) / 307 | Yes | STUDENT | Detailed incident tracking ledger | None | **PASS** |
| `/student/incidents/[id]` | 200 (Authed) / 307 | Yes | STUDENT | Live case progression, responder notes | None | **PASS** |
| `/student/profile` | 200 (Authed) / 307 | Yes | STUDENT | Personal details, blood group, emergency info| None | **PASS** |
| `/student/report` | 200 (Authed) / 307 | Yes | STUDENT | Incident reporting form with file attachments | None | **PASS** |
| `/student/safe-box` | 200 (Authed) / 307 | Yes | STUDENT | Encrypted evidence vault & private notes | None | **PASS** |
| `/student/safe-walk` | 200 (Authed) / 307 | Yes | STUDENT | Real-time GPS companion tracking session | None | **PASS** |
| `/student/settings` | 200 (Authed) / 307 | Yes | STUDENT | Privacy preferences & notification toggles | None | **PASS** |
| `/student/sos` | 200 (Authed) / 307 | Yes | STUDENT | One-tap emergency SOS trigger with countdown | None | **PASS** |
| `/student/trusted-contacts`| 200 (Authed) / 307 | Yes | STUDENT | Emergency contact editor with priority tag | None | **PASS** |
| `/student/verification-status`| 200 (Authed) / 307| Yes| STUDENT | ID card upload progress & resubmission | None | **PASS** |
| `/student/voice-report` | 200 (Authed) / 307 | Yes | STUDENT | Audio recording and automated transcript | None | **PASS** |

---

## 3. Staff & Management Routes (7 Routes)

| Route Path | HTTP Status | Auth Req | Role Req | Actual Result | Console Errors | Status |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: |
| `/staff` | 200 (Authed) / 307 | Yes | STAFF | First responder queue & dispatch map | None | **PASS** |
| `/staff/incidents` | 200 (Authed) / 307 | Yes | STAFF | Case triage queue filtered by severity | None | **PASS** |
| `/staff/incidents/[id]` | 200 (Authed) / 307 | Yes | STAFF | Dispatch room: responder notes & actions | None | **PASS** |
| `/management` | 200 (Authed) / 307 | Yes | HOD/PRINCIPAL | Executive leadership campus safety dashboard | None | **PASS** |
| `/management/incidents` | 200 (Authed) / 307 | Yes | HOD/PRINCIPAL | Campus-wide incident monitoring ledger | None | **PASS** |
| `/management/incidents/[id]`| 200 (Authed) / 307| Yes | HOD/PRINCIPAL | Executive incident progression review | None | **PASS** |
| `/dashboard` | 307 Redirect | Yes | Authenticated | Dispatches user to their designated portal | None | **PASS** |

*Configured Next.js Redirects:*
* `/hod` -> Redirects to `/management` (Permanent: false) -> **PASS**
* `/principal` -> Redirects to `/management` (Permanent: false) -> **PASS**

---

## 4. Administrative & Super Admin Routes (10 Routes)

| Route Path | HTTP Status | Auth Req | Role Req | Actual Result | Console Errors | Status |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: |
| `/admin` | 200 (Authed) / 307 | Yes | ADMIN | Campus administrator command center | None | **PASS** |
| `/admin/login` | 200 OK | None | Public | Dedicated Campus Admin login portal | None | **PASS** |
| `/admin/ai` | 200 (Authed) / 307 | Yes | ADMIN | AI severity routing rules & keyword monitor | None | **PASS** |
| `/admin/campus` | 200 (Authed) / 307 | Yes | ADMIN | College geofences and emergency teams | None | **PASS** |
| `/admin/campus/register` | 200 OK | None | Public | New institutional tenant registration | None | **PASS** |
| `/admin/incidents` | 200 (Authed) / 307 | Yes | ADMIN | Comprehensive administrative incident ledger | None | **PASS** |
| `/admin/incidents/[id]` | 200 (Authed) / 307 | Yes | ADMIN | Detailed administrative incident management | None | **PASS** |
| `/admin/system-audit` | 200 (Authed) / 307 | Yes | ADMIN | Tamper-evident audit log ledger inspector | None | **PASS** |
| `/admin/users` | 200 (Authed) / 307 | Yes | ADMIN | User verification queue & role management | None | **PASS** |
| `/super-admin` | 200 (Authed) / 307 | Yes | SUPER_ADMIN | Multi-campus governance dashboard | None | **PASS** |
| `/super-admin/login` | 200 OK | None | Public | High-security Super Admin login portal | None | **PASS** |
| `/super-admin/pending-campus`| 200 (Authed) / 307| Yes | SUPER_ADMIN | Unaffiliated student approval queue | None | **PASS** |

---

## 5. Backend REST API Route Handlers (28 Handlers Verified Live)

* `/api/system/health` -> 401 unauthenticated; 200 with admin token -> **PASS**
* `/api/colleges/search` -> 200 returns active institutions (SRKR & Vishnu) -> **PASS**
* `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` -> **PASS**
* `/api/auth/mobile-login`, `/api/auth/verify-otp`, `/api/auth/resend-otp` -> **PASS**
* `/api/auth/demo-sms` -> Simulates SMS with ₹0 free notice -> **PASS**
* `/api/auth/forgot-password`, `/api/auth/reset-password` -> Anti-enumeration active -> **PASS**
* `/api/incidents`, `/api/incidents/[id]`, `/api/incidents/[id]/escalate`, `/api/incidents/[id]/notes`, `/api/incidents/[id]/evidence`, `/api/incidents/[id]/nearby-staff` -> Enforces 401 unauth -> **PASS**
* `/api/sos`, `/api/sos/location` -> Enforces 401 unauth & 60s cooldown -> **PASS**
* `/api/safe-walk/start`, `/api/safe-walk/location`, `/api/safe-walk/end` -> **PASS**
* `/api/cron/escalate`, `/api/cron/safe-walk-timeout` -> Enforces 401 without CRON_SECRET -> **PASS**
* `/api/student/blood-search`, `/api/student/profile`, `/api/student/trusted-contacts`, `/api/student/verify-id`, `/api/student/safe-box` -> **PASS**
* `/api/admin/analytics`, `/api/admin/users`, `/api/admin/users/approve`, `/api/admin/verifications` -> **PASS**
* `/api/super-admin/pending-campus` -> **PASS**

