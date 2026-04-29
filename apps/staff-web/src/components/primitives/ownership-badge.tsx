'use client';

import { Car, Handshake, Wrench, Upload, Users } from 'lucide-react';
import { cn } from '@dms/ui';
import { StateChip } from './state-chip';
import type { StateChipStatus } from './state-chip';
import type { EffectiveState } from '@dms/vehicles-core';
import type { VehicleTouchSource } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnershipBadgeProps {
  effectiveState: EffectiveState;
  source: VehicleTouchSource;
  isJoint?: boolean;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<VehicleTouchSource, React.ElementType> = {
  BN_SALE: Car,
  BN_CONSIGNMENT: Handshake,
  SERVICE_ONLY_WALKIN: Wrench,
  LEGACY_IMPORT: Upload,
  CUSTOM_BUILD_LINKED: Car,
};

const EFFECTIVE_STATE_TO_CHIP: Record<EffectiveState, StateChipStatus> = {
  PENDING_CLAIM: 'own-pending-claim',
  ACTIVE: 'own-active',
  ACTIVE_JOINT: 'own-active-joint',
  GRACE: 'own-grace',
  REVOKED: 'own-revoked',
  TRANSFERRED: 'own-transferred',
  REJECTED: 'own-rejected',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipBadge({
  effectiveState,
  source,
  isJoint = false,
  className,
}: OwnershipBadgeProps) {
  const SourceIcon = SOURCE_ICON[source];
  const chipStatus = EFFECTIVE_STATE_TO_CHIP[effectiveState];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <StateChip status={chipStatus} />
      <span className="inline-flex items-center gap-0.5 text-ink-muted">
        <SourceIcon className="h-3 w-3" aria-hidden="true" />
        {isJoint && <Users className="h-3 w-3" aria-label="Joint ownership" />}
      </span>
    </span>
  );
}
