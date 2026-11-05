import { ALL_COLLEGES } from '../src/lib/colleges/index';
import { AP_26_DISTRICTS } from '../src/lib/colleges/districts';

console.log('--- PHASE 4: ANDHRA PRADESH COLLEGE DIRECTORY AUDIT ---');

console.log(`Total colleges in ALL_COLLEGES: ${ALL_COLLEGES.length}`);
console.log(`Total AP districts defined: ${AP_26_DISTRICTS.length}`);

// Count AP vs National
const apColleges = ALL_COLLEGES.filter(c => c.state === 'Andhra Pradesh');
const nationalColleges = ALL_COLLEGES.filter(c => c.state !== 'Andhra Pradesh');

console.log(`Andhra Pradesh institutions count: ${apColleges.length}`);
console.log(`National / Premier institutions count: ${nationalColleges.length}`);

// Category breakdown
const categoryCounts: Record<string, number> = {};
const subcatCounts: Record<string, number> = {};
const districtCounts: Record<string, number> = {};

let invalidLatLong = 0;
let missingCityOrDistrict = 0;
const duplicatesById = new Set<string>();
const duplicateIds: string[] = [];

for (const c of ALL_COLLEGES) {
  if (duplicatesById.has(c.id)) {
    duplicateIds.push(c.id);
  }
  duplicatesById.add(c.id);

  const cat = (c.category || 'UNKNOWN') as string;
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  if (c.subcategory) {
    const sc = c.subcategory as string;
    subcatCounts[sc] = (subcatCounts[sc] || 0) + 1;
  }
  // Normalize district matching
  const matchedDistrict = AP_26_DISTRICTS.find(d => 
    d.name.toLowerCase() === c.district.toLowerCase() ||
    d.id.toLowerCase() === (c.districtId || '').toLowerCase()
  );
  if (matchedDistrict) {
    districtCounts[matchedDistrict.name] = (districtCounts[matchedDistrict.name] || 0) + 1;
  } else if (c.state === 'Andhra Pradesh') {
    districtCounts[c.district] = (districtCounts[c.district] || 0) + 1;
  }

  // Validate coordinates
  const lat = c.coordinates?.lat;
  const lng = c.coordinates?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || lat < 8 || lat > 36 || lng < 68 || lng > 98) {
    console.error(`Invalid lat/lng for ${c.id}: lat=${lat}, lng=${lng}`);
    invalidLatLong++;
  }

  if (!c.city || !c.district) {
    missingCityOrDistrict++;
  }
}

console.log('\nCategory breakdown across all colleges:', categoryCounts);
console.log('Subcategory breakdown:', subcatCounts);

console.log('\nDistrict-wise institution count (AP districts):');
let missingDistricts = 0;
for (const d of AP_26_DISTRICTS) {
  const count = districtCounts[d.name] || 0;
  console.log(` - ${d.name}: ${count} colleges`);
  if (count === 0) {
    missingDistricts++;
  }
}

console.log(`\nDuplicate college IDs: ${duplicateIds.length} ${duplicateIds.length ? duplicateIds.join(', ') : '(None)'}`);
console.log(`Invalid latitude/longitude coordinates: ${invalidLatLong}`);
console.log(`Missing city or district: ${missingCityOrDistrict}`);
console.log(`AP Districts with 0 colleges: ${missingDistricts}`);

if (duplicateIds.length === 0 && invalidLatLong === 0 && missingDistricts === 0 && apColleges.length === 145) {
  console.log('\nPASS: All 145 AP institutions across 26 districts verified with valid coordinates, categories, and zero duplicates.');
} else {
  console.error('\nAUDIT FAILED on college directory checks.');
}
