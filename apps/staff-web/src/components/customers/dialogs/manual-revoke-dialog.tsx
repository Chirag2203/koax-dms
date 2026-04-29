'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManualRevokeDialogProps {
  open: boolean;
  ownershipId: string | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualRevokeDialog({
  open,
  ownershipId,
  onClose,
}: ManualRevokeDialogProps) {
  const [reason, setReason] = useState('');
  const [dirty, setDirty] = useState(false);

  const { user } = useStaffAuth();
  const manualRevoke = useVehiclesStore((s) => s.manualRevoke);

  const reasonTrimmed = reason.trim();
  const isValid = reasonTrimmed.length >= 4;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownershipId || !user || !isValid) return;
    manualRevoke(ownershipId, 'MANUAL_REVOKE', { id: user.id, name: user.name, role: user.role });
    handleClose();
  }

  function handleClose() {
    onClose();
    setReason('');
    setDirty(false);
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Revoke Vehicle Ownership"
      subtitle="This will revoke this ownership with a 7-day grace window. The customer retains portal access during the grace period."
      size="sm"
      dirty={dirty}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="revoke-form"
            disabled={!isValid}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
              'bg-state-danger hover:bg-state-danger/90',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            Revoke
          </button>
        </>
      }
    >
      <form id="revoke-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="revoke-reason" className="block text-xs font-medium text-ink-secondary mb-1.5">
            Reason for revocation <span className="text-state-danger" aria-hidden="true">*</span>
          </label>
          <textarea
            id="revoke-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setDirty(true);
            }}
            placeholder="Describe the reason for this revocation (min. 4 characters)"
            className={cn(
              'w-full rounded-md border border-line bg-bg-canvas px-3 py-2',
              'text-sm text-ink-primary resize-none',
              'focus:outline-none focus:ring-1 focus:ring-accent',
              dirty && !isValid && 'border-state-danger',
            )}
          />
          {dirty && !isValid && (
            <p className="text-xs text-state-danger mt-1">Reason must be at least 4 characters.</p>
          )}
        </div>
      </form>
    </Dialog>
  );
}
