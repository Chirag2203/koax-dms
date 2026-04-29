/**
 * FailedDispatchesAlert — amber banner + list + acknowledge for terminal failures.
 * SPEC-NOTIFICATIONS-001 §6.5
 *
 * ≤100 LoC per spec §11
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import type { NotificationDispatch } from '@dms/types';

interface FailedDispatchesAlertProps {
  dispatches: NotificationDispatch[];
}

export function FailedDispatchesAlert({ dispatches }: FailedDispatchesAlertProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = dispatches.filter((d) => !dismissed.has(d.id));

  if (visible.length === 0) return null;

  const dismissOne = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const dismissAll = () => {
    setDismissed(new Set(dispatches.map((d) => d.id)));
  };

  return (
    <div
      className="rounded-md border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.06)] p-4"
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={16}
            className="text-[rgb(var(--state-overdue))] flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-[rgb(var(--state-overdue))]">
            {visible.length} terminal dispatch failure{visible.length !== 1 ? 's' : ''} require attention
          </p>
        </div>
        <button
          type="button"
          onClick={dismissAll}
          className="text-xs text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          aria-label="Dismiss all failure alerts"
        >
          <X size={12} aria-hidden="true" />
          Dismiss all
        </button>
      </div>

      {/* List */}
      <ul className="space-y-1.5">
        {visible.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-2 bg-bg-canvas rounded-md px-3 py-2"
          >
            <div className="min-w-0">
              <Link
                href={`/notifications/${d.id}`}
                className="text-xs font-mono text-accent hover:underline"
              >
                {d.id}
              </Link>
              {d.errorReason && (
                <p className="text-xs text-ink-muted truncate max-w-xs">{d.errorReason}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-ink-muted font-mono">
                {d.retryCount}× retried
              </span>
              <button
                type="button"
                onClick={() => dismissOne(d.id)}
                className="h-6 w-6 flex items-center justify-center rounded text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Acknowledge failure ${d.id}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
