import { chromium } from '@playwright/test';
import { createTestUser, getPlaywrightCookiesForUser, adminClient } from '../tests/e2e/test-auth-helper';

async function main() {
  const admin = await createTestUser('ADMIN', true, false);
  const cookies = await getPlaywrightCookiesForUser(admin.email, admin.password);

  const browser = await chromium.launch({ headless: true });
  
  // Test multiple viewports
  const viewports = [
    { name: 'Mobile 375x812', width: 375, height: 812 },
    { name: 'Tablet 768x1024', width: 768, height: 1024 },
    { name: 'Desktop 1280x800', width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing ${vp.name} ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });

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
      if (msg.type() === 'error' || msg.text().toLowerCase().includes('hydration') || msg.text().toLowerCase().includes('mismatch')) {
        console.log(`[${vp.name} CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      console.error(`[${vp.name} PAGE ERROR]:`, err.message);
      errors.push(err.message);
    });

    await page.goto('http://localhost:3000/admin/ai', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const overlay = await page.evaluate(() => {
      const nextPortal = document.querySelector('nextjs-portal');
      let text = '';
      if (nextPortal && nextPortal.shadowRoot) {
        text = (nextPortal.shadowRoot as any).innerText || nextPortal.shadowRoot.textContent || '';
      }
      return text;
    });

    if (overlay) {
      console.log(`[${vp.name} OVERLAY DETECTED]:`, overlay.slice(0, 500));
    } else {
      console.log(`[${vp.name}] No error overlay detected.`);
    }

    await context.close();
  }

  await browser.close();
  await adminClient.auth.admin.deleteUser(admin.id);
  console.log('\nFinished viewport testing.');
}

main().catch(console.error);
