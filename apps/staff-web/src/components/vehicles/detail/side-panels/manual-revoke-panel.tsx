'use client';

import { useState } from 'react';
import { AlertDialog } from '@/src/components/primitives';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { CloseReason } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManualRevokePanelProps {
  open: boolean;
  ownershipId: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualRevokePanel({ open, ownershipId, onClose }: ManualRevokePanelProps) {
  const [reason, setReason] = useState<CloseReason>('MANUAL_REVOKE');
  const { user } = useStaffAuth();
  const manualRevoke = useVehiclesStore((s) => s.manualRevoke);

  function handleConfirm() {
    if (!ownershipId || !user) return;
    manualRevoke(ownershipId, reason, { id: user.id, name: user.name, role: user.role });
    onClose();
  }

  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Revoke Ownership"
      description="This will immediately revoke this ownership with a 7-day grace window. The customer retains portal access during the grace period."
      confirmLabel="Revoke"
      cancelLabel="Cancel"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
