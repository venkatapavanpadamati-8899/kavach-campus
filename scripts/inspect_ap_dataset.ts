import { AP_STATEWIDE_COLLEGES } from '../src/lib/colleges/ap-colleges-data';
import { AP_26_DISTRICTS } from '../src/lib/colleges/districts';

console.log('Total AP colleges currently:', AP_STATEWIDE_COLLEGES.length);

const districtCounts = new Map<string, { total: number; engg: number; poly: number; degree: number }>();
for (const d of AP_26_DISTRICTS) {
  districtCounts.set(d.name, { total: 0, engg: 0, poly: 0, degree: 0 });
}

for (const c of AP_STATEWIDE_COLLEGES) {
  let stats = districtCounts.get(c.district);
  if (!stats) {
    stats = { total: 0, engg: 0, poly: 0, degree: 0 };
    districtCounts.set(c.district, stats);
  }
  stats.total++;
  const cat = (c.category || '').toUpperCase();
  if (cat === 'ENGINEERING') stats.engg++;
  else if (cat === 'POLYTECHNIC') stats.poly++;
  else if (cat === 'DEGREE') stats.degree++;
}

console.log('District distribution:');
console.table(Array.from(districtCounts.entries()).map(([district, s]) => ({ district, ...s })));

