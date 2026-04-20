'use client';

import { useMemo, useState } from 'react';
import { cn } from '@dms/ui';
import { StateChip, Gate } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { effectiveState } from '@dms/vehicles-core';
import type { EffectiveState } from '@dms/vehicles-core';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import type { VehicleMaster, VehicleOwnership, OwnershipChangeEvent } from '@dms/types';
import { ManualRevokePanel } from '../side-panels/manual-revoke-panel';
import { ManualAssignPanel } from '../side-panels/manual-assign-panel';
import { OwnershipTimelineEvent } from './ownership-timeline-event';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnershipTabProps {
  vehicle: VehicleMaster;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EFFECTIVE_TO_CHIP: Record<EffectiveState, StateChipStatus> = {
  PENDING_CLAIM: 'own-pending-claim',
  ACTIVE: 'own-active',
  ACTIVE_JOINT: 'own-active-joint',
  GRACE: 'own-grace',
  REVOKED: 'own-revoked',
  TRANSFERRED: 'own-transferred',
  REJECTED: 'own-rejected',
};

const SOURCE_LABELS: Record<string, string> = {
  BN_SALE: 'BN Sale',
  BN_CONSIGNMENT: 'BN Consignment',
  SERVICE_ONLY_WALKIN: 'Service Walk-in',
  LEGACY_IMPORT: 'Legacy Import',
};

function isOwnershipRow(
  item: VehicleOwnership | OwnershipChangeEvent,
): item is VehicleOwnership {
  return 'customerId' in item;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipTab({ vehicle }: OwnershipTabProps) {
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const now = useMemo(() => new Date().toISOString(), []);

  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);
  const customers = useCustomersStore((s) => s.customers);
  const store = useVehiclesStore.getState();

  // Resolve customerId → display name; anonymized rows show placeholder
  const displayNameFor = (customerId: string, anonIndex?: number) => {
    if (customerId.startsWith('anon-')) {
      const n = customerId.slice(5);
      return `Owner #${n} (anonymized)`;
    }
    return customers[customerId]?.name ?? customerId;
  };

  const timeline = useMemo(() => {
    return store.selectOwnershipTimeline(useVehiclesStore.getState(), vehicle.vin);
  }, [store, vehicle.vin]);

  const ownershipRows = useMemo(() => {
    const ids = ownershipIdByVin[vehicle.vin] ?? [];
    return ids.map((id) => ownerships[id]).filter(Boolean) as VehicleOwnership[];
  }, [ownerships, ownershipIdByVin, vehicle.vin]);

  const peerCountFor = (id: string) => {
    return ownershipRows.filter((r) => {
      if (r.id === id) return false;
      const es = effectiveState(r, now, 0);
      return es === 'ACTIVE' || es === 'ACTIVE_JOINT';
    }).length;
  };

  const rows = useMemo(() => {
    return ownershipRows
      .map((r) => ({
        row: r,
        es: effectiveState(r, now, peerCountFor(r.id)),
      }))
      .sort((a, b) => {
        // Active rows first
        const aActive = a.es === 'ACTIVE' || a.es === 'ACTIVE_JOINT' || a.es === 'GRACE';
        const bActive = b.es === 'ACTIVE' || b.es === 'ACTIVE_JOINT' || b.es === 'GRACE';
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return new Date(b.row.fromAt).getTime() - new Date(a.row.fromAt).getTime();
      });
  }, [ownershipRows, now]);

  const events = useMemo(() => {
    return timeline.filter((item) => !isOwnershipRow(item)) as OwnershipChangeEvent[];
  }, [timeline]);

  if (ownershipRows.length === 0) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
        <p className="text-sm text-ink-muted">No ownership records for this vehicle.</p>
        <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="Insufficient permissions">
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Assign first owner
          </button>
        </Gate>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Ledger */}
        <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h3 className="text-sm font-semibold text-ink-primary">Ownership Ledger</h3>
            <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="Insufficient permissions">
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className={cn(
                  'h-8 px-3 rounded-md text-xs font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors',
                )}
              >
                Assign Owner
              </button>
            </Gate>
          </div>

          <div className="divide-y divide-line">
            {rows.map(({ row, es }) => {
              const isAnon = row.customerId.startsWith('anon-');
              const isActive = es === 'ACTIVE' || es === 'ACTIVE_JOINT';
              const isGrace = es === 'GRACE';
              const isRevoked = es === 'REVOKED';

              return (
                <div
                  key={row.id}
                  className={cn(
                    'px-6 py-4',
                    (isActive || isGrace) && 'bg-[rgb(var(--state-listed)/0.03)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-sm font-medium',
                          isAnon && 'text-ink-muted italic',
                        )}>
                          {displayNameFor(row.customerId)}
                        </span>
                        <StateChip status={EFFECTIVE_TO_CHIP[es]} />
                        {row.isJoint && (
                          <span className="text-xs text-ink-muted font-mono">Joint</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-muted flex-wrap">
                        <span>Source: {SOURCE_LABELS[row.source] ?? row.source}</span>
                        <span>From: {new Date(row.fromAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {row.toAt && <span>To: {new Date(row.toAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        <span className="font-mono">{row.kmAtOpen.toLocaleString('en-IN')} km open</span>
                        {row.kmAtClose && (
                          <span className="font-mono">{row.kmAtClose.toLocaleString('en-IN')} km close</span>
                        )}
                        {isGrace && row.graceUntilAt && (
                          <span className="text-[rgb(var(--state-in-refurb))]">
                            Grace until {new Date(row.graceUntilAt).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive && (
                        <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="R09+ required">
                          <button
                            type="button"
                            onClick={() => setRevokeId(row.id)}
                            className="h-7 px-2 rounded text-xs border border-line text-ink-secondary hover:bg-bg-hover transition-colors"
                          >
                            Revoke
                          </button>
                        </Gate>
                      )}
                      {isRevoked && (
                        <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="R09+ required">
                          <button
                            type="button"
                            onClick={() => {
                              useVehiclesStore.getState().restoreOwnership(
                                row.id,
                                'Staff restore',
                                { id: 'staff-current', name: 'Staff', role: 'R09' },
                              );
                            }}
                            className="h-7 px-2 rounded text-xs border border-line text-ink-secondary hover:bg-bg-hover transition-colors"
                          >
                            Restore
                          </button>
                        </Gate>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Events sub-section */}
        {events.length > 0 && (
          <div className="rounded-md border border-line bg-bg-surface p-6">
            <h3 className="text-sm font-semibold text-ink-primary mb-4">Ownership Events</h3>
            <div>
              {events.map((evt, i) => (
                <OwnershipTimelineEvent
                  key={evt.id}
                  kind={evt.kind}
                  actorId={evt.actorId}
                  at={evt.at}
                  payload={evt.payload as Record<string, unknown> | undefined}
                  isLast={i === events.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Side panels */}
      <ManualRevokePanel
        open={revokeId !== null}
        ownershipId={revokeId ?? ''}
        onClose={() => setRevokeId(null)}
      />
      <ManualAssignPanel
        open={assignOpen}
        vin={vehicle.vin}
        onClose={() => setAssignOpen(false)}
      />
    </>
  );
}
