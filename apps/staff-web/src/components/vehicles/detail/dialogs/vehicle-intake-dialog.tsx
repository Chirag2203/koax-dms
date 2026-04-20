'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleIntakeDialogProps {
  open: boolean;
  onClose: () => void;
  vin: string;
  /** Optional callback after vehicle data is saved — used by service JC creation flow. */
  onConfirm?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleIntakeDialog({ open, onClose, vin, onConfirm }: VehicleIntakeDialogProps) {
  const { user } = useStaffAuth();
  const upsertVehicle = useVehiclesStore((s) => s.upsertVehicle);
  const vehicle = useVehiclesStore((s) => s.vehicles[vin]);

  const [form, setForm] = useState({
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year ?? new Date().getFullYear(),
    variant: vehicle?.variant ?? '',
    color: vehicle?.color ?? '',
    rcNumber: vehicle?.rcNumber ?? '',
    firstTouchOutletId: vehicle?.firstTouchOutletId ?? 'BLR-01',
  });
  const [dirty, setDirty] = useState(false);

  function handleChange(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !vehicle) return;
    upsertVehicle(
      {
        ...vehicle,
        ...form,
        year: Number(form.year),
      },
      { id: user.id, name: user.name, role: user.role },
    );
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  }

  const inputClass = cn(
    'w-full h-10 rounded-md border border-line bg-bg-canvas px-3',
    'text-sm text-ink-primary placeholder:text-ink-muted',
    'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent',
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vehicle Intake — Complete Metadata"
      subtitle={`VIN: ${vin}`}
      size="md"
      dirty={dirty}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="vehicle-intake-form"
            className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Save
          </button>
        </>
      }
    >
      <form id="vehicle-intake-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Make</label>
            <input
              className={inputClass}
              value={form.make}
              onChange={(e) => handleChange('make', e.target.value)}
              placeholder="e.g. BMW"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Model</label>
            <input
              className={inputClass}
              value={form.model}
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder="e.g. M340i"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Year</label>
            <input
              type="number"
              className={inputClass}
              value={form.year}
              onChange={(e) => handleChange('year', Number(e.target.value))}
              min={1990}
              max={2030}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Variant</label>
            <input
              className={inputClass}
              value={form.variant}
              onChange={(e) => handleChange('variant', e.target.value)}
              placeholder="e.g. xDrive Sedan"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Color</label>
            <input
              className={inputClass}
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="e.g. Alpine White"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">RC Number</label>
            <input
              className={inputClass}
              value={form.rcNumber}
              onChange={(e) => handleChange('rcNumber', e.target.value)}
              placeholder="e.g. KA01AB1234"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">First Touch Outlet</label>
          <select
            className={inputClass}
            value={form.firstTouchOutletId}
            onChange={(e) => handleChange('firstTouchOutletId', e.target.value)}
          >
            <option value="BLR-01">Bangalore (BLR-01)</option>
            <option value="MUM-01">Mumbai (MUM-01)</option>
            <option value="CHE-01">Chennai (CHE-01)</option>
          </select>
        </div>
      </form>
    </Dialog>
  );
}
