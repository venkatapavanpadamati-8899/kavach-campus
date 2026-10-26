import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Configuration and connectivity diagnostics reveal useful reconnaissance
    // information. Restrict them to platform administrators rather than
    // exposing provider state and database errors on a public endpoint.
    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !['ADMIN', 'SUPER_ADMIN'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const isAnonConfigured = !!supabaseUrl && !!anonKey;
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY');

    let anonDbStatus = 'NOT_CONFIGURED';
    let anonError = 'None';

    if (isAnonConfigured) {
      try {
        const client = createSupabaseClient(supabaseUrl, anonKey);
        const { error, status } = await client.from('profiles').select('id').limit(1);
        if (error && error.code === 'PGRST205') {
          anonDbStatus = 'MISSING_TABLES';
          anonError = 'Database schema is unavailable.';
        } else if (error && error.code === '42P17') {
          anonDbStatus = 'RLS_RECURSION';
          anonError = 'Database authorization policy is invalid.';
        } else if (error && status >= 400 && status !== 401 && status !== 403) {
          anonDbStatus = 'FAIL';
          anonError = 'Database connectivity check failed.';
        } else {
          // Status 200 or 401/403 (RLS protected) confirms reachability
          anonDbStatus = 'PASS';
          anonError = 'None';
        }
      } catch {
        anonDbStatus = 'FAIL';
        anonError = 'Database connectivity check failed.';
      }
    }

    let serviceRoleDbStatus = 'NOT_CONFIGURED';
    let serviceRoleError = 'None';

    if (isServiceRoleConfigured) {
      try {
        const admin = createAdminClient();
        const { error } = await admin.from('profiles').select('id').limit(1);
        if (error) {
          serviceRoleDbStatus = 'FAIL';
          serviceRoleError = 'Administrative database check failed.';
        } else {
          serviceRoleDbStatus = 'PASS';
        }
      } catch {
        serviceRoleDbStatus = 'FAIL';
        serviceRoleError = 'Administrative database check failed.';
      }
    }

    const overallDbStatus =
      anonDbStatus === 'PASS' || serviceRoleDbStatus === 'PASS' ? 'PASS' : 'FAIL';

    const isGeminiConfigured =
      !!process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.length > 20 &&
      !process.env.GEMINI_API_KEY.includes('placeholder') &&
      !process.env.GEMINI_API_KEY.includes('your_gemini');

    const isCronConfigured = !!process.env.CRON_SECRET;

    return NextResponse.json(
      {
        status: overallDbStatus === 'PASS' ? 'healthy' : 'degraded',
        liveness: 'UP',
        readiness: overallDbStatus === 'PASS' ? 'READY' : 'NOT_READY',
        supabase_url_configured: isAnonConfigured,
        supabase_anon_configured: isAnonConfigured,
        supabase_service_role_configured: isServiceRoleConfigured,
        gemini_ai_configured: isGeminiConfigured,
        cron_secret_configured: isCronConfigured,
        anon_db_status: anonDbStatus,
        anon_error: anonError,
        service_role_db_status: serviceRoleDbStatus,
        service_role_error: serviceRoleError,
        dbStatus: overallDbStatus,
        free_tier_safeguards: {
          twilio_sms: 'DISABLED (Free Only)',
          browser_push_api: 'ENABLED (Free HTML5)',
          in_app_notifications: 'ENABLED (PostgreSQL free)',
          ai_fallback: isGeminiConfigured ? 'GEMINI_ACTIVE' : 'DETERMINISTIC_RULES_FALLBACK'
        },
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Health check exception:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during health check' },
      { status: 500 }
    );
  }
}

