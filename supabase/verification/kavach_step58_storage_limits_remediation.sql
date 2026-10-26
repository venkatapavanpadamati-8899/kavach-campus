-- =============================================================================
-- KAVACH CAMPUS — STEP 58: STORAGE BUCKET LIMITS REMEDIATION SCRIPT
-- =============================================================================
-- PURPOSE:
-- Safely configure storage bucket file size limits and supported MIME types
-- on remote Supabase Storage ('kavach-evidence' and 'kavach-id-cards')
-- WITHOUT dropping, modifying, or weakening any existing Storage RLS policies.
--
-- TARGET DATABASE: Supabase PostgreSQL (polbnvszmvblwenfnqll)
-- EXECUTION METHOD: Manual execution in Supabase SQL Editor after review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PREFLIGHT CHECK (Read-Only: Inspect current state before making changes)
-- -----------------------------------------------------------------------------
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards')
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 2. SAFE REMEDIATION (Atomic UPDATEs with explicit WHERE guards)
-- -----------------------------------------------------------------------------
-- Evidence Bucket:
-- - Maximum File Size: 10 MiB (10 * 1024 * 1024 = 10,485,760 bytes)
-- - Allowed Formats: JPEG, PNG, WEBP, PDF, and MP4 Video
-- - Privacy: Strictly public = false (Private bucket)
UPDATE storage.buckets
SET 
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'application/pdf', 
        'video/mp4'
    ],
    public = false
WHERE id = 'kavach-evidence';

-- ID Cards Bucket:
-- - Maximum File Size: 5 MiB (5 * 1024 * 1024 = 5,242,880 bytes)
-- - Allowed Formats: JPEG, PNG, WEBP, and PDF documents
-- - Privacy: Strictly public = false (Private bucket)
UPDATE storage.buckets
SET 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'application/pdf'
    ],
    public = false
WHERE id = 'kavach-id-cards';

-- -----------------------------------------------------------------------------
-- 3. POST-CHANGE VERIFICATION (Confirm limits are now active)
-- -----------------------------------------------------------------------------
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('kavach-evidence', 'kavach-id-cards')
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 4. VERIFY POLICIES REMAIN INTACT (Zero policies modified or dropped)
-- -----------------------------------------------------------------------------
SELECT 
    policyname, 
    cmd, 
    roles, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
