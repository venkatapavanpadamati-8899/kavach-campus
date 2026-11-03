# KAVACH CAMPUS — FINAL COLLEGE ONBOARDING & SEARCH REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Full-Stack Architect & Multi-Tenant Specialist  

---

## 1. Executive Summary

College onboarding in Kavach Campus ensures that students and staff are associated only with verified academic institutions. Registration does not guess or force a college selection; instead, an unverified user is routed to a dedicated pre-dashboard onboarding gate before accessing privileged features.

| Feature / Workflow | Implementation Path | Automated Test Status | Production Status |
| :--- | :--- | :---: | :---: |
| **Pre-Dashboard Redirect Gate** | `src/proxy.ts`<br>`/student/verification-status` | **VERIFIED BY AUTOMATED TEST** | Live |
| **6-Digit PIN Code Search** | `/api/colleges/search?pincode=...` | **VERIFIED BY AUTOMATED TEST** | Live |
| **College Name / Keyword Search** | `/api/colleges/search?q=...` | **VERIFIED BY AUTOMATED TEST** | Live |
| **Multi-College per PIN Support** | `src/lib/colleges.ts` | **VERIFIED BY AUTOMATED TEST** | Live |
| **One-Tap Suggestion Pills** | `/app/student/verification-status` | **VERIFIED LOCALLY** | Live |
| **Claim Submission for Review** | `/api/student/verify-id` | **VERIFIED BY AUTOMATED TEST** | Pending Migration 015 |
| **Campus Tenant Branding Sync** | `src/lib/college-branding.ts` | **VERIFIED BY AUTOMATED TEST** | Live |

---

## 2. Onboarding Workflow & Gatekeeping

### A. Gated Access Architecture
1. **Public Registration:** Users register with personal (e.g. `@gmail.com`) or institutional email without entering college name upfront.
2. **Session Gate in Middleware:** When an unverified student logs in, `src/proxy.ts` detects that `verification_status !== 'VERIFIED'` and redirects them to:
   ```
   /student/verification-status?notice=verification_required
   ```
3. **Emergency Exemption:** The SOS trigger route (`/student/sos`) is explicitly exempt from the verification gate to ensure student physical safety is never compromised.

### B. College Discovery (Name & PIN Code Search)
* **API Route:** `GET /api/colleges/search`
  * Query parameters: `q` (name, short name, city) and `pincode` (6-digit postal code).
* **Multi-College Postal Handling:** A postal PIN code does not uniquely identify a single institution. For example:
  * `534204` → SRKR Engineering College, Bhimavaram
  * `534202` → Vishnu Institute of Technology / BVRIT campus
  * `500032` → Hyderabad technological institutions
  * `600036` → Chennai IIT Madras & engineering campus
* **Supported Directory:** Over 30 verified institutions across Andhra Pradesh, Telangana, Tamil Nadu, and Karnataka, including SRKR, Vishnu, DNR, Swarnandhra, Aditya, JNTUK, and AU.

---

## 3. Verified Institution Association & Review

* Students submit an institutional claim via `/api/student/verify-id` with their claimed college ID and physical ID card document.
* Client-supplied text is treated strictly as an unverified claim.
* Authorized campus reviewers (`STAFF`, `COLLEGE_MANAGEMENT`, `ADMIN`) inspect the claim in their review queue and officially approve or reject the association.
* Upon approval, `student_profiles.verification_status` updates to `'VERIFIED'`, immediately unlocking the primary `/student` dashboard.

---

## 4. Pending Database Migration

Migration `supabase/migrations/015_student_college_claims.sql` introduces:
* `claimed_college_id` column in `student_profiles`
* Index `idx_student_profiles_claimed_college`
* Storage bucket policies for `profile-photos` and `student-id-cards`

> **Owner Action:** Execute `015_student_college_claims.sql` in your Supabase SQL Editor.

