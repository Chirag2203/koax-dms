'use client';

import { cn } from '@dms/ui';
import { VinBadge, StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { effectiveState } from '@dms/vehicles-core';
import type { EffectiveState } from '@dms/vehicles-core';
import type { VehicleOwnership, VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerVehicleCardProps {
  ownership: VehicleOwnership;
  vehicle: VehicleMaster | undefined;
  peerCount: number;
  now: string;
  onClick?: () => void;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerVehicleCard({
  ownership,
  vehicle,
  peerCount,
  now,
  onClick,
}: CustomerVehicleCardProps) {
  const es = effectiveState(ownership, now, peerCount);
  const isActive = es === 'ACTIVE' || es === 'ACTIVE_JOINT' || es === 'GRACE';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md border border-line bg-bg-surface p-4',
        'hover:border-accent/50 hover:bg-bg-subtle transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isActive && 'border-[rgb(var(--state-listed)/0.3)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <VinBadge vin={ownership.vin} size="sm" />
          {vehicle && (
            <p className="text-sm font-medium text-ink-primary mt-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.variant && <span className="text-ink-muted font-normal"> · {vehicle.variant}</span>}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StateChip status={EFFECTIVE_TO_CHIP[es]} />
            <span className="text-xs text-ink-muted font-mono">
              {ownership.kmAtOpen.toLocaleString('en-IN')} km open
            </span>
            {ownership.toAt && (
              <span className="text-xs text-ink-muted font-mono">
                → {new Date(ownership.toAt).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-ink-muted shrink-0">
          {new Date(ownership.fromAt).getFullYear()}
        </span>
      </div>
    </button>
  );
}
