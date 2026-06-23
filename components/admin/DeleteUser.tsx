'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteUser } from '@/app/admin/users/actions';

// Danger zone: deletes the user for good. The button stays disabled until the
// admin types the exact account email — a deliberate friction step.
export function DeleteUser({ userId, email }: { userId: string; email: string | null }) {
  const [typed, setTyped] = useState('');
  const matches = !!email && typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="mt-10 rounded-md border border-red-500/30 bg-red-500/5 p-5">
      <h2 className="font-serif text-lg text-red-300">Danger zone</h2>
      <p className="mt-1 font-sans text-sm text-ink3">
        Permanently delete this user and all of their app data (syncs, readings, journals, events).
        This cannot be undone.
      </p>
      {email ? (
        <form action={deleteUser} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="userId" value={userId} />
          <input
            name="confirmEmail"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type ${email} to confirm`}
            autoComplete="off"
            className="w-72 max-w-full rounded-md border border-white/10 bg-surface/40 px-3 py-2 font-sans text-sm text-ink placeholder:text-ink4 focus:border-red-400 focus:outline-none"
          />
          <DeleteButton disabled={!matches} />
        </form>
      ) : (
        <p className="mt-4 font-sans text-sm text-ink4">
          No email on file for this account — deletion is disabled to avoid mistakes.
        </p>
      )}
    </section>
  );
}

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`rounded-md px-4 py-2 font-sans text-sm transition ${
        disabled || pending
          ? 'cursor-not-allowed border border-white/10 text-ink4'
          : 'bg-red-500/90 text-white hover:bg-red-500'
      }`}
    >
      {pending ? 'Deleting…' : 'Delete user'}
    </button>
  );
}
