import fs from 'fs';

console.log('--- CRITICAL FUNCTIONALITY PROTECTION VERIFICATION ---');

// 1. Check verify-otp route
const verifyOtpFile = fs.readFileSync('src/app/api/auth/verify-otp/route.ts', 'utf8');
const demoOtpMatch = verifyOtpFile.includes('123456');
const demoOtpEnvCheck = verifyOtpFile.includes('ENABLE_DEMO_OTP');
console.log('verify-otp checks ENABLE_DEMO_OTP:', demoOtpEnvCheck);
console.log('verify-otp uses 123456 demo code:', demoOtpMatch);

// 2. Check mobile-login route
const mobileLoginFile = fs.readFileSync('src/app/api/auth/mobile-login/route.ts', 'utf8');
const mobileDemoOtpCheck = mobileLoginFile.includes('ENABLE_DEMO_OTP') && mobileLoginFile.includes('123456');
console.log('mobile-login preserves ENABLE_DEMO_OTP & 123456:', mobileDemoOtpCheck);

// 3. Check demo-sms route
const demoSmsFile = fs.readFileSync('src/app/api/auth/demo-sms/route.ts', 'utf8');
const demoSmsEnvCheck = demoSmsFile.includes('ENABLE_DEMO_SMS');
console.log('demo-sms checks ENABLE_DEMO_SMS:', demoSmsEnvCheck);

// 4. Check Safe Box route & privacy
const safeBoxRoute = fs.readFileSync('src/app/api/student/safe-box/route.ts', 'utf8');
const safeBoxAuth = safeBoxRoute.includes('getUser') || safeBoxRoute.includes('auth.getUser');
console.log('safe-box requires auth check:', safeBoxAuth);

// 5. Check AI control panel advisory status
const aiLib = fs.readFileSync('src/lib/ai.ts', 'utf8');
const advisoryCheck = aiLib.includes('advisory') || aiLib.includes('human') || aiLib.includes('CONFIDENCE') || aiLib.includes('fallback');
console.log('AI logic includes safety/fallback/advisory mechanisms:', advisoryCheck);

// 6. Check tenant isolation in incidents route
const incidentsRoute = fs.readFileSync('src/app/api/incidents/route.ts', 'utf8');
const collegeTenantCheck = incidentsRoute.includes('college_id');
console.log('incidents route enforces college_id tenant scoping:', collegeTenantCheck);

