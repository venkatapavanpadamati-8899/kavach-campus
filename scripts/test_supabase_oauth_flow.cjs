const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
const anonMatch = env.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m);

const supabaseUrl = urlMatch ? urlMatch[1].trim().replace(/^["']|["']$/g, '') : '';
const anonKey = anonMatch ? anonMatch[1].trim().replace(/^["']|["']$/g, '') : '';

console.log('Supabase URL:', supabaseUrl);

async function testSupabaseOAuthUrl() {
  // Call Supabase /auth/v1/authorize?provider=google
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('http://localhost:3000/api/auth/callback')}`;
  console.log('Fetching Supabase authorize URL...');
  try {
    const res = await fetch(authUrl, {
      redirect: 'manual',
      headers: {
        'apikey': anonKey
      }
    });
    console.log('Supabase status:', res.status);
    const location = res.headers.get('location');
    console.log('Supabase redirect location:', location ? location.slice(0, 150) + '...' : 'none');
    if (location) {
      const u = new URL(location);
      console.log('Google Auth Host:', u.host);
      console.log('Google Auth client_id:', u.searchParams.get('client_id'));
      console.log('Google Auth redirect_uri:', u.searchParams.get('redirect_uri'));
      
      // Now fetch the actual Google URL that Supabase gave us!
      const gRes = await fetch(location, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const gText = await gRes.text();
      console.log('Google HTTP status:', gRes.status);
      if (gText.includes('deleted_client') || gText.includes('The OAuth client was deleted')) {
        console.log('CONFIRMED ON SUPABASE FORWARD: Google returned "The OAuth client was deleted" (deleted_client)!');
      } else if (gText.includes('redirect_uri_mismatch')) {
        console.log('Google returned: redirect_uri_mismatch');
      } else {
        console.log('Google response snippet:', gText.slice(0, 300));
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testSupabaseOAuthUrl();
