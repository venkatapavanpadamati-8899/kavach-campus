const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const clientMatch = env.match(/^GOOGLE_CLIENT_ID=(.+)$/m);
if (!clientMatch) {
  console.log('No client ID');
  process.exit(1);
}
const clientId = clientMatch[1].trim().replace(/^["']|["']$/g, '');

async function checkGoogleClient() {
  const redirectUri = 'https://polbnvszmvblwenfnqll.supabase.co/auth/v1/callback';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
  
  console.log('Checking Google OAuth auth endpoint with client ID (Project # ' + clientId.split('-')[0] + ')...');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const text = await res.text();
    console.log('HTTP Status:', res.status);
    if (text.includes('deleted_client') || text.includes('The OAuth client was deleted')) {
      console.log('CONFIRMED: Google returned "deleted_client" / "The OAuth client was deleted."');
    } else if (text.includes('redirect_uri_mismatch')) {
      console.log('Google returned: redirect_uri_mismatch');
    } else if (text.includes('Sign in with Google') || text.includes('Choose an account') || text.includes('identifierId')) {
      console.log('SUCCESS: Google presented valid sign-in page!');
    } else {
      console.log('Response excerpt:', text.slice(0, 500));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

checkGoogleClient();
