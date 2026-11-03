import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
];

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

    // Generate 15-minute signed URLs for private downloads/previews
    const items = await Promise.all(
      (rawEvidence || []).map(async (ev) => {
        try {
          const rawPath = ev.file_path || '';
          const cleanPath = rawPath.replace(/^.*kavach-evidence\//, '');
          const { data: signedData } = await supabase.storage
            .from('kavach-evidence')
            .createSignedUrl(cleanPath, 900);

          return {
            id: ev.id,
            caseId: ev.case_id,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            type: ev.type,
            uploadedBy: ev.uploaded_by,
            createdAt: ev.created_at,
            signedUrl: signedData?.signedUrl || null,
          };
        } catch {
          return {
            id: ev.id,
            caseId: ev.case_id,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            type: ev.type,
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Evidence file is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum 25MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported format. Allowed: JPEG, PNG, WEBP, GIF, MP4, QuickTime, WebM, MP3, WAV, OGG, and PDF.' },
        { status: 400 }
      );
    }

    // Determine high-level evidence type
    let evidenceType = 'DOCUMENT';
    if (file.type.startsWith('image/')) evidenceType = 'IMAGE';
    else if (file.type.startsWith('video/')) evidenceType = 'VIDEO';
    else if (file.type.startsWith('audio/')) evidenceType = 'AUDIO';

    // File name normalization
    const rawName = file.name || 'safebox_evidence';
    const cleanFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID().substring(0, 8)}-${cleanFileName}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Storage client selection
    let storageClient = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (serviceRoleKey && serviceRoleKey.length > 30 && !serviceRoleKey.includes('placeholder')) {
      try {
        storageClient = createAdminClient();
      } catch {
        storageClient = supabase;
      }
    }

    const { error: uploadError } = await storageClient.storage
      .from('kavach-evidence')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Safe box storage upload failed:', uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const evidenceId = crypto.randomUUID();
    const targetCaseId = caseId && caseId.trim().length > 0 ? caseId.trim() : `SAFEBOX-${user.id.substring(0, 8).toUpperCase()}`;

    const { data: record, error: dbError } = await supabase
      .from('evidence')
      .insert({
        id: evidenceId,
        case_id: targetCaseId,
        type: evidenceType,
        file_path: storagePath,
        file_name: cleanFileName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Safe box database insert failed:', dbError);
      // Clean up orphaned storage object
      await storageClient.storage.from('kavach-evidence').remove([storagePath]).catch(() => undefined);
      return NextResponse.json({ error: 'Failed to record evidence in database' }, { status: 500 });
    }

    // Generate signed URL for immediate preview
    const { data: signedData } = await supabase.storage
      .from('kavach-evidence')
      .createSignedUrl(storagePath, 900);

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
          notes: notes || null,
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

    if (fetchErr || !existing) {
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
      await supabase.storage.from('kavach-evidence').remove([cleanPath]).catch(() => undefined);
    }

    return NextResponse.json({ success: true, message: 'Evidence deleted from Safe Box' }, { status: 200 });
  } catch (err: unknown) {
    console.error('Safe box DELETE error:', err);
    return NextResponse.json({ error: 'Failed to process evidence deletion' }, { status: 500 });
  }
}
