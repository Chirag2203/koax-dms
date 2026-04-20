'use client';

/**
 * OwnershipTimelineEvent — thin adapter between OwnershipChangeEvent and
 * the shared TimelineEntryRow primitive.
 *
 * All rendering logic (source labels, actor resolution, km formatting,
 * "[object Object]" suppression) lives in renderTimelineEntry() +
 * PAYLOAD_KEY_LABELS in @dms/vehicles-core. This component is a ≤80 LoC
 * shell that wires the store context into the pure render functions.
 *
 * PLAN-002 behaviors preserved (L20): joint badge, formatINR, relative
 * timestamps, consecutive-collapse — all handled by the shared primitive.
 *
 * Spec reference: PLAN-VEHICLES-003 §9, deliverable #8
 * LoC budget: ≤80
 */

import { useMemo } from 'react';
import { renderTimelineEntry } from '@dms/vehicles-core';
import type { RenderContext } from '@dms/vehicles-core';
import type { OwnershipChangeEvent } from '@dms/types';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { STAFF_NAMES } from '@/src/components/parts/helpers';
import { TimelineEntryRow } from './shared/timeline-entry-row';
import { TIMELINE_LABELS } from './shared/timeline-i18n';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OwnershipTimelineEventProps {
  event: OwnershipChangeEvent;
  isLast?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipTimelineEvent({
  event,
  isLast = false,
}: OwnershipTimelineEventProps) {
  const customers = useCustomersStore((s) => s.customers);
  const ownerships = useVehiclesStore((s) => s.ownerships);

  // Enrich payload with customerId resolved from the linked ownership row,
  // so title templates for BN_SALE/BN_CONSIGNMENT/SERVICE_WALKIN/LEGACY_IMPORT
  // can produce "Sale to {name}" etc. even when fixture payloads don't embed
  // the customerId directly.
  const enrichedEvent = useMemo(() => {
    const payload = { ...(event.payload ?? {}) };
    const linkedOwnership = event.ownershipId ? ownerships[event.ownershipId] : undefined;
    const linkedCustomerId = linkedOwnership?.customerId;
    if (linkedCustomerId) {
      const source = payload['source'];
      if (source === 'BN_SALE' && !payload['buyerCustomerId']) {
        payload['buyerCustomerId'] = linkedCustomerId;
      } else if (source === 'BN_CONSIGNMENT' && !payload['consignorCustomerId']) {
        payload['consignorCustomerId'] = linkedCustomerId;
      } else if ((source === 'SERVICE_ONLY_WALKIN' || source === 'LEGACY_IMPORT') && !payload['customerId']) {
        payload['customerId'] = linkedCustomerId;
      }
    }
    // JOINT_ADD uses `customerId` in fixtures; renderer expects
    // `jointWithCustomerId`. Alias to keep renderer stable.
    if (event.kind === 'JOINT_ADD' && !payload['jointWithCustomerId']) {
      if (typeof payload['customerId'] === 'string') {
        payload['jointWithCustomerId'] = payload['customerId'];
      } else if (linkedCustomerId) {
        payload['jointWithCustomerId'] = linkedCustomerId;
      }
    }
    return { ...event, payload };
  }, [event, ownerships]);

  const ctx: RenderContext = useMemo(() => ({
    resolveCustomerName(id: string) {
      if (id.startsWith('anon-')) return `Owner #${id.slice(5)} (anonymized)`;
      return customers[id]?.name ?? 'Customer';
    },
    resolveStaffName(id: string) {
      if (STAFF_NAMES[id]) return STAFF_NAMES[id]!;
      if (id.startsWith('cust-')) return customers[id]?.name ?? 'Customer';
      return 'BN Automobiles';
    },
    resolveVehicleRef(vin: string) { return vin; },
    resolveOwnershipRef(ownershipId: string) { return ownershipId; },
    now: new Date().toISOString(),
  }), [customers]);

  const view = useMemo(
    () => renderTimelineEntry({ kind: 'OWNERSHIP', event: enrichedEvent }, ctx),
    [enrichedEvent, ctx],
  );

  // Resolve title from static i18n table (avoids next-intl hook in pure helper)
  const title = resolveTitleKey(view.titleKey, view.titleParams);

  return (
    <TimelineEntryRow
      entry={view}
      title={title}
      chipLabels={TIMELINE_LABELS}
      isLast={isLast}
    />
  );
}

// ─── Title resolution (static fallback — no next-intl hook needed here) ───────

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
