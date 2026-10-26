import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..', '..');
const readSource = (relativePath: string) =>
  readFileSync(resolve(root, relativePath), 'utf8');

describe('frontend navigation contract', () => {
  it('keeps public sign-in and registration links on Next.js routes', () => {
    const home = readSource('src/app/page.tsx');

    expect(home).toContain('href="/login"');
    expect(home).toContain('href="/register"');
    expect(home).not.toMatch(/(?:login|register)\.html/);
  });

  it('points staff case links at the implemented incident detail route', () => {
    const staffDashboard = readSource('src/app/staff/page.tsx');
    const dashboardLayout = readSource('src/components/layouts/DashboardLayout.tsx');
    const staffNavigation = dashboardLayout.slice(
      dashboardLayout.indexOf('const staffNav'),
      dashboardLayout.indexOf('const adminNav'),
    );

    expect(staffDashboard).toContain('/staff/incidents/${inc.id}');
    expect(staffDashboard).not.toContain('/staff/cases/${inc.id}');
    expect(staffNavigation).toContain("href: '/staff/incidents'");
    expect(staffNavigation).not.toContain("href: '/student/settings'");
  });

  it('keeps named college branding off the public authentication views', () => {
    const login = readSource('src/app/login/page.tsx');
    const register = readSource('src/app/register/page.tsx');

    for (const source of [login, register]) {
      expect(source).not.toMatch(/\bSRKR\b/i);
      expect(source).not.toMatch(/\bVishnu\b/i);
    }
  });
});
