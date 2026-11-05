import { NextRequest, NextResponse } from 'next/server';
import {
  searchColleges,
  getCollegeById,
  getDefaultCollege,
  AP_26_DISTRICTS,
  ALL_COLLEGES,
} from '@/lib/colleges';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('query') || undefined;
  const pincode = searchParams.get('pincode') || undefined;
  const id = searchParams.get('id') || undefined;
  const state = searchParams.get('state') || undefined;
  const district = searchParams.get('district') || undefined;
  const category = searchParams.get('category') || undefined;
  const affiliation = searchParams.get('affiliation') || undefined;
  const type = searchParams.get('type') || undefined;

  try {
    // 1. Direct District Registry Lookup
    if (type === 'districts') {
      return NextResponse.json({
        success: true,
        count: AP_26_DISTRICTS.length,
        districts: AP_26_DISTRICTS,
      });
    }

    // 2. Direct College Lookup by ID or Slug
    if (id) {
      const college = getCollegeById(id);
      if (!college) {
        return NextResponse.json({ error: 'College not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, college });
    }

    const includeStatewide =
      searchParams.get('includeStatewide') === 'true' ||
      Boolean(district || category || affiliation);

    // 3. Statewide Multi-College Search
    const results = searchColleges({
      query,
      pincode,
      state,
      district,
      category,
      affiliation,
      includeStatewide,
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      colleges: results,
      districts: AP_26_DISTRICTS,
      totalStatewideColleges: ALL_COLLEGES.length,
      defaultCollege: getDefaultCollege(),
    });
  } catch (error) {
    console.error('Colleges lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to search colleges directory' },
      { status: 500 }
    );
  }
}
