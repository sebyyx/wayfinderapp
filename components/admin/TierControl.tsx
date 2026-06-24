'use client';

import { useActionState } from 'react';
import { setTier, type TierActionState } from '@/app/admin/users/actions';
import type { Tier } from '@/lib/users';

const TIERS: Tier[] = ['free', 'monthly', 'lifetime'];
const LABEL: Record<Tier, string> = { free: 'Free', monthly: 'Monthly', lifetime: 'Lifetime' };
const INITIAL: TierActionState = { ok: false };

// Inline tier switcher with action feedback. Never crashes the page — setTier
// returns a status which we render next to the buttons.
export function TierControl({
  userId,
  tier,
  size = 'sm',
}: {
  userId: string;
  tier: Tier;
  size?: 'sm' | 'md';
}) {
  const [state, action, pending] = useActionState(setTier, INITIAL);
  const pad = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';

  return (
    <div className="flex flex-col gap-1">
      <form action={action} className="flex gap-1">
        <input type="hidden" name="userId" value={userId} />
        {TIERS.map((t) => (
          <button
            key={t}
            name="tier"
            value={t}
            disabled={tier === t || pending}
            className={`rounded ${pad} transition ${
              tier === t
                ? 'cursor-default bg-accent/20 text-accent'
                : 'border border-white/10 text-ink3 hover:border-accent hover:text-ink disabled:opacity-50'
            }`}
          >
            {LABEL[t]}
          </button>
        ))}
      </form>
      {pending && <span className="font-sans text-xs text-ink4">Working…</span>}
      {!pending && state.message && (
        <span
          className={`font-sans text-xs ${state.ok ? 'text-emerald-400' : 'text-red-400'}`}
          title={state.message}
        >
          {state.ok ? state.message : truncate(state.message, 60)}
        </span>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
