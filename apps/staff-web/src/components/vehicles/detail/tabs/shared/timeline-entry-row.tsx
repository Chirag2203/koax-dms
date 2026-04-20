'use client';

/**
 * TimelineEntryRow — shared primitive for ownership and sales timeline rows.
 *
 * Receives a fully-resolved TimelineEntryView from renderTimelineEntry().
 * Renders: icon + title (via next-intl) + chips + meta + relative timestamp.
 * Used by OwnershipTab now; reused by SalesTab in P2.
 *
 * L20 behaviors preserved:
 *   - isJoint → amber "Joint" badge next to title
 *   - currency values formatted via formatINR (resolved externally via meta.value)
 *   - relative timestamps via formatRelative helper
 *
 * Spec reference: PLAN-VEHICLES-003 §5, deliverable #6
 * LoC budget: ≤220
 */

import {
  UserPlus, UserMinus, ArrowRightLeft, FileText,
  CheckCircle, XCircle, RotateCcw, EyeOff, Download,
  Users, Clipboard, ShoppingCart, Tag, TrendingDown,
  Lock, LockOpen, BadgeCheck, Circle,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { TimelineEntryView } from '@dms/vehicles-core';
import { TimelineEntryChips } from './timeline-entry-chips';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, UserMinus, ArrowRightLeft, FileText,
  CheckCircle, XCircle, RotateCcw, EyeOff, Download,
  Users, Clipboard, ShoppingCart, Tag, TrendingDown,
  Lock, LockOpen, BadgeCheck, Circle,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TimelineEntryRowProps {
  entry: TimelineEntryView;
  /** Resolved title string (caller handles next-intl translation) */
  title: string;
  /** Resolved chip labels keyed by i18n key */
  chipLabels: Record<string, string>;
  isLast?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'just now' : `${diffMins}m ago`;
    }
    return `${diffHrs}h ago`;
  }
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimelineEntryRow({
  entry,
  title,
  chipLabels,
  isLast = false,
}: TimelineEntryRowProps) {
  const Icon = ICON_MAP[entry.icon] ?? Circle;

  return (
    <div className="flex gap-3">
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          'bg-bg-subtle border border-line text-ink-secondary',
        )}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-line mt-1" style={{ minHeight: 16 }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm text-ink-primary font-medium leading-snug">
            {title}
          </p>
          {entry.isJoint && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-[rgb(var(--state-listed)/0.12)] text-[rgb(var(--state-listed))] border-[rgb(var(--state-listed)/0.25)]">
              Joint
            </span>
          )}
          {entry.collapsedCount && entry.collapsedCount > 1 && (
            <span className="text-xs text-ink-muted font-mono">
              ({entry.collapsedCount})
            </span>
          )}
        </div>

        {/* Timestamp */}
        <p
          className="text-xs text-ink-muted mt-0.5"
          title={formatAbsolute(entry.at)}
        >
          {formatRelative(entry.at)}
        </p>

        {/* Chips */}
        <TimelineEntryChips chips={entry.chips} labels={chipLabels} />

        {/* Meta rows */}
        {entry.meta.length > 0 && (
          <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
            {entry.meta.map((m, i) => (
              <span key={m.labelKey}>
                {i > 0 && ' · '}
                <span className="text-ink-muted">{chipLabels[m.labelKey] ?? m.labelKey}:</span>
                {' '}
                {m.value}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
