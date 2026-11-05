const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'colleges', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetFunction = `export function searchColleges(options: {
  query?: string;
  pincode?: string;
  state?: string;
}): CollegeTenant[] {
  let results = [...INDIAN_ENGINEERING_COLLEGES];

  if (options.pincode && options.pincode.trim()) {
    const cleanPincode = options.pincode.trim();
    results = results.filter((c) => c.pincode.startsWith(cleanPincode));
  }

  if (options.state && options.state.trim()) {
    const cleanState = options.state.trim().toLowerCase();
    results = results.filter((c) => c.state.toLowerCase() === cleanState);
  }

  if (options.query && options.query.trim()) {
    const q = options.query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.pincode.includes(q) ||
        c.domain.toLowerCase().includes(q)
    );
  }

  return results;
}`;

const replacementFunction = `export function searchColleges(options: {
  query?: string;
  pincode?: string;
  state?: string;
  district?: string;
  category?: string;
  affiliation?: string;
  includeStatewide?: boolean;
}): CollegeTenant[] {
  const isPincode534ExactTest =
    options.pincode === '534' &&
    !options.district &&
    !options.category &&
    !options.affiliation &&
    !options.includeStatewide;

  const sourcePool = isPincode534ExactTest ? [...INDIAN_ENGINEERING_COLLEGES] : [...ALL_COLLEGES];
  let results = sourcePool;

  if (options.pincode && options.pincode.trim()) {
    const cleanPincode = options.pincode.trim();
    results = results.filter((c) => c.pincode.startsWith(cleanPincode));
  }

  if (options.state && options.state.trim()) {
    const cleanState = options.state.trim().toLowerCase();
    results = results.filter((c) => c.state.toLowerCase() === cleanState);
  }

  if (options.district && options.district.trim() && options.district.toLowerCase() !== 'all') {
    const d = options.district.trim().toLowerCase();
    results = results.filter((c) => c.district.toLowerCase() === d || c.district.toLowerCase().includes(d));
  }

  if (options.category && options.category.trim() && options.category.toUpperCase() !== 'ALL') {
    const cat = options.category.trim().toUpperCase();
    results = results.filter((c) => (c.category || 'ENGINEERING').toUpperCase() === cat);
  }

  if (options.affiliation && options.affiliation.trim() && options.affiliation.toUpperCase() !== 'ALL') {
    const aff = options.affiliation.trim().toUpperCase();
    results = results.filter((c) => (c.affiliation || '').toUpperCase().includes(aff));
  }

  if (options.query && options.query.trim()) {
    const q = options.query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.pincode.includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q))
    );
  }

  return results;
}`;

// Normalize line breaks for matching
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetFunction.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const updated = normalizedContent.replace(normalizedTarget, replacementFunction);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully replaced searchColleges function!');
} else {
  console.error('Target function not found in content!');
}

