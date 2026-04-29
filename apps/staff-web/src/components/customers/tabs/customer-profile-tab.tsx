'use client';

import { Lock } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { maskedContactFor } from '@dms/vehicles-core';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import { ConfidentialToggle } from './confidential-toggle';
import type { Customer, CustomerLifecycleStage, CustomerSegment } from '@dms/types';

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

// Lifecycle chip — PROSPECT=blue(pending), ACTIVE=green(listed), DORMANT=amber(overdue), CHURNED=grey(stale)
const LIFECYCLE_CHIP: Record<CustomerLifecycleStage, string> = {
  PROSPECT: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  ACTIVE: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  DORMANT: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  CHURNED: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
};

// Segment chip — ULTRA_HNW=cpo(gold), PREMIER=reserved(purple-ish), STANDARD=grey(stale)
const SEGMENT_CHIP: Record<CustomerSegment, string> = {
  ULTRA_HNW: 'bg-[rgb(var(--state-cpo)/0.1)] text-[rgb(var(--state-cpo))]',
  PREMIER: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  STANDARD: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
};

function InlineChip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-widest',
        className,
      )}
    >
      {label}
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

          {/* Lifecycle */}
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Lifecycle</dt>
            <dd className="text-sm text-ink-primary mt-0.5">
              {customer.lifecycleStage ? (
                <InlineChip
                  label={customer.lifecycleStage}
                  className={LIFECYCLE_CHIP[customer.lifecycleStage]}
                />
              ) : (
                '—'
              )}
            </dd>
          </div>

          {/* Segment */}
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Segment</dt>
            <dd className="text-sm text-ink-primary mt-0.5">
              {customer.segment ? (
                <InlineChip
                  label={customer.segment.replace('_', ' ')}
                  className={SEGMENT_CHIP[customer.segment]}
                />
              ) : (
                '—'
              )}
            </dd>
          </div>

          {/* Aadhaar */}
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wider">Aadhaar</dt>
            <dd className="text-sm text-ink-primary mt-0.5 flex items-center gap-1">
              {customer.aadhaarLast4 ? (
                <span className="font-mono">XXXX-XXXX-{customer.aadhaarLast4}</span>
              ) : (
                <>
                  <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                  <span className="text-ink-muted">Not on file</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
