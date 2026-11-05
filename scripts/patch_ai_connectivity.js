const fs = require('fs');
const path = require('path');

const file = path.resolve('src/lib/ai.ts');
let content = fs.readFileSync(file, 'utf8');

const target = `function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || 'MISSING_KEY';
  return new GoogleGenAI({ apiKey });
}`;

const replacement = `function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || 'MISSING_KEY';
  return new GoogleGenAI({ apiKey });
}

let lastConnectivityCheck: {
  timestamp: number;
  result: { connected: boolean; status: 'OPERATIONAL' | 'FALLBACK_RULES'; model: string; latencyMs?: number };
} | null = null;

export async function checkGeminiConnectivity(): Promise<{
  connected: boolean;
  status: 'OPERATIONAL' | 'FALLBACK_RULES';
  model: string;
  latencyMs?: number;
}> {
  if (lastConnectivityCheck && Date.now() - lastConnectivityCheck.timestamp < 60_000) {
    return lastConnectivityCheck.result;
  }

  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey.length < 20 || apiKey.includes('placeholder') || apiKey.includes('your_gemini')) {
    const res = { connected: false, status: 'FALLBACK_RULES' as const, model: 'Deterministic Rules Fallback' };
    lastConnectivityCheck = { timestamp: Date.now(), result: res };
    return res;
  }

  try {
    const ai = getAiClient();
    const startTime = Date.now();
    const resp = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: 'Ping. Answer OK',
      config: { maxOutputTokens: 5 },
    });
    const latencyMs = Date.now() - startTime;
    if (resp && resp.text) {
      const res = { connected: true, status: 'OPERATIONAL' as const, model: 'gemini-flash-lite-latest', latencyMs };
      lastConnectivityCheck = { timestamp: Date.now(), result: res };
      return res;
    }
  } catch {
    // Graceful fallback to deterministic rule engine
  }

  const res = { connected: false, status: 'FALLBACK_RULES' as const, model: 'Deterministic Rules Fallback' };
  lastConnectivityCheck = { timestamp: Date.now(), result: res };
  return res;
}`;

// Normalize line endings for replacement
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const newContent = normalizedContent.replace(normalizedTarget, replacement);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully patched src/lib/ai.ts!');
} else {
  console.error('Target not found in src/lib/ai.ts');
}

