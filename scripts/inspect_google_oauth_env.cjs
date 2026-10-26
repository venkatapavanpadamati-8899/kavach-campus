const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const clientMatch = env.match(/^GOOGLE_CLIENT_ID=(.+)$/m);
if (clientMatch) {
  console.log('Client ID in .env.local:', clientMatch[1].trim().replace(/^["']|["']$/g, ''));
}
