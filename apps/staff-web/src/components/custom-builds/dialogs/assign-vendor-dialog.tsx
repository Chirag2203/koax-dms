/**
 * AssignVendorDialog — vendor picker for assigning/changing vendor on a Build Job.
 *
 * R10+ action. Opens from Vendor & Schedule tab or Overview tab.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 3, P1.1 L21
 */

'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { cn } from '@dms/ui';
import type { CustomBuildVendor } from '@dms/types';

interface AssignVendorDialogProps {
  open: boolean;
  onClose: () => void;
  vendors: CustomBuildVendor[];
  currentVendorId?: string;
  onAssign: (vendorId: string) => void;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="font-mono text-[11px] text-[rgb(var(--state-in-refurb))] tabular-nums">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} {rating.toFixed(1)}
    </span>
  );
}

export function AssignVendorDialog({
  open,
  onClose,
  vendors,
  currentVendorId,
  onAssign,
}: AssignVendorDialogProps) {
  const [selectedId, setSelectedId] = useState<string>(currentVendorId ?? '');

  const activeVendors = vendors.filter((v) => v.active);

  const handleAssign = () => {
    if (!selectedId) return;
    onAssign(selectedId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign Vendor"
      subtitle="Select a vendor for this build job"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedId || selectedId === currentVendorId}
            className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Assign Vendor
          </button>
        </>
      }
    >
      <div className="space-y-2 max-h-80 overflow-y-auto rounded-md border border-line divide-y divide-line">
        {activeVendors.length === 0 ? (
          <p className="text-[13px] text-ink-muted text-center py-6">No active vendors found.</p>
        ) : (
          activeVendors.map((vendor) => (
            <button
              key={vendor.id}
              type="button"
              onClick={() => setSelectedId(vendor.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors',
                selectedId === vendor.id
                  ? 'bg-accent/10 border-l-2 border-accent'
                  : 'hover:bg-bg-hover',
              )}
              aria-pressed={selectedId === vendor.id}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-ink-primary">{vendor.name}</p>
                  {vendor.id === currentVendorId && (
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-mono">Current</span>
                  )}
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">{vendor.city} · {vendor.specialties.join(', ')}</p>
                <StarRow rating={vendor.rating} />
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[12px] text-ink-primary tabular-nums">
                  ₹{(vendor.dayRate / 1000).toFixed(1)}k/day
                </p>
                <p className="text-[10px] text-ink-muted">{vendor.onTimePct}% on-time</p>
              </div>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
