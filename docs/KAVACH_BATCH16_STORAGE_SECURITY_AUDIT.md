# KAVACH CAMPUS — BATCH 16: STORAGE SECURITY VERIFICATION AUDIT

**Project:** Kavach Campus (`D:\Kavach Campus`)  
**Audit Scope:** Supabase Storage Security (`kavach-evidence` and `kavach-id-cards`)  
**Audit Mode:** READ-ONLY SECURITY AUDIT  
**Environment:** Local Development / Docker Containerized Supabase (`localhost:54322`, Database: `postgres`, Port: 54321 Kong API Gateway)  
**Date:** October 18, 2026  
**Remote Production Database:** **0 Calls — Remote Production (`polbnvszmvblwenfnqll`) was strictly untouched.**  
**Production Release Status:** **STRICT RELEASE HOLD MAINTAINED**

---

## 1. Executive Summary

Batch 16 conducted an exhaustive, read-only security verification of the Supabase Storage architecture for Kavach Campus, targeting the two sensitive storage buckets:
1. `kavach-evidence`: Houses incident photo/video evidence submitted by students and security responders.
2. `kavach-id-cards`: Houses student government/institutional ID cards uploaded for academic batch verification.

The audit combined static code analysis across Next.js API routes, migration files, and candidate hardening scripts with live integration probes against the local Docker Supabase Storage service (`supabase_storage_kavach_campus:5000` via Kong gateway `localhost:54321`) and direct PostgreSQL RLS inspection (`localhost:54322`).

A dedicated 10-scenario live security verification suite was executed against the local database engine. All **10/10 scenarios PASSED**. Public endpoints correctly block unauthenticated access (returning 403 / 404), RLS strictly isolates cross-student data, and signed URL generation enforces pre-issuance authorization with short-lived expiration (5 minutes for ID cards, 15 minutes for incident evidence).

---

## 2. Scope and Environment

### 2.1 Evaluated Components
* **Storage Buckets:** `kavach-evidence`, `kavach-id-cards`
* **Storage Tables & Triggers:** `storage.buckets`, `storage.objects`, `storage.protect_delete()`
* **RLS Policies:** Active policies on `storage.objects` and `storage.buckets`
* **API Routes & Server Handlers:**
  * `src/app/api/admin/verifications/route.ts` (ID card retrieval & verification)
  * `src/app/api/incidents/[id]/evidence/route.ts` (Incident evidence GET / POST)
  * `src/app/api/incidents/[id]/route.ts` (Incident details & evidence retrieval)
  * `src/app/api/student/verify-id/route.ts` (Student verification submission)
* **Frontend Upload Integration:** `src/app/student/verification-status/page.tsx`

### 2.2 Operational Environment
* **Database Target:** `postgresql://postgres:postgres@localhost:54322/postgres` (Container Host: `172.18.0.2`)
* **Storage API Gateway:** `http://localhost:54321/storage/v1` (Kong Gateway)
* **Remote Production Target:** `polbnvszmvblwenfnqll` (Uncontacted — Marked **NOT VERIFIED** for remote live state)

---

## 3. Bucket Privacy Findings

| Bucket ID | Intended Privacy | Actual Local Status | File Size Limit | Allowed MIME Types | Public Access Probe |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `kavach-evidence` | `private` | `public = false` | 10 MB (10,485,760 B) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `video/mp4` | ⛔ **BLOCKED** (`HTTP 400/404 NoSuchBucket`) |
| `kavach-id-cards` | `private` | `public = false` | 5 MB (5,242,880 B) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | ⛔ **BLOCKED** (`HTTP 400/404 NoSuchBucket`) |

### Direct HTTP Probe Evidence (Port 54321):
* `GET /storage/v1/object/public/kavach-evidence/test.jpg`  
  -> Response: `HTTP 400: {"statusCode":"404","error":"Bucket not found","message":"Bucket not found","code":"NoSuchBucket"}`  
  *(Supabase Storage deliberately hides non-public buckets from the public object endpoint).*
* `GET /storage/v1/bucket/kavach-evidence` (Unauthenticated)  
  -> Response: `HTTP 400: {"statusCode":"403","error":"Unauthorized","message":"Invalid Compact JWS","code":"AccessDenied"}`
* `GET /storage/v1/object/list/kavach-evidence` (Unauthenticated)  
  -> Response: `HTTP 400: {"statusCode":"404","error":"Bucket not found","message":"Bucket not found","code":"NoSuchBucket"}`

**Conclusion:** Both buckets are strictly private. Anonymous access via public URLs or unauthorized REST API calls is completely rejected.

---

## 4. Complete Storage RLS Policy Inventory

The actual live database policies on `storage.objects` were inventoried directly from `pg_policies`:

### 4.1 Policy 1: `"Authenticated users upload own id card"`
* **Table:** `storage.objects`
* **Operation:** `INSERT`
* **Roles:** `{authenticated}`
* **Permissive:** `PERMISSIVE`
* **WITH CHECK:**
  ```sql
  ((bucket_id = 'kavach-id-cards'::text) AND 
   (((auth.uid())::text = (storage.foldername(name))[1]) OR 
    (name ~~ ((auth.uid())::text || '/%'::text))))
  ```
* **Enforcement:** Enforces folder prefix isolation. An authenticated student can only upload files whose root path prefix matches their own `auth.uid()`.

### 4.2 Policy 2: `"Users and reviewers read authorized id card"`
* **Table:** `storage.objects`
* **Operation:** `SELECT`
* **Roles:** `{authenticated}`
* **Permissive:** `PERMISSIVE`
* **USING:**
  ```sql
  ((bucket_id = 'kavach-id-cards'::text) AND 
   (((auth.uid())::text = (storage.foldername(name))[1]) OR 
    (name ~~ ((auth.uid())::text || '/%'::text)) OR 
    is_reviewer()))
  ```
* **Enforcement:** Only the owning student (`auth.uid() = folder`) or an authorized reviewer (`is_reviewer()`: `ADMIN`, `SUPER_ADMIN`, `SECURITY`) can read the ID card. Unrelated students and general staff are blocked.

### 4.3 Policy 3: `"Authorized users upload incident evidence files"`
* **Table:** `storage.objects`
* **Operation:** `INSERT`
* **Roles:** `{authenticated}`
* **Permissive:** `PERMISSIVE`
* **WITH CHECK:**
  ```sql
  ((bucket_id = 'kavach-evidence'::text) AND 
   (((auth.uid())::text = (storage.foldername(name))[1]) OR 
    (name ~~ ((auth.uid())::text || '/%'::text)) OR 
    (EXISTS (
      SELECT 1 FROM incidents i
      WHERE (((i.case_id = (storage.foldername(objects.name))[1]) OR 
              ((i.id)::text = (storage.foldername(objects.name))[1])) AND 
             ((i.student_id = auth.uid()) OR 
              (i.assigned_to = auth.uid()) OR 
              is_reviewer()))))))
  ```
* **Enforcement:** Supports dual-path upload authorization:
  1. User UUID folder prefix (`<auth.uid()>/...`)
  2. Case-scoped folder prefix (`<case_id>/...` or `<incident_id>/...`) strictly bound to an incident where the caller is the student owner, the assigned responder, or an institutional reviewer.

### 4.4 Policy 4: `"Authorized users read incident evidence files"`
* **Table:** `storage.objects`
* **Operation:** `SELECT`
* **Roles:** `{authenticated}`
* **Permissive:** `PERMISSIVE`
* **USING:**
  ```sql
  ((bucket_id = 'kavach-evidence'::text) AND 
   (((auth.uid())::text = (storage.foldername(name))[1]) OR 
    (name ~~ ((auth.uid())::text || '/%'::text)) OR 
    is_admin() OR 
    (EXISTS (
      SELECT 1 FROM incidents i
      WHERE (((i.case_id = (storage.foldername(objects.name))[1]) OR 
              ((i.id)::text = (storage.foldername(objects.name))[1])) AND 
             ((i.student_id = auth.uid()) OR 
              (i.assigned_to = auth.uid()) OR 
              is_reviewer()))))))
  ```
* **Enforcement:** Student owners read evidence for their own incidents. Assigned responders read evidence for cases assigned to them. Reviewers and admins have institutional oversight. General, unassigned staff receive 0 rows.

### 4.5 UPDATE and DELETE Policy Evaluation
* **UPDATE:** Zero policies defined on `storage.objects`. In PostgreSQL RLS, lack of an UPDATE policy defaults to **DENY ALL**.
* **DELETE:** Zero policies defined on `storage.objects`. In addition, PostgreSQL trigger `storage.protect_delete()` intercepts direct SQL deletes with: `ERROR: Direct deletion from storage tables is not allowed. Use the Storage API instead.`

---

## 5. Role-Based Access Matrix

| Role | `kavach-id-cards` Upload | `kavach-id-cards` Read | `kavach-evidence` Upload | `kavach-evidence` Read | Overwrite / Delete |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Student (Owner)** | ✅ Own folder only (`<auth.uid()>/...`) | ✅ Own ID card only | ✅ Own folder OR owned incident case | ✅ Owned incident evidence only | ⛔ Denied |
| **Student (Unrelated)** | ⛔ Denied (RLS error `42501`) | ⛔ 0 rows returned | ⛔ Denied (RLS error `42501`) | ⛔ 0 rows returned | ⛔ Denied |
| **Staff (Assigned Responder)** | ⛔ Cannot read student ID card | ⛔ 0 rows returned | ✅ Allowed for assigned case | ✅ Assigned incident evidence only | ⛔ Denied |
| **Staff (Unassigned / General)** | ⛔ Cannot read student ID card | ⛔ 0 rows returned | ⛔ Cannot upload to unassigned case | ⛔ 0 rows returned | ⛔ Denied |
| **Security Officer (`is_reviewer`)**| ⛔ Cannot upload as student | ✅ Allowed (Verification review) | ✅ Allowed (Incident investigation) | ✅ Allowed (Case oversight) | ⛔ Denied |
| **Admin / Super Admin** | ⛔ Cannot upload as student | ✅ Allowed (Administrative review) | ✅ Allowed (Institutional oversight) | ✅ Allowed (Institutional oversight) | ⛔ Denied |
| **Anonymous (`anon`)** | ⛔ Denied (RLS error `42501`) | ⛔ 0 rows returned | ⛔ Denied (RLS error `42501`) | ⛔ 0 rows returned | ⛔ Denied |

---

## 6. Signed URL Security and Audit

### 6.1 Route Inspection Inventory
All signed URL issuance paths in the application were inspected:

| Route | Code Location | Target Bucket | Expiry Duration | Pre-Issuance Authorization Check | Fail-Closed Handling |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `/api/admin/verifications` (GET) | [route.ts:L81-95](file:///D:/Kavach%20Campus/src/app/api/admin/verifications/route.ts#L81-L95) | `kavach-id-cards` | **300s (5 min)** | Strict: `role IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY') AND is_approved = true` | ✅ Returns 403 Forbidden |
| `/api/incidents/[id]/evidence` (GET) | [route.ts:L67-99](file:///D:/Kavach%20Campus/src/app/api/incidents/[id]/evidence/route.ts#L67-L99) | `kavach-evidence` | **900s (15 min)** | Strict: `student_id = user.id OR assigned_to = user.id OR isSecurityOrAdmin` | ✅ Returns 403 Forbidden |
| `/api/incidents/[id]/evidence` (POST) | [route.ts:L241-246](file:///D:/Kavach%20Campus/src/app/api/incidents/[id]/evidence/route.ts#L241-L246) | `kavach-evidence` | **900s (15 min)** | Strict: Incident ownership or assigned responder verification | ✅ Returns 403 Forbidden |
| `/api/incidents/[id]` (GET) | [route.ts:L174-194](file:///D:/Kavach%20Campus/src/app/api/incidents/[id]/route.ts#L174-L194) | `kavach-evidence` | **900s (15 min)** | Strict: Incident student, assigned responder, or reviewer | ✅ Returns empty evidence array |

### 6.2 Signed URL Bearer Token Security
* **Token Lifetime:** ID cards expire in **5 minutes** (300 seconds); evidence expires in **15 minutes** (900 seconds). Both match institutional data protection guidelines.
* **Leak Prevention:** Signed URLs are generated dynamically on demand; they are **never stored in the database** and **never printed to server logs or audit logs**.
* **Path Sanitation:** All routes invoke `.replace(/^.*kavach-evidence\//, '')` or sanitize with random UUIDs to prevent directory traversal or bucket-substitution attacks.
* **Bearer Token Limitation:** As with standard signed URLs, any party possessing the URL string within its 5-to-15 minute lifespan can view the file. Expiry duration is kept minimal to reduce the exposure window.

---

## 7. Test Results and Supporting Evidence

The live verification probe [scratch/verify_storage_security_live.ts](file:///D:/Kavach%20Campus/scratch/verify_storage_security_live.ts) executed against the live local database:

```text
======================================================
LIVE STORAGE SECURITY TEST RESULTS:
Total: 10 | Passed: 10 | Failed: 0
======================================================
```

| Scenario # | Test Description | Role / Identity | Expected Behavior | Observed Result | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1** | Upload authorized ID card and evidence | Student A (`auth.uid()`) | INSERT succeeds for own folder & owned incident | 1 row inserted in both buckets | ✅ **PASS** |
| **2** | Download Student B private ID card | Student A (`auth.uid()`) | SELECT query filtered by RLS | 0 rows returned | ✅ **PASS** |
| **3** | Download unrelated Incident B evidence | Student A (`auth.uid()`) | SELECT query filtered by RLS | 0 rows returned | ✅ **PASS** |
| **4** | Unassigned staff evidence access | Counsellor (`STAFF`) | SELECT query filtered by RLS | 0 rows returned | ✅ **PASS** |
| **5** | Assigned staff evidence access | Staff Responder (`STAFF`) | Can read assigned Incident A; blocked from Incident B | Incident A: 1 row; Incident B: 0 rows | ✅ **PASS** |
| **6** | Institutional reviewer access | Security Reviewer (`SECURITY`) | Can inspect ID cards & incident evidence | Both returned 1 row | ✅ **PASS** |
| **7** | Anonymous user access | `anon` | SELECT returns 0 rows; INSERT rejected | 0 rows returned; caught `42501` | ✅ **PASS** |
| **8** | Unauthorized overwrite / delete | Student A on Student B file | UPDATE affects 0 rows; DELETE blocked | 0 rows updated; DELETE blocked | ✅ **PASS** |
| **9** | Path traversal attempt | Student A (`auth.uid()`) | Path manipulation to other folder/case rejected | Both attempts threw `42501` | ✅ **PASS** |
| **10** | Metadata injection attempt | Student A (`auth.uid()`) | Arbitrary folder upload with fake metadata rejected | Caught `42501` | ✅ **PASS** |

---

## 8. Findings Classification

### Medium Findings (Non-Blocking for Local Dev, Actionable for Batch 17)
1. **[MED-01] Frontend ID Card Upload Path Discrepancy:**
   * *Location:* [src/app/student/verification-status/page.tsx:L80](file:///D:/Kavach%20Campus/src/app/student/verification-status/page.tsx#L80)
   * *Description:* Frontend submits `kavach-id-cards/${formData.studentId.trim()}-card.jpg` (10-digit roll number) rather than `<auth.uid()>/...`. If client-side direct upload were invoked, RLS would reject it because the path root is not the student's UUID.
   * *Mitigation Recommendation:* Align client upload path to `${user.id}/${studentId}-card.jpg` when implementing real client-side file upload in the UI.

### Low / Informational Findings
2. **[INFO-01] Baseline Migration vs. Step 115 Hardening Parity:**
   * *Location:* [supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql:L206-239](file:///D:/Kavach%20Campus/supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql#L206-L239)
   * *Description:* Baseline migration 008 originally contained overly broad `OR public.is_staff()` clauses on storage SELECT. Candidate Step 115 properly replaced them with `is_reviewer()` and case binding.
   * *Mitigation Recommendation:* In Batch 17 (Migration Reconciliation), consolidate the Step 115 hardened storage policies into the primary migration baseline so broad policies are never recreated.

3. **[INFO-02] Direct DELETE Trigger Defense:**
   * *Location:* Supabase internal function `storage.protect_delete()`
   * *Description:* Direct SQL `DELETE` queries on `storage.objects` are blocked by default internal trigger `storage.protect_delete()`, providing a defense-in-depth safeguard against accidental object purging.

---

## 9. Items Requiring Remote Production Verification

The following items **could not be verified on the remote Supabase project (`polbnvszmvblwenfnqll`)** because connecting to or modifying remote production was strictly forbidden:
1. **Remote Bucket Privacy:** Confirmation that `public = false` is active on remote `kavach-evidence` and `kavach-id-cards`.
2. **Remote Storage Policies:** Confirmation that Step 115 candidate RLS policies have been executed on the remote database.
3. **Remote Signed URL Expiry:** Live confirmation of token expiry against remote Supabase storage edge nodes.

*Status: **NOT VERIFIED ON REMOTE PRODUCTION***.

---

## 10. Release Decision and Next Steps

**PRODUCTION DEPLOYMENT STATUS: STRICT RELEASE HOLD MAINTAINED**

Local Supabase Storage security, bucket privacy, and RLS policies are verified and passing 10/10 test scenarios. However, production release remains on **STRICT HOLD** until:
1. Batch 17: Duplicate migration versions (`001`, `002`, `008`) and schema consolidation are fully planned.
2. Remote production migration preflight is formally reviewed.
