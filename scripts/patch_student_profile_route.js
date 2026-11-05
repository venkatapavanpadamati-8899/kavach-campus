const fs = require('fs');
let content = fs.readFileSync('src/app/api/student/profile/route.ts', 'utf8');

const target = `    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name, college_email, student_id, role, department, year, phone, profile_photo_path')
      .eq('id', user.id)
      .single();

    if (profError) {
      console.error('Fetch profile error:', profError);
      return NextResponse.json({ error: 'Unable to load your profile.' }, { status: 500 });
    }`;

const regex = /const\s+\{\s*data:\s*profile,\s*error:\s*profError\s*\}\s*=\s*await\s*supabase\s*\.from\('profiles'\)\s*\.select\('id,\s*full_name,\s*college_email,\s*student_id,\s*role,\s*department,\s*year,\s*phone,\s*profile_photo_path'\)\s*\.eq\('id',\s*user\.id\)\s*\.single\(\);\s*if\s*\(profError\)\s*\{\s*console\.error\('Fetch profile error:',\s*profError\);\s*return\s*NextResponse\.json\(\{\s*error:\s*'Unable to load your profile\.'\s*\},\s*\{\s*status:\s*500\s*\}\);\s*\}/;

const replacement = `let { data: profile, error: profError } = await supabase
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
    }`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/api/student/profile/route.ts', content, 'utf8');
  console.log('Successfully patched src/app/api/student/profile/route.ts');
} else {
  console.log('Regex did not match');
}

