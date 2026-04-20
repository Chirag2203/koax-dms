'use client';

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@dms/ui';
import { VinBadge, OutletPill, StateChip, Gate } from '@/src/components/primitives';
import type { StateChipStatus, OutletCode } from '@/src/components/primitives';
import { effectiveState } from '@dms/vehicles-core';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import type { VehicleMaster } from '@dms/types';
import { VehicleIntakeDialog } from './dialogs/vehicle-intake-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleDetailHeaderProps {
  vehicle: VehicleMaster;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OUTLET_MAP: Record<string, OutletCode> = {
  'BLR-01': 'bangalore',
  'MUM-01': 'mumbai',
  'CHE-01': 'chennai',
};

const EFFECTIVE_TO_CHIP: Record<string, StateChipStatus> = {
  ACTIVE: 'own-active',
  ACTIVE_JOINT: 'own-active-joint',
  GRACE: 'own-grace',
  REVOKED: 'own-revoked',
  TRANSFERRED: 'own-transferred',
  PENDING_CLAIM: 'own-pending-claim',
  REJECTED: 'own-rejected',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleDetailHeader({ vehicle }: VehicleDetailHeaderProps) {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const now = useMemo(() => new Date().toISOString(), []);

  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);
  // eslint-disable-next-line @typescript-eslint/unbound-method

  const storeRef = useVehiclesStore.getState;

  const activeOwnership = useMemo(() => {
    const currentOwnerships = storeRef().selectCurrentOwnerships(
      storeRef(),
      vehicle.vin,
    );
    return currentOwnerships[0] ?? null;
  }, [storeRef, vehicle.vin, ownerships, ownershipIdByVin]);

  const peerCount = useMemo(() => {
    const currentOwnerships = storeRef().selectCurrentOwnerships(
      storeRef(),
      vehicle.vin,
    );
    return Math.max(0, currentOwnerships.length - 1);
  }, [storeRef, vehicle.vin, ownerships, ownershipIdByVin]);

  const es = activeOwnership
    ? effectiveState(activeOwnership, now, peerCount)
    : null;

  const outletCode = OUTLET_MAP[vehicle.firstTouchOutletId] ?? 'bangalore';
  const metadataIncomplete = !vehicle.make || vehicle.make === '';

  return (
    <>
      <div className="mb-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-muted mb-4">
          <a href="/vehicles" className="hover:text-ink-primary transition-colors">Vehicles</a>
          <span aria-hidden="true">›</span>
          <span className="font-mono text-ink-primary">{vehicle.vin}</span>
        </nav>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <VinBadge vin={vehicle.vin} size="md" />
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.variant && (
              <p className="text-sm text-ink-muted">{vehicle.variant}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <OutletPill outlet={outletCode} />
              {es && <StateChip status={EFFECTIVE_TO_CHIP[es] as StateChipStatus} />}
              <span className="font-mono text-sm text-ink-secondary tabular-nums">
                {vehicle.lastKnownKm.toLocaleString('en-IN')} km
              </span>
              <span className="text-sm text-ink-muted">{vehicle.color}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {metadataIncomplete && (
              <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="tooltip" tooltipMessage="Insufficient permissions">
                <button
                  type="button"
                  onClick={() => setIntakeOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[rgb(var(--state-overdue)/0.3)]',
                    'bg-[rgb(var(--state-overdue)/0.05)] text-[rgb(var(--state-overdue))] text-sm',
                    'hover:bg-[rgb(var(--state-overdue)/0.1)] transition-colors',
                  )}
                >
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Complete Metadata
                </button>
              </Gate>
            )}
          </div>
        </div>
      </div>

      <VehicleIntakeDialog
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        vin={vehicle.vin}
      />
    </>
  );
}
