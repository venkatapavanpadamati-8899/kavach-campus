import { AP_STATEWIDE_COLLEGES } from '../src/lib/colleges/ap-colleges-data';

console.log('Existing college IDs count:', AP_STATEWIDE_COLLEGES.length);
const ids = AP_STATEWIDE_COLLEGES.map(c => ({ id: c.id, code: c.code, name: c.name, district: c.district, category: c.category }));
console.log(JSON.stringify(ids, null, 2));

