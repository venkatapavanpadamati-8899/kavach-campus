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
import { getCollegeById, resolveCollegeIdFromEmail } from '@/lib/colleges';

function getOwnedIdCardStoragePath(value: string | null | undefined, userId: string): string | null {
  const prefix = 'kavach-id-cards/';
  if (!value) return null;
  const path = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  const segments = path.split('/');
  if (
    segments[0] !== userId ||
    segments.some(segment => !segment || segment === '.' || segment === '..')
  ) {
    return null;
  }
  return path;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, college_email, student_id, role, is_approved, department, college_id')
      .eq('id', user.id)
      .single();
    if (profileError) {
      console.error('Fetch verification profile failed:', profileError);
      return NextResponse.json({ error: 'Unable to load your verification profile.' }, { status: 500 });
    }
    if (profile.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student account required.' }, { status: 403 });
    }

    const { data: studentProfile, error: studentProfileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (studentProfileError) {
      console.error('Fetch student verification record failed:', studentProfileError);
      return NextResponse.json({ error: 'Unable to load your verification status.' }, { status: 500 });
    }

    const frontPath = getOwnedIdCardStoragePath(
      studentProfile?.id_card_url || studentProfile?.ocr_extracted_data?.front_url,
      user.id
    );
    const backPath = getOwnedIdCardStoragePath(studentProfile?.ocr_extracted_data?.back_url, user.id);
    let idCardPreviewUrl: string | null = null;
    let idCardBackPreviewUrl: string | null = null;
    if (frontPath) {
      const { data, error } = await supabase.storage.from('kavach-id-cards').createSignedUrl(frontPath, 300);
      if (error) {
        console.error('Sign student ID front URL failed:', error);
        return NextResponse.json({ error: 'Unable to load your ID card preview.' }, { status: 500 });
      }
      idCardPreviewUrl = data.signedUrl;
    }
    if (backPath) {
      const { data, error } = await supabase.storage.from('kavach-id-cards').createSignedUrl(backPath, 300);
      if (error) {
        console.error('Sign student ID back URL failed:', error);
        return NextResponse.json({ error: 'Unable to load your ID card preview.' }, { status: 500 });
      }
      idCardBackPreviewUrl = data.signedUrl;
    }

    return NextResponse.json({
      profile,
      studentProfile: studentProfile || {
        verification_status: 'PENDING_UPLOAD',
        admission_type: 'REGULAR',
      },
      idCardStoragePath: frontPath ? `kavach-id-cards/${frontPath}` : null,
      idCardBackStoragePath: backPath ? `kavach-id-cards/${backPath}` : null,
      idCardPreviewUrl,
      idCardBackPreviewUrl,
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
    let idCardUrl: string | null = null;
    let idCardBackUrl: string | null = null;
    let uploadedFileBuffer: Buffer | null = null;
    let uploadedFileMime = '';
    let uploadedFileName = '';

    let incomingFullName = '';
    let incomingDepartment = '';
    let incomingBranch = '';
    let incomingSection = '';
    let incomingDob = '';
    let incomingGender = '';
    let incomingParentPhone = '';
    let incomingEmergencyPhone = '';
    let incomingPersonalPhone = '';
    let incomingAddress = '';
    let incomingAccommodation = 'Day Scholar';
    let profilePhotoDataUrl = '';
    let profilePhotoBuffer: Buffer | null = null;
    let profilePhotoMime = '';
    let incomingClaimedCollegeId = '';

    let uploadedBackFileBuffer: Buffer | null = null;
    let uploadedBackFileMime = '';
    let uploadedBackFileName = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      studentId = (formData.get('studentId') as string) || '';
      admissionType = ((formData.get('admissionType') as string) || 'REGULAR') as AdmissionType;
      admissionYear = Number(formData.get('admissionYear'));
      expectedGraduationYear = Number(formData.get('expectedGraduationYear'));
      incomingClaimedCollegeId = String(formData.get('claimedCollegeId') || formData.get('collegeId') || '');
      idCardUrl = String(formData.get('idCardUrl') || '') || null;
      idCardBackUrl = String(formData.get('idCardBackUrl') || '') || null;

      incomingFullName = (formData.get('fullName') as string) || '';
      incomingDepartment = (formData.get('department') as string) || '';
      incomingBranch = (formData.get('branch') as string) || '';
      incomingSection = (formData.get('section') as string) || '';
      incomingDob = (formData.get('dob') as string) || '';
      incomingGender = (formData.get('gender') as string) || '';
      incomingParentPhone = (formData.get('parentPhone') as string) || '';
      incomingEmergencyPhone = (formData.get('emergencyPhone') as string) || '';
      incomingPersonalPhone = (formData.get('personalPhone') as string) || (formData.get('phone') as string) || '';
      incomingAddress = (formData.get('address') as string) || '';
      incomingAccommodation = (formData.get('residentialStatus') as string) || (formData.get('accommodationType') as string) || 'Day Scholar';
      profilePhotoDataUrl = (formData.get('profilePhoto') as string) || '';

      // ID Card Front File
      const fileFront = (formData.get('fileFront') || formData.get('file')) as File | null;
      if (fileFront && fileFront.size > 0) {
        const frontValidation = validateIdCardFile({
          size: fileFront.size,
          type: fileFront.type,
          name: fileFront.name,
        });
        if (!frontValidation.valid) {
          return NextResponse.json({ error: `Front ID Card: ${frontValidation.error}` }, { status: 400 });
        }

        const arrayBuffer = await fileFront.arrayBuffer();
        uploadedFileBuffer = Buffer.from(arrayBuffer);
        uploadedFileMime = fileFront.type;
        uploadedFileName = fileFront.name || 'id-card-front.jpg';

        const signatureCheck = validateFileSignature(new Uint8Array(uploadedFileBuffer));
        if (!signatureCheck.valid) {
          return NextResponse.json({ error: `Front ID Card: ${signatureCheck.error}` }, { status: 400 });
        }
      }

      // ID Card Back File (Optional but validated if provided)
      const fileBack = formData.get('fileBack') as File | null;
      if (fileBack && fileBack.size > 0) {
        const backValidation = validateIdCardFile({
          size: fileBack.size,
          type: fileBack.type,
          name: fileBack.name,
        });
        if (!backValidation.valid) {
          return NextResponse.json({ error: `Back ID Card: ${backValidation.error}` }, { status: 400 });
        }

        const arrayBuffer = await fileBack.arrayBuffer();
        uploadedBackFileBuffer = Buffer.from(arrayBuffer);
        uploadedBackFileMime = fileBack.type;
        uploadedBackFileName = fileBack.name || 'id-card-back.jpg';

        const signatureCheck = validateFileSignature(new Uint8Array(uploadedBackFileBuffer));
        if (!signatureCheck.valid) {
          return NextResponse.json({ error: `Back ID Card: ${signatureCheck.error}` }, { status: 400 });
        }
      }
    } else {
      const body = await req.json();
      studentId = body.studentId || '';
      admissionType = (body.admissionType || 'REGULAR') as AdmissionType;
      admissionYear = Number(body.admissionYear);
      expectedGraduationYear = Number(body.expectedGraduationYear);
      idCardUrl = body.idCardUrl || null;
      idCardBackUrl = body.idCardBackUrl || null;
      incomingClaimedCollegeId = typeof body.claimedCollegeId === 'string'
        ? body.claimedCollegeId
        : (typeof body.collegeId === 'string' ? body.collegeId : '');
    }

    if (profilePhotoDataUrl) {
      const photoMatch = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(profilePhotoDataUrl);
      if (!photoMatch) {
        return NextResponse.json({ error: 'Profile photo must be a JPEG, PNG, or WEBP image.' }, { status: 400 });
      }

      profilePhotoMime = photoMatch[1];
      profilePhotoBuffer = Buffer.from(photoMatch[2], 'base64');
      if (profilePhotoBuffer.length > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Profile photo must be no larger than 2MB.' }, { status: 400 });
      }
      const photoSignature = validateFileSignature(new Uint8Array(profilePhotoBuffer));
      if (!photoSignature.valid || photoSignature.detectedMime !== profilePhotoMime) {
        return NextResponse.json({ error: 'Profile photo content does not match its image format.' }, { status: 400 });
      }
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
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, full_name, department, college_id, college_email, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Student ID verification profile lookup failed:', profileError);
      return NextResponse.json({ error: 'Unable to verify your account. Please try again.' }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: 'Account profile not found' }, { status: 404 });
    }
    if (profile.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only student accounts can submit student ID verification.' }, { status: 403 });
    }

    const claimedCollege = getCollegeById(incomingClaimedCollegeId);
    const profileCollegeId = typeof profile.college_id === 'string' &&
      profile.college_id !== 'PENDING_CAMPUS_VERIFICATION' &&
      getCollegeById(profile.college_id)
      ? getCollegeById(profile.college_id)?.id || ''
      : '';
    const emailCollegeId = resolveCollegeIdFromEmail(profile.college_email);
    const trustedCollegeId = profileCollegeId ||
      (emailCollegeId !== 'PENDING_CAMPUS_VERIFICATION' ? emailCollegeId : '');

    if (trustedCollegeId && claimedCollege && trustedCollegeId !== claimedCollege.id) {
      return NextResponse.json(
        { error: 'The selected college does not match your verified institutional email or account. Contact campus support if this is incorrect.' },
        { status: 403 }
      );
    }
    const collegeClaimForReview = trustedCollegeId || claimedCollege?.id || '';
    if (!collegeClaimForReview) {
      return NextResponse.json({ error: 'Select a college from the verified directory before submitting your ID card.' }, { status: 400 });
    }

    // 3. Duplicate Student ID Check: Ensure no other student registered with this ID
    const { data: existingProfiles, error: existingProfilesError } = await adminSupabase
      .from('profiles')
      .select('id, student_id')
      .eq('student_id', studentId.trim())
      .neq('id', user.id);
    if (existingProfilesError) {
      console.error('Duplicate student ID lookup failed:', existingProfilesError);
      return NextResponse.json({ error: 'Unable to verify the student ID right now. Please try again.' }, { status: 500 });
    }

    if (existingProfiles && existingProfiles.length > 0) {
      return NextResponse.json(
        { error: `Student ID ${studentId} is already registered by another account. Contact campus security for duplicate resolution.` },
        { status: 409 }
      );
    }

    // The client may provide a claimed college for manual review, but it never
    // controls authorization or the persistent campus assignment.
    const fullName = profile.full_name || 'Student';

    // No OCR provider is configured. Client-supplied text is not evidence; keep
    // the request in the manual-review queue until an authorized reviewer acts.
    const evaluatedDecision = evaluateVerificationDecision({
      fullName,
      studentId: studentId.trim(),
      admissionType: admissionType as AdmissionType,
      admissionYear: Number(admissionYear),
      expectedGraduationYear: Number(expectedGraduationYear),
      ocrExtractedText: '',
    });
    const decision = trustedCollegeId
      ? evaluatedDecision
      : {
        status: 'PENDING_MANUAL_REVIEW' as const,
        reason: 'Campus assignment requires administrator review before identity approval.',
        isAutoApproved: false,
      };

    // 5. Upload files to private storage bucket if uploaded, or enforce user.id isolation
    let resolvedIdCardUrl = idCardUrl ? String(idCardUrl).trim() : null;
    let resolvedIdCardBackUrl: string | null = idCardBackUrl;
    if (!uploadedFileBuffer && !resolvedIdCardUrl) {
      return NextResponse.json({ error: 'Upload your college ID card before submitting verification.' }, { status: 400 });
    }
    if (resolvedIdCardUrl) {
      const ownedPath = getOwnedIdCardStoragePath(resolvedIdCardUrl, user.id);
      if (!ownedPath) {
        return NextResponse.json({ error: 'The saved ID card path is not owned by this account.' }, { status: 403 });
      }
      resolvedIdCardUrl = `kavach-id-cards/${ownedPath}`;
    }
    if (resolvedIdCardBackUrl) {
      const ownedPath = getOwnedIdCardStoragePath(resolvedIdCardBackUrl, user.id);
      if (!ownedPath) {
        return NextResponse.json({ error: 'The saved back-side ID card path is not owned by this account.' }, { status: 403 });
      }
      resolvedIdCardBackUrl = `kavach-id-cards/${ownedPath}`;
    }

    if (uploadedFileBuffer) {
      const cleanFileName = uploadedFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${Date.now()}-front-${cleanFileName}`;

      const { error: uploadError } = await adminSupabase.storage
        .from('kavach-id-cards')
        .upload(storagePath, uploadedFileBuffer, {
          contentType: uploadedFileMime,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error (front):', uploadError);
        return NextResponse.json(
          { error: `ID Card Front upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      resolvedIdCardUrl = `kavach-id-cards/${storagePath}`;
    }

    if (uploadedBackFileBuffer) {
      const cleanFileName = uploadedBackFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${Date.now()}-back-${cleanFileName}`;

      const { error: uploadError } = await adminSupabase.storage
        .from('kavach-id-cards')
        .upload(storagePath, uploadedBackFileBuffer, {
          contentType: uploadedBackFileMime,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error (back):', uploadError);
        return NextResponse.json(
          { error: `ID Card Back upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      resolvedIdCardBackUrl = `kavach-id-cards/${storagePath}`;
    }

    let profilePhotoPath: string | null = null;
    if (profilePhotoBuffer) {
      const extension = profilePhotoMime === 'image/jpeg' ? 'jpg' : profilePhotoMime === 'image/png' ? 'png' : 'webp';
      profilePhotoPath = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: photoUploadError } = await adminSupabase.storage
        .from('kavach-profile-photos')
        .upload(profilePhotoPath, profilePhotoBuffer, {
          contentType: profilePhotoMime,
          upsert: true,
        });
      if (photoUploadError) {
        console.error('Profile photo upload failed:', photoUploadError);
        return NextResponse.json({ error: 'Unable to save the profile photo. Please try again.' }, { status: 500 });
      }
    }

    // 6. Update student_profiles table
    const updates = {
      id: user.id,
      claimed_college_id: collegeClaimForReview,
      admission_type: admissionType,
      admission_year: Number(admissionYear),
      expected_graduation_year: Number(expectedGraduationYear),
      id_card_url: resolvedIdCardUrl,
      verification_status: decision.status,
      verification_notes: decision.reason,
      ocr_extracted_data: {
        front_url: resolvedIdCardUrl,
        front_mime: uploadedFileMime || null,
        back_url: resolvedIdCardBackUrl,
        back_mime: uploadedBackFileMime || null,
        dob: incomingDob || null,
        gender: incomingGender || null,
        parent_phone: incomingParentPhone || null,
        emergency_phone: incomingEmergencyPhone || null,
        address: incomingAddress || null,
        branch: incomingBranch || null,
        section: incomingSection || null,
        accommodation_type: incomingAccommodation,
        verified_sides: resolvedIdCardBackUrl ? 'FRONT_AND_BACK' : 'FRONT_ONLY',
      },
      updated_at: new Date().toISOString(),
      ...(decision.status === 'VERIFIED' ? { verified_at: new Date().toISOString() } : {}),
    };

    let { error: upsertError } = await adminSupabase
      .from('student_profiles')
      .upsert(updates, { onConflict: 'id' });

    if (upsertError && (upsertError.code === 'PGRST204' || upsertError.code === '42703' || (upsertError.message && upsertError.message.includes('claimed_college_id')))) {
      const { claimed_college_id: _claimed_college_id, ...legacyUpdates } = updates as any;
      const retryResult = await adminSupabase
        .from('student_profiles')
        .upsert(legacyUpdates, { onConflict: 'id' });
      upsertError = retryResult.error;
    }

    if (upsertError) {
      console.error('Upsert student profile error:', upsertError);
      throw upsertError;
    }

    // Update profile student_id and college affiliation if verified
    const profileUpdates: Record<string, unknown> = {
      student_id: studentId.trim(),
      is_approved: decision.status === 'VERIFIED',
      ...(decision.status === 'VERIFIED' && collegeClaimForReview ? { college_id: collegeClaimForReview } : {}),
      ...(profilePhotoPath ? { profile_photo_path: profilePhotoPath } : {}),
    };
    // Never persist a client-supplied collegeId. Campus assignment is an
    // administrator/server decision, not an ID-upload form field.
    if (incomingFullName && incomingFullName.trim()) {
      profileUpdates.full_name = incomingFullName.trim();
    }
    if (incomingDepartment && incomingDepartment.trim()) {
      profileUpdates.department = incomingDepartment.trim();
    }
    if (incomingPersonalPhone && incomingPersonalPhone.trim()) {
      profileUpdates.phone = incomingPersonalPhone.trim();
    }
    if (incomingDob && incomingDob.trim()) {
      profileUpdates.dob = incomingDob.trim();
    }
    if (incomingGender && incomingGender.trim()) {
      profileUpdates.gender = incomingGender.trim();
    }

    const { error: profileUpdateError } = await adminSupabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id);
    if (profileUpdateError) {
      console.error('Update profile after student verification failed:', profileUpdateError);
      return NextResponse.json({ error: 'Unable to save profile verification details.' }, { status: 500 });
    }

    // Persist to dedicated student_residences table
    // A residence cannot be safely assigned to a default campus. Defer this
    // optional record until the submitted institution has been verified.
    if (incomingAccommodation && trustedCollegeId) {
      try {
        const residenceType = incomingAccommodation.toLowerCase().includes('hostel') ? 'COLLEGE_HOSTEL' : 'DAY_SCHOLAR';
        const resPayload: Record<string, unknown> = {
          id: user.id,
          college_id: trustedCollegeId,
          residence_type: residenceType,
          updated_at: new Date().toISOString(),
        };
        if (incomingParentPhone && incomingParentPhone.trim()) {
          resPayload.guardian_contact_phone = incomingParentPhone.trim();
        }
        if (incomingAddress && incomingAddress.trim()) {
          if (residenceType === 'COLLEGE_HOSTEL') {
            resPayload.room_number = incomingAddress.trim();
          } else {
            resPayload.pg_address = incomingAddress.trim();
          }
        }
        await adminSupabase
          .from('student_residences')
          .upsert(resPayload, { onConflict: 'id' });
      } catch (resErr) {
        console.warn('student_residences upsert in verify-id non-fatal error:', resErr);
      }
    }

    // 6. Record in immutable audit log
    const { error: auditError } = await adminSupabase.from('audit_logs').insert({
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
    if (auditError) {
      console.error('Failed to record student verification audit event:', auditError);
      return NextResponse.json({ error: 'Verification was saved but its audit record could not be written. Contact campus support.' }, { status: 500 });
    }

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
