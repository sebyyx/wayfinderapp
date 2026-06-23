'use client';

import { useState } from 'react';

// Copies a value (e.g. a user id) to the clipboard with a brief "copied" flash.
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className="rounded border border-white/10 px-2 py-0.5 font-sans text-xs text-ink3 transition hover:border-accent hover:text-ink"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
