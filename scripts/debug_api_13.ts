import { createTestUser, getPlaywrightCookiesForUser, adminClient } from '../tests/e2e/test-auth-helper';

async function main() {
  const user = await createTestUser('STUDENT', true, true);
  console.log('Created user:', user.id, user.email);
  const cookies = await getPlaywrightCookiesForUser(user.email, user.password);
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  const res = await fetch('http://localhost:3000/api/student/profile', {
    headers: { Cookie: cookieHeader },
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response body:', text);

  await adminClient.auth.admin.deleteUser(user.id);
}

main().catch(console.error);

