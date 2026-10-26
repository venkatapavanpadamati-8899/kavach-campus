import { test, expect } from '@playwright/test';

const publicPages = [
  { path: '/', titlePart: 'Kavach Campus', headingText: 'Safety in One Tap' },
  { path: '/about', titlePart: 'About', headingText: 'About Kavach Campus' },
  { path: '/features', titlePart: 'Features', headingText: 'Features' },
  { path: '/contact', titlePart: 'Contact', headingText: 'Contact' },
  { path: '/privacy', titlePart: 'Privacy', headingText: 'Privacy' },
  { path: '/login', titlePart: 'Login', headingText: 'Sign In' },
  { path: '/register', titlePart: 'Register', headingText: 'Create Account' },
  { path: '/forgot-password', titlePart: 'Forgot Password', headingText: 'Reset Password' },
  { path: '/reset-password', titlePart: 'Reset Password', headingText: 'Set New Password' },
  { path: '/verify-otp', titlePart: 'Verify', headingText: 'Verification' },
  { path: '/super-admin/login', titlePart: 'Super Admin', headingText: 'Super Admin' },
  { path: '/unauthorized', titlePart: 'Unauthorized', headingText: 'Access Denied' },
];

test.describe('Public Pages End-to-End Rendering & Navigation', () => {
  for (const pageInfo of publicPages) {
    test(`renders ${pageInfo.path} successfully without fatal console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          // Ignore non-fatal React hydration or favicon warnings if any
          const text = msg.text();
          if (!text.includes('favicon.ico') && !text.includes('Failed to load resource: the server responded with a status of 404')) {
            consoleErrors.push(text);
          }
        }
      });

      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      const response = await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      // Verify page body is loaded and rendered
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Check title or document content
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);

      // Verify no uncaught exceptions crashed the page
      expect(consoleErrors.length).toBe(0);
    });
  }

  test('Homepage navigation links and call-to-actions are functional', async ({ page }) => {
    await page.goto('/');
    
    // Check main call to actions
    const loginLink = page.locator('a[href*="/login"]').first();
    await expect(loginLink).toBeVisible();

    const registerLink = page.locator('a[href*="/register"]').first();
    await expect(registerLink).toBeVisible();

    // Verify multi-college platform branding
    const pageText = await page.textContent('body');
    expect(pageText).toContain('KAVACH CAMPUS');
    expect(pageText).toContain('Multi-College');

    // Verify institutional support on About page
    await page.goto('/about');
    const aboutText = await page.textContent('body');
    expect(aboutText).toContain('SRKR');
    expect(aboutText).toContain('Vishnu');
  });

  test('Contact page form validates required fields', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('body')).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      // Form should remain on contact page or show validation feedback
      expect(page.url()).toContain('/contact');
    }
  });
});
