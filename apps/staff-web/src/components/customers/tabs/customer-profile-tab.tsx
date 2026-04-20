'use client';

import { Lock } from 'lucide-react';
import { Gate } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { maskedContactFor } from '@dms/vehicles-core';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import { ConfidentialToggle } from './confidential-toggle';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerProfileTabProps {
  customer: Customer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Inline lock affordance — shows next to a masked field. */
function MaskedBadge() {
  return (
    <span
      title="Confidential — full contact requires R19+ access"
      className="inline-flex items-center ml-1 align-middle"
    >
      <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerProfileTab({ customer }: CustomerProfileTabProps) {
  const { user } = useStaffAuth();
  const viewerRank = ROLE_RANK[user?.role ?? ''] ?? 0;
  const contact = maskedContactFor(customer, viewerRank);

  const fields = [
    { label: 'Full Name', value: customer.name, masked: false },
    {
      label: 'Email',
      value: contact.email || '—',
      masked: contact.isMasked && !!customer.email,
    },
    {
      label: 'Phone',
      value: contact.phone || '—',
      masked: contact.isMasked && !!customer.phone,
    },
    { label: 'City', value: customer.preferredCity, masked: false },
    { label: 'Language', value: customer.preferredLanguage, masked: false },
    { label: 'Member Since', value: new Date(customer.memberSince).toLocaleDateString('en-IN'), masked: false },
    { label: 'PAN', value: customer.pan ? `${customer.pan.slice(0, 5)}XXXXX` : '—', masked: false },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Confidentiality toggle — R19+ only */}
      <Gate role={['R19', 'R22', 'R24']} fallback="hide">
        <ConfidentialToggle customer={customer} />
      </Gate>

      <div className="rounded-md border border-line bg-bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink-primary mb-4">Profile Details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {fields.map(({ label, value, masked }) => (
            <div key={label}>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
              <dd className="text-sm text-ink-primary mt-0.5 flex items-center">
                {value}
                {masked && <MaskedBadge />}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
