'use client';

import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { AlertDialog } from '@/src/components/primitives';
import { effectiveState } from '@dms/vehicles-core';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RightToErasureDialogProps {
  open: boolean;
  customer: Customer;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RightToErasureDialog({
  open,
  customer,
  onClose,
}: RightToErasureDialogProps) {
  const { user } = useStaffAuth();
  const forceRevoke = useVehiclesStore((s) => s.forceRevoke);
  const logErasure = useCustomersStore((s) => s.logErasure);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);

  function handleConfirm() {
    if (!user) return;
    const actor = { id: user.id, name: user.name, role: user.role };
    const now = new Date().toISOString();

    // Force-revoke all effectively active/grace ownership rows for this customer
    const ids = ownershipIdByCustomer[customer.id] ?? [];
    for (const id of ids) {
      const row = ownerships[id];
      if (!row) continue;
      const es = effectiveState(row, now, 0);
      if (es === 'ACTIVE' || es === 'ACTIVE_JOINT' || es === 'GRACE') {
        forceRevoke(id, 'ERASURE_REQUEST', actor);
      }
    }

    // Log erasure + redact profile
    logErasure(customer.id, actor);
    onClose();
  }

  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Right to Erasure — Permanent Data Deletion"
      description={`This will permanently delete all personal data for ${customer.name}. All active ownerships will be force-revoked. This action cannot be undone.`}
      confirmLabel="Delete all data"
      cancelLabel="Cancel"
      destructive
      requireTypeToConfirm={customer.email}
      onConfirm={handleConfirm}
    />
  );
}
