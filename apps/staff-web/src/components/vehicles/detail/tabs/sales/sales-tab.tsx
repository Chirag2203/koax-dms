'use client';

/**
 * SalesTab — vehicle lifetime detail tab.
 *
 * Layout mirrors OwnershipTab (card shell + events list).
 *
 * Features:
 * - StaleListingChip: amber/red when vehicle on lot > 90/180 days (L23)
 * - ActiveDealCard: pinned card for first active deal (reserved/SO/delivered)
 * - Sales events section using shared TimelineEntryRow primitive
 * - "View Sale Details" link to /inventory/[vin] when vehicle is on sale
 * - Lazy reservation expiry: runs once on mount (L37)
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §8
 */

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Tag } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { buildVehicleTimeline, renderTimelineEntry } from '@dms/vehicles-core';
import type { RenderContext, TimelineEntry } from '@dms/vehicles-core';
import type { Deal, SalesEvent, OwnershipChangeEvent, VehicleMaster } from '@dms/types';
import { TimelineEntryRow } from '../shared/timeline-entry-row';
import { TIMELINE_LABELS } from '../shared/timeline-i18n';
import { ActiveDealCard } from './active-deal-card';
import { StaleListingChip } from './stale-listing-chip';

// ─── Stable empty-array refs (prevents infinite re-render from `?? []`) ───────

const EMPTY_SALES_EVENTS: SalesEvent[] = [];

// ─── Active-deal stages (mirrors sales-deals-store ACTIVE_DEAL_STAGES) ────────

const ACTIVE_STAGES = new Set<Deal['stage']>(['reserved', 'sales-order', 'delivered']);

// ─── Stub render context (customers/staff lookup in v2) ───────────────────────

function buildStubCtx(): RenderContext {
  return {
    resolveCustomerName: (id: string) => id,
    resolveStaffName: (id: string) => id,
    resolveVehicleRef: (vin: string) => vin,
    resolveOwnershipRef: (ownershipId: string) => ownershipId,
    now: new Date().toISOString(),
  };
}

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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SalesTabProps {
  vehicle: VehicleMaster;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesTab({ vehicle }: SalesTabProps) {
  const { user } = useStaffAuth();

  // Pull base state — stable references; filters below via useMemo
  const salesEventsMap = useVehiclesStore((s) => s.salesEvents);
  const allEvents = useVehiclesStore((s) => s.events);
  const allDeals = useSalesDealsStore((s) => s.deals);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);

  const salesEvents = salesEventsMap[vehicle.vin] ?? EMPTY_SALES_EVENTS;

  const ownershipEvents = useMemo<OwnershipChangeEvent[]>(
    () => allEvents.filter((e) => e.vin === vehicle.vin),
    [allEvents, vehicle.vin],
  );

  const activeDeals = useMemo<Deal[]>(
    () =>
      Object.values(allDeals).filter(
        (d) => d.vehicleVin === vehicle.vin && ACTIVE_STAGES.has(d.stage),
      ),
    [allDeals, vehicle.vin],
  );

  const salesEntries = useMemo<TimelineEntry[]>(() => {
    const timeline = buildVehicleTimeline(ownershipEvents, salesEvents);
    return timeline.filter((e) => e.kind === 'SALES');
  }, [ownershipEvents, salesEvents]);

  const ctx = useMemo(() => buildStubCtx(), []);
  const views = useMemo(
    () => salesEntries.map((entry) => renderTimelineEntry(entry, ctx)),
    [salesEntries, ctx],
  );

  // Lazy reservation expiry (L37): runs once on mount per VIN, not in a selector
  useEffect(() => {
    const deals = useSalesDealsStore.getState().deals;
    const nowIso = new Date().toISOString();
    const actor = {
      id: user?.id ?? 'system',
      name: user?.name ?? 'System',
      role: user?.role ?? 'R24',
    };
    for (const deal of Object.values(deals)) {
      if (
        deal.vehicleVin === vehicle.vin &&
        deal.stage === 'reserved' &&
        deal.reservationExpiresAt &&
        deal.reservationExpiresAt < nowIso
      ) {
        useSalesDealsStore.getState().markReservationExpired(deal.id);
        useVehiclesStore.getState().emitSalesEvent(
          vehicle.vin,
          'RESERVATION_LOST',
          { dealId: deal.id, reason: 'EXPIRED' },
          actor,
        );
      }
    }
    // Only re-run if VIN changes; user is captured at mount for this pass
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.vin]);

  // Derive current sale state from the sales-events stream (authoritative).
  // A vehicle is currently on sale iff the last SalesEvent is a listing-state
  // event (ACQUIRED/LISTED/PRICE_CHANGED/RESERVED/RESERVATION_LOST).
  // SOLD/RETURNED take it off sale (terminal for this listing cycle).
  // Falls back to `inventoryVehicleVin` when stream is empty.
  const lastSalesEvent = salesEvents[salesEvents.length - 1];
  const isCurrentlyOnSale = useMemo(() => {
    if (!lastSalesEvent) return Boolean(vehicle.inventoryVehicleVin);
    return (
      lastSalesEvent.kind === 'ACQUIRED' ||
      lastSalesEvent.kind === 'LISTED' ||
      lastSalesEvent.kind === 'PRICE_CHANGED' ||
      lastSalesEvent.kind === 'RESERVED' ||
      lastSalesEvent.kind === 'RESERVATION_LOST'
    );
  }, [lastSalesEvent, vehicle.inventoryVehicleVin]);

  // Only show active deal card if vehicle is CURRENTLY on sale (events say so).
  // Prevents showing stale reservations for already-SOLD vehicles.
  const activeDeal = isCurrentlyOnSale ? (activeDeals[0] ?? null) : null;

  const inventoryLinkVin = vehicle.inventoryVehicleVin ?? (isCurrentlyOnSale ? vehicle.vin : null);
  const hasContent = views.length > 0 || activeDeal !== null;

  // ─── L12: "Put car on sale" eligibility ──────────────────────────────────
  // Visible iff:
  //   1. Vehicle is NOT currently on sale (no active listing), AND
  //   2. Vehicle has at least one ACTIVE non-dealer ownership row, AND
  //   3. No active BN_CONSIGNMENT ownership exists (i.e. not already in BN stock)
  // Deep-links to /inventory/new?mode=existing&vin=<vin> to start the listing wizard
  // pre-filled with this VIN.
  const canPutOnSale = useMemo(() => {
    if (isCurrentlyOnSale) return false;
    const vinOwnerships = (ownershipIdByVin[vehicle.vin] ?? [])
      .map((id) => ownerships[id])
      .filter(Boolean);
    const hasActiveBnConsignment = vinOwnerships.some(
      (o) => o && o.state === 'ACTIVE' && o.source === 'BN_CONSIGNMENT',
    );
    if (hasActiveBnConsignment) return false;
    const hasActiveCustomerOwnership = vinOwnerships.some(
      (o) =>
        o &&
        o.state === 'ACTIVE' &&
        o.source !== 'BN_CONSIGNMENT' &&
        o.customerId !== 'cust-bn-dealer',
    );
    return hasActiveCustomerOwnership;
  }, [vehicle.vin, ownerships, ownershipIdByVin, isCurrentlyOnSale]);

  // Status line: what to show under "Status"
  const statusLabel = activeDeal
    ? null // ActiveDealCard takes over
    : isCurrentlyOnSale
      ? 'Listed on inventory — no active deal'
      : lastSalesEvent?.kind === 'SOLD'
        ? 'Sold'
        : lastSalesEvent?.kind === 'RETURNED'
          ? 'Returned'
          : 'Not on sale';

  return (
    <div className="flex flex-col gap-6">
      {/* ── Listing summary card ──────────────────────────────────────────── */}
      <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-ink-primary">Sales Summary</h3>
            {isCurrentlyOnSale && (
              <StaleListingChip
                listedAt={vehicle.listedAt}
                dealStage={activeDeal?.stage}
                vin={vehicle.vin}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isCurrentlyOnSale && inventoryLinkVin && (
              <Link
                href={`/inventory/${inventoryLinkVin}`}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium',
                  'border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors',
                )}
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                View Sale Details
              </Link>
            )}
            {isCurrentlyOnSale && inventoryLinkVin && (
              <Gate
                role={['R10', 'R19', 'R22', 'R24']}
                fallback="tooltip"
                tooltipMessage="R10+ required"
              >
                <Link
                  href={`/inventory/${inventoryLinkVin}/edit`}
                  className={cn(
                    'inline-flex items-center h-8 px-3 rounded-md text-xs font-medium',
                    'border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors',
                  )}
                >
                  Edit Listing
                </Link>
              </Gate>
            )}
            {/* L12: Put car on sale — customer-owned, not in BN stock */}
            {canPutOnSale && (
              <Gate
                role={['R10', 'R19', 'R22', 'R24']}
                fallback="tooltip"
                tooltipMessage="R10+ required to list a vehicle for sale"
              >
                <Link
                  href={`/inventory/new?mode=existing&vin=${vehicle.vin}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold',
                    'bg-accent text-white hover:bg-accent/90 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  )}
                  title="List this customer-owned vehicle on BN inventory"
                >
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  Put on Sale
                </Link>
              </Gate>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {activeDeal ? (
            <ActiveDealCard deal={activeDeal} />
          ) : canPutOnSale ? (
            // Prominent put-on-sale CTA when vehicle is owned by a customer
            // and not currently listed (L12)
            <div className="flex items-center justify-between gap-4 rounded-md border border-accent/30 bg-accent/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent/15">
                  <Tag className="h-4 w-4 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Ready to list this vehicle?
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {statusLabel}. Put it up for sale on BN inventory.
                  </p>
                </div>
              </div>
              <Gate
                role={['R10', 'R19', 'R22', 'R24']}
                fallback="tooltip"
                tooltipMessage="R10+ required to list a vehicle for sale"
              >
                <Link
                  href={`/inventory/new?mode=existing&vin=${vehicle.vin}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-semibold',
                    'bg-accent text-white hover:bg-accent/90 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  )}
                >
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  Put on Sale
                </Link>
              </Gate>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-ink-muted text-xs">Status</span>
                <span className="text-ink-primary">{statusLabel}</span>
              </div>
              {isCurrentlyOnSale && vehicle.listedAt && (
                <div className="flex flex-col items-end">
                  <span className="text-ink-muted text-xs">Listed on</span>
                  <span className="text-ink-secondary font-mono text-xs">
                    {new Date(vehicle.listedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Sales events section ─────────────────────────────────────────── */}
      {hasContent && views.length > 0 ? (
        <div className="rounded-md border border-line bg-bg-surface p-6">
          <h3 className="text-sm font-semibold text-ink-primary mb-4">Sales Events</h3>
          <div>
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
        </div>
      ) : (
        <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
          <p className="text-sm text-ink-muted">No sales activity recorded for this VIN yet.</p>
        </div>
      )}
    </div>
  );
}
