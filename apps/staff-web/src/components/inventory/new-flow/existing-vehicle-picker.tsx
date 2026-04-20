'use client';

/**
 * ExistingVehiclePicker — Step 2 (Existing branch) of the Add Car flow.
 *
 * Shows a VIN autocomplete list filtered to:
 *   - VINs that exist in the vehicles store (VehicleMaster)
 *   - VINs NOT already on the sale floor (active BN_CONSIGNMENT ownership
 *     that is not SOLD or WITHDRAWN — we treat ACTIVE status on inventory
 *     vehicles fixture as "already on sale floor")
 *
 * Disabled rows show a tooltip "Already on sale floor".
 * Picker row shows: VIN · make/model · current owner display name.
 *
 * PLAN-VEHICLES-002 §C — Part 2, Step 2 (Existing branch)
 */

import { useState, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { vehicles as inventoryVehicles } from '@dms/mocks/fixtures';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExistingVehiclePickerProps {
  onPick: (vin: string) => void;
  onCancel: () => void;
}

interface VehicleRow {
  vin: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  ownerName: string;
  alreadyOnFloor: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** VINs currently active on the sale floor (from inventory fixture). */
const FLOOR_VINS = new Set(
  inventoryVehicles
    .filter((v) => !(['sold'] as string[]).includes(v.status))
    .map((v) => v.vin.trim().toUpperCase()),
);

// ─── Component ────────────────────────────────────────────────────────────────

export function ExistingVehiclePicker({ onPick, onCancel }: ExistingVehiclePickerProps) {
  const [query, setQuery] = useState('');

  const vehicles = useVehiclesStore((s) => s.vehicles);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);
  const customers = useCustomersStore((s) => s.customers);

  // Build display rows — one row per VIN in the master
  const rows = useMemo<VehicleRow[]>(() => {
    return Object.values(vehicles).map((v) => {
      // Find active owner
      const ownershipIds = ownershipIdByVin[v.vin] ?? [];
      const activeRow = ownershipIds
        .map((id) => ownerships[id])
        .find((o) => o?.state === 'ACTIVE');
      const owner = activeRow ? customers[activeRow.customerId] : undefined;
      const ownerName = owner?.name ?? activeRow?.customerId ?? 'Unknown';

      // "Already on sale floor": vin is in floor set AND owner is BN dealer
      const vinUpper = v.vin.trim().toUpperCase();
      const alreadyOnFloor =
        FLOOR_VINS.has(vinUpper) && activeRow?.customerId === 'cust-bn-dealer';

      return {
        vin: v.vin,
        make: v.make,
        model: v.model,
        variant: v.variant ?? '',
        year: v.year,
        ownerName,
        alreadyOnFloor,
      };
    });
  }, [vehicles, ownerships, ownershipIdByVin, customers]);

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.vin.toLowerCase().includes(q) ||
        r.make.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q),
    );
  }, [rows, query]);

  // Separate available vs disabled
  const available = filtered.filter((r) => !r.alreadyOnFloor);
  const disabled = filtered.filter((r) => r.alreadyOnFloor);
  const displayRows = [...available, ...disabled];

  return (
    <div className="flex flex-col max-w-[640px] mx-auto py-8 px-4">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink-primary">Select an existing vehicle</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Only vehicles already in the BN lifetime ledger are shown here.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by VIN, make, model, or owner…"
          aria-label="Search vehicles"
          className={cn(
            'w-full h-10 rounded-md border border-line bg-bg-subtle pl-9 pr-3',
            'text-sm text-ink-primary placeholder:text-ink-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
          )}
        />
      </div>

      {/* Vehicle list */}
      <div
        role="listbox"
        aria-label="Available vehicles"
        className={cn(
          'border border-line rounded-lg overflow-hidden',
          displayRows.length === 0 && 'border-dashed',
        )}
      >
        {displayRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-sm text-ink-muted">
            <AlertCircle className="h-6 w-6 opacity-40" aria-hidden="true" />
            <span>No vehicles match your search.</span>
          </div>
        ) : (
          displayRows.map((row) => {
            const isDisabled = row.alreadyOnFloor;
            return (
              <div
                key={row.vin}
                role="option"
                aria-selected={false}
                aria-disabled={isDisabled}
                title={isDisabled ? 'Already on sale floor' : undefined}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 border-b border-line last:border-b-0',
                  isDisabled
                    ? 'opacity-45 cursor-not-allowed bg-bg-subtle'
                    : 'cursor-pointer hover:bg-bg-hover',
                  'transition-colors duration-100',
                )}
                onClick={isDisabled ? undefined : () => onPick(row.vin)}
                onKeyDown={
                  isDisabled
                    ? undefined
                    : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPick(row.vin);
                        }
                      }
                }
                tabIndex={isDisabled ? -1 : 0}
              >
                {/* VIN */}
                <span className="font-mono text-[12px] text-ink-muted w-36 shrink-0 truncate tabular-nums">
                  {row.vin}
                </span>

                {/* Make/model */}
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-ink-primary truncate">
                    {row.year} {row.make} {row.model}
                  </span>
                  {row.variant && (
                    <span className="block text-[12px] text-ink-muted truncate">{row.variant}</span>
                  )}
                </span>

                {/* Owner */}
                <span className="text-[13px] text-ink-secondary shrink-0 max-w-[140px] truncate">
                  {isDisabled ? (
                    <span className="text-state-warning text-[11px] font-medium">On sale floor</span>
                  ) : (
                    row.ownerName
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'h-9 px-4 rounded-md text-sm font-medium border border-line',
            'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
