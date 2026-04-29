'use client';

/**
 * SalesTimelineList — renders a list of SALES TimelineEntries using the
 * shared TimelineEntryRow primitive.
 *
 * ctx resolver functions return stub strings for now; full resolution
 * to be wired in v2 when customers/staff stores expose lookup helpers.
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §8
 * LoC budget: ≤120
 */

import { useMemo } from 'react';
import { renderTimelineEntry } from '@dms/vehicles-core';
import type { RenderContext, TimelineEntry } from '@dms/vehicles-core';
import { TimelineEntryRow } from '../shared/timeline-entry-row';
import { TIMELINE_LABELS } from '../shared/timeline-i18n';

// ─── Title resolution (mirrors ownership-timeline-event pattern) ──────────────

function resolveTitleKey(
  key: string,
  params: Record<string, string | number>,
): string {
  let template = TIMELINE_LABELS[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return template;
}

// ─── Stub context ─────────────────────────────────────────────────────────────
//
// In v2, wire these to the customers/staff stores.
// For P2, returning the raw id is safe — the timeline adapter gracefully
// uses the id as a display value anyway.

function buildStubCtx(): RenderContext {
  return {
    resolveCustomerName: (id: string) => id,
    resolveStaffName: (id: string) => id,
    resolveVehicleRef: (vin: string) => vin,
    resolveOwnershipRef: (ownershipId: string) => ownershipId,
    now: new Date().toISOString(),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SalesTimelineListProps {
  entries: TimelineEntry[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesTimelineList({ entries }: SalesTimelineListProps) {
  const ctx = useMemo(() => buildStubCtx(), []);

  const views = useMemo(
    () => entries.map((entry) => renderTimelineEntry(entry, ctx)),
    [entries, ctx],
  );

  if (views.length === 0) return null;

  return (
    <div className="flex flex-col">
      {views.map((view, i) => (
        <TimelineEntryRow
          key={view.id}
          entry={view}
          title={resolveTitleKey(view.titleKey, view.titleParams)}
          chipLabels={TIMELINE_LABELS}
          isLast={i === views.length - 1}
        />
      ))}
    </div>
  );
}
