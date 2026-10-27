import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateStudentId,
  validateAcademicBatch,
  validateIdCardFile,
  validateFileSignature,
  evaluateVerificationDecision,
  AdmissionType,
} from '@/lib/verification/id-card';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, college_email, student_id, role, is_approved, department, college_id')
      .eq('id', user.id)
      .single();

    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      profile,
      studentProfile: studentProfile || {
        verification_status: 'PENDING_UPLOAD',
        admission_type: 'REGULAR',
      },
    });
  } catch (error) {
    console.error('Fetch verification status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let studentId = '';
    let admissionType: AdmissionType = 'REGULAR';
    let admissionYear = 2024;
    let expectedGraduationYear = 2028;
    let collegeId = '';
    let idCardUrl: string | null = null;
    let ocrText = '';
    let uploadedFileBuffer: Buffer | null = null;
    let uploadedFileMime = '';
    let uploadedFileName = '';

    let incomingFullName = '';
    let incomingDepartment = '';
    let profilePhotoDataUrl = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      studentId = (formData.get('studentId') as string) || '';
      admissionType = ((formData.get('admissionType') as string) || 'REGULAR') as AdmissionType;
      admissionYear = Number(formData.get('admissionYear'));
      expectedGraduationYear = Number(formData.get('expectedGraduationYear'));
      collegeId = (formData.get('collegeId') as string) || '';
      ocrText = (formData.get('ocrText') as string) || '';

      incomingFullName = (formData.get('fullName') as string) || '';
      incomingDepartment = (formData.get('department') as string) || '';
      profilePhotoDataUrl = (formData.get('profilePhoto') as string) || '';

      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        // Validate file size and MIME format
        const fileValidation = validateIdCardFile({
          size: file.size,
          type: file.type,
          name: file.name,
        });
        if (!fileValidation.valid) {
          return NextResponse.json({ error: fileValidation.error }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        uploadedFileBuffer = Buffer.from(arrayBuffer);
        uploadedFileMime = file.type;
        uploadedFileName = file.name || 'id-card.jpg';

        // Validate binary magic bytes
        const signatureCheck = validateFileSignature(new Uint8Array(uploadedFileBuffer));
        if (!signatureCheck.valid) {
          return NextResponse.json({ error: signatureCheck.error }, { status: 400 });
        }
      }
    } else {
      const body = await req.json();
      studentId = body.studentId || '';
      admissionType = (body.admissionType || 'REGULAR') as AdmissionType;
      admissionYear = Number(body.admissionYear);
      expectedGraduationYear = Number(body.expectedGraduationYear);
      collegeId = body.collegeId || '';
      idCardUrl = body.idCardUrl || null;
      ocrText = body.ocrText || '';
    }

    // 1. Validate Student ID format (7-10 alphanumeric characters)
    const idValidation = validateStudentId(studentId);
    if (!idValidation.valid) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    // 2. Validate Academic Batch Duration (Regular: 4 yrs, Lateral: 3 yrs)
    const batchValidation = validateAcademicBatch(
      admissionType as AdmissionType,
      Number(admissionYear),
      Number(expectedGraduationYear)
    );
    if (!batchValidation.valid) {
      return NextResponse.json({ error: batchValidation.error }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
      !serviceRoleKey.includes('placeholder');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Student verification service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();

    // 3. Duplicate Student ID Check: Ensure no other student registered with this ID
    const { data: existingProfiles } = await adminSupabase
      .from('profiles')
      .select('id, student_id')
      .eq('student_id', studentId.trim())
      .neq('id', user.id);

    if (existingProfiles && existingProfiles.length > 0) {
      return NextResponse.json(
        { error: `Student ID ${studentId} is already registered by another account. Contact campus security for duplicate resolution.` },
        { status: 409 }
      );
    }

    // Fetch caller profile for name comparison
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, department')
      .eq('id', user.id)
      .single();

    const fullName = profile?.full_name || 'Student';

    // 4. Evaluate decision based on OCR text, batch consistency, and ID match
    const decision = evaluateVerificationDecision({
      fullName,
      studentId: studentId.trim(),
      admissionType: admissionType as AdmissionType,
      admissionYear: Number(admissionYear),
      expectedGraduationYear: Number(expectedGraduationYear),
      ocrExtractedText: ocrText,
    });

    // 5. Upload file to private storage bucket if uploaded, or enforce user.id isolation
    let resolvedIdCardUrl = idCardUrl ? String(idCardUrl).trim() : null;
    if (uploadedFileBuffer) {
      const cleanFileName = uploadedFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${Date.now()}-${cleanFileName}`;

      const { error: uploadError } = await adminSupabase.storage
        .from('kavach-id-cards')
        .upload(storagePath, uploadedFileBuffer, {
          contentType: uploadedFileMime,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json(
          { error: `ID Card document upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      resolvedIdCardUrl = `kavach-id-cards/${storagePath}`;
    } else if (resolvedIdCardUrl && !resolvedIdCardUrl.includes(user.id)) {
      const rawFilename = resolvedIdCardUrl.replace(/^kavach-id-cards\/?/, '');
      resolvedIdCardUrl = `kavach-id-cards/${user.id}/${rawFilename}`;
    }

    // 6. Update student_profiles table
    const updates = {
      id: user.id,
      admission_type: admissionType,
      admission_year: Number(admissionYear),
      expected_graduation_year: Number(expectedGraduationYear),
      id_card_url: resolvedIdCardUrl,
      verification_status: decision.status,
      verification_notes: decision.reason,
      updated_at: new Date().toISOString(),
      ...(decision.status === 'VERIFIED' ? { verified_at: new Date().toISOString() } : {}),
    };

    const { error: upsertError } = await adminSupabase
      .from('student_profiles')
      .upsert(updates, { onConflict: 'id' });

    if (upsertError) {
      console.error('Upsert student profile error:', upsertError);
      throw upsertError;
    }

    // Update profile student_id and college affiliation if verified
    const profileUpdates: Record<string, unknown> = {
      student_id: studentId.trim(),
      is_approved: decision.status === 'VERIFIED',
    };
    if (collegeId && collegeId.trim()) {
      profileUpdates.college_id = collegeId.trim();
    }
    if (incomingFullName && incomingFullName.trim()) {
      profileUpdates.full_name = incomingFullName.trim();
    }
    if (incomingDepartment && incomingDepartment.trim()) {
      profileUpdates.department = incomingDepartment.trim();
    }

    if (profilePhotoDataUrl && profilePhotoDataUrl.includes('base64,')) {
      try {
        const base64Data = profilePhotoDataUrl.split('base64,')[1];
        const avatarBuffer = Buffer.from(base64Data, 'base64');
        const avatarPath = `${user.id}/avatar.jpg`;
        await adminSupabase.storage
          .from('kavach-id-cards')
          .upload(avatarPath, avatarBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });
      } catch (err) {
        console.warn('Extracted portrait photo upload ignored:', err);
      }
    }

    await adminSupabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id);

    // 6. Record in immutable audit log
    await adminSupabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      actor_id: user.id,
      action: 'STUDENT_ID_VERIFICATION_EVALUATED',
      entity_type: 'student_profiles',
      entity_id: user.id,
      metadata: {
        studentId: studentId.trim(),
        admissionType,
        batchDuration: batchValidation.duration,
        resultingStatus: decision.status,
        reason: decision.reason,
      },
    });

    return NextResponse.json({
      success: true,
      verificationStatus: decision.status,
      message: decision.reason,
      isAutoApproved: decision.isAutoApproved,
    });
  } catch (error) {
    console.error('Student ID verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
