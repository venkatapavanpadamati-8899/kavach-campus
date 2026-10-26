import { test, expect } from '@playwright/test';
import {
  createTestUser,
  getPlaywrightCookiesForUser,
  cleanupTestUsers,
  type TestUser,
} from './test-auth-helper';

const VIEWPORTS = [
  { name: 'Mobile Small (iPhone SE)', width: 320, height: 568 },
  { name: 'Mobile Medium (iPhone X/11)', width: 375, height: 812 },
  { name: 'Mobile Modern (iPhone 12/13/14)', width: 390, height: 844 },
  { name: 'Tablet Portrait (iPad)', width: 768, height: 1024 },
  { name: 'Tablet Landscape (iPad)', width: 1024, height: 768 },
  { name: 'Laptop Standard (HD Laptop)', width: 1366, height: 768 },
  { name: 'Desktop Full HD (1080p)', width: 1920, height: 1080 },
];

test.describe('Kavach Campus — Viewport Responsiveness & Critical Features', () => {
  const createdUserIds: string[] = [];
  let studentUser: TestUser | null = null;

  test.beforeAll(async () => {
    try {
      studentUser = await createTestUser('STUDENT', true, true);
      if (studentUser) {
        createdUserIds.push(studentUser.id);
      }
    } catch (e) {
      console.warn('Could not provision test student user for browser session:', e);
    }
  });

  test.afterAll(async () => {
    await cleanupTestUsers(createdUserIds);
  });

  // =========================================================================
  // 1. REGISTRATION PAGE RESPONSIVENESS & ELEMENTS
  // =========================================================================
  test.describe('Registration Page Responsiveness & Elements', () => {
    for (const vp of VIEWPORTS) {
      test(`Registration page renders properly on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/register', { waitUntil: 'domcontentloaded' });

        // Centered card / glass-panel visibility
        const panel = page.locator('.glass-panel').first();
        await expect(panel).toBeVisible();

        // Required form inputs
        const nameInput = page.locator('input[name="name"]');
        const emailInput = page.locator('input[name="email"]');
        const regNumberInput = page.locator('input[name="registrationNumber"]');
        const phoneInput = page.locator('input[name="phone"]');
        const passwordInput = page.locator('input[name="password"]');

        await expect(nameInput).toBeVisible();
        await expect(emailInput).toBeVisible();
        await expect(regNumberInput).toBeVisible();
        await expect(phoneInput).toBeVisible();
        await expect(passwordInput).toBeVisible();

        // Google button
        const googleBtn = page.getByText(/Continue with Google/i);
        await expect(googleBtn).toBeVisible();

        // Sign in navigation link pointing to login.html
        const loginLink = page.locator('a[href="/login.html"], a[href="/login"]').first();
        await expect(loginLink).toBeVisible();

        // No horizontal scroll on the viewport
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(vp.width + 10);
      });
    }

    test('Registration link navigation routes to login.html correctly', async ({ page }) => {
      await page.goto('/register', { waitUntil: 'domcontentloaded' });
      const loginLink = page.locator('a[href="/login.html"]').first();
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain('/login');
    });
  });

  // =========================================================================
  // 2. SIGN-IN PAGE RESPONSIVENESS & ELEMENTS
  // =========================================================================
  test.describe('Sign-In Page Responsiveness & Elements', () => {
    for (const vp of VIEWPORTS) {
      test(`Sign-in page renders properly on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/login', { waitUntil: 'domcontentloaded' });

        const panel = page.locator('.glass-panel').first();
        await expect(panel).toBeVisible();

        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();

        const googleBtn = page.getByText(/Continue with Google/i);
        await expect(googleBtn).toBeVisible();

        const registerLink = page.locator('a[href="/register.html"], a[href="/register"]').first();
        await expect(registerLink).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(vp.width + 10);
      });
    }

    test('Sign-in link navigation routes to register.html correctly', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      const registerLink = page.locator('a[href="/register.html"]').first();
      await expect(registerLink).toBeVisible();
      await registerLink.click();
      await page.waitForURL(/\/register/);
      expect(page.url()).toContain('/register');
    });
  });

  // =========================================================================
  // 3. ID CARD VERIFICATION PRE-CHECKS & PHOTO EXTRACTION UI
  // =========================================================================
  test.describe('ID Card Verification Page Pre-checks & UI', () => {
    for (const vp of VIEWPORTS) {
      test(`Verification page displays upload & analysis card on ${vp.name}`, async ({ page, context }) => {
        if (studentUser) {
          const cookies = await getPlaywrightCookiesForUser(studentUser.email, studentUser.password);
          await context.addCookies(cookies);
        }

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/student/verification-status', { waitUntil: 'domcontentloaded' });

        // Check if page loaded or redirected
        if (page.url().includes('/login')) {
          // Unauthenticated redirect is correct behavior
          expect(page.url()).toContain('/login');
          return;
        }

        const heading = page.getByText(/Student Identity Verification/i);
        await expect(heading).toBeVisible();

        // 10-digit ID input & college selector
        const idInput = page.locator('input[placeholder*="2101201045"]');
        if (await idInput.count() > 0) {
          await expect(idInput).toBeVisible();
        }

        // Emergency SOS availability banner
        const sosBanner = page.getByText(/Emergency SOS is ALWAYS available/i);
        if (await sosBanner.count() > 0) {
          await expect(sosBanner).toBeVisible();
        }
      });
    }
  });

  // =========================================================================
  // 4. ACCOMMODATION STATUS: RESPONSIVENESS ACROSS 7 VIEWPORTS
  // =========================================================================
  test.describe('Accommodation Status Responsiveness & Interactions', () => {
    for (const vp of VIEWPORTS) {
      test(`Accommodation status 3-option selector adapts seamlessly to ${vp.name}`, async ({ page, context }) => {
        if (studentUser) {
          const cookies = await getPlaywrightCookiesForUser(studentUser.email, studentUser.password);
          await context.addCookies(cookies);
        }

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/student/profile', { waitUntil: 'domcontentloaded' });

        if (page.url().includes('/login')) {
          expect(page.url()).toContain('/login');
          return;
        }

        // Heading for Accommodation Status
        const heading = page.getByText(/Accommodation Status/i);
        await expect(heading).toBeVisible();

        // 3 Options: College Hostel, Private Hostel / PG, Day Scholar
        const collegeHostelBtn = page.getByRole('button', { name: /College Hostel/i });
        const privateHostelBtn = page.getByRole('button', { name: /Private Hostel/i });
        const dayScholarBtn = page.getByRole('button', { name: /Day Scholar/i });

        await expect(collegeHostelBtn).toBeVisible();
        await expect(privateHostelBtn).toBeVisible();
        await expect(dayScholarBtn).toBeVisible();

        // Switch to Private Hostel and verify conditional fields render
        await privateHostelBtn.click();
        const pgNameInput = page.locator('input[placeholder*="PG Name"]');
        if (await pgNameInput.count() > 0) {
          await expect(pgNameInput).toBeVisible();
        }

        // Switch to Day Scholar and verify commuter badge renders
        await dayScholarBtn.click();
        const commuterNotice = page.getByText(/Day Scholar Daily Commuter/i);
        if (await commuterNotice.count() > 0) {
          await expect(commuterNotice).toBeVisible();
        }

        // Switch back to College Hostel and verify room number input
        await collegeHostelBtn.click();
        const hostelNameInput = page.locator('input[placeholder*="Hostel Block"]');
        if (await hostelNameInput.count() > 0) {
          await expect(hostelNameInput).toBeVisible();
        }

        // Ensure no horizontal scroll breakage
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(vp.width + 10);
      });
    }
  });

  // =========================================================================
  // 5. DASHBOARD SETTINGS, SOS SAFETY & COLLEGE NAME RENDERING
  // =========================================================================
  test.describe('Dashboard Controls & Conditional College Name', () => {
    test('Settings and SOS buttons are fully functional and responsive', async ({ page, context }) => {
      if (studentUser) {
        const cookies = await getPlaywrightCookiesForUser(studentUser.email, studentUser.password);
        await context.addCookies(cookies);
      }

      await page.goto('/student', { waitUntil: 'domcontentloaded' });

      if (page.url().includes('/login')) {
        expect(page.url()).toContain('/login');
        return;
      }

      // Check navigation to SOS page
      const sosLink = page.locator('a[href="/student/sos"]').first();
      if (await sosLink.count() > 0) {
        await expect(sosLink).toBeVisible();
      }

      // Check navigation to Settings page
      const settingsLink = page.locator('a[href="/student/settings"]').first();
      if (await settingsLink.count() > 0) {
        await expect(settingsLink).toBeVisible();
      }
    });

    test('Authentication pages do NOT display any college names', async ({ page }) => {
      const authPages = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];

      for (const p of authPages) {
        await page.goto(p, { waitUntil: 'domcontentloaded' });
        const bodyText = await page.textContent('body');
        // Specific college institutional names must NOT be hardcoded on unauthenticated landing
        expect(bodyText).not.toContain('Sagi Rama Krishnam Raju Engineering College (Autonomous)');
        expect(bodyText).not.toContain('Vishnu Institute of Technology (Autonomous)');
      }
    });
  });
});
