'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyTierToRevenueCat } from '@/lib/revenuecat';
import type { Tier } from '@/lib/users';

const TIERS: Tier[] = ['free', 'monthly', 'lifetime'];

export type TierActionState = { ok: boolean; message?: string };

// Changes a user's tier. Source of truth on-device is RevenueCat, so we grant/
// revoke a promotional entitlement there (that's what the app actually honors)
// and mirror it to profiles for instant admin display.
//
// Returns a status object (never throws) so the UI can show inline feedback
// instead of crashing the page with a server-side exception.
export async function setTier(
  _prev: TierActionState,
  formData: FormData,
): Promise<TierActionState> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, message: 'Not authorized' };

  const userId = String(formData.get('userId') ?? '');
  const tier = String(formData.get('tier') ?? '') as Tier;
  if (!userId || !TIERS.includes(tier)) {
    return { ok: false, message: 'Invalid tier change' };
  }

  // Mirror to profiles for instant admin display.
  const sb = createAdminClient();
  const { error } = await sb.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
  if (error) return { ok: false, message: `DB update failed: ${error.message}` };

  // Grant/revoke the RevenueCat promotional entitlement (what the app reads).
  const rc = await applyTierToRevenueCat(userId, tier);

  // Refresh every admin view (home, users list, user detail).
  revalidatePath('/admin', 'layout');

  if (!rc.ok) {
    return { ok: false, message: `Saved locally, but RevenueCat grant failed: ${rc.error}` };
  }
  return { ok: true, message: `Set to ${tier}` };
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
