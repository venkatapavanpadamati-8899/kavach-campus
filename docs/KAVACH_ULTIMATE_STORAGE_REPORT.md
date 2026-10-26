# KAVACH CAMPUS — ULTIMATE STORAGE & ID VERIFICATION REPORT

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** October 19, 2026  
**Auditor:** Antigravity Autonomous Security Subsystem  
**Test Suite Reference:** `src/__tests__/student-id-verification.test.ts` (34 tests passed)

---

## 1. Storage Buckets Configuration & Security

The application manages two dedicated object storage buckets:

| Bucket Name | Public Access | Allowed MIME Types | File Size Limit | Storage Folder Structure |
|:---|:---:|:---|:---:|:---|
| `kavach-evidence` | 🔴 **FALSE** (Private) | `image/jpeg`, `image/png`, `image/webp`, `audio/mp4`, `audio/mpeg`, `video/mp4` | 25 MB | `${incident_id}/${user_id}/${file_name}` |
| `kavach-id-cards` | 🔴 **FALSE** (Private) | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | 10 MB | `${user_id}/${timestamp}_id_card.${ext}` |

---

## 2. Storage Authorization Policies

1. **Upload Path Enforcement:**
   - Both client upload hooks and server verification endpoints force uploads into folders prefixed with the caller's verified `auth.uid()`.
   - Any attempt to upload to an arbitrary root path or another student's UUID is blocked by PostgreSQL storage policies:
     ```sql
     CREATE POLICY "student_upload_own_id_card"
     ON storage.objects FOR INSERT TO authenticated
     WITH CHECK (
       bucket_id = 'kavach-id-cards' AND
       (storage.foldername(name))[1] = auth.uid()::text
     );
     ```
2. **Short-Lived Signed URLs:**
   - Direct public access to uploaded photos or student ID cards returns `403 Forbidden`.
   - Access is mediated exclusively through time-limited signed URLs (TTL: 15 minutes for staff review; 5 minutes for student preview).
3. **MIME Type & Size Validation:**
   - Client and server inspect file magic bytes and Content-Type headers. Executable binaries, scripts (`.exe`, `.sh`, `.php`), and HTML files are strictly rejected.
