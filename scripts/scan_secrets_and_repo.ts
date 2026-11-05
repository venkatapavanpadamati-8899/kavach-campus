import fs from 'fs';
import { execSync } from 'child_process';

console.log('--- REPOSITORY & SECRET AUDIT ---');

// 1. Check tracked env files
try {
  const trackedEnv = execSync('git ls-files .env .env.local .env.production *.env', { encoding: 'utf8' }).trim();
  if (trackedEnv) {
    console.error('CRITICAL: Tracked env files found:', trackedEnv);
  } else {
    console.log('PASS: No .env files are tracked by Git.');
  }
} catch (e: any) {
  console.error('Error running git ls-files:', e.message);
}

// 2. Check git diff for secrets
const diff = execSync('git diff', { encoding: 'utf8' });
const secretPatterns = [
  { name: 'Supabase Service Role Key JWT', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { name: 'Private Key header', regex: /BEGIN (RSA|EC|OPENSSH|DSA|PGP)? PRIVATE KEY/ },
  { name: 'Google API Key pattern', regex: /AIza[0-9A-Za-z\\-_]{35}/ },
  { name: 'Hardcoded live Stripe/Twilio Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: 'Raw database password in connection string', regex: /postgres:\/\/[a-zA-Z0-9_]+:[^@\s]+@/ }
];

let leaksFound = 0;
for (const p of secretPatterns) {
  if (p.regex.test(diff)) {
    // Check if it's not just a placeholder
    console.warn(`WARNING: Potential match for ${p.name} in git diff.`);
    leaksFound++;
  }
}

if (leaksFound === 0) {
  console.log('PASS: No sensitive credentials or secret patterns detected in git diff.');
}

// 3. Inspect modified files list
const status = execSync('git status --short', { encoding: 'utf8' });
const lines = status.split('\n').filter(l => l.trim().length > 0);
const modified = lines.filter(l => l.startsWith(' M ') || l.startsWith('M  '));
const untracked = lines.filter(l => l.startsWith('?? '));

console.log(`Modified tracked files: ${modified.length}`);
console.log(`Untracked files: ${untracked.length}`);

// 4. Check critical settings
const envLocalExists = fs.existsSync('.env.local');
console.log(`.env.local exists: ${envLocalExists}`);
if (envLocalExists) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const demoOtpMatch = envContent.match(/ENABLE_DEMO_OTP=(true|false)/);
  const demoSmsMatch = envContent.match(/ENABLE_DEMO_SMS=(true|false)/);
  console.log(`ENABLE_DEMO_OTP: ${demoOtpMatch ? demoOtpMatch[1] : 'not found'}`);
  console.log(`ENABLE_DEMO_SMS: ${demoSmsMatch ? demoSmsMatch[1] : 'not found'}`);
}

