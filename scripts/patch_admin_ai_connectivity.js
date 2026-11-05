const fs = require('fs');
const path = require('path');

const file = path.resolve('src/app/api/admin/ai/route.ts');
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// 1. Add import
if (!content.includes('checkGeminiConnectivity')) {
  content = content.replace(
    "import { createAdminClient } from '@/lib/supabase/admin';",
    "import { createAdminClient } from '@/lib/supabase/admin';\nimport { checkGeminiConnectivity } from '@/lib/ai';"
  );
}

// 2. Replace static isConfigured check with dynamic connectivity
const oldLogic = `    // Verify Gemini environment configuration securely without exposing the secret key
    const rawKey = process.env.GEMINI_API_KEY || '';
    const isConfigured = Boolean(
      rawKey &&
      rawKey.length > 20 &&
      !rawKey.includes('placeholder') &&
      !rawKey.includes('your_gemini')
    );`;

const newLogic = `    // Safely verify actual live Gemini model connectivity without exposing secret keys
    const connectivity = await checkGeminiConnectivity();
    const isOperational = connectivity.status === 'OPERATIONAL';`;

content = content.replace(oldLogic, newLogic);
content = content.replace(
  "status: isConfigured ? 'OPERATIONAL' : 'FALLBACK_RULES',",
  "status: isOperational ? 'OPERATIONAL' : 'FALLBACK_RULES',"
);
content = content.replace(
  "statusLabel: isConfigured ? 'Operational (Live Google GenAI)' : 'Deterministic Rules Fallback',",
  "statusLabel: isOperational ? 'Operational (Live Google GenAI)' : 'Deterministic Rules Fallback',"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated src/app/api/admin/ai/route.ts with checkGeminiConnectivity!');

