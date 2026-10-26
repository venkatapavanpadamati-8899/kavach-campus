import { NextRequest, NextResponse } from 'next/server';
import { searchColleges, getCollegeById, getDefaultCollege } from '@/lib/colleges';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('query') || undefined;
  const pincode = searchParams.get('pincode') || undefined;
  const id = searchParams.get('id') || undefined;
  const state = searchParams.get('state') || undefined;

  try {
    if (id) {
      const college = getCollegeById(id);
      if (!college) {
        return NextResponse.json({ error: 'College not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, college });
    }

    const results = searchColleges({ query, pincode, state });

    return NextResponse.json({
      success: true,
      count: results.length,
      colleges: results,
      defaultCollege: getDefaultCollege()
    });
  } catch (error) {
    console.error('Colleges lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to search colleges directory' },
      { status: 500 }
    );
  }
}
