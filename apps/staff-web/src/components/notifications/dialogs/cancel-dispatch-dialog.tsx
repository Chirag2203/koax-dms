/**
 * CancelDispatchDialog — confirms cancellation of a queued dispatch.
 * SPEC-NOTIFICATIONS-001 L8, S-N-10
 * SPEC-ARCH-UI-001 §3.6 (AlertDialog)
 */

'use client';

import { AlertDialog } from '../../primitives/dialog';

interface CancelDispatchDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dispatchId: string;
}

export function CancelDispatchDialog({
  open,
  onClose,
  onConfirm,
  dispatchId,
}: CancelDispatchDialogProps) {
  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Cancel Dispatch?"
      description={`This will cancel dispatch ${dispatchId} before it is sent. Queued dispatches that have not yet reached the BSP can be cancelled. This action cannot be undone.`}
      confirmLabel="Cancel Dispatch"
      cancelLabel="Keep Queued"
      destructive
      onConfirm={onConfirm}
    />
  );
}
