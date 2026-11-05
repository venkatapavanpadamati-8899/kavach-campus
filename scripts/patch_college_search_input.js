const fs = require('fs');
let content = fs.readFileSync('src/components/ui/CollegeSearchInput.tsx', 'utf8');

// Add includeStatewide=true to API call
content = content.replace(
  'const res = await fetch(`/api/colleges/search?${param}`);',
  'const res = await fetch(`/api/colleges/search?${param}&includeStatewide=true`);'
);

// Add category badge to dropdown item if present
const badgeTarget = `                      {col.isAutonomous && (`;
const badgeAddition = `                      {col.category && (
                        <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', fontSize: '0.68rem', fontWeight: 600 }}>
                          {col.category}
                        </span>
                      )}
                      {col.isAutonomous && (`;

if (content.includes(badgeTarget)) {
  content = content.replace(badgeTarget, badgeAddition);
}

fs.writeFileSync('src/components/ui/CollegeSearchInput.tsx', content, 'utf8');
console.log('Successfully updated src/components/ui/CollegeSearchInput.tsx');

