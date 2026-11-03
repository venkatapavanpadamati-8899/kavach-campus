-- Store an applicant's selected institution for campus review without granting
-- tenant membership. Only a privileged reviewer may apply it to profiles.
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS claimed_college_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;

CREATE INDEX IF NOT EXISTS idx_student_profiles_claimed_college_status
  ON public.student_profiles (claimed_college_id, verification_status)
  WHERE claimed_college_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kavach-profile-photos',
  'kavach-profile-photos',
  FALSE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
CREATE POLICY "Users read own profile photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'kavach-profile-photos'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);
