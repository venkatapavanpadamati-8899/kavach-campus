import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkGeminiConnectivity } from '@/lib/ai';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profError || !profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Safely verify actual live Gemini model connectivity without exposing secret keys
    const connectivity = await checkGeminiConnectivity();
    const isOperational = connectivity.status === 'OPERATIONAL';

    // Fetch existing AI configuration from database
    const { data: configData } = await supabase
      .from('ai_configuration')
      .select('*')
      .limit(1)
      .maybeSingle();

    const criticalThreatScore = configData?.confidence_threshold
      ? Math.round(configData.confidence_threshold * 100)
      : 80;

    const configuration = {
      enabled: configData?.enabled ?? true,
      model: configData?.model ?? 'gemini-flash-lite-latest',
      modelVersion: 'Gemini Flash Lite (v2.28)',
      status: isOperational ? 'OPERATIONAL' : 'FALLBACK_RULES',
      statusLabel: isOperational ? 'Operational (Live Google GenAI)' : 'Deterministic Rules Fallback',
      criticalThreatScore,
      spamThreshold: 95,
      fallbackEnabled: configData?.fallback_enabled ?? true,
      humanReviewMandatory: true, // Non-negotiable safety invariant
      advisoryMode: true,        // AI is strictly advisory
      lastUpdated: configData?.updated_at || null,
    };

    return NextResponse.json({ success: true, configuration });
  } catch (err: unknown) {
    console.error('Admin AI GET configuration error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profError || !profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { enabled, criticalThreatScore, fallbackEnabled } = body;

    // Validate inputs
    const numThreatScore = Number(criticalThreatScore);
    if (isNaN(numThreatScore) || numThreatScore < 50 || numThreatScore > 100) {
      return NextResponse.json(
        { error: 'Critical Threat Score must be a valid number between 50 and 100.' },
        { status: 400 }
      );
    }

    const confidenceThreshold = numThreatScore / 100;
    const isEnabled = enabled !== false;
    const isFallback = fallbackEnabled !== false;

    // Upsert to ai_configuration
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('ai_configuration')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await admin
        .from('ai_configuration')
        .update({
          enabled: isEnabled,
          model: 'gemini-flash-lite-latest',
          confidence_threshold: confidenceThreshold,
          fallback_enabled: isFallback,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await admin
        .from('ai_configuration')
        .insert({
          enabled: isEnabled,
          model: 'gemini-flash-lite-latest',
          confidence_threshold: confidenceThreshold,
          fallback_enabled: isFallback,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
    }

    // Record in audit log
    try {
      await admin.from('audit_logs').insert({
        action: 'UPDATE_AI_CONFIGURATION',
        actor_id: user.id,
        entity_type: 'AI_CONFIGURATION',
        details: {
          criticalThreatScore: numThreatScore,
          enabled: isEnabled,
          fallbackEnabled: isFallback,
          humanReviewMandatory: true,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log write non-fatal warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'AI Configuration successfully updated and persisted.',
      configuration: {
        enabled: isEnabled,
        model: 'gemini-flash-lite-latest',
        criticalThreatScore: numThreatScore,
        spamThreshold: 95,
        fallbackEnabled: isFallback,
        humanReviewMandatory: true,
        advisoryMode: true,
      },
    });
  } catch (err: unknown) {
    console.error('Admin AI POST configuration error:', err);
    return NextResponse.json({ error: 'Failed to update AI configuration.' }, { status: 500 });
  }
}

