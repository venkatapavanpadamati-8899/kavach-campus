import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface DailyCount {
  date: string;
  count: number;
}

export interface MonthlyCount {
  month: string;
  count: number;
}

export interface YearlyCount {
  year: string;
  count: number;
}

export interface HotspotSummary {
  location: string;
  count: number;
  lastIncidentAt: string | null;
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorize role (Only ADMIN or SUPER_ADMIN)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges to view aggregate analytics.' },
        { status: 403 }
      );
    }

    // Optional query param: days (default 30)
    const url = new URL(req.url);
    const daysParam = parseInt(url.searchParams.get('days') || '30', 10);
    const maxDays = Math.min(Math.max(isNaN(daysParam) ? 30 : daysParam, 7), 365);

    // 3. Query real incidents from database
    const { data: incidents, error: fetchError } = await supabase
      .from('incidents')
      .select('id, case_id, category, severity, status, created_at, updated_at, resolved_at, latitude, longitude')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch incidents for analytics:', fetchError);
      return NextResponse.json({ error: 'Database error fetching analytics' }, { status: 500 });
    }

    const all = incidents || [];
    const totalComplaints = all.length;

    // Timezone-aware date boundaries (UTC / ISO)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const todayComplaints = all.filter(inc => inc.created_at && inc.created_at >= todayStart).length;

    // Daily complaint counts (last maxDays)
    const dailyMap: Record<string, number> = {};
    for (let i = maxDays - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = 0;
    }

    // Monthly complaint counts (last 12 months)
    const monthlyMap: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }

    // Yearly complaint counts
    const yearlyMap: Record<string, number> = {};

    // Grouping accumulators
    const categoryBreakdown: Record<string, number> = {};
    const severityBreakdown: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    const statusBreakdown: Record<string, number> = {
      RECEIVED: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      ESCALATED: 0,
      RESOLVED: 0,
      CANCELLED: 0,
    };

    let totalAckMinutes = 0;
    let ackCount = 0;
    let totalResMinutes = 0;
    let resCount = 0;
    let escalationCount = 0;
    let harassmentStalkingCount = 0;

    const hotspotMap: Record<string, { count: number; lastAt: string | null }> = {};

    for (const inc of all) {
      // 1. Time aggregations
      if (inc.created_at) {
        const dayKey = inc.created_at.split('T')[0];
        if (dailyMap[dayKey] !== undefined) {
          dailyMap[dayKey]++;
        }

        const monthKey = inc.created_at.substring(0, 7);
        if (monthlyMap[monthKey] !== undefined) {
          monthlyMap[monthKey]++;
        } else {
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
        }

        const yearKey = inc.created_at.substring(0, 4);
        yearlyMap[yearKey] = (yearlyMap[yearKey] || 0) + 1;
      }

      // 2. Category Breakdown
      const cat = (inc.category || 'GENERAL').toUpperCase();
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      if (cat === 'HARASSMENT' || cat === 'STALKING' || cat === 'RAGGING') {
        harassmentStalkingCount++;
      }

      // 3. Severity Breakdown
      const sev = (inc.severity || 'MEDIUM').toUpperCase();
      severityBreakdown[sev] = (severityBreakdown[sev] || 0) + 1;

      // 4. Status Breakdown
      const st = (inc.status || 'RECEIVED').toUpperCase();
      statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;

      if (st === 'ESCALATED') {
        escalationCount++;
      }

      // 5. Response & Resolution Times
      const ackTimestamp = (inc as { assigned_at?: string | null; updated_at?: string | null }).assigned_at || inc.updated_at;
      if (inc.created_at && ackTimestamp && (inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS' || inc.status === 'RESOLVED')) {
        const createdMs = new Date(inc.created_at).getTime();
        const updatedMs = new Date(ackTimestamp).getTime();
        if (updatedMs >= createdMs) {
          totalAckMinutes += (updatedMs - createdMs) / (1000 * 60);
          ackCount++;
        }
      }

      if (inc.created_at && inc.resolved_at) {
        const createdMs = new Date(inc.created_at).getTime();
        const resolvedMs = new Date(inc.resolved_at).getTime();
        if (resolvedMs >= createdMs) {
          totalResMinutes += (resolvedMs - createdMs) / (1000 * 60);
          resCount++;
        }
      }

      // 6. Verified Hotspots (Zero PII - only approximate area or coordinates)
      const incLocationName = (inc as { location_name?: string | null }).location_name;
      const loc = incLocationName || (inc.latitude && inc.longitude ? `Campus Area (${Number(inc.latitude).toFixed(2)}, ${Number(inc.longitude).toFixed(2)})` : 'General Campus');
      if (loc) {
        if (!hotspotMap[loc]) {
          hotspotMap[loc] = { count: 0, lastAt: inc.created_at };
        }
        hotspotMap[loc].count++;
        if (inc.created_at && (!hotspotMap[loc].lastAt || inc.created_at > hotspotMap[loc].lastAt!)) {
          hotspotMap[loc].lastAt = inc.created_at;
        }
      }
    }

    const avgAckMinutes = ackCount > 0 ? Math.round((totalAckMinutes / ackCount) * 10) / 10 : 0;
    const avgResolutionMinutes = resCount > 0 ? Math.round((totalResMinutes / resCount) * 10) / 10 : 0;
    const resolvedCount = statusBreakdown['RESOLVED'] || 0;
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 1000) / 10 : 0;

    const dailyCounts: DailyCount[] = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
    const monthlyCounts: MonthlyCount[] = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));
    const yearlyCounts: YearlyCount[] = Object.entries(yearlyMap).map(([year, count]) => ({ year, count }));

    const hotspots: HotspotSummary[] = Object.entries(hotspotMap)
      .map(([location, data]) => ({ location, count: data.count, lastIncidentAt: data.lastAt }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        totalComplaints,
        todayComplaints,
        resolutionRate,
        resolvedCount,
        escalationCount,
        harassmentStalkingCount,
        avgAckMinutes,
        avgResolutionMinutes,
        statusBreakdown,
        severityBreakdown,
        categoryBreakdown,
        dailyCounts,
        monthlyCounts,
        yearlyCounts,
        hotspots,
      },
    }, { status: 200 });

  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      ('digest' in error || (error as { message?: string }).message?.includes('prerender'))
    ) {
      throw error;
    }
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

