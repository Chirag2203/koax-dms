'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
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
  const vehicles = useVehiclesStore((s) => s.vehicles);

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
    openOwnership(
      { vin: normalizedVin, customerId, source, kmAtOpen: km },
      { id: user.id, name: user.name, role: user.role },
    );
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
            Assign
          </button>
        </>
      }
    >
      <form id="assign-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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
