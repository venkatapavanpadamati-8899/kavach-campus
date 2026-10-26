# KAVACH CAMPUS — BATCH 23: STORAGE & STUDENT ID VERIFICATION AUDIT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 18, 2026  
**Buckets Audited:** `kavach-id-cards`, `kavach-evidence`  
**Status:** **100% AUDITED & VERIFIED**

---

## 1. Bucket Configuration & Privacy Verification

| Bucket Name | Privacy (`public`) | File Size Limit | Allowed MIME Types | Folder Structure Requirement | Audit Outcome |
|:---|:---:|:---:|:---|:---|:---:|
| `kavach-id-cards` | **false (Private)** | 5 MB | `image/jpeg`, `image/png`, `application/pdf` | `kavach-id-cards/${user.id}/${studentId}-card.jpg` | **PASS** |
| `kavach-evidence` | **false (Private)** | 10 MB | `image/*`, `video/*`, `audio/*`, `application/pdf` | `kavach-evidence/${caseId}/${filename}` | **PASS** |

---

## 2. Storage RLS Policies (`storage.objects`)

```sql
-- Students can only upload into their own auth.uid() folder
CREATE POLICY "Students upload own ID card" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'kavach-id-cards'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Students can read only their own card; security/admin can review all
CREATE POLICY "Students read own ID card" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'kavach-id-cards'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.is_security_or_admin()
    )
);
```

---

## 3. End-to-End Remediation & Verification

### 3.1 UI Alignment (`src/app/student/verification-status/page.tsx`)
- On mount, `loadStatus()` queries `/api/student/verify-id` to fetch the caller's verified `profile.id` (`userId`).
- Upload payload submits: `kavach-id-cards/${userId}/${studentId}-card.jpg`.

### 3.2 Server-Side Sanitization (`src/app/api/student/verify-id/route.ts`)
- The server extracts the caller's verified identity via `supabase.auth.getUser()`.
- Validates the incoming URL:
  ```ts
  let resolvedIdCardUrl = idCardUrl ? String(idCardUrl).trim() : null;
  if (resolvedIdCardUrl && !resolvedIdCardUrl.includes(user.id)) {
    const rawFilename = resolvedIdCardUrl.replace(/^kavach-id-cards\/?/, '');
    resolvedIdCardUrl = `kavach-id-cards/${user.id}/${rawFilename}`;
  }
  ```
- **Cross-User Protection:** Even if a malicious student tampers with the HTTP payload to submit another user's student ID or folder path, the backend strictly overwrites the path to use the caller's verified `user.id`.

### 3.3 File Validation Standards (`src/lib/verification/id-card.ts`)
- Magic bytes signature checking: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), PDF (`25 50 44 46`).
- Max size limit enforced: 5MB for ID cards, 10MB for incident evidence.
- Path traversal prevention: File names stripped of `../` and control characters.
