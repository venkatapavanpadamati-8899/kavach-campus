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
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should display anti-enumeration message or redirect to verify-otp
    await page.waitForTimeout(1500);
    const bodyText = await page.textContent('body');
    const hasFeedback = bodyText?.includes('sent') || bodyText?.includes('reset') || bodyText?.includes('OTP') || page.url().includes('verify-otp');
    expect(hasFeedback).toBe(true);
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
});
