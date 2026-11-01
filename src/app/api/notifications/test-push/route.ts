import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();

    // In production, require authenticated user
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { deviceToken, title, body: messageBody } = body;

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'deviceToken is required to test push delivery' },
        { status: 400 }
      );
    }

    // Explicitly enable real push delivery for manual test triggers
    const originalReal = process.env.ENABLE_REAL_NOTIFICATIONS;
    process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

    const result = await sendPushNotification({
      userId: user.id,
      deviceToken,
      title: title || '🛡️ Kavach Campus Test Notification',
      body: messageBody || 'This is a live test alert from Kavach Campus.',
      idempotencyKey: `test-push-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    });

    process.env.ENABLE_REAL_NOTIFICATIONS = originalReal;

    return NextResponse.json({
      success: result.success,
      status: result.status,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
