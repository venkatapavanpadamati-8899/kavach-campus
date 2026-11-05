const fs = require('fs');
let content = fs.readFileSync('src/components/layouts/DashboardLayout.tsx', 'utf8');

const targetRegex = /<Link\s+href=\{role === 'STUDENT'\s*\?\s*\'\/student\/cases\'\s*:\s*role === \'STAFF\'\s*\?\s*\'\/staff\/incidents\'\s*:\s*role === \'MANAGEMENT\'\s*\?\s*\'\/management\/incidents\'\s*:\s*\'\/admin\/incidents\'\}>\s*<button[\s\S]*?<\/button>\s*<\/Link>/;

const replacement = `<Link
                href={role === 'STUDENT' ? '/student/cases' : role === 'STAFF' ? '/staff/incidents' : role === 'MANAGEMENT' ? '/management/incidents' : '/admin/incidents'}
                title="View Incident Alerts"
                aria-label="View Incident Alerts"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '7px',
                  borderRadius: '50%',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
              >
                <Bell size={17} />
              </Link>`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync('src/components/layouts/DashboardLayout.tsx', content, 'utf8');
  console.log('SUCCESS: Nested button inside Link removed in DashboardLayout.tsx');
} else {
  console.log('REGEX DID NOT MATCH');
}

