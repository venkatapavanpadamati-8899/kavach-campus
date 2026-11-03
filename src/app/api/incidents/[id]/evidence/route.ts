import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateUploadSignature } from '@/lib/verification/upload-file';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Fetch parent incident to enforce authorization
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, student_id, assigned_to, college_id')
      .eq(isUuid ? 'id' : 'case_id', id)
      .single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // 2. Role verification
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, college_id')
      .eq('id', user.id)
      .single();

    // Cross-college tenant isolation
    if (userProfile?.role !== 'SUPER_ADMIN' && userProfile?.college_id && incident.college_id && userProfile.college_id !== incident.college_id) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to access evidence from another campus.' },
        { status: 403 }
      );
    }

    const isStudentOwner = incident.student_id === user.id;
    const isAssignedResponder = incident.assigned_to === user.id;
    const isSecurityOrAdmin = !!(userProfile && ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role));

    // Strict boundary: Only student owner, assigned responder, or security/admin can view evidence
    if (!isStudentOwner && !isAssignedResponder && !isSecurityOrAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to access evidence for this incident.' },
        { status: 403 }
      );
    }

    // 3. Fetch evidence records
    const targetCaseId = incident.case_id || incident.id;
    const { data: rawEvidence, error: evError } = await supabase
      .from('evidence')
      .select('id, case_id, file_path, file_name, file_size, mime_type, uploaded_by, created_at')
      .or(`case_id.eq.${targetCaseId},case_id.eq.${incident.id}`)
      .order('created_at', { ascending: false });

    if (evError) {
      return NextResponse.json({ error: 'Failed to retrieve evidence records' }, { status: 500 });
    }

    if (!rawEvidence || rawEvidence.length === 0) {
      return NextResponse.json({ success: true, evidence: [] }, { status: 200 });
    }

    // 4. Generate 15-minute signed URLs
    const evidenceWithUrls = await Promise.all(
      rawEvidence.map(async (ev) => {
        try {
          const rawPath = ev.file_path || '';
          const cleanPath = rawPath.replace(/^.*kavach-evidence\//, '');
          const { data: signedData, error: signedUrlError } = await supabase.storage
            .from('kavach-evidence')
            .createSignedUrl(cleanPath, 900);
          if (signedUrlError) {
            console.error('Incident evidence signed URL generation failed:', signedUrlError);
          }

          return {
            id: ev.id,
            caseId: ev.case_id,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            uploadedBy: ev.uploaded_by,
            createdAt: ev.created_at,
            signedUrl: signedData?.signedUrl || null,
          };
        } catch (error) {
          console.error('Incident evidence signed URL generation failed unexpectedly:', error);
          return {
            id: ev.id,
            caseId: ev.case_id,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            uploadedBy: ev.uploaded_by,
            createdAt: ev.created_at,
            signedUrl: null,
          };
        }
      })
    );

    return NextResponse.json({ success: true, evidence: evidenceWithUrls }, { status: 200 });
  } catch (error: unknown) {
    console.error('Incident evidence handler failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Fetch parent incident to enforce binding and authorization
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, student_id, assigned_to, college_id')
      .eq(isUuid ? 'id' : 'case_id', id)
      .single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // 2. Verify caller authorization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, college_id')
      .eq('id', user.id)
      .single();

    // Cross-college tenant isolation
    if (userProfile?.role !== 'SUPER_ADMIN' && userProfile?.college_id && incident.college_id && userProfile.college_id !== incident.college_id) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to upload evidence to another campus incident.' },
        { status: 403 }
      );
    }

    const isStudentOwner = incident.student_id === user.id;
    const isAssignedResponder = incident.assigned_to === user.id;
    const isSecurityOrAdmin = !!(userProfile && ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role));

    // Reject unauthorized users from uploading to another student's incident
    if (!isStudentOwner && !isAssignedResponder && !isSecurityOrAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to upload evidence to this incident.' },
        { status: 403 }
      );
    }

    // 3. Process multipart form data
    const formData = await req.formData();
    const fileValue = formData.get('file');

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: 'Evidence file is required' }, { status: 400 });
    }
    const file = fileValue;

    // 4. Validate file size (max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed 25MB limit' }, { status: 400 });
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

    // 6. Generate secure storage path bound to parent incident
    const rawName = file.name || 'evidence';
    const cleanFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${incident.case_id}/${Date.now()}-${crypto.randomUUID().substring(0, 8)}-${cleanFileName}`;

    // Upload to Supabase Storage
    // Check if service-role is configured for storage operations
    let storageClient = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (serviceRoleKey && serviceRoleKey.length > 30 && !serviceRoleKey.includes('placeholder')) {
      try {
        storageClient = createAdminClient();
      } catch (error) {
        console.error('Incident evidence admin storage client initialization failed; using the authenticated client:', error);
        storageClient = supabase;
      }
    }

    const { error: uploadError } = await storageClient.storage
      .from('kavach-evidence')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 7. Insert evidence record into public.evidence table
    let evidenceType = 'DOCUMENT';
    if (mimeType.startsWith('image/')) evidenceType = 'IMAGE';
    else if (mimeType.startsWith('video/')) evidenceType = 'VIDEO';
    else if (mimeType.startsWith('audio/')) evidenceType = 'AUDIO';

    const evidenceId = crypto.randomUUID();
    const { data: evidenceRecord, error: dbError } = await supabase
      .from('evidence')
      .insert({
        id: evidenceId,
        case_id: incident.case_id,
        type: evidenceType,
        file_path: storagePath,
        file_name: cleanFileName,
        file_size: file.size,
        mime_type: mimeType,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (dbError) {
      // Storage and metadata are separate services. Remove the newly uploaded
      // object if its database record cannot be created, avoiding orphaned
      // evidence that is not visible in the case timeline.
      console.error('Incident evidence metadata insert failed:', dbError);
      try {
        const { error: cleanupError } = await storageClient.storage
          .from('kavach-evidence')
          .remove([storagePath]);
        if (cleanupError) {
          console.error('Incident evidence storage cleanup after database failure failed:', cleanupError);
        }
      } catch (cleanupError) {
        console.error('Incident evidence storage cleanup after database failure threw:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to record evidence metadata' },
        { status: 500 }
      );
    }

    // 8. Generate short-lived signed URL
    const { data: signedData, error: signedUrlError } = await supabase.storage
      .from('kavach-evidence')
      .createSignedUrl(storagePath, 900);
    if (signedUrlError) {
      console.error('Incident evidence signed URL generation failed:', signedUrlError);
    }

    // 9. Audit log
    const { error: auditLogError } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'EVIDENCE_UPLOADED',
      entity_type: 'evidence',
      entity_id: evidenceRecord.id,
      metadata: { case_id: incident.case_id, file_name: cleanFileName, file_size: file.size }
    });
    if (auditLogError) {
      console.error('Incident evidence audit log insert failed:', auditLogError);
    }

    return NextResponse.json(
      {
        success: true,
        evidence: {
          id: evidenceRecord.id,
          caseId: incident.case_id,
          fileName: cleanFileName,
          filePath: storagePath,
          fileSize: file.size,
          mimeType,
          signedUrl: signedData?.signedUrl || null,
          createdAt: evidenceRecord.created_at
        }
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Incident evidence upload handler failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
