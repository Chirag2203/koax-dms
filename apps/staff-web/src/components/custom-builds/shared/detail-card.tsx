/**
 * Shared Card + Field primitives for custom-build detail tabs.
 *
 * Canonical pattern: matches customer-360 / staff-profile pattern.
 * All detail tabs import from here — do NOT copy-paste these locally.
 */

import type { ReactNode } from 'react';

// ─── Card ──────────────────────────────────────────────────────────────────────

export function Card({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

// ─── Field (read-only dt/dd) ───────────────────────────────────────────────────

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-ink-primary mt-1">{value ?? '—'}</dd>
    </div>
  );
}
