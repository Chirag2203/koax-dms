'use client';

import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerProfileTabProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerProfileTab({ customer }: CustomerProfileTabProps) {
  const fields = [
    { label: 'Full Name', value: customer.name },
    { label: 'Email', value: customer.email },
    { label: 'Phone', value: customer.phone },
    { label: 'City', value: customer.preferredCity },
    { label: 'Language', value: customer.preferredLanguage },
    { label: 'Member Since', value: new Date(customer.memberSince).toLocaleDateString('en-IN') },
    { label: 'PAN', value: customer.pan ? `${customer.pan.slice(0, 5)}XXXXX` : '—' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-line bg-bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink-primary mb-4">Profile Details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
              <dd className="text-sm text-ink-primary mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
