'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { normalizeVin } from '@dms/vehicles-core';
import type { VehicleTouchSource } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManualOwnershipAssignDialogProps {
  open: boolean;
  customerId: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualOwnershipAssignDialog({
  open,
  customerId,
  onClose,
}: ManualOwnershipAssignDialogProps) {
  const [vin, setVin] = useState('');
  const [km, setKm] = useState(0);
  const [source, setSource] = useState<VehicleTouchSource>('BN_SALE');
  const [vinError, setVinError] = useState('');
  const [dirty, setDirty] = useState(false);

  const { user } = useStaffAuth();
  const openOwnership = useVehiclesStore((s) => s.openOwnership);
  const transferOwnership = useVehiclesStore((s) => s.transferOwnership);
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByVin = useVehiclesStore((s) => s.ownershipIdByVin);
  const logAuditAssignVehicle = useCustomersStore((s) => s.logAuditAssignVehicle);

  // Determine if the entered VIN has an ACTIVE owner already
  let normalizedVinForCheck = '';
  try {
    if (vin.length === 17) {
      normalizedVinForCheck = normalizeVin(vin.toUpperCase());
    }
  } catch {
    // invalid vin — ignore for check
  }
  const existingOwnershipIds = normalizedVinForCheck ? (ownershipIdByVin[normalizedVinForCheck] ?? []) : [];
  const hasActiveOwner = existingOwnershipIds.some(
    (id) => ownerships[id]?.state === 'ACTIVE',
  );

  function handleVinChange(v: string) {
    setVin(v);
    setDirty(true);
    try {
      normalizeVin(v.toUpperCase());
      setVinError('');
    } catch {
      setVinError('Invalid VIN format');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || vinError) return;
    let normalizedVin: string;
    try {
      normalizedVin = normalizeVin(vin.toUpperCase());
    } catch {
      setVinError('Invalid VIN');
      return;
    }
    if (!vehicles[normalizedVin]) {
      setVinError('VIN not found in system');
      return;
    }

    const actor = { id: user.id, name: user.name, role: user.role };

    if (hasActiveOwner) {
      // Spec §5.1 step 6: existing ACTIVE owner — use transferOwnership
      transferOwnership(
        {
          vin: normalizedVin,
          toCustomerId: customerId,
          source: source as 'BN_SALE' | 'BN_CONSIGNMENT',
          kmAtClose: km,
          kmAtOpen: km,
          closeReason: 'BN_SALE_TRANSFER',
        },
        actor,
      );
    } else {
      openOwnership(
        { vin: normalizedVin, customerId, source, kmAtOpen: km },
        actor,
      );
    }

    logAuditAssignVehicle(customerId, { vin: normalizedVin }, actor);

    onClose();
    setVin('');
    setKm(0);
    setDirty(false);
  }

  const inputClass = cn(
    'w-full h-10 rounded-md border border-line bg-bg-canvas px-3',
    'text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign Vehicle Ownership"
      size="sm"
      dirty={dirty}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors">
            Cancel
          </button>
          <button type="submit" form="assign-form" disabled={!!vinError || !vin} className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40">
            {hasActiveOwner ? 'Transfer' : 'Assign'}
          </button>
        </>
      }
    >
      <form id="assign-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Active-owner warning banner (spec §5.1 step 6) */}
        {hasActiveOwner && (
          <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]">
            <AlertTriangle className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-ink-secondary">
              This VIN has an active owner. Transferring will close the current ownership.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">VIN</label>
          <input
            className={cn(inputClass, 'font-mono uppercase', vinError && 'border-[rgb(var(--state-danger))]')}
            value={vin}
            onChange={(e) => handleVinChange(e.target.value)}
            placeholder="17-character VIN"
            maxLength={17}
          />
          {vinError && <p className="text-xs text-[rgb(var(--state-danger))] mt-1">{vinError}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value as VehicleTouchSource)} className={inputClass}>
            <option value="BN_SALE">BN Sale</option>
            <option value="BN_CONSIGNMENT">Consignment</option>
            <option value="LEGACY_IMPORT">Legacy Import</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">Odometer at Open (km)</label>
          <input type="number" min={0} value={km} onChange={(e) => setKm(Number(e.target.value))} className={cn(inputClass, 'font-mono')} />
        </div>
      </form>
    </Dialog>
  );
}
