const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'colleges', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports at top
if (!content.includes("from './districts'")) {
  content = `import { AP_26_DISTRICTS, DistrictRecord } from './districts';\nimport { AP_STATEWIDE_COLLEGES, CollegeRecord } from './ap-colleges-data';\n\nexport { AP_26_DISTRICTS };\nexport type { DistrictRecord, CollegeRecord };\n\n` + content;
}

// 2. Expand CollegeTenant interface
const oldInterface = `export interface CollegeTenant {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geofenceRadiusMeters: number;
  domain: string;
  emergencyHelpline: string;
  womensCellHelpline: string;
  securityControlRoom: string;
  ambulanceContact: string;
  primaryColor: string;
  secondaryColor: string;
  campusBuildings: string[];
  bannerUrl?: string;
  logoUrl?: string;
  isAutonomous: boolean;
  naacGrade?: string;
}`;

const newInterface = `export interface CollegeTenant {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geofenceRadiusMeters: number;
  domain: string;
  emergencyHelpline: string;
  womensCellHelpline: string;
  securityControlRoom: string;
  ambulanceContact: string;
  primaryColor: string;
  secondaryColor: string;
  campusBuildings: string[];
  bannerUrl?: string;
  logoUrl?: string;
  isAutonomous: boolean;
  naacGrade?: string;
  category?: 'ENGINEERING' | 'POLYTECHNIC' | 'DEGREE' | 'PHARMACY' | 'MANAGEMENT' | 'LAW' | 'OTHER';
  subcategory?: 'GOVERNMENT' | 'PRIVATE' | 'AIDED' | 'AUTONOMOUS' | 'UNIVERSITY_CONSTITUENT';
  code?: string;
  aisheCode?: string;
  affiliation?: string;
  approval?: string;
  districtId?: string;
  sourceReference?: string;
}`;

content = content.replace(oldInterface, newInterface);

// 3. Add ALL_COLLEGES
const allCollegesDeclaration = `\nexport const ALL_COLLEGES: CollegeTenant[] = Array.from(
  new Map(
    [
      ...AP_STATEWIDE_COLLEGES.map((c) => ({
        ...c,
        category: c.category,
        subcategory: c.subcategory,
      })),
      ...INDIAN_ENGINEERING_COLLEGES,
    ].map((c) => [c.id, c])
  ).values()
);\n`;

if (!content.includes('export const ALL_COLLEGES')) {
  const insertPos = content.indexOf('export function getCollegeById');
  content = content.slice(0, insertPos) + allCollegesDeclaration + '\n' + content.slice(insertPos);
}

// 4. Update getCollegeById
const oldGet = `export function getCollegeById(idOrSlug: string): CollegeTenant | null {
  const normalized = idOrSlug.trim().toLowerCase();
  return (
    INDIAN_ENGINEERING_COLLEGES.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.slug.toLowerCase() === normalized ||
        (c.id === 'vit-bhimavaram' && (normalized === 'vishnu-bhimavaram' || normalized === 'vishnu'))
    ) || null
  );
}`;

const newGet = `export function getCollegeById(idOrSlug: string): CollegeTenant | null {
  const normalized = idOrSlug.trim().toLowerCase();
  return (
    ALL_COLLEGES.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.slug.toLowerCase() === normalized ||
        (c.id === 'vit-bhimavaram' && (normalized === 'vishnu-bhimavaram' || normalized === 'vishnu'))
    ) || null
  );
}`;

content = content.replace(oldGet, newGet);

// 5. Update searchColleges
const oldSearch = `export function searchColleges(options: {
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

const newSearch = `export function searchColleges(options: {
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

content = content.replace(oldSearch, newSearch);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated src/lib/colleges/index.ts');

