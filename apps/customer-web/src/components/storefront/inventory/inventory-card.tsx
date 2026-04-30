/**
 * InventoryCard — extends VehicleCard with a compare toggle button.
 *
 * Wraps the existing VehicleCard and adds a CompareButton overlay.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L14
 */

'use client';

import * as React from 'react';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';
import { VehicleCard } from '@/src/components/vehicle-card';
import { CompareButton } from '../compare/compare-button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryCardProps {
  vehicle: Vehicle;
  isCompareSelected: boolean;
  isCompareDisabled: boolean;
  onCompareToggle: (vin: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryCard({
  vehicle,
  isCompareSelected,
  isCompareDisabled,
  onCompareToggle,
  className,
}: InventoryCardProps) {
  return (
    <div className={cn('relative group/card', className)}>
      <VehicleCard vehicle={vehicle} variant="collection" />

      {/* Compare button — shown on hover or when selected */}
      <div
        className={cn(
          'absolute bottom-14 right-0',
          'motion-safe:transition-opacity motion-safe:duration-200',
          isCompareSelected
            ? 'opacity-100'
            : 'opacity-0 group-hover/card:opacity-100',
        )}
      >
        <CompareButton
          vin={vehicle.vin}
          isSelected={isCompareSelected}
          isDisabled={isCompareDisabled}
          onToggle={onCompareToggle}
        />
      </div>
    </div>
  );
}
