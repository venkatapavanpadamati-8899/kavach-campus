import { checkGeminiConnectivity, analyzeIncident } from '../src/lib/ai';

async function test() {
  console.log('Testing AI connectivity...');
  const t0 = Date.now();
  const conn = await checkGeminiConnectivity();
  console.log(`checkGeminiConnectivity took ${Date.now() - t0}ms:`, conn);

  console.log('Testing analyzeIncident...');
  const t1 = Date.now();
  const res = await analyzeIncident('Test suspicious activity near academic library block.');
  console.log(`analyzeIncident took ${Date.now() - t1}ms:`, res);
}

test();

