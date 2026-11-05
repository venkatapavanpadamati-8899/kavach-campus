import { checkGeminiConnectivity } from '../src/lib/ai';

async function testConn() {
  console.log('Testing safe Gemini connectivity check...');
  const res = await checkGeminiConnectivity();
  console.log('Connectivity result:', res);
}

testConn().catch(console.error);

