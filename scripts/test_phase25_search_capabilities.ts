import { searchColleges, getCollegeById, ALL_COLLEGES } from '../src/lib/colleges';

async function testSearch() {
  console.log('Testing Phase 25 Search Capabilities across', ALL_COLLEGES.length, 'institutions:');

  // 1. Search by Acronym / Spelling Variation (Dots & Hyphens)
  const srkrDot = searchColleges({ query: 'S.R.K.R.', includeStatewide: true });
  console.log('Search "S.R.K.R.":', srkrDot.map(c => c.shortName));
  if (!srkrDot.some(c => c.id === 'srkr-bhimavaram')) throw new Error('Failed to find SRKR with dots');

  // 2. Search by District
  const gunturColleges = searchColleges({ district: 'Guntur', includeStatewide: true });
  console.log('Search District "Guntur" count:', gunturColleges.length);
  if (gunturColleges.length < 5) throw new Error('Expected at least 5 colleges in Guntur');

  // 3. Search by City
  const tirupatiColleges = searchColleges({ query: 'Tirupati', includeStatewide: true });
  console.log('Search City "Tirupati" count:', tirupatiColleges.length);
  if (tirupatiColleges.length < 5) throw new Error('Expected at least 5 colleges in Tirupati');

  // 4. Search by Category (Polytechnic)
  const polyColleges = searchColleges({ category: 'POLYTECHNIC', includeStatewide: true });
  console.log('Search Category "POLYTECHNIC" count:', polyColleges.length);
  if (polyColleges.length < 20) throw new Error('Expected at least 20 polytechnics');

  // 5. Search by University / Affiliation (AKNU / Nannaya)
  const aknuColleges = searchColleges({ affiliation: 'Nannaya', includeStatewide: true });
  console.log('Search Affiliation "Nannaya" count:', aknuColleges.length);
  if (aknuColleges.length < 3) throw new Error('Expected at least 3 AKNU affiliated colleges');

  // 6. Search by University in query string (e.g. "JNTUK")
  const jntukColleges = searchColleges({ query: 'JNTUK', includeStatewide: true });
  console.log('Search Query "JNTUK" count:', jntukColleges.length);
  if (jntukColleges.length < 2) throw new Error('Expected at least 2 colleges matching JNTUK');

  // 7. Verification of SRKR and Vishnu Flagship Colleges
  const srkr = getCollegeById('srkr-bhimavaram');
  const vishnu = getCollegeById('vit-bhimavaram');
  const vishnuAlias = getCollegeById('vishnu-bhimavaram');
  console.log('SRKR Found:', !!srkr, srkr?.name);
  console.log('Vishnu Found:', !!vishnu, vishnu?.name);
  console.log('Vishnu Alias Found:', !!vishnuAlias, vishnuAlias?.name);
  if (!srkr || !vishnu || !vishnuAlias) throw new Error('Flagship colleges missing!');

  console.log('\nAll search assertions PASSED successfully!');
}

testSearch().catch(err => {
  console.error('Search test failed:', err);
  process.exit(1);
});

