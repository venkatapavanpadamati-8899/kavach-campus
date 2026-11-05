import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name, college_email, student_id, role, department, year, phone, profile_photo_path')
      .eq('id', user.id)
      .single();

    if (profError && (profError.code === '42703' || profError.message?.includes('profile_photo_path'))) {
      const fallback = await supabase
        .from('profiles')
        .select('id, full_name, college_email, student_id, role, department, year, phone')
        .eq('id', user.id)
        .single();
      profile = fallback.data ? { ...fallback.data, profile_photo_path: null } : null;
      profError = fallback.error;
    }

    if (profError || !profile) {
      console.error('Fetch profile error:', profError);
      return NextResponse.json({ error: 'Unable to load your profile.' }, { status: 500 });
    }
    if (profile.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student account required.' }, { status: 403 });
    }

    const { data: studentProfile, error: spError } = await supabase
      .from('student_profiles')
      .select('id, course, verification_status, admission_type, admission_year, expected_graduation_year, id_card_url, blood_group, medical_conditions, hostel_room, ocr_extracted_data, updated_at')
      .eq('id', user.id)
      .single();

    if (spError && spError.code !== 'PGRST116') {
      console.error('Fetch student profile error:', spError);
      return NextResponse.json({ error: 'Unable to load your student profile.' }, { status: 500 });
    }

    let profilePhotoUrl: string | null = null;
    if (profile.profile_photo_path) {
      const { data: signedPhoto, error: photoError } = await supabase.storage
        .from('kavach-profile-photos')
        .createSignedUrl(profile.profile_photo_path, 300);
      if (photoError) {
        console.error('Sign profile photo URL failed:', photoError);
        return NextResponse.json({ error: 'Unable to load your profile photo.' }, { status: 500 });
      }
      profilePhotoUrl = signedPhoto.signedUrl;
    }

    const { data: studentResidenceData, error: residenceError } = await supabase
      .from('student_residences')
      .select('residence_type, hostel_name, room_number, pg_name, pg_address, guardian_contact_phone, updated_at')
      .eq('id', user.id)
      .maybeSingle();
    const studentResidence = studentResidenceData;
    if (residenceError && residenceError.code !== 'PGRST205' && residenceError.code !== '42P01') {
      console.error('Fetch student residence failed:', residenceError);
      return NextResponse.json({ error: 'Unable to load your residence details.' }, { status: 500 });
    }
    if (residenceError) {
      console.warn('student_residences is not available; profile uses legacy accommodation data.');
    }

    return NextResponse.json({
      success: true,
      profile: profile || null,
      profilePhotoUrl,
      studentProfile: studentProfile || {
        id: user.id,
        verification_status: 'PENDING_UPLOAD',
        admission_type: 'REGULAR',
        blood_group: null,
        medical_conditions: null,
        hostel_room: null,
      },
      residence: studentResidence || (studentProfile?.hostel_room ? {
        residence_type: studentProfile.hostel_room.toLowerCase().includes('day scholar')
          ? 'DAY_SCHOLAR'
          : (studentProfile.hostel_room.toLowerCase().includes('pg') ? 'PRIVATE_HOSTEL' : 'COLLEGE_HOSTEL'),
        room_number: studentProfile.hostel_room,
      } : null)
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('Student profile GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    // Explicitly reject tampering with protected verification fields
    const protectedFields = [
      'verification_status',
      'verified_by',
      'verified_at',
      'verification_notes',
      'ocr_extracted_data',
      'id',
      'admission_type'
    ];
    const hasProtectedField = protectedFields.some(field => field in body);
    if (hasProtectedField) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot modify institutional verification fields' },
        { status: 403 }
      );
    }

    const bloodGroup = body.bloodGroup !== undefined ? body.bloodGroup : body.blood_group;
    const medicalConditions = body.medicalConditions !== undefined ? body.medicalConditions : body.medical_conditions;
    const hostelRoom = body.hostelRoom !== undefined 
      ? body.hostelRoom 
      : (body.hostel_room !== undefined ? body.hostel_room : body.roomNumber);
    const course = body.course;
    const phone = body.phone;

    const rawResidenceType = body.residenceType !== undefined 
      ? body.residenceType 
      : (body.residence_type !== undefined ? body.residence_type : body.accommodationStatus);
    const hostelName = body.hostelName !== undefined ? body.hostelName : body.hostel_name;
    const pgName = body.pgName !== undefined ? body.pgName : body.pg_name;
    const pgAddress = body.pgAddress !== undefined ? body.pgAddress : body.pg_address;
    const guardianContactPhone = body.guardianContactPhone !== undefined 
      ? body.guardianContactPhone 
      : (body.guardian_contact_phone !== undefined ? body.guardian_contact_phone : body.guardianPhone);

    let normalizedResidenceType: string | null = null;
    if (rawResidenceType !== undefined && rawResidenceType !== null && rawResidenceType !== '') {
      const validResidenceTypes = ['DAY_SCHOLAR', 'COLLEGE_HOSTEL', 'PRIVATE_HOSTEL'];
      normalizedResidenceType = String(rawResidenceType).trim().toUpperCase();
      if (!validResidenceTypes.includes(normalizedResidenceType)) {
        return NextResponse.json(
          { error: 'Invalid accommodation status. Allowed: COLLEGE_HOSTEL, PRIVATE_HOSTEL, DAY_SCHOLAR' },
          { status: 400 }
        );
      }
    }

    // Validate blood group if provided
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (bloodGroup && !validBloodGroups.includes(bloodGroup.trim().toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid blood group. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-' },
        { status: 400 }
      );
    }

    const profileQuery = supabase.from('profiles');
    if (typeof profileQuery.select === 'function') {
      const { data: profile, error: profileError } = await profileQuery
        .select('role')
        .eq('id', user.id)
        .single();
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Verify student profile update role failed:', profileError);
      }
      if (profile && profile.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Student account required.' }, { status: 403 });
      }
    }

    // Build student_profiles update payload strictly omitting server-controlled verification columns
    const studentProfileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (bloodGroup !== undefined) {
      studentProfileUpdates.blood_group = bloodGroup ? bloodGroup.trim().toUpperCase() : null;
    }
    if (medicalConditions !== undefined) {
      studentProfileUpdates.medical_conditions = typeof medicalConditions === 'string' ? medicalConditions.trim() : null;
    }
    if (hostelRoom !== undefined) {
      studentProfileUpdates.hostel_room = typeof hostelRoom === 'string' ? hostelRoom.trim() : null;
    }
    if (normalizedResidenceType) {
      if (normalizedResidenceType === 'DAY_SCHOLAR') {
        studentProfileUpdates.hostel_room = 'Day Scholar (Commuter)';
      } else if (normalizedResidenceType === 'COLLEGE_HOSTEL') {
        studentProfileUpdates.hostel_room = hostelRoom ? String(hostelRoom).trim() : (hostelName ? String(hostelName).trim() : 'College Hostel');
      } else if (normalizedResidenceType === 'PRIVATE_HOSTEL') {
        studentProfileUpdates.hostel_room = pgName ? `Private PG: ${String(pgName).trim()}` : 'Private Hostel';
      }
    }
    if (course !== undefined) {
      studentProfileUpdates.course = typeof course === 'string' ? course.trim() : null;
    }

    // Update student_profiles (governed by RLS and trigger)
    const { error: spError } = await supabase
      .from('student_profiles')
      .update(studentProfileUpdates)
      .eq('id', user.id);

    if (spError) {
      console.error('Update student_profiles error:', spError);
      return NextResponse.json({ error: spError.message || 'Failed to update student health profile' }, { status: 500 });
    }

    // Persist to dedicated student_residences table if residence_type is updated
    if (normalizedResidenceType) {
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('college_id')
          .eq('id', user.id)
          .maybeSingle();

        const collegeId = userProfile?.college_id && userProfile.college_id !== 'PENDING_CAMPUS_VERIFICATION'
          ? userProfile.college_id
          : 'srkr-bhimavaram';

        const residencePayload: Record<string, unknown> = {
          id: user.id,
          college_id: collegeId,
          residence_type: normalizedResidenceType,
          updated_at: new Date().toISOString(),
        };

        if (normalizedResidenceType === 'COLLEGE_HOSTEL') {
          residencePayload.hostel_name = typeof hostelName === 'string' ? hostelName.trim() : null;
          residencePayload.room_number = typeof hostelRoom === 'string' ? hostelRoom.trim() : null;
        } else if (normalizedResidenceType === 'PRIVATE_HOSTEL') {
          residencePayload.pg_name = typeof pgName === 'string' ? pgName.trim() : null;
          residencePayload.pg_address = typeof pgAddress === 'string' ? pgAddress.trim() : null;
        }

        if (guardianContactPhone) {
          residencePayload.guardian_contact_phone = typeof guardianContactPhone === 'string' ? guardianContactPhone.trim() : null;
        }

        await supabase
          .from('student_residences')
          .upsert(residencePayload, { onConflict: 'id' });
      } catch (resErr) {
        // Non-fatal if student_residences is staged
        console.warn('student_residences update non-fatal error:', resErr);
      }
    }

    // Update emergency phone in profiles if provided
    if (phone !== undefined) {
      const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
      await supabase
        .from('profiles')
        .update({ phone: cleanPhone, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('Student profile PUT error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
