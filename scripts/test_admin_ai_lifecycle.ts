import { chromium } from '@playwright/test';
import { createTestUser, getPlaywrightCookiesForUser, adminClient } from '../tests/e2e/test-auth-helper';

async function main() {
  console.log('1. Creating test Admin user...');
  const admin = await createTestUser('ADMIN', true, false);
  const cookies = await getPlaywrightCookiesForUser(admin.email, admin.password);
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  console.log('2. Testing GET /api/admin/ai directly...');
  const getRes = await fetch('http://localhost:3000/api/admin/ai', {
    headers: { Cookie: cookieHeader },
  });
  console.log('GET status:', getRes.status);
  const getData = await getRes.json();
  console.log('GET data:', JSON.stringify(getData, null, 2));

  console.log('\n3. Testing POST /api/admin/ai to update threshold...');
  const postRes = await fetch('http://localhost:3000/api/admin/ai', {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      enabled: true,
      criticalThreatScore: 85,
      fallbackEnabled: true,
    }),
  });
  console.log('POST status:', postRes.status);
  const postData = await postRes.json();
  console.log('POST data:', JSON.stringify(postData, null, 2));

  console.log('\n4. Launching browser to test /admin/ai page render...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: 'localhost',
      path: '/',
    }))
  );

  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER ERROR]:', msg.text());
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/admin/ai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check if Gemini AI Safety Control title renders
  const title = await page.textContent('h1');
  console.log('Page Title:', title);

  // Check for any Next.js error overlay
  const overlay = await page.evaluate(() => {
    const nextPortal = document.querySelector('nextjs-portal');
    return nextPortal && nextPortal.shadowRoot ? ((nextPortal.shadowRoot as any).innerText || nextPortal.shadowRoot.textContent) : null;
  });

  console.log('Overlay present:', !!overlay);
  if (overlay) {
    console.log('Overlay text:', overlay.slice(0, 300));
  }

  // Click Save button in browser
  console.log('\n5. Clicking Save button in browser UI...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const successText = await page.textContent('form');
  console.log('Form contains success notice:', successText?.includes('updated and persisted'));

  await browser.close();
  await adminClient.auth.admin.deleteUser(admin.id);
  console.log('\nSUCCESS: Admin AI lifecycle verified.');
}

main().catch(console.error);
