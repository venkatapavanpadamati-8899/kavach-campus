# KAVACH CAMPUS — PROJECT DISCOVERY REPORT
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer, Security & QA Specialist  
**Repository:** `D:\kavach-campus`  
**Framework:** Next.js 16.4.3 (App Router, Turbopack) / React 19 / TypeScript 5 / Supabase / PostgreSQL  

---

## 1. Project Inventory & Directory Structure

```text
D:\kavach-campus
├── src/
│   ├── app/                          # 71 Application routes & API endpoints
│   │   ├── (auth)/                   # login, register, verify-otp, forgot-password, reset-password
│   │   ├── admin/                    # Admin portal (dashboard, incidents, users, AI config, audit)
│   │   ├── api/                      # 38 Serverless API routes (RESTful backend)
│   │   ├── management/               # HOD & Principal management dashboard
│   │   ├── staff/                    # Staff responder triage & investigation console
│   │   ├── student/                  # Student portal (SOS, safe walk, safe box, report, cases, profile)
│   │   ├── super-admin/              # Super Admin root oversight dashboard
│   │   └── dashboard/                # Central role-based router
│   ├── components/                   # UI components, layouts, safety characters
│   ├── lib/                          # Core business logic, RBAC, routing, SMS/Email/AI adapters
│   └── __tests__/                    # 60 test suites (779 automated vitest unit & integration tests)
├── supabase/
│   └── migrations/                   # 18 schema migrations (001 - 017)
├── public/                           # Static assets, branding logos, icons
└── docs/                             # Engineering audit and verification reports
```

---

## 2. Existing Features (Audited & Operational)

1. **Authentication & Multi-Tenant Routing:**
   - Registration with institutional email domain auto-resolution (`@srkr.edu.in`, `@srkrec.ac.in`, etc.).
   - Secure server-side OTP generation, rate limiting (60s resend cooldown), 5-minute expiry.
   - Demo OTP and Demo SMS simulation (`₹0` developer mode) for friction-free local QA.
   - Central role-based redirect router (`/dashboard` routes to `/student`, `/staff`, `/management`, `/admin`, `/super-admin`).
   - Anti-enumeration protection across login and password recovery endpoints.

2. **Staff Hierarchy & 16-Designation Catalog:**
   - Multi-category staff role selection (Academic Faculty, Student Affairs & Welfare, Administrative & Operational, Campus Security & Safety).
   - Dynamic search and fuzzy alias resolution for designations.
   - Prevention of self-assigned privileged administrative roles (`ADMIN`, `SUPER_ADMIN`, `PRINCIPAL`, `HOD`).
   - Staff accounts default to unapproved (`is_approved = false`) until multi-tier review.

3. **Multi-Tier Institutional Approvals:**
   - **HOD Approval:** Restricted strictly to matching college and matching academic department (`CROSS_DEPARTMENT_APPROVAL_FORBIDDEN`).
   - **Principal / Campus Admin Approval:** Scoped to all staff across the institution.
   - **Super Admin Approval:** Global authority to approve Institutional Leadership (Principals, Deans, Campus Admins).
   - Atomic self-approval prevention (`user.id === targetUserId` blocked with `403`).

4. **Emergency SOS & Responder Routing:**
   - Single-tap panic trigger capturing GPS coordinates, campus zone, and accuracy radius.
   - Indian national emergency integration (112 dialing link where applicable).
   - Haversine distance-based responder ranking with coordinate freshness TTL.
   - Automatic severity classification (CRITICAL, HIGH, MEDIUM, LOW).

5. **Safe Walk System:**
   - Departure and destination tracking with live breadcrumbs.
   - Configurable session timer with automated check-in reminders.
   - Automated SOS escalation on expired sessions via `/api/cron/safe-walk-timeout`.

6. **Student Privacy & ID Verification:**
   - OCR and fuzzy text-match verification for student ID cards.
   - Storage in private buckets (`kavach-id-cards`, `kavach-evidence`) with signed URL access.
   - Cross-student and cross-college Row Level Security isolation.

---

## 3. Discovered Defects & Verified Resolutions

During discovery, five runtime and schema discrepancies were identified and immediately remediated:

| Defect ID | Component | Root Cause | Remediation Applied |
| :--- | :--- | :--- | :--- |
| **DEF-01** | `src/app/admin/page.tsx` | Querying non-existent column `staff_profiles.is_on_duty` | Replaced with `profiles` query filtering active security and staff roles |
| **DEF-02** | `src/app/management/page.tsx` | Querying non-existent column `staff_profiles.is_on_duty` | Replaced with `profiles` query filtered by `college_id` and active staff roles |
| **DEF-03** | `src/app/dashboard/page.tsx` | Fixed array whitelist missing new catalog designations, sending staff to `/student` | Replaced with `isManagementRole()` and `isStaffRole()` helpers |
| **DEF-04** | `src/lib/staff-roles.ts` | `canUserApproveRole` whitelist did not include dynamic catalog roles | Added `isStaffRole(targetRole)` fallback check |
| **DEF-05** | `src/app/api/auth/register/route.ts` | `allowedStaffRoles` whitelist omitted catalog designations | Added `isStaffRole(role)` check to retain staff designation requests |

---

## 4. Database & External Service Dependencies

### Database Dependencies (Supabase / PostgreSQL)
- **19 Required Tables:** `profiles`, `student_profiles`, `staff_profiles`, `user_otp_verifications`, `campus_zones`, `campus_buildings`, `incidents`, `incident_locations`, `evidence`, `ai_analyses`, `escalations`, `incident_messages`, `case_actions`, `notifications`, `safe_walks`, `trusted_contacts`, `audit_logs`, `ai_configuration`, `emergency_configuration`.
- **Remote DB Status:** Verified live connection. All 19 tables exist, RLS write blocking active on all 8 probed tables.
- **Pending Migrations:** `015`, `016`, `017` reviewed (see `DATABASE_FINAL_AUDIT.md`).

### External Service Dependencies
- **Authentication:** Supabase Auth (Active), Google OAuth (Configured).
- **AI Triage:** Google Gemini API (`@google/genai` v2.28.0) for case classification.
- **Notifications:** Firebase Cloud Messaging (FCM HTTP v1), Twilio SMS (or demo simulation), SendGrid SMTP (or demo simulation).

---

## 5. Security Posture Summary
- **Zero Plaintext Passwords:** Client passwords are submitted directly to bcrypt/Supabase Auth; never saved in plaintext in OTP verification tables.
- **Git Security:** `.env.local` strictly git-ignored and untracked.
- **Private Storage:** Buckets `kavach-id-cards` and `kavach-evidence` are set to `public: false`.

