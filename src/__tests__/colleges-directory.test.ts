import { describe, it, expect } from 'vitest';
import {
  INDIAN_ENGINEERING_COLLEGES,
  searchColleges,
  getCollegeById,
  getDefaultCollege,
  resolveCollegeIdFromEmail,
} from '@/lib/colleges';
import { GET } from '@/app/api/colleges/search/route';
import { NextRequest } from 'next/server';

describe('India-Wide Engineering Colleges Directory & Pincode Lookup', () => {
  it('loads the default flagship college (SRKR Engineering College, Bhimavaram)', () => {
    const defaultCol = getDefaultCollege();
    expect(defaultCol).toBeDefined();
    expect(defaultCol.id).toBe('srkr-bhimavaram');
    expect(defaultCol.pincode).toBe('534204');
    expect(defaultCol.city).toBe('Bhimavaram');
    expect(defaultCol.coordinates.lat).toBeCloseTo(16.5449, 3);
    expect(defaultCol.coordinates.lng).toBeCloseTo(81.4975, 3);
    expect(defaultCol.emergencyHelpline).toBe('+91-8816-223332');
  });

  it('filters colleges accurately by 6-digit Pincode', () => {
    // 534204 -> Bhimavaram SRKR
    const bhimavaramCols = searchColleges({ pincode: '534204' });
    expect(bhimavaramCols.length).toBeGreaterThanOrEqual(1);
    expect(bhimavaramCols.some((c) => c.shortName.includes('SRKR'))).toBe(true);

    // 500032 -> IIIT Hyderabad
    const hydCols = searchColleges({ pincode: '500032' });
    expect(hydCols.length).toBe(1);
    expect(hydCols[0].shortName).toBe('IIIT Hyderabad');

    // 600036 -> IIT Madras
    const chennaiCols = searchColleges({ pincode: '600036' });
    expect(chennaiCols.length).toBe(1);
    expect(chennaiCols[0].shortName).toBe('IIT Madras');
  });

  it('supports partial prefix matching for pincodes', () => {
    // Prefix '534' matches all three West Godavari campuses in the directory.
    const wgCols = searchColleges({ pincode: '534' });
    expect(wgCols.length).toBe(3);
    expect(wgCols.map((c) => c.shortName)).toContain('SRKR Engineering College');
    expect(wgCols.map((c) => c.shortName)).toContain('Vishnu Institute of Technology');
    expect(wgCols.map((c) => c.shortName)).toContain('DNR College of Engg');
  });

  it('searches colleges by name or city (case-insensitive)', () => {
    const auResults = searchColleges({ query: 'Andhra University' });
    expect(auResults.length).toBe(1);
    expect(auResults[0].id).toBe('aucoe-visakhapatnam');

    const puneResults = searchColleges({ query: 'pune' });
    expect(puneResults.length).toBe(1);
    expect(puneResults[0].shortName).toBe('COEP Pune');

    const vijayawadaResults = searchColleges({ query: 'Vijayawada' });
    expect(vijayawadaResults.length).toBe(1);
    expect(vijayawadaResults[0].shortName).toBe('VR Siddhartha Engg College');
  });

  it('retrieves specific college by unique ID or slug', () => {
    const college = getCollegeById('srkr-bhimavaram');
    expect(college).toBeDefined();
    expect(college?.domain).toBe('srkr.edu.in');
    expect(college?.campusBuildings).toContain('Main Administrative Block');
    expect(college?.campusBuildings).toContain('CSE & IT Block');

    // Cross-tenant alias check for Vishnu Institute of Technology
    const vishnuAlias = getCollegeById('vishnu-bhimavaram');
    expect(vishnuAlias).toBeDefined();
    expect(vishnuAlias?.shortName).toBe('Vishnu Institute of Technology');
    expect(vishnuAlias?.domain).toBe('vishnu.edu.in');

    const nonExistent = getCollegeById('invalid-slug-999');
    expect(nonExistent).toBeNull();
  });

  it('maps institutional email domains to correct college tenant IDs', () => {
    expect(resolveCollegeIdFromEmail('student@srkr.edu.in')).toBe('srkr-bhimavaram');
    expect(resolveCollegeIdFromEmail('faculty@srkrec.ac.in')).toBe('srkr-bhimavaram');
    expect(resolveCollegeIdFromEmail('student@vishnu.edu.in')).toBe('vishnu-bhimavaram');
    expect(resolveCollegeIdFromEmail('faculty@svecw.edu.in')).toBe('vishnu-bhimavaram');
    expect(resolveCollegeIdFromEmail('random@gmail.com')).toBe('PENDING_CAMPUS_VERIFICATION');
    expect(resolveCollegeIdFromEmail('student@srkr.edu.in.attacker.example')).toBe('PENDING_CAMPUS_VERIFICATION');
    expect(resolveCollegeIdFromEmail('student@srkr.attacker.example')).toBe('PENDING_CAMPUS_VERIFICATION');
    expect(resolveCollegeIdFromEmail('student@vishnu.attacker.example')).toBe('PENDING_CAMPUS_VERIFICATION');
    expect(resolveCollegeIdFromEmail('student@srkr.edu.in@attacker.example')).toBe('PENDING_CAMPUS_VERIFICATION');
    expect(resolveCollegeIdFromEmail(null)).toBe('PENDING_CAMPUS_VERIFICATION');
  });

  it('ensures every college tenant defines mandatory safety metadata and coordinates', () => {
    for (const college of INDIAN_ENGINEERING_COLLEGES) {
      expect(college.id).toBeTruthy();
      expect(college.name).toBeTruthy();
      expect(college.pincode).toMatch(/^[0-9]{6}$/);
      expect(college.coordinates.lat).toBeGreaterThan(8.0); // India latitude range
      expect(college.coordinates.lat).toBeLessThan(37.0);
      expect(college.coordinates.lng).toBeGreaterThan(68.0); // India longitude range
      expect(college.coordinates.lng).toBeLessThan(98.0);
      expect(college.emergencyHelpline).toBeTruthy();
      expect(college.womensCellHelpline).toBeTruthy();
      expect(college.campusBuildings.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('GET /api/colleges/search handles pincode parameter correctly', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?pincode=534204');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.colleges[0].id).toBe('srkr-bhimavaram');
  });

  it('GET /api/colleges/search handles college id lookup', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?id=iiit-hyderabad');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.college.name).toContain('International Institute of Information Technology');
  });

  it('GET /api/colleges/search returns 404 for unknown college id', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?id=unknown-campus-xyz');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('College not found');
  });
});
