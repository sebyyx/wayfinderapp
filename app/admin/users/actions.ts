'use server';

import { revalidatePath } from 'next/cache';
import { getAdminUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tier } from '@/lib/users';

const TIERS: Tier[] = ['free', 'monthly', 'lifetime'];

// Admin override of the in-app access flag (profiles.subscription_tier). This
// controls what the app unlocks — it does NOT bill anyone (real billing lives in
// the App Store via RevenueCat). Use for comps, support, and testing.
//
// Caveat: a future RevenueCat webhook for this user can overwrite the tier to
// match their real entitlement. That's intentional — the webhook is the source
// of truth for paying customers.
export async function setTier(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error('Not authorized');

  const userId = String(formData.get('userId') ?? '');
  const tier = String(formData.get('tier') ?? '') as Tier;

  if (!userId || !TIERS.includes(tier)) {
    throw new Error('Invalid tier change');
  }

  const sb = createAdminClient();
  const { error } = await sb.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
  if (error) throw new Error(`Failed to update tier: ${error.message}`);

  // Refresh every admin view (home, users list, and the user detail page).
  revalidatePath('/admin', 'layout');
}
