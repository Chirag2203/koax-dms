'use client';

import { MessageSquare } from 'lucide-react';
import type { Customer } from '@dms/types';

export interface CustomerCommsTabProps {
  customer: Customer;
}

export function CustomerCommsTab({ customer: _customer }: CustomerCommsTabProps) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
      <div className="flex justify-center mb-3">
        <MessageSquare className="h-8 w-8 text-ink-muted" aria-hidden="true" />
      </div>
      <p className="text-sm text-ink-muted font-medium">Communications log</p>
      <p className="text-xs text-ink-muted mt-2">
        WhatsApp, SMS, and email history will appear here once DLT integration ships in P5.
      </p>
    </div>
  );
}
