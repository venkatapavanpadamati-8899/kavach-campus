import { chromium } from '@playwright/test';
import { createTestUser, getPlaywrightCookiesForUser, adminClient } from '../tests/e2e/test-auth-helper';

async function main() {
  console.log('1. Creating test Admin user...');
  const admin = await createTestUser('ADMIN', true, false);
  console.log('Admin user created:', admin.email);

  console.log('2. Fetching auth cookies...');
  const cookies = await getPlaywrightCookiesForUser(admin.email, admin.password);

  console.log('3. Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Add cookies to context for localhost:3000
  await context.addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: 'localhost',
      path: '/',
    }))
  );

  const page = await context.newPage();

  const consoleMessages: { type: string; text: string }[] = [];
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error' || msg.text().includes('Hydration') || msg.text().includes('mismatch')) {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE UNCAUGHT ERROR]:', err);
  });

  console.log('4. Navigating to http://localhost:3000/admin/ai...');
  const res = await page.goto('http://localhost:3000/admin/ai', { waitUntil: 'networkidle' });
  console.log('HTTP Status:', res?.status());

  // Wait a moment for React hydration
  await page.waitForTimeout(3000);

  // Check for Next.js error overlay elements
  const nextErrorOverlay = await page.evaluate(() => {
    // Next.js dev overlay creates elements with shadow root or specific tags
    const nextPortal = document.querySelector('nextjs-portal');
    const toast = document.querySelector('[data-nextjs-toast]');
    const dialog = document.querySelector('[data-nextjs-dialog]');
    const errors = document.querySelectorAll('[data-nextjs-error-message]');
    
    // Check shadow roots if any
    let shadowContent = '';
    if (nextPortal && nextPortal.shadowRoot) {
      shadowContent = nextPortal.shadowRoot.innerHTML;
    }

    return {
      hasPortal: !!nextPortal,
      hasToast: !!toast,
      toastText: toast ? (toast as HTMLElement).innerText : null,
      hasDialog: !!dialog,
      dialogText: dialog ? (dialog as HTMLElement).innerText : null,
      errorsCount: errors.length,
      shadowContentSnippet: shadowContent ? shadowContent.slice(0, 1000) : null,
    };
  });

  console.log('Next.js Error Overlay Detection:', JSON.stringify(nextErrorOverlay, null, 2));

  // Log all errors and warnings captured
  console.log('\n--- ALL CONSOLE MESSAGES ---');
  consoleMessages.forEach((m) => {
    console.log(`[${m.type}]: ${m.text}`);
  });

  // Take screenshot
  await page.screenshot({ path: 'test-results/admin-ai-reproduction.png', fullPage: true });
  console.log('\nScreenshot saved to test-results/admin-ai-reproduction.png');

  await browser.close();
  await adminClient.auth.admin.deleteUser(admin.id);
  console.log('Test admin cleaned up. Done.');
}

main().catch(console.error);

