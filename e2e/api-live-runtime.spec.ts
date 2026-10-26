import { test, expect } from '@playwright/test';

test.describe('Live API Runtime Verification (33 Routes on http://localhost:3000)', () => {
  const baseURL = 'http://localhost:3000';

  test('1. /api/system/health requires ADMIN session auth (rejects unauthenticated reconnaissance)', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/system/health`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('2. /api/colleges/search returns active institutions including SRKR and Vishnu', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/colleges/search?q=srkr`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.colleges)).toBe(true);
    const srkr = body.colleges.find((c: any) => c.id === 'srkr-bhimavaram');
    expect(srkr).toBeDefined();
    expect(srkr.name).toContain('Sagi Rama Krishnam Raju');
  });

  test('3. /api/admin/analytics rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/admin/analytics`);
    expect(res.status()).toBe(401);
  });

  test('4. /api/admin/users/approve rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/admin/users/approve`, {
      data: { userId: 'fake-id', approved: true },
    });
    expect(res.status()).toBe(401);
  });

  test('5. /api/admin/verifications rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/admin/verifications`);
    expect(res.status()).toBe(401);
  });

  test('6. /api/cron/escalate rejects unauthenticated requests without CRON_SECRET with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/cron/escalate`);
    expect(res.status()).toBe(401);
  });

  test('7. /api/cron/safe-walk-timeout rejects unauthenticated requests without CRON_SECRET with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/cron/safe-walk-timeout`);
    expect(res.status()).toBe(401);
  });

  test('8. /api/incidents rejects unauthenticated listing with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/incidents`);
    expect(res.status()).toBe(401);
  });

  test('9. /api/incidents rejects unauthenticated creation with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/incidents`, {
      data: { title: 'Test Incident', category: 'THEFT' },
    });
    expect(res.status()).toBe(401);
  });

  test('10. /api/incidents/[id] rejects unauthenticated access with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/incidents/mock-id-123`);
    expect(res.status()).toBe(401);
  });

  test('11. /api/incidents/[id]/escalate rejects unauthenticated access with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/incidents/mock-id-123/escalate`);
    expect(res.status()).toBe(401);
  });

  test('12. /api/incidents/[id]/evidence rejects unauthenticated upload with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/incidents/mock-id-123/evidence`);
    expect(res.status()).toBe(401);
  });

  test('13. /api/incidents/[id]/nearby-staff rejects unauthenticated lookup with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/incidents/mock-id-123/nearby-staff`);
    expect(res.status()).toBe(401);
  });

  test('14. /api/incidents/[id]/notes rejects unauthenticated notes with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/incidents/mock-id-123/notes`);
    expect(res.status()).toBe(401);
  });

  test('15. /api/safe-walk/start rejects unauthenticated start with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/safe-walk/start`, {
      data: { startLatitude: 16.5449, startLongitude: 81.4975, durationMinutes: 15 },
    });
    expect(res.status()).toBe(401);
  });

  test('16. /api/safe-walk/location rejects unauthenticated location update with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/safe-walk/location`, {
      data: { sessionId: 'mock-session', latitude: 16.5449, longitude: 81.4975 },
    });
    expect(res.status()).toBe(401);
  });

  test('17. /api/safe-walk/end rejects unauthenticated end request with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/safe-walk/end`, {
      data: { sessionId: 'mock-session' },
    });
    expect(res.status()).toBe(401);
  });

  test('18. /api/sos rejects unauthenticated SOS triggers with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/sos`, {
      data: { latitude: 16.5449, longitude: 81.4975 },
    });
    expect(res.status()).toBe(401);
  });

  test('19. /api/sos/location rejects unauthenticated SOS location updates with 401', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/sos/location`, {
      data: { sosId: 'mock-sos', latitude: 16.5449, longitude: 81.4975 },
    });
    expect(res.status()).toBe(401);
  });

  test('20. /api/student/blood-search rejects unauthenticated search with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/student/blood-search?bloodGroup=O_POS`);
    expect(res.status()).toBe(401);
  });

  test('21. /api/student/profile rejects unauthenticated profile read with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/student/profile`);
    expect(res.status()).toBe(401);
  });

  test('22. /api/student/trusted-contacts rejects unauthenticated contacts read with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/student/trusted-contacts`);
    expect(res.status()).toBe(401);
  });

  test('23. /api/student/verify-id rejects unauthenticated student ID verification with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/student/verify-id`);
    expect(res.status()).toBe(401);
  });

  test('24. /api/super-admin/pending-campus rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/super-admin/pending-campus`);
    expect(res.status()).toBe(401);
  });

  test('25. /api/auth/demo-sms validates input format and rejects invalid mobile numbers with 400', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/demo-sms`, {
      data: { phone: '123' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('valid 10-digit mobile number');
  });

  test('26. /api/auth/demo-sms successfully dispatches simulated OTP with ₹0 free demo notice', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/demo-sms`, {
      data: { phone: '9876543210' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.mode).toBe('DEMO_SMS_MODE');
    expect(body.isRealVerification).toBe(false);
  });

  test('27. /api/auth/demo-sms GET enforces clientToken session authorization (rejects eavesdropping)', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/auth/demo-sms?recipient=9876543210`);
    expect(res.status()).toBe(401);
  });

  test('28. /api/auth/logout succeeds gracefully', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/logout`);
    // Logout should succeed (200) or redirect
    expect([200, 302, 303, 307]).toContain(res.status());
  });

  test('29. /api/auth/forgot-password preserves anti-enumeration on unknown email', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/forgot-password`, {
      data: { email: 'unknown.student@srkr.edu.in' },
    });
    // Must return 200 with generic success message to prevent user enumeration
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('If an account exists');
  });

  test('30. /api/auth/login rejects empty credentials with 400', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/login`, {
      data: { email: '', password: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('31. /api/auth/register rejects missing fields with 400', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/register`, {
      data: { email: 'invalid' },
    });
    expect(res.status()).toBe(400);
  });

  test('32. /api/auth/resend-otp rejects missing identifier with 400', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/resend-otp`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('33. /api/auth/verify-otp rejects missing OTP with 400', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/auth/verify-otp`, {
      data: { email: 'test@srkr.edu.in' },
    });
    expect(res.status()).toBe(400);
  });
});
