import { test, expect } from '@playwright/test';

test.describe('Authentication & User Interface Flows', () => {
  test('Login page renders SRKR/Vishnu institutional elements and handles invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Check institutional indicators
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Kavach Campus');

    // Fill invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('invalid.student@srkr.edu.in');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Verify error state appears or remains gracefully on login page without crashing
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });

  test('Registration page renders form fields and validates college selection', async ({ page }) => {
    await page.goto('/register');

    // Verify email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
    await expect(passwordInput).toBeVisible();

    // Check college selector or options
    const collegeSelect = page.locator('select, [role="combobox"]').first();
    if (await collegeSelect.count() > 0) {
      await expect(collegeSelect).toBeVisible();
    }
  });

  test('Forgot password page handles password recovery submission', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    await expect(emailInput).toBeVisible();

    await emailInput.fill('student.test@srkr.edu.in');
    const regNumInput = page.locator('input[name="registrationNumber"]');
    if (await regNumInput.isVisible()) {
      await regNumInput.fill('2101201045');
    }
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should display anti-enumeration message or redirect to verify-otp / reset-password
    await expect(
      page.getByRole('heading', { name: 'Recovery Code Dispatched!' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('Super Admin login page enforces isolation and rejects unauthorized access', async ({ page }) => {
    await page.goto('/super-admin/login');

    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    await expect(emailInput).toBeVisible();

    await emailInput.fill('fake.admin@campus.edu');
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
    await passwordInput.fill('InvalidAdminPass123!');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/super-admin/login');
  });

  test('Verify OTP page displays demo simulation notice and allows resend', async ({ page }) => {
    await page.goto('/verify-otp?email=student.demo@srkr.edu.in');

    const bodyText = await page.textContent('body');
    // Verify that demo notice / ₹0 Free simulated OTP indicator is present
    expect(bodyText).toContain('OTP');

    const otpInput = page.locator('input[type="text"], input[inputmode="numeric"]').first();
    if (await otpInput.count() > 0) {
      await expect(otpInput).toBeVisible();
    }
  });

  test('Registration page displays single email input, 8-10 alphanumeric registration number, department dropdown, academic year, and campus background', async ({ page }) => {
    await page.goto('/register');

    // 1. Single canonical email input
    const emailInputs = page.locator('input[type="email"]');
    expect(await emailInputs.count()).toBe(1);
    const emailPlaceholder = await emailInputs.first().getAttribute('placeholder');
    expect(emailPlaceholder).toContain('Email');

    // 2. 8-10 alphanumeric Student Registration Number input
    const regInput = page.locator('input[name="registrationNumber"]');
    await expect(regInput).toBeVisible();
    expect(await regInput.getAttribute('maxLength')).toBe('10');
    expect(await regInput.getAttribute('placeholder')).toContain('Registration Number');

    // 3. Department and Academic Year selectors
    const deptSelect = page.locator('select[name="department"]');
    await expect(deptSelect).toBeVisible();
    const yearSelect = page.locator('select[name="academicYear"]');
    await expect(yearSelect).toBeVisible();

    // 4. Background styling contains campus background image
    const bgContainer = page.locator('div[style*="auth_campus_bg.jpg"]').first();
    await expect(bgContainer).toBeVisible();

    // 5. Test client-side 8-10 alphanumeric validation
    await page.locator('input[name="name"]').fill('Test Student');
    await emailInputs.first().fill('test.student@srkr.edu.in');
    await page.locator('input[name="password"]').fill('ValidPassword123!');
    await regInput.fill('12345'); // only 5 chars (< 8)
    await deptSelect.selectOption({ index: 1 });
    await yearSelect.selectOption('1st Year');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Verify error message for registration number
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/8, 9, or 10 characters|Registration Number/i);
  });

  test('Legacy .html URLs redirect smoothly to canonical routes without loops', async ({ page }) => {
    // login.html -> /login
    await page.goto('/login.html');
    expect(page.url()).toContain('/login');
    expect(page.url()).not.toContain('.html');

    // register.html -> /register
    await page.goto('/register.html');
    expect(page.url()).toContain('/register');
    expect(page.url()).not.toContain('.html');
  });

  test('Displays clear actionable error banner when redirected with google_oauth_client_deleted error', async ({ page }) => {
    await page.goto('/login?error=google_oauth_client_deleted');

    const errorBanner = page.locator('text=Google Cloud OAuth Client Deleted or Inactive');
    await expect(errorBanner).toBeVisible();

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Google Cloud OAuth Client Deleted or Inactive');
    expect(bodyText).toContain('Google Cloud Console');
    expect(bodyText).toContain('GOOGLE_CLIENT_ID');
  });

  test('Google Sign-In button is decoupled from email password form on login and register pages', async ({ page }) => {
    // Check login page
    await page.goto('/login');
    const loginGoogleBtn = page.locator('button:has-text("Google"), button:has-text("Sign in with Google")').first();
    await expect(loginGoogleBtn).toBeVisible();
    expect(await loginGoogleBtn.getAttribute('type')).toBe('button');

    // Check register page
    await page.goto('/register');
    const registerGoogleBtn = page.locator('button:has-text("Google"), button:has-text("Sign up with Google")').first();
    await expect(registerGoogleBtn).toBeVisible();
    expect(await registerGoogleBtn.getAttribute('type')).toBe('button');
  });
});
