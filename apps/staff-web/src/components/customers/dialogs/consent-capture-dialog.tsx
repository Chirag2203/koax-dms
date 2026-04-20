'use client';

/**
 * ConsentCaptureDialog — scaffolded P2. Not wired from UI unless dev flag active.
 * Per spec: button hidden unless a dev flag is enabled.
 *
 * Spec reference: SPEC-CUSTOMERS-001 §6 (deferred to v2)
 */

import { Dialog } from '@/src/components/primitives';
import type { Customer } from '@dms/types';

export interface ConsentCaptureDialogProps {
  open: boolean;
  customer: Customer;
  onClose: () => void;
}

export function ConsentCaptureDialog({
  open,
  onClose,
  customer,
}: ConsentCaptureDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Capture Consent"
      subtitle={customer.name}
      size="sm"
      footer={
        <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors">
          Close
        </button>
      }
    >
      <p className="text-sm text-ink-muted">
        Consent capture UI ships in P5 alongside Aadhaar eKYC integration
        and DPDP purpose-limitation flows. This dialog is scaffolded for P2
        but not wired to any action.
      </p>
    </Dialog>
  );
}
