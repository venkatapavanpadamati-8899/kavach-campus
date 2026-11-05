const fs = require('fs');
const filePath = 'tests/e2e/protected-routes-auth-redirect.spec.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  // Admin Portal (7 routes)
  { path: '/admin', expectedRedirect: '/login?redirect=%2Fadmin' },
  { path: '/admin/ai', expectedRedirect: '/login?redirect=%2Fadmin%2Fai' },
  { path: '/admin/campus', expectedRedirect: '/login?redirect=%2Fadmin%2Fcampus' },
  { path: '/admin/incidents', expectedRedirect: '/login?redirect=%2Fadmin%2Fincidents' },
  { path: '/admin/incidents/test-id-1', expectedRedirect: '/login?redirect=%2Fadmin%2Fincidents%2Ftest-id-1' },
  { path: '/admin/system-audit', expectedRedirect: '/login?redirect=%2Fadmin%2Fsystem-audit' },
  { path: '/admin/users', expectedRedirect: '/login?redirect=%2Fadmin%2Fusers' },`;

const targetCRLF = target.replace(/\n/g, '\r\n');

const replacement = `  // Admin Portal (7 routes) — Securely routes to dedicated Campus Admin login portal
  { path: '/admin', expectedRedirect: '/admin/login' },
  { path: '/admin/ai', expectedRedirect: '/admin/login?redirect=%2Fadmin%2Fai' },
  { path: '/admin/campus', expectedRedirect: '/admin/login?redirect=%2Fadmin%2Fcampus' },
  { path: '/admin/incidents', expectedRedirect: '/admin/login?redirect=%2Fadmin%2Fincidents' },
  { path: '/admin/incidents/test-id-1', expectedRedirect: '/admin/login?redirect=%2Fadmin%2Fincidents%2Ftest-id-1' },
  { path: '/admin/system-audit', expectedRedirect: '/admin/login?redirect=%2Fadmin%2Fsystem-audit' },
  { path: '/admin/users', expectedRedirect: '/admin/login?redirect=%2Fadmin%2Fusers' },`;

const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (content.includes(targetCRLF)) {
  content = content.replace(targetCRLF, replacementCRLF);
  console.log('Admin routes test updated (CRLF)');
} else if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log('Admin routes test updated (LF)');
} else {
  console.error('Target not found in tests/e2e/protected-routes-auth-redirect.spec.ts');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated tests/e2e/protected-routes-auth-redirect.spec.ts successfully.');

