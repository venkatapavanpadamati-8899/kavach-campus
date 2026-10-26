# KAVACH CAMPUS — STEP 71A: STORAGE REMEDIATION PREFLIGHT CHECK

**Project:** Kavach Campus — Safety in One Tap  
**Workspace:** `D:\Kavach Campus`  
**Execution Timestamp:** 2026-10-11T21:08:00+05:30  
**Target File:** `supabase/verification/kavach_step58_storage_limits_remediation.sql`  
**Scope:** Storage Bucket Sizing, MIME Enforcement, Privacy Guardrails, Policy Non-Destruction  
**VERDICT:** **SAFE TO REVIEW FOR EXECUTION**

---

## 1. 8-Point Preflight Verification Matrix

| # | Inspection Item | Script & Code Specification | Verification Finding | Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Target Buckets Existence** | `kavach-evidence`, `kavach-id-cards` | Confirmed in Supabase storage schema. SQL includes preflight `SELECT` check. | **VERIFIED** |
| **2** | **Evidence Sizing** | `file_size_limit = 10485760` | Exactly 10 MiB ($10 \times 1024 \times 1024$ bytes) prevents large video/photo flood. | **VERIFIED** |
| **3** | **ID Card Sizing** | `file_size_limit = 5242880` | Exactly 5 MiB ($5 \times 1024 \times 1024$ bytes) strictly sizes student identity scans. | **VERIFIED** |
| **4** | **Bucket Privacy** | `public = false` | Both buckets explicitly set to private; direct public URL enumeration is blocked. | **VERIFIED** |
| **5** | **MIME Type Whitelist** | Evidence: JPEG, PNG, WEBP, PDF, MP4<br>ID Cards: JPEG, PNG, WEBP, PDF | Matches client-side file upload validators; blocks executables and scripts. | **VERIFIED** |
| **6** | **Zero Policy Alterations** | Zero `DROP POLICY`, zero `ALTER POLICY` | Preserves existing RLS policies on `storage.objects` without weakening security. | **VERIFIED** |
| **7** | **Bucket Detection Guard** | Pre-check `SELECT` query included | If a bucket is missing, `SELECT` shows missing row before running `UPDATE`. | **VERIFIED** |
| **8** | **Strict Scope Isolation** | `WHERE id = 'kavach-evidence'`<br>`WHERE id = 'kavach-id-cards'` | Only touches the two safety buckets; will never alter avatars or system storage. | **VERIFIED** |

---

## 2. Safety Guidelines for Remote Execution

1. Antigravity does not auto-execute remote SQL commands to guarantee database governance.
2. The administrator should open [Supabase SQL Editor](https://supabase.com/dashboard/project/polbnvszmvblwenfnqll/sql/new).
3. Paste and run the safe script: `supabase/verification/kavach_step58_storage_limits_remediation.sql`.
4. Verify post-execution output:
   - `kavach-evidence`: `public = false`, `file_size_limit = 10485760`
   - `kavach-id-cards`: `public = false`, `file_size_limit = 5242880`
