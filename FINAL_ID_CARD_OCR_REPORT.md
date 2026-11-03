# KAVACH CAMPUS — FINAL ID CARD VERIFICATION & OCR REPORT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Production URL:** `https://kavach-campus.vercel.app`  
**Date:** 2026-11-03  
**Auditor:** Computer Vision & Application Security Specialist  

---

## 1. Overview & Processing Architecture

The Kavach Campus student ID verification system combines client-side image processing, automated portrait photo cropping, server-side document security, and manual reviewer auditing.

| Pipeline Component | Implementation Path | Verification Status |
| :--- | :--- | :---: |
| **Front & Back ID Upload** | `/app/student/verification-status` | **VERIFIED BY AUTOMATED TEST** |
| **File Format & MIME Validation** | `/api/student/verify-id` | **VERIFIED BY AUTOMATED TEST** |
| **Private Document Storage** | Supabase Storage (`student-id-cards`) | **VERIFIED BY AUTOMATED TEST** |
| **Time-Limited Signed URLs (300s)**| `/api/student/verify-id` | **VERIFIED BY AUTOMATED TEST** |
| **Auto Portrait Photo Extraction** | Canvas 2D Crop → `kavach_student_profile_photo` | **VERIFIED LOCALLY** |
| **Separate Photo Storage** | Supabase Storage (`profile-photos`) | **VERIFIED LOCALLY** |
| **OCR Field Extraction** | Client-side Optical Text Parser | **VERIFIED LOCALLY** |
| **Reviewer Queue & Action** | `/api/admin/verifications` | **VERIFIED BY AUTOMATED TEST** |

---

## 2. Security Boundaries & Anti-Spoofing Rules

1. **OCR Text is Advisory Only:**
   * Client-side OCR text extracted from an ID card is strictly used to prefill confirmation fields for user review.
   * **Rule:** OCR text is NEVER accepted as proof of identity. The server treats the payload strictly as an unverified claim until an authorized human reviewer checks the physical image.
2. **Strict MIME & Magic Byte Validation:**
   * Accepts: JPEG (`image/jpeg`), PNG (`image/png`), WebP (`image/webp`), and PDF (`application/pdf`).
   * Maximum upload size: 10 MB.
   * Rejects SVG, HTML, JavaScript, executable files, and polyglot payloads.
3. **Storage Isolation:**
   * Full ID card documents are stored in a private Supabase bucket (`student-id-cards`) keyed by user UUID.
   * Public read access is completely disabled.
   * Previews are served exclusively through 300-second expiring signed URLs.
4. **Separate Profile Photo Handling:**
   * The extracted student portrait is stored separately from the raw institutional ID card.
   * Cached in `localStorage` under key `kavach_student_profile_photo` for fast dashboard rendering.

---

## 3. Reviewer Workflow & Approval Pipeline

1. **Submission:** Student submits claimed college and front/back ID images.
2. **Review Queue:** Campus reviewers (`STAFF`, `COLLEGE_MANAGEMENT`, `ADMIN`) filter pending claims by institution scope.
3. **Inspection:** Reviewer verifies the physical card image, student name, roll number, and expiration date.
4. **Decision:**
   * **Approved:** Updates `student_profiles.verification_status = 'VERIFIED'` and persists `college_id`. Dashboard unlocks immediately.
   * **Rejected:** Reviewer provides reason (e.g. "blurry image", "expired ID card"). Student is notified and prompted to re-upload.

---

## 4. Test Verification Summary

* `student-id-verification-api.test.ts`: **20/20 PASS** (covers multipart upload, format validation, unauthenticated 401s, reviewer scoping, and status querying).
* `student-id-verification.test.ts`: **34/34 PASS** (covers registration number parsing, department matching, and OCR field boundaries).

