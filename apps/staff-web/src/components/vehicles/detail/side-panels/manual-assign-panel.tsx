'use client';

import { useState } from 'react';
import { SlideInPanel } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { vehicleModuleCustomers } from '@dms/mocks/fixtures';
import type { VehicleTouchSource } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManualAssignPanelProps {
  open: boolean;
  vin: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualAssignPanel({ open, vin, onClose }: ManualAssignPanelProps) {
  const [customerId, setCustomerId] = useState('');
  const [source, setSource] = useState<VehicleTouchSource>('BN_SALE');
  const [kmAtOpen, setKmAtOpen] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useStaffAuth();
  const openOwnership = useVehiclesStore((s) => s.openOwnership);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !user) return;
    setSubmitting(true);
    try {
      openOwnership(
        {
          vin,
          customerId,
          source,
          kmAtOpen,
          fromAt: new Date().toISOString(),
        },
        { id: user.id, name: user.name, role: user.role },
      );
      onClose();
      setCustomerId('');
      setKmAtOpen(0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SlideInPanel open={open} onClose={onClose} title="Assign Owner" width="40%">
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {/* Customer search */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">
            Customer
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className={cn(
              'w-full h-10 rounded-md border border-line bg-bg-canvas px-3',
              'text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
            )}
          >
            <option value="">Select customer...</option>
            {vehicleModuleCustomers
              .filter((c) => !c.id.startsWith('cust-bn'))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">
            Ownership Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as VehicleTouchSource)}
            className={cn(
              'w-full h-10 rounded-md border border-line bg-bg-canvas px-3',
              'text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
            )}
          >
            <option value="BN_SALE">BN Sale</option>
            <option value="BN_CONSIGNMENT">BN Consignment</option>
            <option value="SERVICE_ONLY_WALKIN">Service Walk-in</option>
            <option value="LEGACY_IMPORT">Legacy Import</option>
          </select>
        </div>

        {/* KM at open */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">
            Odometer at Open (km)
          </label>
          <input
            type="number"
            min={0}
            value={kmAtOpen}
            onChange={(e) => setKmAtOpen(Number(e.target.value))}
            className={cn(
              'w-full h-10 rounded-md border border-line bg-bg-canvas px-3',
              'text-sm font-mono text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
            )}
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-1 h-10 rounded-md border border-line bg-bg-canvas text-sm',
              'text-ink-secondary hover:bg-bg-subtle transition-colors',
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!customerId || submitting}
            className={cn(
              'flex-1 h-10 rounded-md bg-accent text-white text-sm font-medium',
              'hover:bg-accent/90 transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            Assign
          </button>
        </div>
      </form>
    </SlideInPanel>
  );
}
