'use client';

import { AlertDialog } from '@/src/components/primitives';
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
  const { user } = useStaffAuth();
  const manualRevoke = useVehiclesStore((s) => s.manualRevoke);

  function handleConfirm() {
    if (!ownershipId || !user) return;
    manualRevoke(ownershipId, 'MANUAL_REVOKE', { id: user.id, name: user.name, role: user.role });
    onClose();
  }

  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Revoke Vehicle Ownership"
      description="This will revoke this ownership with a 7-day grace window. The customer retains portal access during the grace period."
      confirmLabel="Revoke"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
