import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Receives RevenueCat webhook events and stores them in `rc_events` so the admin
// dashboard can compute churn. Configure this URL in RevenueCat → Integrations →
// Webhooks, with the Authorization header set to REVENUECAT_WEBHOOK_SECRET.
export async function POST(request: NextRequest) {
  const secret = env.revenueCatWebhookSecret();
  if (secret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const event = payload?.event;
  if (!event?.type) {
    // RevenueCat also sends test pings without an event — ack them.
    return NextResponse.json({ ok: true });
  }

  try {
    const sb = createAdminClient();
    await sb.from('rc_events').upsert(
      {
        event_id: event.id ?? null,
        type: event.type,
        app_user_id: event.app_user_id ?? null,
        product_id: event.product_id ?? null,
        event_at: event.event_timestamp_ms
          ? new Date(event.event_timestamp_ms).toISOString()
          : new Date().toISOString(),
        raw: event,
      },
      { onConflict: 'event_id', ignoreDuplicates: true },
    );
  } catch {
    // Never make RevenueCat retry forever on our storage hiccup; log-and-ack.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
