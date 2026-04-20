'use client';

import { Shield } from 'lucide-react';
import type { Customer } from '@dms/types';

export interface CustomerConsentsTabProps {
  customer: Customer;
}

export function CustomerConsentsTab({ customer: _customer }: CustomerConsentsTabProps) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
      <div className="flex justify-center mb-3">
        <Shield className="h-8 w-8 text-ink-muted" aria-hidden="true" />
      </div>
      <p className="text-sm text-ink-muted font-medium">Consent log (DPDP Act 2023)</p>
      <p className="text-xs text-ink-muted mt-2">
        Read-only in P2. Consent capture (per DPDP purpose limitation) ships in P5
        alongside the customer portal eKYC integration.
      </p>
    </div>
  );
}
