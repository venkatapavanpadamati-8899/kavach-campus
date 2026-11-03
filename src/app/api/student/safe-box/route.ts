import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateUploadSignature } from '@/lib/verification/upload-file';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

async function requireStudentRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<NextResponse | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Safe box role verification failed:', error);
    return NextResponse.json({ error: 'Unable to verify Safe Box access' }, { status: 500 });
  }
  if (profile?.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student access required' }, { status: 403 });
  }
  return null;
}

/**
 * GET /api/student/safe-box
 * Returns all confidential evidence and media belonging to the authenticated student.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleError = await requireStudentRole(supabase, user.id);
    if (roleError) return roleError;

    // Query evidence uploaded by this user
    const { data: rawEvidence, error: dbError } = await supabase
      .from('evidence')
      .select('id, case_id, file_path, file_name, file_size, mime_type, type, uploaded_by, created_at')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Safe box fetch error:', dbError);
      return NextResponse.json({ error: 'Failed to retrieve Safe Box records' }, { status: 500 });
    }

    const noteByEvidenceId = new Map<string, string>();
    if (rawEvidence?.length) {
      const { data: privateNotes, error: notesError } = await supabase
        .from('safe_box_private_notes')
        .select('evidence_id, private_note')
        .eq('owner_id', user.id)
        .in('evidence_id', rawEvidence.map((item) => item.id));

      if (notesError) {
        console.error('Safe box private note fetch error:', notesError);
        return NextResponse.json({ error: 'Failed to retrieve private Safe Box notes' }, { status: 500 });
      }

      for (const note of privateNotes || []) {
        noteByEvidenceId.set(note.evidence_id, note.private_note);
      }
    }

    // Generate 15-minute signed URLs for private downloads/previews
    const items = await Promise.all(
      (rawEvidence || []).map(async (ev) => {
        try {
          const rawPath = ev.file_path || '';
          const cleanPath = rawPath.replace(/^.*kavach-evidence\//, '');
          const { data: signedData, error: signedUrlError } = await supabase.storage
            .from('kavach-evidence')
            .createSignedUrl(cleanPath, 900);
          if (signedUrlError) {
            console.error('Safe box signed URL generation failed:', signedUrlError);
          }

          return {
            id: ev.id,
            caseId: ev.case_id,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            type: ev.type,
            notes: noteByEvidenceId.get(ev.id) || null,
            uploadedBy: ev.uploaded_by,
            createdAt: ev.created_at,
            signedUrl: signedData?.signedUrl || null,
          };
        } catch (error) {
          console.error('Safe box signed URL generation failed unexpectedly:', error);
          return {
            id: ev.id,
            caseId: ev.case_id,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            type: ev.type,
            notes: noteByEvidenceId.get(ev.id) || null,
            uploadedBy: ev.uploaded_by,
            createdAt: ev.created_at,
            signedUrl: null,
          };
        }
      })
    );

    return NextResponse.json({ success: true, count: items.length, items }, { status: 200 });
  } catch (err: unknown) {
    console.error('Safe box handler error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred while loading Safe Box' }, { status: 500 });
  }
}

/**
 * POST /api/student/safe-box
 * Uploads a private evidence file (photo, video, audio note, document) to the student's Safe Box.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleError = await requireStudentRole(supabase, user.id);
    if (roleError) return roleError;

    const formData = await req.formData();
    const fileValue = formData.get('file');
    const caseIdValue = formData.get('caseId');
    const notesValue = formData.get('notes');

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: 'Evidence file is required' }, { status: 400 });
    }
    const file = fileValue;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 25MB limit' }, { status: 400 });
    }

    if (caseIdValue !== null && typeof caseIdValue !== 'string') {
      return NextResponse.json({ error: 'Case ID must be text.' }, { status: 400 });
    }
    if (notesValue !== null && typeof notesValue !== 'string') {
      return NextResponse.json({ error: 'Private note must be text.' }, { status: 400 });
    }
    const requestedCaseId = typeof caseIdValue === 'string' ? caseIdValue.trim() : '';
    const privateNote = typeof notesValue === 'string' ? notesValue.trim() : '';
    if (requestedCaseId.length > 80) {
      return NextResponse.json({ error: 'Case ID must be 80 characters or fewer.' }, { status: 400 });
    }
    if (privateNote.length > 2000) {
      return NextResponse.json({ error: 'Private note must be 2,000 characters or fewer.' }, { status: 400 });
    }

    let targetCaseId: string | null = null;
    if (requestedCaseId) {
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('case_id')
        .eq('case_id', requestedCaseId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (incidentError) {
        console.error('Safe box case reference lookup failed:', incidentError);
        return NextResponse.json({ error: 'Unable to verify the case reference.' }, { status: 500 });
      }
      if (!incident) {
        return NextResponse.json({ error: 'Case reference not found or not owned by this account.' }, { status: 404 });
      }
      targetCaseId = incident.case_id;
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const signatureCheck = validateUploadSignature(new Uint8Array(fileBuffer), file.type);
    if (!signatureCheck.valid || !signatureCheck.mimeType) {
      return NextResponse.json(
        { error: signatureCheck.error || 'Unsupported or invalid file content.' },
        { status: 400 }
      );
    }
    const mimeType = signatureCheck.mimeType;

    // Determine high-level evidence type
    let evidenceType = 'DOCUMENT';
    if (mimeType.startsWith('image/')) evidenceType = 'IMAGE';
    else if (mimeType.startsWith('video/')) evidenceType = 'VIDEO';
    else if (mimeType.startsWith('audio/')) evidenceType = 'AUDIO';

    // File name normalization
    const rawName = file.name || 'safebox_evidence';
    const cleanFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID().substring(0, 8)}-${cleanFileName}`;

    // Storage client selection
    let storageClient = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (serviceRoleKey && serviceRoleKey.length > 30 && !serviceRoleKey.includes('placeholder')) {
      try {
        storageClient = createAdminClient();
      } catch (error) {
        console.error('Safe box admin storage client initialization failed; using the authenticated client:', error);
        storageClient = supabase;
      }
    }

    const { error: uploadError } = await storageClient.storage
      .from('kavach-evidence')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Safe box storage upload failed:', uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const evidenceId = crypto.randomUUID();
    const { data: record, error: dbError } = await supabase
      .from('evidence')
      .insert({
        id: evidenceId,
        case_id: targetCaseId,
        type: evidenceType,
        file_path: storagePath,
        file_name: cleanFileName,
        file_size: file.size,
        mime_type: mimeType,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Safe box database insert failed:', dbError);
      try {
        const { error: cleanupError } = await storageClient.storage
          .from('kavach-evidence')
          .remove([storagePath]);
        if (cleanupError) {
          console.error('Safe box storage cleanup after database failure failed:', cleanupError);
        }
      } catch (cleanupError) {
        console.error('Safe box storage cleanup after database failure threw:', cleanupError);
      }
      return NextResponse.json({ error: 'Failed to record evidence in database' }, { status: 500 });
    }

    if (privateNote) {
      const { error: noteError } = await supabase.from('safe_box_private_notes').insert({
        evidence_id: record.id,
        owner_id: user.id,
        private_note: privateNote,
      });

      if (noteError) {
        console.error('Safe box private note save failed:', noteError);
        const { error: cleanupError } = await supabase
          .from('evidence')
          .delete()
          .eq('id', record.id)
          .eq('uploaded_by', user.id);
        if (cleanupError) {
          console.error('Safe box evidence cleanup after note failure failed:', cleanupError);
        }
        const { error: storageCleanupError } = await storageClient.storage
          .from('kavach-evidence')
          .remove([storagePath]);
        if (storageCleanupError) {
          console.error('Safe box storage cleanup after note failure failed:', storageCleanupError);
        }
        return NextResponse.json({ error: 'Failed to save the private note; the upload was rolled back.' }, { status: 500 });
      }
    }

    // Generate signed URL for immediate preview
    const { data: signedData, error: signedUrlError } = await supabase.storage
      .from('kavach-evidence')
      .createSignedUrl(storagePath, 900);
    if (signedUrlError) {
      console.error('Safe box preview URL generation failed:', signedUrlError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Evidence successfully secured in your Safe Box',
        item: {
          id: record.id,
          caseId: record.case_id,
          fileName: record.file_name,
          fileSize: record.file_size,
          mimeType: record.mime_type,
          type: record.type,
          notes: privateNote || null,
          createdAt: record.created_at,
          signedUrl: signedData?.signedUrl || null,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Safe box POST error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred during evidence upload' }, { status: 500 });
  }
}

/**
 * DELETE /api/student/safe-box
 * Removes an evidence item owned by the authenticated student.
 */
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleError = await requireStudentRole(supabase, user.id);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Evidence ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('evidence')
      .select('id, file_path, uploaded_by')
      .eq('id', id)
      .eq('uploaded_by', user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Safe box ownership lookup failed:', fetchErr);
      return NextResponse.json({ error: 'Unable to verify evidence ownership' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Evidence record not found or access denied' }, { status: 404 });
    }

    // Delete from database
    const { error: delErr } = await supabase
      .from('evidence')
      .delete()
      .eq('id', id)
      .eq('uploaded_by', user.id);

    if (delErr) {
      console.error('Safe box DB delete error:', delErr);
      return NextResponse.json({ error: 'Failed to delete evidence record' }, { status: 500 });
    }

    // Remove from storage
    if (existing.file_path) {
      const cleanPath = existing.file_path.replace(/^.*kavach-evidence\//, '');
      const { error: storageError } = await supabase.storage.from('kavach-evidence').remove([cleanPath]);
      if (storageError) {
        console.error('Safe box storage delete failed:', storageError);
        return NextResponse.json({ error: 'Evidence record deleted, but its storage file could not be removed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Evidence deleted from Safe Box' }, { status: 200 });
  } catch (err: unknown) {
    console.error('Safe box DELETE error:', err);
    return NextResponse.json({ error: 'Failed to process evidence deletion' }, { status: 500 });
  }
}
