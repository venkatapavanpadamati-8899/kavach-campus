import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(url, serviceRoleKey);

async function testCrossStudentIsolation() {
  console.log('=== TESTING LIVE CROSS-STUDENT ISOLATION (STUDENT A vs STUDENT B) ===');

  const now = Date.now();
  const emailA = `student.a.${now}@kavachcampus.test`;
  const emailB = `student.b.${now}@kavachcampus.test`;
  const password = 'TestPassword123!Safe';

  // 1. Create Student A
  const { data: userAData } = await adminClient.auth.admin.createUser({
    email: emailA,
    password: password,
    email_confirm: true,
  });
  const idA = userAData!.user!.id;

  // 2. Create Student B
  const { data: userBData } = await adminClient.auth.admin.createUser({
    email: emailB,
    password: password,
    email_confirm: true,
  });
  const idB = userBData!.user!.id;

  try {
    // Seed profiles
    await adminClient.from('profiles').insert([
      { id: idA, full_name: 'Student Alice', college_email: emailA, role: 'STUDENT', student_id: 'STUA' + now.toString().slice(-4), is_approved: true },
      { id: idB, full_name: 'Student Bob', college_email: emailB, role: 'STUDENT', student_id: 'STUB' + now.toString().slice(-4), is_approved: true },
    ]);

    await adminClient.from('student_profiles').insert([
      { id: idA, admission_type: 'REGULAR', admission_year: 2024, expected_graduation_year: 2028, verification_status: 'PENDING_UPLOAD' },
      { id: idB, admission_type: 'REGULAR', admission_year: 2024, expected_graduation_year: 2028, verification_status: 'VERIFIED' },
    ]);

    console.log('✅ Student A and Student B seeded on live database.');

    // Log in AS Student A
    const clientA = createClient(url, anonKey);
    const { error: loginAErr } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (loginAErr) throw new Error('Student A login failed: ' + loginAErr.message);

    console.log('✅ Student A authenticated with own JWT.');

    // Test 1: Student A attempts to read Student B's student_profiles record
    console.log('Test 1: Student A reading Student B student_profile...');
    const { data: bDataFromA } = await clientA
      .from('student_profiles')
      .select('*')
      .eq('id', idB);

    if (bDataFromA && bDataFromA.length > 0) {
      console.log('🚨 VULNERABILITY! Student A read Student B student_profile:', bDataFromA);
    } else {
      console.log('🛡️ PASS: Student A received 0 records for Student B (RLS isolating data).');
    }

    // Test 2: Student A attempts to update Student B's profile
    console.log('Test 2: Student A attempting to modify Student B profile...');
    const { data: bModFromA } = await clientA
      .from('profiles')
      .update({ full_name: 'Hacked by Student A' })
      .eq('id', idB)
      .select();

    if (bModFromA && bModFromA.length > 0) {
      console.log('🚨 VULNERABILITY! Student A modified Student B profile!');
    } else {
      console.log('🛡️ PASS: Student A modification on Student B rejected (0 rows modified).');
    }

    // Test 3: Student A attempts to upload into Student B's storage folder
    console.log('Test 3: Student A attempting to upload PNG into Student B storage folder...');
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const { error: crossUploadErr } = await clientA.storage
      .from('kavach-id-cards')
      .upload(`${idB}/hacked_id.png`, pngBuffer, { contentType: 'image/png' });

    if (crossUploadErr) {
      console.log('🛡️ PASS: Storage RLS blocked cross-student upload! Error:', crossUploadErr.message);
    } else {
      console.log('🚨 VULNERABILITY! Student A was able to upload into Student B storage folder!');
      await adminClient.storage.from('kavach-id-cards').remove([`${idB}/hacked_id.png`]);
    }

    // Test 4: Student A uploads into own storage path
    console.log('Test 4: Student A uploading PNG into OWN storage folder...');
    const { data: ownUpload, error: ownUploadErr } = await clientA.storage
      .from('kavach-id-cards')
      .upload(`${idA}/own_id.png`, pngBuffer, { contentType: 'image/png' });

    if (ownUploadErr) {
      console.log('Own upload note:', ownUploadErr.message);
    } else {
      console.log('✅ PASS: Student A successfully uploaded to OWN storage path:', ownUpload?.path);
      await adminClient.storage.from('kavach-id-cards').remove([`${idA}/own_id.png`]);
    }

  } finally {
    console.log('Cleaning up synthetic test data...');
    await adminClient.from('student_profiles').delete().in('id', [idA, idB]);
    await adminClient.from('profiles').delete().in('id', [idA, idB]);
    await adminClient.auth.admin.deleteUser(idA);
    await adminClient.auth.admin.deleteUser(idB);
    console.log('✅ Cleanup complete. Live database is completely clean.');
  }
}

testCrossStudentIsolation().catch(console.error);
