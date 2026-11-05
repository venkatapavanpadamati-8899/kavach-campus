const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'colleges', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldSearch = `export function searchColleges(options: {
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
  let results = sourcePool;`;

const newSearch = `export function searchColleges(options: {
  query?: string;
  pincode?: string;
  state?: string;
  district?: string;
  category?: string;
  affiliation?: string;
  includeStatewide?: boolean;
}): CollegeTenant[] {
  const useAllColleges = Boolean(
    options.includeStatewide ||
    (options.district && options.district.toLowerCase() !== 'all') ||
    (options.category && options.category.toUpperCase() !== 'ALL') ||
    (options.affiliation && options.affiliation.toUpperCase() !== 'ALL')
  );

  const sourcePool = useAllColleges ? [...ALL_COLLEGES] : [...INDIAN_ENGINEERING_COLLEGES];
  let results = sourcePool;`;

content = content.replace(oldSearch, newSearch);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated searchColleges in index.ts');

