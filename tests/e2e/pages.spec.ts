import { test, expect, type Page } from '@playwright/test';
import {
  createTestUser,
  getPlaywrightCookiesForUser,
  cleanupTestUsers,
  type TestUser,
} from './test-auth-helper';

test.describe('Kavach Campus — Comprehensive E2E Page Verification', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  // Helper to monitor console and page errors
  function setupErrorMonitoring(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(`PageError: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore harmless browser noise like favicon or mock network 401s in normal client fetch
        if (!text.includes('favicon') && !text.includes('401') && !text.includes('WebSocket')) {
          errors.push(`ConsoleError: ${text}`);
        }
      }
    });
    return errors;
  }

  // --------------------------------------------------------------------------
  // GROUP 1: Public Pages (Unauthenticated)
  // --------------------------------------------------------------------------
  test.describe('Public & Informational Pages', () => {
    const publicPages = [
      { path: '/', titleSnippet: 'Kavach Campus', headingText: 'Safety' },
      { path: '/about', titleSnippet: 'Kavach', headingText: 'About' },
      { path: '/features', titleSnippet: 'Kavach', headingText: 'Features' },
      { path: '/privacy', titleSnippet: 'Kavach', headingText: 'Privacy' },
      { path: '/contact', titleSnippet: 'Kavach', headingText: 'Contact' },
      { path: '/unauthorized', titleSnippet: 'Kavach', headingText: 'Access Denied' },
      { path: '/login', titleSnippet: 'Kavach', headingText: 'Sign In' },
      { path: '/register', titleSnippet: 'Kavach', headingText: 'Register' },
      { path: '/verify-otp', titleSnippet: 'Kavach', headingText: 'Verification' },
      { path: '/forgot-password', titleSnippet: 'Kavach', headingText: 'Reset Password' },
      { path: '/reset-password', titleSnippet: 'Kavach', headingText: 'Create New Password' },
      { path: '/super-admin/login', titleSnippet: 'Kavach', headingText: 'Super Admin' },
    ];

    for (const p of publicPages) {
      test(`Public Page: ${p.path} renders successfully without errors`, async ({ page }) => {
        const errors = setupErrorMonitoring(page);
        const response = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);

        const body = page.locator('body');
        await expect(body).toBeVisible();
        await page.waitForLoadState('networkidle').catch(() => {});

        const title = await page.title();
        expect(title.toLowerCase()).toContain(p.titleSnippet.toLowerCase());

        // Wait for page heading or content to render
        await expect(page.getByText(new RegExp(p.headingText, 'i')).first()).toBeVisible({ timeout: 5000 });

        // Check for fatal unhandled React errors
        expect(errors.filter((e) => e.startsWith('PageError'))).toHaveLength(0);
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 2: Unauthenticated Protection & Role-Based Redirects
  // --------------------------------------------------------------------------
  test.describe('Unauthenticated Route Protection', () => {
    const protectedPaths = [
      '/student',
      '/student/report',
      '/student/safe-walk',
      '/staff',
      '/staff/incidents',
      '/admin',
      '/admin/users',
      '/admin/incidents',
      '/management',
      '/management/incidents',
      '/super-admin',
      '/super-admin/pending-campus',
    ];

    for (const path of protectedPaths) {
      test(`Unauthenticated access to ${path} redirects to login or unauthorized`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        const finalUrl = page.url();
        const isRedirectedToAuth =
          finalUrl.includes('/login') ||
          finalUrl.includes('/super-admin/login') ||
          finalUrl.includes('/unauthorized');
        expect(isRedirectedToAuth).toBeTruthy();
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 3: Authenticated Student Portal (13 Pages)
  // --------------------------------------------------------------------------
  test.describe('Authenticated Student Portal Pages', () => {
    let studentUser: TestUser;
    let studentCookies: any[];

    test.beforeAll(async () => {
      studentUser = await createTestUser('STUDENT', true, true);
      createdUserIds.push(studentUser.id);
      studentCookies = await getPlaywrightCookiesForUser(studentUser.email, studentUser.password);
    });

    const studentPages = [
      '/student',
      '/student/cases',
      '/student/contacts',
      '/student/incidents',
      '/student/profile',
      '/student/report',
      '/student/safe-walk',
      '/student/settings',
      '/student/sos',
      '/student/trusted-contacts',
      '/student/verification-status',
      '/student/voice-report',
      '/student/incidents/00000000-0000-0000-0000-000000000001',
    ];

    for (const path of studentPages) {
      test(`Student Portal: ${path} renders for verified student`, async ({ context }) => {
        await context.addCookies(studentCookies);
        const page = await context.newPage();
        const errors = setupErrorMonitoring(page);

        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(400);

        const body = await page.textContent('body');
        expect(body).toBeTruthy();
        expect(body?.length).toBeGreaterThan(50);

        // Assert no fatal React crash
        expect(errors.filter((e) => e.startsWith('PageError'))).toHaveLength(0);
        await page.close();
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 4: Authenticated Staff Portal (3 Pages)
  // --------------------------------------------------------------------------
  test.describe('Authenticated Staff Portal Pages', () => {
    let staffUser: TestUser;
    let staffCookies: any[];

    test.beforeAll(async () => {
      staffUser = await createTestUser('SECURITY', true, false);
      createdUserIds.push(staffUser.id);
      staffCookies = await getPlaywrightCookiesForUser(staffUser.email, staffUser.password);
    });

    const staffPages = [
      '/staff',
      '/staff/incidents',
      '/staff/incidents/00000000-0000-0000-0000-000000000001',
    ];

    for (const path of staffPages) {
      test(`Staff Portal: ${path} renders for security staff`, async ({ context }) => {
        await context.addCookies(staffCookies);
        const page = await context.newPage();
        const errors = setupErrorMonitoring(page);

        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(400);

        const body = await page.textContent('body');
        expect(body).toBeTruthy();

        expect(errors.filter((e) => e.startsWith('PageError'))).toHaveLength(0);
        await page.close();
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 5: Authenticated Campus Admin Portal (7 Pages)
  // --------------------------------------------------------------------------
  test.describe('Authenticated Campus Admin Portal Pages', () => {
    let adminUser: TestUser;
    let adminCookies: any[];

    test.beforeAll(async () => {
      adminUser = await createTestUser('ADMIN', true, false);
      createdUserIds.push(adminUser.id);
      adminCookies = await getPlaywrightCookiesForUser(adminUser.email, adminUser.password);
    });

    const adminPages = [
      '/admin',
      '/admin/ai',
      '/admin/campus',
      '/admin/incidents',
      '/admin/incidents/00000000-0000-0000-0000-000000000001',
      '/admin/system-audit',
      '/admin/users',
    ];

    for (const path of adminPages) {
      test(`Admin Portal: ${path} renders for campus admin`, async ({ context }) => {
        await context.addCookies(adminCookies);
        const page = await context.newPage();
        const errors = setupErrorMonitoring(page);

        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(400);

        const body = await page.textContent('body');
        expect(body).toBeTruthy();

        expect(errors.filter((e) => e.startsWith('PageError'))).toHaveLength(0);
        await page.close();
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 6: Authenticated Management Portal (3 Pages)
  // --------------------------------------------------------------------------
  test.describe('Authenticated Management Portal Pages', () => {
    let mgmtUser: TestUser;
    let mgmtCookies: any[];

    test.beforeAll(async () => {
      mgmtUser = await createTestUser('PRINCIPAL', true, false);
      createdUserIds.push(mgmtUser.id);
      mgmtCookies = await getPlaywrightCookiesForUser(mgmtUser.email, mgmtUser.password);
    });

    const mgmtPages = [
      '/management',
      '/management/incidents',
      '/management/incidents/00000000-0000-0000-0000-000000000001',
    ];

    for (const path of mgmtPages) {
      test(`Management Portal: ${path} renders for college management`, async ({ context }) => {
        await context.addCookies(mgmtCookies);
        const page = await context.newPage();
        const errors = setupErrorMonitoring(page);

        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(400);

        const body = await page.textContent('body');
        expect(body).toBeTruthy();

        expect(errors.filter((e) => e.startsWith('PageError'))).toHaveLength(0);
        await page.close();
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 7: Authenticated Super-Admin Portal (2 Pages)
  // --------------------------------------------------------------------------
  test.describe('Authenticated Super-Admin Portal Pages', () => {
    let superAdminUser: TestUser;
    let superAdminCookies: any[];

    test.beforeAll(async () => {
      superAdminUser = await createTestUser('SUPER_ADMIN', true, false);
      createdUserIds.push(superAdminUser.id);
      superAdminCookies = await getPlaywrightCookiesForUser(superAdminUser.email, superAdminUser.password);
    });

    const superAdminPages = [
      '/super-admin',
      '/super-admin/pending-campus',
    ];

    for (const path of superAdminPages) {
      test(`Super Admin Portal: ${path} renders for platform super-admin`, async ({ context }) => {
        await context.addCookies(superAdminCookies);
        const page = await context.newPage();
        const errors = setupErrorMonitoring(page);

        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(400);

        const body = await page.textContent('body');
        expect(body).toBeTruthy();

        expect(errors.filter((e) => e.startsWith('PageError'))).toHaveLength(0);
        await page.close();
      });
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 8: Central Dashboard Redirector (/dashboard)
  // --------------------------------------------------------------------------
  test.describe('Role-Based Dashboard Dispatcher (/dashboard)', () => {
    test('/dashboard redirects STUDENT to /student', async ({ context }) => {
      const student = await createTestUser('STUDENT', true, true);
      createdUserIds.push(student.id);
      const cookies = await getPlaywrightCookiesForUser(student.email, student.password);
      await context.addCookies(cookies);

      const page = await context.newPage();
      await page.goto('/dashboard');
      await page.waitForURL(/\/student/, { timeout: 25000 });
      expect(page.url()).toContain('/student');
      await page.close();
    });

    test('/dashboard redirects ADMIN to /admin', async ({ context }) => {
      const admin = await createTestUser('ADMIN', true, false);
      createdUserIds.push(admin.id);
      const cookies = await getPlaywrightCookiesForUser(admin.email, admin.password);
      await context.addCookies(cookies);

      const page = await context.newPage();
      await page.goto('/dashboard');
      await page.waitForURL(/\/admin/, { timeout: 25000 });
      expect(page.url()).toContain('/admin');
      await page.close();
    });
  });

  // --------------------------------------------------------------------------
  // GROUP 9: Mobile Viewport Layout Verification
  // --------------------------------------------------------------------------
  test.describe('Mobile Viewport Responsiveness (Pixel 7 / iPhone 13)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('Mobile landing page renders without horizontal scroll overflow', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Check document scroll width does not exceed client width (no broken overflowing containers)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    });

    test('Mobile SOS page renders emergency button prominently', async ({ context }) => {
      const student = await createTestUser('STUDENT', true, true);
      createdUserIds.push(student.id);
      const cookies = await getPlaywrightCookiesForUser(student.email, student.password);
      await context.addCookies(cookies);

      const page = await context.newPage();
      await page.goto('/student/sos', { waitUntil: 'domcontentloaded' });
      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toContain('sos');
      await page.close();
    });
  });
});
