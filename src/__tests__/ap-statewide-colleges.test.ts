import { describe, it, expect } from 'vitest';
import {
  AP_26_DISTRICTS,
  ALL_COLLEGES,
  searchColleges,
  getCollegeById,
} from '@/lib/colleges';
import { GET } from '@/app/api/colleges/search/route';
import { NextRequest } from 'next/server';

describe('Phase 23: Andhra Pradesh Statewide All-College Expansion Suite', () => {
  it('covers all 26 official gazetted districts of Andhra Pradesh', () => {
    expect(AP_26_DISTRICTS.length).toBe(26);

    const districtNames = AP_26_DISTRICTS.map((d) => d.name);
    // North Coastal
    expect(districtNames).toContain('Alluri Sitharama Raju');
    expect(districtNames).toContain('Anakapalli');
    expect(districtNames).toContain('Parvathipuram Manyam');
    expect(districtNames).toContain('Srikakulam');
    expect(districtNames).toContain('Visakhapatnam');
    expect(districtNames).toContain('Vizianagaram');

    // Central Coastal
    expect(districtNames).toContain('Bapatla');
    expect(districtNames).toContain('Dr. B. R. Ambedkar Konaseema');
    expect(districtNames).toContain('East Godavari');
    expect(districtNames).toContain('Eluru');
    expect(districtNames).toContain('Guntur');
    expect(districtNames).toContain('Kakinada');
    expect(districtNames).toContain('Krishna');
    expect(districtNames).toContain('NTR');
    expect(districtNames).toContain('Palnadu');
    expect(districtNames).toContain('West Godavari');

    // South Coastal
    expect(districtNames).toContain('Prakasam');
    expect(districtNames).toContain('Sri Potti Sriramulu Nellore');

    // Rayalaseema
    expect(districtNames).toContain('Ananthapuramu');
    expect(districtNames).toContain('Annamayya');
    expect(districtNames).toContain('Chittoor');
    expect(districtNames).toContain('Kurnool');
    expect(districtNames).toContain('Nandyal');
    expect(districtNames).toContain('Sri Sathya Sai');
    expect(districtNames).toContain('Tirupati');
    expect(districtNames).toContain('YSR (Kadapa)');
  });

  it('guarantees unique IDs across all colleges in the registry', () => {
    const ids = ALL_COLLEGES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('preserves existing flagship SRKR and Vishnu campus identifiers', () => {
    const srkr = getCollegeById('srkr-bhimavaram');
    expect(srkr).toBeDefined();
    expect(srkr?.district).toBe('West Godavari');
    expect(srkr?.domain).toBe('srkr.edu.in');
    expect(srkr?.category).toBe('ENGINEERING');

    const vit = getCollegeById('vit-bhimavaram');
    expect(vit).toBeDefined();
    expect(vit?.district).toBe('West Godavari');
    expect(vit?.category).toBe('ENGINEERING');
  });

  it('filters colleges accurately by institutional category', () => {
    const engColleges = searchColleges({ category: 'ENGINEERING', includeStatewide: true });
    expect(engColleges.length).toBeGreaterThanOrEqual(30);
    expect(engColleges.every((c) => (c.category || 'ENGINEERING') === 'ENGINEERING')).toBe(true);

    const polyColleges = searchColleges({ category: 'POLYTECHNIC', includeStatewide: true });
    expect(polyColleges.length).toBeGreaterThanOrEqual(5);
    expect(polyColleges.some((c) => c.shortName.includes('Polytechnic') || c.shortName.includes('Poly'))).toBe(true);

    const degreeColleges = searchColleges({ category: 'DEGREE', includeStatewide: true });
    expect(degreeColleges.length).toBeGreaterThanOrEqual(10);
    expect(degreeColleges.some((c) => c.category === 'DEGREE')).toBe(true);
  });

  it('filters colleges accurately by district', () => {
    const vizagColleges = searchColleges({ district: 'Visakhapatnam' });
    expect(vizagColleges.length).toBeGreaterThanOrEqual(3);
    expect(vizagColleges.map((c) => c.id)).toContain('aucoe-visakhapatnam');

    const kakinadaColleges = searchColleges({ district: 'Kakinada' });
    expect(kakinadaColleges.length).toBeGreaterThanOrEqual(3);
    expect(kakinadaColleges.map((c) => c.id)).toContain('jntuk-kakinada');

    const tirupatiColleges = searchColleges({ district: 'Tirupati' });
    expect(tirupatiColleges.length).toBeGreaterThanOrEqual(2);
    expect(tirupatiColleges.map((c) => c.id)).toContain('svuce-tirupati');

    const kadapaColleges = searchColleges({ district: 'YSR (Kadapa)' });
    expect(kadapaColleges.length).toBeGreaterThanOrEqual(2);
    expect(kadapaColleges.map((c) => c.id)).toContain('rgukt-rkvalley');
  });

  it('filters colleges accurately by university affiliation', () => {
    const jntukColleges = searchColleges({ affiliation: 'JNTUK', includeStatewide: true });
    expect(jntukColleges.length).toBeGreaterThanOrEqual(5);

    const auColleges = searchColleges({ affiliation: 'Andhra University', includeStatewide: true });
    expect(auColleges.length).toBeGreaterThanOrEqual(3);

    const sbtetColleges = searchColleges({ affiliation: 'SBTET', includeStatewide: true });
    expect(sbtetColleges.length).toBeGreaterThanOrEqual(4);
  });

  it('GET /api/colleges/search?type=districts returns all 26 AP districts', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?type=districts');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(26);
    expect(data.districts.length).toBe(26);
    expect(data.districts[0]).toHaveProperty('headquarters');
    expect(data.districts[0]).toHaveProperty('zone');
  });

  it('GET /api/colleges/search with category and district parameters', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?category=POLYTECHNIC&district=Visakhapatnam');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.colleges[0].id).toBe('gpt-visakhapatnam');
  });
});

