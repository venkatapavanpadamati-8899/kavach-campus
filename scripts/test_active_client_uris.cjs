const clientId = '538218379520-lr4cgu4bts5cqiu4bdv8p8vd60a32ci2.apps.googleusercontent.com';

const testUris = [
  'https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback',
  'http://localhost:3000/api/auth/callback',
  'http://localhost:3000',
  'https://kavach-campus-rmnruamrg-venkatapavanpadamati-8899s-projects.vercel.app/api/auth/callback',
  'https://kavach-campus.vercel.app/api/auth/callback'
];

async function testAll() {
  for (const uri of testUris) {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(uri)}&response_type=code&scope=openid%20email%20profile`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const text = await res.text();
    if (text.includes('deleted_client')) {
      console.log(`[${uri}]: DELETED_CLIENT`);
    } else if (text.includes('redirect_uri_mismatch')) {
      console.log(`[${uri}]: REDIRECT_URI_MISMATCH`);
    } else if (text.includes('identifierId') || text.includes('Sign in') || text.includes('Choose an account')) {
      console.log(`[${uri}]: SUCCESS - VALID MATCH!`);
    } else {
      console.log(`[${uri}]: Status ${res.status}`);
    }
  }
}

testAll();
