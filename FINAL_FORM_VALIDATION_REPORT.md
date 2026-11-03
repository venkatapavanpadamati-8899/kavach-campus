# KAVACH CAMPUS — FINAL FORM VALIDATION & DATA FLOW REPORT

**Project Location:** `D:\Kavach Campus`  
**Date:** 2026-11-03  
**Auditor:** Senior Full-Stack Engineer & Application Security Specialist  

---

## 1. End-to-End Validation Pipeline

Every form in Kavach Campus follows a strict multi-layer validation pipeline:

```
[ User Input ]
      │
      ▼
[ Layer 1: Client-Side Pre-Validation ]
  - Regex checks (email, phone, PIN, reg-number)
  - File size & extension filters
  - Form state lock (disables double submission)
      │
      ▼
[ Layer 2: API Gateway & Authentication ]
  - Supabase session check or service-role validation
  - Rate limiting & request cooldown enforcement
      │
      ▼
[ Layer 3: Server-Side Strict Schema Validation ]
  - Type coercion & boundary checks
  - Normalization (lowercase email, clean digits)
  - Role-based authorization & tenant scope check
      │
      ▼
[ Layer 4: Database Constraints & Supabase RLS ]
  - Foreign key integrity
  - Parameterized queries (SQL injection prevention)
  - Tenant isolation (`college_id` match)
      │
      ▼
[ Layer 5: UI Response & Status Transition ]
  - Toast / Banner notifications
  - Optimistic or real-time UI updates
  - Protected route redirection
```

---

## 2. Form-by-Form Trace & Audit Results

### 1. Dual Login Form (`src/app/login/page.tsx`)
* **Client Validation:** Email format or 10-digit mobile number starting with `[6-9]`.
* **API Route:** `POST /api/auth/login` or `POST /api/auth/mobile-login`.
* **Server Validation:** Rate limit check (max 5 failed attempts per 15 min).
* **Database Action:** Verifies bcrypt password hash or CSPRNG OTP token.
* **Result:** Generates authenticated session; redirects to `/student`, `/staff`, or `/student/verification-status`. **PASS**

### 2. 11-Field Registration Form (`src/app/register/page.tsx`)
* **Client Validation:** Full name (min 2 chars), password (min 8 chars), 10-digit phone, mandatory consent checkbox.
* **API Route:** `POST /api/auth/register`.
* **Server Validation:** Forbids public registration of `ADMIN`, `SUPER_ADMIN`, `HOD`, or `PRINCIPAL`.
* **Database Action:** Inserts into `profiles` and creates Supabase auth record.
* **Result:** Redirects to `/verify-otp?email=...`. **PASS**

### 3. Student Profile Form (`src/app/student/profile/page.tsx`)
* **Client Validation:** Accommodation type, hostel details, blood group format.
* **API Route:** `PUT /api/student/profile`.
* **Server Validation:** Restricts update permissions strictly to the authenticated student.
* **Database Action:** Updates `student_profiles` and upserts `student_residences`.
* **Result:** Updates 15-field profile completion progress bar. **PASS**

### 4. Incident / File Report Form (`src/app/student/report/page.tsx`)
* **Client Validation:** Category selection, description length (min 10 chars), attachment limit (25MB).
* **API Route:** `POST /api/incidents`.
* **Server Validation:** Validates GPS coordinates (`-90 <= lat <= 90`, `-180 <= lng <= 180`), assigns severity via AI or rule engine.
* **Database Action:** Inserts into `incidents`, uploads evidence to private storage bucket.
* **Result:** Displays confirmation with tracking case ID. **PASS**

### 5. Voice Report Form (`src/app/student/voice-report/page.tsx`)
* **Client Validation:** Audio blob presence, duration > 1s, category selection.
* **API Route:** `POST /api/incidents` (multipart audio payload).
* **Server Validation:** MIME type check (`audio/webm`, `audio/mp4`), file size check.
* **Database Action:** Stores audio memo in private bucket, creates audio-type incident.
* **Result:** Displays case status and playback preview. **PASS**

### 6. Safe Box Evidence Vault (`src/app/student/safe-box/page.tsx`)
* **Client Validation:** File type check (Image, Video, Audio, Document), title input.
* **API Route:** `POST /api/student/safe-box` & `GET /api/student/safe-box`.
* **Server Validation:** Verifies student ownership; generates 15-minute signed URLs.
* **Database Action:** Inserts into `safe_box_items` with encrypted metadata.
* **Result:** Adds item to responsive grid with download/delete triggers. **PASS**

### 7. College Onboarding & PIN Search Form (`src/app/student/verification-status/page.tsx`)
* **Client Validation:** 6-digit postal PIN code format, Front/Back ID card selection.
* **API Route:** `POST /api/student/verify-id` & `GET /api/colleges/search`.
* **Server Validation:** Verifies image payload, crops portrait canvas, saves claim.
* **Database Action:** Records claim in `student_college_claims` for reviewer audit.
* **Result:** Displays pending review banner; unlocks dashboard upon approval. **PASS**

---

## 3. Security Assertions

* **SQL Injection:** 100% prevented via Supabase PostgREST parameterized query builders.
* **Cross-Site Scripting (XSS):** React 19 automatic JSX text escaping; no unescaped `dangerouslySetInnerHTML`.
* **Cross-Site Request Forgery (CSRF):** SameSite=Lax/Strict cookie configuration on all authentication tokens.
* **Double Submit Prevention:** Buttons disabled and loading spinners displayed on all forms.

