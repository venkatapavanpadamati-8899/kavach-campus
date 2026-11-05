import { AP_STATEWIDE_COLLEGES } from '../src/lib/colleges/ap-colleges-data';
import { ALL_COLLEGES, INDIAN_ENGINEERING_COLLEGES } from '../src/lib/colleges';
import { AP_26_DISTRICTS } from '../src/lib/colleges/districts';

console.log('AP_26_DISTRICTS count:', AP_26_DISTRICTS.length);
console.log('INDIAN_ENGINEERING_COLLEGES count:', INDIAN_ENGINEERING_COLLEGES.length);
console.log('AP_STATEWIDE_COLLEGES count:', AP_STATEWIDE_COLLEGES.length);
console.log('ALL_COLLEGES count:', ALL_COLLEGES.length);

const byCat: Record<string, number> = {};
const byDist: Record<string, number> = {};

ALL_COLLEGES.forEach((c) => {
  const cat = c.category || 'ENGINEERING';
  byCat[cat] = (byCat[cat] || 0) + 1;
  byDist[c.district] = (byDist[c.district] || 0) + 1;
});

console.log('\nBreakdown by Category in ALL_COLLEGES:');
console.table(byCat);

console.log('\nDistricts Covered Count:', Object.keys(byDist).length);
console.log('District List:', Object.keys(byDist).sort());

