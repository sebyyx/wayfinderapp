'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyTierToRevenueCat } from '@/lib/revenuecat';
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

  // Source of truth on-device is RevenueCat, so grant/revoke a promotional
  // entitlement there first — that's what actually changes access in the app.
  const rc = await applyTierToRevenueCat(userId, tier);

  // Mirror to profiles for instant admin display (the RC webhook also keeps
  // this in sync over time).
  const sb = createAdminClient();
  const { error } = await sb.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
  if (error) throw new Error(`Failed to update profile tier: ${error.message}`);

  // Refresh every admin view (home, users list, and the user detail page).
  revalidatePath('/admin', 'layout');

  // Surface a RevenueCat failure after the local mirror succeeded, so the admin
  // knows the in-app grant didn't go through and can retry.
  if (!rc.ok) {
    throw new Error(`Profile updated, but RevenueCat grant failed: ${rc.error}`);
  }
}

// Permanently deletes a user: their app data, then the auth identity. This is
// irreversible. The form requires the admin to type the user's email (verified
// here too) so a stray click can't nuke an account.
const CHILD_TABLES_BY_USER = [
  'movement_syncs',
  'readings',
  'journal_entries',
  'reading_feedback',
  'weekly_reviews',
  'monthly_reports',
];

export async function deleteUser(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error('Not authorized');

  const userId = String(formData.get('userId') ?? '');
  const confirmEmail = String(formData.get('confirmEmail') ?? '').trim().toLowerCase();
  if (!userId) throw new Error('Missing user id');

  const sb = createAdminClient();

  // Verify the typed email matches the account before doing anything.
  const { data: authUser } = await sb.auth.admin.getUserById(userId);
  const actualEmail = authUser?.user?.email?.toLowerCase() ?? '';
  if (!actualEmail || confirmEmail !== actualEmail) {
    throw new Error('Confirmation email does not match');
  }

  // Best-effort cleanup of app data (ignore tables that don't exist / FK order).
  for (const table of CHILD_TABLES_BY_USER) {
    try {
      await sb.from(table).delete().eq('user_id', userId);
    } catch {
      /* table missing or no rows — continue */
    }
  }
  try {
    await sb.from('rc_events').delete().eq('app_user_id', userId);
  } catch {
    /* continue */
  }
  try {
    await sb.from('profiles').delete().eq('id', userId);
  } catch {
    /* continue */
  }

  // Finally remove the auth identity (this is the point of no return).
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete auth user: ${error.message}`);

  revalidatePath('/admin', 'layout');
  redirect('/admin/users');
}
