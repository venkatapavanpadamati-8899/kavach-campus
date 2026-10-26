import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { analyzeIncident } = await import('../src/lib/ai');
  console.log('Testing analyzeIncident with live Gemini API key...');
  const result = await analyzeIncident('Some seniors are verbally abusing and ragging first-year students near the mechanical engineering workshop.');
  console.log('Live AI Analysis Result:\n', JSON.stringify(result, null, 2));
}

run().catch(console.error);
