/**
 * Live HTTP & Routing Verification Script for Kavach Campus
 * Tests live HTTP response codes, headers, and redirects on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

interface RouteCheck {
  path: string;
  expectedStatus: number[]; // e.g. [200] or [302, 307]
  type: 'PUBLIC' | 'PROTECTED' | 'API';
  description: string;
}

const routesToTest: RouteCheck[] = [
  // Public Landing & Info
  { path: '/', expectedStatus: [200], type: 'PUBLIC', description: 'Homepage / Landing' },
  { path: '/features', expectedStatus: [200], type: 'PUBLIC', description: 'Campus Safety Features' },
  { path: '/about', expectedStatus: [200], type: 'PUBLIC', description: 'About Kavach Mandate' },
  { path: '/contact', expectedStatus: [200], type: 'PUBLIC', description: 'Emergency Directory & Helplines' },
  { path: '/privacy', expectedStatus: [200], type: 'PUBLIC', description: 'Privacy & Data Protection Policy' },

  // Auth Pages
  { path: '/login', expectedStatus: [200], type: 'PUBLIC', description: 'Student & Staff Login Portal' },
  { path: '/register', expectedStatus: [200], type: 'PUBLIC', description: 'Student Registration Portal' },
  { path: '/forgot-password', expectedStatus: [200], type: 'PUBLIC', description: 'Password Recovery Request' },
  { path: '/reset-password', expectedStatus: [200], type: 'PUBLIC', description: 'Password Reset Form' },
  { path: '/verify-otp', expectedStatus: [200], type: 'PUBLIC', description: 'Two-Factor / Email OTP Verification' },

  // Protected Student Routes (Must be accessible or redirect to login when unauthenticated)
  { path: '/student', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Student Core Dashboard' },
  { path: '/student/report', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Incident Reporting Form' },
  { path: '/student/safe-walk', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Safe Walk Initiation & Tracker' },
  { path: '/student/sos', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'One-Tap SOS Emergency Page' },
  { path: '/student/trusted-contacts', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Trusted Emergency Contacts' },
  { path: '/student/incidents', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Student Incident History' },
  { path: '/student/profile', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Student Private Profile' },
  { path: '/student/settings', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Student Notification Settings' },

  // Protected Staff & Admin Portals
  { path: '/staff', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Security Staff Response Portal' },
  { path: '/staff/incidents', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Staff Active Case Dispatch List' },
  { path: '/admin', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Campus Admin Security Portal' },
  { path: '/admin/ai', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'AI Classification Monitoring' },
  { path: '/admin/campus', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Campus Zones & Buildings Config' },
  { path: '/admin/users', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'User Approval & Role Management' },
  { path: '/admin/incidents', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Full Incident Audit & Management' },
  { path: '/management', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Executive Safety Dashboard' },
  { path: '/management/incidents', expectedStatus: [200, 302, 307], type: 'PROTECTED', description: 'Management Case Review' },

  // APIs
  { path: '/api/system/health', expectedStatus: [200], type: 'API', description: 'System Health Check Endpoint' },
  { path: '/api/colleges/search?pincode=534204', expectedStatus: [200], type: 'API', description: 'Colleges Pincode & Name Search API' },
];

async function runLiveVerification() {
  console.log('='.repeat(70));
  console.log('KAVACH CAMPUS — LIVE SERVER ROUTE & PAGE AUDIT');
  console.log(`Target: ${BASE_URL}`);
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const route of routesToTest) {
    const url = `${BASE_URL}${route.path}`;
    try {
      const response = await fetch(url, {
        redirect: 'manual', // do not follow redirects automatically so we can inspect 302/307
      });

      const isExpected = route.expectedStatus.includes(response.status);
      const redirectLocation = response.headers.get('location');

      if (isExpected) {
        passed++;
        const redirectInfo = redirectLocation ? ` -> Redirects to: ${redirectLocation}` : '';
        console.log(`[PASS] ${response.status} | ${route.path.padEnd(28)} | ${route.type.padEnd(9)} | ${route.description}${redirectInfo}`);
      } else {
        failed++;
        console.error(`[FAIL] ${response.status} (expected ${route.expectedStatus.join('/')}) | ${route.path} | ${route.description}`);
      }
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ERR ] ${route.path.padEnd(28)} | Network Error: ${msg}`);
    }
  }

  console.log('='.repeat(70));
  console.log(`Live Route Audit Summary: ${passed} Passed, ${failed} Failed (Total ${routesToTest.length})`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification();
