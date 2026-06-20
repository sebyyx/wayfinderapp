import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The single RevenueCat webhook. It does two jobs so there is exactly one
// source of truth for subscriptions:
//   1. Syncs profiles.subscription_tier server-side (authoritative — works even
//      if the user never reopens the app; the client SDK sync stays as a fast path).
//   2. Logs every event into rc_events so the admin can compute churn.
// Configure in RevenueCat → Integrations → Webhooks with the Authorization
// header set to REVENUECAT_WEBHOOK_SECRET.

type Tier = 'free' | 'monthly' | 'lifetime';

// Maps a RevenueCat event to the resulting tier, or null when the event should
// NOT change the tier (e.g. CANCELLATION = auto-renew off but still entitled
// until expiration; BILLING_ISSUE = grace period).
function tierChangeFromEvent(event: any): Tier | null {
  const type: string = event?.type ?? '';
  const ents: string[] = event?.entitlement_ids ?? (event?.entitlement_id ? [event.entitlement_id] : []);
  const product: string = event?.product_id ?? '';

  const entitledTier = (): Tier => {
    if (ents.includes('voyager') || product.includes('voyager')) return 'lifetime';
    if (ents.includes('navigator') || product.includes('navigator')) return 'monthly';
    return 'monthly';
  };

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIPTION_EXTENDED':
      return entitledTier();
    case 'EXPIRATION':
      return 'free'; // access actually ended
    case 'CANCELLATION':
    case 'BILLING_ISSUE':
      return null; // still entitled — don't downgrade
    default:
      return null; // TRANSFER, TEST, etc. — leave the client SDK to reconcile
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    // RevenueCat test pings have no event — ack them.
    return NextResponse.json({ ok: true });
  }

  const sb = createAdminClient();

  // 1) Log the raw event (idempotent on event_id) for churn analytics.
  try {
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
    // Storage hiccup — fall through; never make RevenueCat retry forever.
  }

  // 2) Sync the subscription tier on the user's profile. The app identifies users
  //    in RevenueCat with their Supabase auth id, so app_user_id == profiles.id.
  try {
    const appUserId: string | undefined = event.app_user_id;
    const tier = tierChangeFromEvent(event);
    if (tier && appUserId && UUID_RE.test(appUserId)) {
      await sb.from('profiles').update({ subscription_tier: tier }).eq('id', appUserId);
    }
  } catch {
    // Profile sync failure shouldn't fail the webhook ack.
  }

  return NextResponse.json({ ok: true });
}
