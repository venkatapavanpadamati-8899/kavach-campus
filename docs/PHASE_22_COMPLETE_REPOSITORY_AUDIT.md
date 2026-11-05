# Phase 22: Complete Repository Inventory & Architecture Audit

**Phase:** 22A — Complete Repository Inventory  
**Date:** 2026-11-05T11:27:00+05:30  
**Workspace:** `D:\kavach-campus`  
**Framework:** Next.js 16.4.3 (Turbopack), React 19.3.0, TypeScript 6.0.3  
**Database:** Local Supabase Docker PostgreSQL (127.0.0.1:54322)  
**Status:** PASS — Complete Inventory Verified

---

## 1. Repository Inventory & Route Breakdown

An exhaustive file-system inspection of `src/app` discovered a total of **81 distinct application routes**:
* **44 Page Routes (`page.tsx`)**
* **37 API Route Handlers (`route.ts`)**

### 1.1. Complete 44 Pages Inventory

| Route Path | File Location | Auth Required | Target Role | Database / Storage Dependencies | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `/` | `src/app/page.tsx` | Public | All | Colleges metadata, branding | ✅ Verified |
| `/about` | `src/app/about/page.tsx` | Public | All | None (Static) | ✅ Verified |
| `/features` | `src/app/features/page.tsx` | Public | All | None (Static) | ✅ Verified |
| `/contact` | `src/app/contact/page.tsx` | Public | All | None (Static) | ✅ Verified |
| `/privacy` | `src/app/privacy/page.tsx` | Public | All | None (Static) | ✅ Verified |
| `/login` | `src/app/login/page.tsx` | Public | All | GoTrue Auth, OTP | ✅ Verified |
| `/register` | `src/app/register/page.tsx` | Public | All | `colleges`, `profiles`, `student_profiles` | ✅ Verified |
| `/verify-otp` | `src/app/verify-otp/page.tsx` | Public | All | `user_otp_verifications` | ✅ Verified |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Public | All | `profiles`, `user_otp_verifications` | ✅ Verified |
| `/reset-password` | `src/app/reset-password/page.tsx` | Public | All | GoTrue Auth, `profiles` | ✅ Verified |
| `/unauthorized` | `src/app/unauthorized/page.tsx` | Public | All | None | ✅ Verified |
| `/dashboard` | `src/app/dashboard/page.tsx` | Authenticated | Redirect | Reads role from session | ✅ Verified |
| `/student` | `src/app/student/page.tsx` | Authenticated | STUDENT | `incidents`, `student_profiles` | ✅ Verified |
| `/student/cases` | `src/app/student/cases/page.tsx` | Authenticated | STUDENT | `incidents`, `evidence` | ✅ Verified |
| `/student/contacts`| `src/app/student/contacts/page.tsx` | Authenticated | STUDENT | `trusted_contacts`, `colleges` | ✅ Verified |
| `/student/incidents`| `src/app/student/incidents/page.tsx` | Authenticated | STUDENT | `incidents` | ✅ Verified |
| `/student/incidents/[id]`| `src/app/student/incidents/[id]/page.tsx`| Authenticated | STUDENT | `incidents`, `case_actions`, `evidence` | ✅ Verified |
| `/student/profile` | `src/app/student/profile/page.tsx` | Authenticated | STUDENT | `profiles`, `student_profiles` | ✅ Verified |
| `/student/report` | `src/app/student/report/page.tsx` | Authenticated | STUDENT | `incidents`, `evidence`, `campus_zones` | ✅ Verified |
| `/student/safe-box`| `src/app/student/safe-box/page.tsx` | Authenticated | STUDENT | `safe_box_private_notes` | ✅ Verified |
| `/student/safe-walk`| `src/app/student/safe-walk/page.tsx`| Authenticated | STUDENT | `safe_walks`, `campus_zones` | ✅ Verified |
| `/student/settings`| `src/app/student/settings/page.tsx`| Authenticated | STUDENT | `profiles`, `trusted_contacts` | ✅ Verified |
| `/student/sos` | `src/app/student/sos/page.tsx` | Authenticated | STUDENT | `incidents`, `incident_locations` | ✅ Verified |
| `/student/trusted-contacts`| `src/app/student/trusted-contacts/page.tsx`| Authenticated | STUDENT | `trusted_contacts` | ✅ Verified |
| `/student/verification-status`| `src/app/student/verification-status/page.tsx`| Authenticated | STUDENT | `student_profiles`, `kavach-id-cards` | ✅ Verified |
| `/student/voice-report`| `src/app/student/voice-report/page.tsx`| Authenticated | STUDENT | Gemini AI, `incidents` | ✅ Verified |
| `/staff` | `src/app/staff/page.tsx` | Authenticated | STAFF | `incidents`, `staff_profiles` | ✅ Verified |
| `/staff/incidents` | `src/app/staff/incidents/page.tsx` | Authenticated | STAFF | `incidents`, `incident_locations` | ✅ Verified |
| `/staff/incidents/[id]`| `src/app/staff/incidents/[id]/page.tsx`| Authenticated | STAFF | `incidents`, `case_actions`, `evidence` | ✅ Verified |
| `/management` | `src/app/management/page.tsx` | Authenticated | HOD / PRINCIPAL | `incidents`, `audit_logs` | ✅ Verified |
| `/management/incidents`| `src/app/management/incidents/page.tsx`| Authenticated | HOD / PRINCIPAL | `incidents`, `escalations` | ✅ Verified |
| `/management/incidents/[id]`| `src/app/management/incidents/[id]/page.tsx`| Authenticated | HOD / PRINCIPAL | `incidents`, `audit_logs` | ✅ Verified |
| `/admin` | `src/app/admin/page.tsx` | Authenticated | CAMPUS_ADMIN | `profiles`, `incidents`, `audit_logs` | ✅ Verified |
| `/admin/ai` | `src/app/admin/ai/page.tsx` | Authenticated | CAMPUS_ADMIN | `ai_configuration` | ✅ Verified |
| `/admin/campus` | `src/app/admin/campus/page.tsx` | Authenticated | CAMPUS_ADMIN | `campus_buildings`, `campus_zones` | ✅ Verified |
| `/admin/campus/register`| `src/app/admin/campus/register/page.tsx`| Public | All | Colleges registration queue | ✅ Verified |
| `/admin/incidents` | `src/app/admin/incidents/page.tsx` | Authenticated | CAMPUS_ADMIN | `incidents`, `escalations` | ✅ Verified |
| `/admin/incidents/[id]`| `src/app/admin/incidents/[id]/page.tsx`| Authenticated | CAMPUS_ADMIN | `incidents`, `audit_logs`, `evidence` | ✅ Verified |
| `/admin/login` | `src/app/admin/login/page.tsx` | Public | All | Admin GoTrue Auth | ✅ Verified |
| `/admin/system-audit`| `src/app/admin/system-audit/page.tsx`| Authenticated | CAMPUS_ADMIN | `audit_logs` | ✅ Verified |
| `/admin/users` | `src/app/admin/users/page.tsx` | Authenticated | CAMPUS_ADMIN | `profiles`, `student_profiles` | ✅ Verified |
| `/super-admin` | `src/app/super-admin/page.tsx` | Authenticated | SUPER_ADMIN | Global cross-college oversight | ✅ Verified |
| `/super-admin/login`| `src/app/super-admin/login/page.tsx`| Public | All | Super Admin Auth | ✅ Verified |
| `/super-admin/pending-campus`| `src/app/super-admin/pending-campus/page.tsx`| Authenticated | SUPER_ADMIN | Global college approvals | ✅ Verified |

---

### 1.2. Complete 37 API Endpoints Inventory

| Endpoint | File Location | Methods | Authentication | Description |
| :--- | :--- | :---: | :---: | :--- |
| `/api/admin/analytics` | `src/app/api/admin/analytics/route.ts` | GET | CAMPUS_ADMIN | Campus safety metrics & graphs |
| `/api/admin/users` | `src/app/api/admin/users/route.ts` | GET, PATCH | CAMPUS_ADMIN | User list & role management |
| `/api/admin/users/approve` | `src/app/api/admin/users/approve/route.ts` | POST | CAMPUS_ADMIN | Student approval workflow |
| `/api/admin/verifications` | `src/app/api/admin/verifications/route.ts` | GET, POST | CAMPUS_ADMIN | Student ID verification queue |
| `/api/auth/callback` | `src/app/api/auth/callback/route.ts` | GET | Public | OAuth code exchange & session setup |
| `/api/auth/demo-sms` | `src/app/api/auth/demo-sms/route.ts` | GET, POST | Public | ₹0 simulated SMS dispatch & inbox |
| `/api/auth/forgot-password`| `src/app/api/auth/forgot-password/route.ts`| POST | Public | Anti-enumeration password reset OTP |
| `/api/auth/google` | `src/app/api/auth/google/route.ts` | GET, POST | Public | Google OAuth PKCE initiation & ID token exchange |
| `/api/auth/login` | `src/app/api/auth/login/route.ts` | POST | Public | Email & password login |
| `/api/auth/logout` | `src/app/api/auth/logout/route.ts` | POST | Authenticated | Secure session invalidation |
| `/api/auth/mobile-login` | `src/app/api/auth/mobile-login/route.ts` | POST | Public | Mobile OTP dispatch & verification |
| `/api/auth/register` | `src/app/api/auth/register/route.ts` | POST | Public | Student/Staff registration |
| `/api/auth/resend-otp` | `src/app/api/auth/resend-otp/route.ts` | POST | Public | Rate-limited OTP resend |
| `/api/auth/reset-password` | `src/app/api/auth/reset-password/route.ts` | POST | Public | Password update with verified reset token |
| `/api/auth/verify-otp` | `src/app/api/auth/verify-otp/route.ts` | POST | Public | Mobile / Email OTP verification |
| `/api/colleges/search` | `src/app/api/colleges/search/route.ts` | GET | Public | Search verified partner institutions |
| `/api/cron/escalate` | `src/app/api/cron/escalate/route.ts` | POST, GET | Bearer Secret | SLA-based incident escalation |
| `/api/cron/safe-walk-timeout`| `src/app/api/cron/safe-walk-timeout/route.ts`| POST, GET | Bearer Secret | Automatic Safe Walk expiration monitor |
| `/api/incidents` | `src/app/api/incidents/route.ts` | GET, POST | Authenticated | Incident listing & reporting |
| `/api/incidents/[id]` | `src/app/api/incidents/[id]/route.ts` | GET, PATCH | Authenticated | Incident details & status transitions |
| `/api/incidents/[id]/escalate`| `src/app/api/incidents/[id]/escalate/route.ts`| POST | Authenticated | Manual escalation to HOD/Principal |
| `/api/incidents/[id]/evidence`| `src/app/api/incidents/[id]/evidence/route.ts`| GET, POST | Authenticated | File attachment & evidence management |
| `/api/incidents/[id]/nearby-staff`| `src/app/api/incidents/[id]/nearby-staff/route.ts`| GET | Authenticated | GPS proximity staff triage |
| `/api/incidents/[id]/notes`| `src/app/api/incidents/[id]/notes/route.ts` | GET, POST | Authenticated | Internal staff notes & resolution history |
| `/api/notifications/test-push`| `src/app/api/notifications/test-push/route.ts`| POST | CAMPUS_ADMIN | Test push notification dispatch |
| `/api/safe-walk/end` | `src/app/api/safe-walk/end/route.ts` | POST | STUDENT | End active Safe Walk session |
| `/api/safe-walk/location`| `src/app/api/safe-walk/location/route.ts` | POST | STUDENT | Live GPS heartbeat update |
| `/api/safe-walk/start` | `src/app/api/safe-walk/start/route.ts` | POST | STUDENT | Start Safe Walk with timer |
| `/api/sos` | `src/app/api/sos/route.ts` | POST | STUDENT | Instant emergency alert trigger |
| `/api/sos/location` | `src/app/api/sos/location/route.ts` | POST | STUDENT | Live SOS tracking GPS breadcrumbs |
| `/api/student/blood-search`| `src/app/api/student/blood-search/route.ts`| GET | Authenticated | Emergency blood donor search |
| `/api/student/profile` | `src/app/api/student/profile/route.ts` | GET, PATCH | STUDENT | Student profile retrieval & update |
| `/api/student/safe-box` | `src/app/api/student/safe-box/route.ts` | GET, POST, DELETE| STUDENT | Encrypted private personal notes locker |
| `/api/student/trusted-contacts`| `src/app/api/student/trusted-contacts/route.ts`| GET, POST, DELETE| STUDENT | Emergency SOS contact list |
| `/api/student/verify-id`| `src/app/api/student/verify-id/route.ts` | POST | STUDENT | Student college ID upload for verification |
| `/api/super-admin/pending-campus`| `src/app/api/super-admin/pending-campus/route.ts`| GET, POST | SUPER_ADMIN | Multi-college provisioning & approval |
| `/api/system/health` | `src/app/api/system/health/route.ts` | GET | CAMPUS_ADMIN | Database latency & subsystem health check |

