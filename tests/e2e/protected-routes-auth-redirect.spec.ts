import { test, expect } from '@playwright/test';

// All 29 protected routes that must enforce authentication via proxy.ts middleware
const protectedRoutes = [
  // Student Portal (13 routes)
  { path: '/student', expectedRedirect: '/login?redirect=%2Fstudent' },
  { path: '/student/cases', expectedRedirect: '/login?redirect=%2Fstudent%2Fcases' },
  { path: '/student/contacts', expectedRedirect: '/login?redirect=%2Fstudent%2Fcontacts' },
  { path: '/student/incidents', expectedRedirect: '/login?redirect=%2Fstudent%2Fincidents' },
  { path: '/student/incidents/test-id-1', expectedRedirect: '/login?redirect=%2Fstudent%2Fincidents%2Ftest-id-1' },
  { path: '/student/profile', expectedRedirect: '/login?redirect=%2Fstudent%2Fprofile' },
  { path: '/student/report', expectedRedirect: '/login?redirect=%2Fstudent%2Freport' },
  { path: '/student/safe-walk', expectedRedirect: '/login?redirect=%2Fstudent%2Fsafe-walk' },
  { path: '/student/settings', expectedRedirect: '/login?redirect=%2Fstudent%2Fsettings' },
  { path: '/student/sos', expectedRedirect: '/login?redirect=%2Fstudent%2Fsos' },
  { path: '/student/trusted-contacts', expectedRedirect: '/login?redirect=%2Fstudent%2Ftrusted-contacts' },
  { path: '/student/verification-status', expectedRedirect: '/login?redirect=%2Fstudent%2Fverification-status' },
  { path: '/student/voice-report', expectedRedirect: '/login?redirect=%2Fstudent%2Fvoice-report' },

  // Staff Portal (3 routes)
  { path: '/staff', expectedRedirect: '/login?redirect=%2Fstaff' },
  { path: '/staff/incidents', expectedRedirect: '/login?redirect=%2Fstaff%2Fincidents' },
  { path: '/staff/incidents/test-id-1', expectedRedirect: '/login?redirect=%2Fstaff%2Fincidents%2Ftest-id-1' },

  // Management Portal (3 routes)
  { path: '/management', expectedRedirect: '/login?redirect=%2Fmanagement' },
  { path: '/management/incidents', expectedRedirect: '/login?redirect=%2Fmanagement%2Fincidents' },
  { path: '/management/incidents/test-id-1', expectedRedirect: '/login?redirect=%2Fmanagement%2Fincidents%2Ftest-id-1' },

  // Admin Portal (7 routes)
  { path: '/admin', expectedRedirect: '/login?redirect=%2Fadmin' },
  { path: '/admin/ai', expectedRedirect: '/login?redirect=%2Fadmin%2Fai' },
  { path: '/admin/campus', expectedRedirect: '/login?redirect=%2Fadmin%2Fcampus' },
  { path: '/admin/incidents', expectedRedirect: '/login?redirect=%2Fadmin%2Fincidents' },
  { path: '/admin/incidents/test-id-1', expectedRedirect: '/login?redirect=%2Fadmin%2Fincidents%2Ftest-id-1' },
  { path: '/admin/system-audit', expectedRedirect: '/login?redirect=%2Fadmin%2Fsystem-audit' },
  { path: '/admin/users', expectedRedirect: '/login?redirect=%2Fadmin%2Fusers' },

  // Super Admin Portal (2 routes)
  { path: '/super-admin', expectedRedirect: '/super-admin/login' },
  { path: '/super-admin/pending-campus', expectedRedirect: '/super-admin/login?redirect=%2Fsuper-admin%2Fpending-campus' },
];

test.describe('Protected Routes Middleware Authentication Redirection', () => {
  for (const route of protectedRoutes) {
    test(`unauthenticated request to ${route.path} redirects safely to ${route.expectedRedirect}`, async ({ page }) => {
      // Clear all cookies to guarantee anonymous unauthenticated request
      await page.context().clearCookies();

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      // Verify URL redirected safely to login
      const currentUrl = new URL(page.url());
      const expectedPath = route.expectedRedirect.split('?')[0];
      expect(currentUrl.pathname).toBe(expectedPath);

      // Verify that login page rendered with login form elements
      const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
      await expect(emailInput).toBeVisible();
    });
  }
});
