const fs = require('fs');
let content = fs.readFileSync('src/components/CollegeSelector.tsx', 'utf8');

content = content.replace(
  /const results = searchColleges\({\s*pincode:\s*pincode\.trim\(\),\s*query:\s*searchQuery\.trim\(\)\s*}\);/,
  `const results = searchColleges({
      pincode: pincode.trim(),
      query: searchQuery.trim(),
      includeStatewide: true,
    });`
);

fs.writeFileSync('src/components/CollegeSelector.tsx', content, 'utf8');
console.log('Successfully updated src/components/CollegeSelector.tsx');
