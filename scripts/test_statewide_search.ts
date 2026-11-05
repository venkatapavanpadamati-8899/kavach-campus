import { searchColleges, AP_26_DISTRICTS, ALL_COLLEGES } from '../src/lib/colleges';

console.log('Total AP Districts:', AP_26_DISTRICTS.length);
console.log('Total Colleges in ALL_COLLEGES:', ALL_COLLEGES.length);

const eng = searchColleges({ category: 'ENGINEERING', includeStatewide: true });
console.log('Engineering Colleges count:', eng.length);

const poly = searchColleges({ category: 'POLYTECHNIC', includeStatewide: true });
console.log('Polytechnic Colleges count:', poly.length);

const deg = searchColleges({ category: 'DEGREE', includeStatewide: true });
console.log('Degree Colleges count:', deg.length);

const vizag = searchColleges({ district: 'Visakhapatnam', includeStatewide: true });
console.log('Visakhapatnam Colleges count:', vizag.length);

const kkd = searchColleges({ district: 'Kakinada', includeStatewide: true });
console.log('Kakinada Colleges count:', kkd.length);

const pincode534 = searchColleges({ pincode: '534' });
console.log('Pincode 534 (backward compatible):', pincode534.length);

