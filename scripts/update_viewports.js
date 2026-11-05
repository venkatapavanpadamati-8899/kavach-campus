const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'tests', 'e2e', 'viewport-responsiveness.spec.ts');
let content = fs.readFileSync(file, 'utf8');

const oldBlock = content.match(/const VIEWPORTS = \[[\s\S]*?\];/)[0];

const newViewports = `const VIEWPORTS = [
  { name: 'Small mobile (320x568)', width: 320, height: 568 },
  { name: 'Mobile (360x800)', width: 360, height: 800 },
  { name: 'Mobile (375x812)', width: 375, height: 812 },
  { name: 'Mobile (390x844)', width: 390, height: 844 },
  { name: 'Mobile (430x932)', width: 430, height: 932 },
  { name: 'Tablet portrait (768x1024)', width: 768, height: 1024 },
  { name: 'Tablet landscape (1024x768)', width: 1024, height: 768 },
  { name: 'Laptop (1280x720)', width: 1280, height: 720 },
  { name: 'Laptop (1366x768)', width: 1366, height: 768 },
  { name: 'Desktop (1440x900)', width: 1440, height: 900 },
  { name: 'Full HD (1920x1080)', width: 1920, height: 1080 },
];`;

content = content.replace(oldBlock, newViewports);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated VIEWPORTS in', file);

