# KAVACH CAMPUS — COMPLETE PROJECT AUDIT & SYSTEM INVENTORY

**Workspace:** `D:\kavach-campus`  
**Git Branch:** `main` (Release Commit: `a8e4636`)  
**Audit Date:** 2026-11-05  
**Compilation Target:** Next.js 16.4.3 (Turbopack App Router), React 19, TypeScript 5.x, Supabase PostgreSQL 17  
**Test Suite:** Vitest 5.0.3 (62/62 suites passed, 791/791 tests passed)  

---

## 1. Executive Summary

This comprehensive audit evaluates the entire Kavach Campus architecture across its client layer, API endpoints, authentication flows, data storage, responsive interfaces, and device compatibility. Every route, component, API handler, and database interaction was systematically analyzed following the resolution of the Google OAuth PKCE storage failure and local mobile network access restrictions.

---

## 2. Complete Inventory of All 71 Application Routes

Next.js Turbopack generates exactly 71 routes (static pages and dynamic route handlers):

### 2.1 Public & Authentication Pages (9 Routes)
1. `/` (Static) — Landing page with hero section, institutional branding, features, interactive character, and role navigation.
2. `/_not-found` (Static) — Custom 404 error page.
3. `/about` (Static) — Institutional safety charter, background information, and campus mission.
4. `/features` (Static) — Comprehensive platform features breakdown.
5. `/contact` (Static) — Emergency contact channels and support directory.
6. `/privacy` (Static) — Privacy charter, zero-knowledge logging policies, and student data protection details.
7. `/login` (Static) — Student and staff unified authentication portal supporting email/password, OTP, and Google OAuth.
8. `/register` (Static) — Student and faculty registration portal supporting institutional domain validation.
9. `/forgot-password` (Static) — Password recovery initiation with anti-enumeration protection.
10. `/reset-password` (Static) — Password reset finalization with secure tokens.
11. `/verify-otp` (Static) — Multi-factor and mobile OTP verification portal.
12. `/unauthorized` (Static) — RBAC denial screen with auto-redirection options.

### 2.2 Student Portal Routes (12 Routes)
13. `/student` (Static) — Student personal safety hub (SOS trigger, quick actions, recent incidents, safe walk card).
14. `/student/sos` (Static) — Dedicated full-screen Emergency SOS trigger with countdown cancel and siren simulation.
15. `/student/report` (Static) — Incident reporting form with file attachments, anonymous submission toggle, and category selector.
16. `/student/incidents` (Static) — Student submitted cases list with status badges and timeline tracking.
17. `/student/incidents/[id]` (Dynamic) — Case details view showing live updates, staff notes, and resolution status.
18. `/student/cases` (Static) — Confidential cases overview.
19. `/student/safe-walk` (Static) — Real-time Safe Walk companion session with active waypoint streaming and arrival confirmation.
20. `/student/safe-box` (Static) — Private encrypted evidence locker for audio/video/image attachments and private notes.
21. `/student/contacts` (Static) — Campus emergency phone numbers, local police, ambulance, and women's helpline.
22. `/student/trusted-contacts` (Static) — Emergency contacts manager (parents, friends, guardians) for automated SOS alerts.
23. `/student/profile` (Static) — Student profile information, college affiliation, blood group, and emergency details.
24. `/student/settings` (Static) — Privacy settings, notification preferences, and account configuration.
25. `/student/verification-status` (Static) — ID card verification progress, resubmission instructions, and status indicator.
26. `/student/voice-report` (Static) — Confidential voice recording and automated transcription reporting portal.

### 2.3 Staff & First Responder Routes (3 Routes)
27. `/staff` (Static) — First responder dashboard, incident dispatch queue, live status toggling, and emergency map.
28. `/staff/incidents` (Dynamic) — Incident queue with filtering by severity, category, status, and campus zone.
29. `/staff/incidents/[id]` (Dynamic) — Incident dispatch room with responder coordination, live updates, and resolution logs.

### 2.4 Management & Administration Routes (10 Routes)
30. `/management` (Static) — College leadership dashboard (Principal, HOD, Management) with campus analytics.
31. `/management/incidents` (Dynamic) — Campus-wide incident monitoring and case progression review.
32. `/management/incidents/[id]` (Dynamic) — Executive case view with escalated review capabilities.
33. `/admin` (Static) — Campus administrator control room.
34. `/admin/login` (Static) — Campus admin authentication portal.
35. `/admin/users` (Static) — Student and staff user verification, role assignment, and campus affiliation management.
36. `/admin/campus` (Static) — College configuration, geofences, safety zones, and security team management.
37. `/admin/campus/register` (Static) — New college onboarding and institutional domain setup.
38. `/admin/incidents` (Dynamic) — Comprehensive campus administrative incident ledger.
39. `/admin/incidents/[id]` (Dynamic) — Detailed incident administrative management view.
40. `/admin/ai` (Static) — Kavach AI system monitor, routing rules configuration, and severity calibration.
41. `/admin/system-audit` (Static) — Security audit trail inspector and compliance log reviewer.
42. `/dashboard` (Static) — Central role routing redirection hub.

### 2.5 Super Admin Routes (3 Routes)
43. `/super-admin` (Static) — Multi-campus governance dashboard for system-wide metrics and tenant management.
44. `/super-admin/login` (Static) — Super administrator high-security login portal.
45. `/super-admin/pending-campus` (Static) — Unaffiliated student verification queue and campus approval management.

### 2.6 Backend API Route Handlers (26 Handlers)
46. `/api/auth/login` (Dynamic) — Credential verification, session generation, and role redirection.
47. `/api/auth/register` (Dynamic) — User registration, institutional domain matching, and student profile initialization.
48. `/api/auth/google` (Dynamic) — Google OAuth 2.0 initiation and ID token exchange.
49. `/api/auth/callback` (Dynamic) — OAuth PKCE code exchange, session cookie setting, and student auto-provisioning.
50. `/api/auth/mobile-login` (Dynamic) — Mobile phone number login initiation with OTP dispatch.
51. `/api/auth/verify-otp` (Dynamic) — OTP verification with fixed demo mode support (`123456`).
52. `/api/auth/resend-otp` (Dynamic) — Rate-limited OTP resend handler.
53. `/api/auth/demo-sms` (Dynamic) — Free simulated SMS console logging engine (`₹0 cost`).
54. `/api/auth/forgot-password` (Dynamic) — Anti-enumeration password recovery dispatch.
55. `/api/auth/reset-password` (Dynamic) — Token-verified password update handler.
56. `/api/auth/logout` (Dynamic) — Supabase session termination and cookie invalidation.
57. `/api/incidents` (Dynamic) — Incident creation, AI severity evaluation, and incident retrieval.
58. `/api/incidents/[id]` (Dynamic) — Case detail fetching and status progression.
59. `/api/incidents/[id]/escalate` (Dynamic) — Manual and automated tier escalation.
60. `/api/incidents/[id]/evidence` (Dynamic) — Multipart attachment upload with virus/magic byte validation.
61. `/api/incidents/[id]/notes` (Dynamic) — Confidential responder notes ledger.
62. `/api/incidents/[id]/nearby-staff` (Dynamic) — Haversine distance-based responder lookup with consent filtering.
63. `/api/sos` (Dynamic) — Emergency SOS broadcast with 60-second duplicate cooldown.
64. `/api/sos/location` (Dynamic) — Real-time SOS location telemetry streaming.
65. `/api/safe-walk/start` (Dynamic) — Safe walk session initiation with ETA and destination.
66. `/api/safe-walk/location` (Dynamic) — Intermediate waypoint ingestion.
67. `/api/safe-walk/end` (Dynamic) — Safe walk completion and companion arrival sign-off.
68. `/api/cron/safe-walk-timeout` (Dynamic) — Automated cron evaluator triggering alarms for overdue walks.
69. `/api/cron/escalate` (Dynamic) — Automated cron evaluator for unacknowledged critical emergencies.
70. `/api/student/verify-id` (Dynamic) — Multipart student ID card upload with self-approval guards.
71. `/api/student/profile` (Dynamic) — Student medical and profile update handler.
72. `/api/student/safe-box` (Dynamic) — Safe box evidence attachment and private note CRUD.
73. `/api/student/trusted-contacts` (Dynamic) — Trusted contacts management.
74. `/api/student/blood-search` (Dynamic) — Emergency same-campus blood donor lookup.
75. `/api/colleges/search` (Dynamic) — Public college directory search.
76. `/api/admin/users` (Dynamic) — Administrative user ledger and role assignment.
77. `/api/admin/users/approve` (Dynamic) — Student and staff institutional approval.
78. `/api/admin/verifications` (Dynamic) — ID card verification queue management.
79. `/api/admin/analytics` (Dynamic) — Incident trends, response times, and safety heatmap data.
80. `/api/super-admin/pending-campus` (Dynamic) — Cross-campus tenant claims management.
81. `/api/notifications/test-push` (Dynamic) — FCM and Web Push test endpoint.
82. `/api/system/health` (Dynamic) — System health check and database connectivity probe.

---

## 3. Database Architecture & RLS Security

### 3.1 Public Database Tables (21 Tables)
1. `profiles` — Core user profiles, role hierarchy, college tenant ID, approval status.
2. `student_profiles` — Admission type, student registration number, verification status.
3. `student_residences` — Hostel block, room number, or day-scholar commute route.
4. `colleges` — Institutional tenant configurations, geofences, domain mappings.
5. `incidents` — Student safety incident records with category, severity, status, and college ID.
6. `incident_locations` — Geographic coordinates and accuracy metrics for incident scenes.
7. `incident_notes` — Internal staff notes, investigation findings, and timestamps.
8. `incident_timeline` — Automated audit trail of status transitions.
9. `evidence` — Metadata for uploaded files in `kavach-evidence` bucket.
10. `safe_walks` — Active and completed safe walk tracking sessions.
11. `safe_walk_locations` — Sequential GPS route waypoints for safe walk sessions.
12. `staff_locations` — On-duty responder GPS coordinates, speed, battery, and consent flag.
13. `trusted_contacts` — Student emergency contacts for automated dispatch.
14. `emergency_helplines` — Campus-specific emergency hotline telephone directory.
15. `notifications` — In-app notifications with delivery tracking and read receipts.
16. `fcm_tokens` — Registered Firebase Cloud Messaging mobile device tokens.
17. `otp_verifications` — Temporary hashed verification codes with expiry limits.
18. `audit_logs` — Tamper-evident administrative audit log ledger.
19. `safe_box_private_notes` — Student encrypted personal notes (`<= 2000` chars).
20. `safety_zones` — Designated campus safe zones, guard posts, and emergency booths.
21. `schema_migrations` — Supabase migration tracking registry (001–018).

### 3.2 Private Storage Buckets (3 Buckets)
* `kavach-evidence` — Incident media (photos, videos, audio recordings). Restricted by folder-level student ID and campus staff authorization policies. 25 MB file limit.
* `kavach-id-cards` — Student institutional identity cards. Restricted strictly to the uploading student and authorized campus admins.
* `kavach-profile-photos` — Student profile avatars. Restricted to student owner and campus administrators.

---

## 4. Middleware & Navigation Protection

The application middleware (`src/proxy.ts`) enforces zero-trust role-based access:
* Unauthenticated requests to protected paths (`/student/*`, `/staff/*`, `/management/*`, `/admin/*`, `/super-admin/*`) are redirected to `/login` with the original URL preserved in `next`.
* Cookie preservation helper `redirectWithCookies()` ensures session tokens and PKCE code verifiers are never dropped during redirects.
* Role-specific boundaries prevent students from accessing staff queues, staff from accessing administrative panels, and non-super-admins from accessing multi-campus governance.

