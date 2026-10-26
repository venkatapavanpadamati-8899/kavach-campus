# KAVACH CAMPUS — PHASE 6: STUDENT ID & EVIDENCE STORAGE AUDIT

**Project:** Kavach Campus — Safety in One Tap (`D:\Kavach Campus`)  
**Scope:** Storage Buckets, RLS Policies, Signed URLs, Upload Paths, and Authorization Boundaries  
**Date:** October 18, 2026

---

## 1. Storage Buckets Inventory & Configuration

| Bucket Name | Privacy | Max File Size | Allowed MIME Types | Public Access Probe |
| :--- | :---: | :---: | :--- | :---: |
| `kavach-evidence` | **Private** (`public = false`) | 10 MB (10,485,760 B) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `video/mp4` | ⛔ **BLOCKED** (`HTTP 404 NoSuchBucket`) |
| `kavach-id-cards` | **Private** (`public = false`) | 5 MB (5,242,880 B) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | ⛔ **BLOCKED** (`HTTP 404 NoSuchBucket`) |

---

## 2. Storage RLS Policies & Dual-Path Verification

### 2.1 `kavach-id-cards` Bucket Policies
- **INSERT (`"Authenticated users upload own id card"`):**  
  Enforces folder isolation via `auth.uid()::text = (storage.foldername(name))[1]` OR `name LIKE (auth.uid()::text || '/%')`. An authenticated student can only write into their own UUID root folder.
- **SELECT (`"Users and reviewers read authorized id card"`):**  
  Only the owning student (`auth.uid() = folder`) or an authorized reviewer (`is_reviewer()`) can retrieve files.

### 2.2 `kavach-evidence` Bucket Policies
- **INSERT (`"Authorized users upload incident evidence files"`):**  
  Supports user-scoped (`<auth.uid()>/...`) and case-scoped (`<case_id>/...`) paths. For case-scoped uploads, caller must be the incident owner or assigned responder.
- **SELECT (`"Authorized participants view incident evidence files"`):**  
  Restricts reads to the student owner, actively assigned responder, or campus administrator.

---

## 3. Pre-Issuance Signed URL Generation
- **ID Cards Reviewer API (`src/app/api/admin/verifications/route.ts`):**  
  Generates short-lived signed URLs with **300 seconds (5 minutes)** expiration. Only users with `ADMIN`, `SUPER_ADMIN`, or `SECURITY` roles can invoke this endpoint.
- **Incident Evidence API (`src/app/api/incidents/[id]/evidence/route.ts`):**  
  Generates signed URLs with **900 seconds (15 minutes)** expiration, strictly verifying incident ownership or assignment before issuance.

---

## 4. UI Path Discrepancy & Surgical Remediation

### 4.1 Identified Issue
In `src/app/student/verification-status/page.tsx:80`, the client submits:
```ts
idCardUrl: `kavach-id-cards/${formData.studentId.trim()}-card.jpg`
```
Because the path lacks the `${auth.uid()}/` folder prefix, a direct client SDK upload to Supabase Storage would be rejected by Storage RLS with HTTP 403. While the server-side proxy route currently uses `service_role` (bypassing RLS), direct client-side operations would fail.

### 4.2 Remediation
Align client submission to:
```ts
idCardUrl: `kavach-id-cards/${user.id}/${formData.studentId.trim()}-id-card.jpg`
```
This guarantees consistent behavior across both server-side proxy and direct PostgREST client uploads.
