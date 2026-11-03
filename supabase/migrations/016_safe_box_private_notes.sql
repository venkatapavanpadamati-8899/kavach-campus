CREATE TABLE IF NOT EXISTS public.safe_box_private_notes (
  evidence_id UUID PRIMARY KEY REFERENCES public.evidence(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_note TEXT NOT NULL CHECK (char_length(private_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.safe_box_private_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own Safe Box notes" ON public.safe_box_private_notes;
CREATE POLICY "Students manage own Safe Box notes"
ON public.safe_box_private_notes
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.evidence
    WHERE evidence.id = safe_box_private_notes.evidence_id
      AND evidence.uploaded_by = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.safe_box_private_notes
TO authenticated;
