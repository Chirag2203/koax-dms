'use client';

import { useState } from 'react';
import { Download, Trash2, Lock } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { maskedContactFor } from '@dms/vehicles-core';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import type { Customer } from '@dms/types';
import { RightToErasureDialog } from './dialogs/right-to-erasure-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer360HeaderProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Customer360Header({ customer }: Customer360HeaderProps) {
  const [erasureOpen, setErasureOpen] = useState(false);
  const { user } = useStaffAuth();
  const logAuditExport = useCustomersStore((s) => s.logAuditExport);

  const viewerRank = ROLE_RANK[user?.role ?? ''] ?? 0;
  const contact = maskedContactFor(customer, viewerRank);

  function handleExport() {
    if (!user) return;
    logAuditExport(customer.id, { target: 'C360_PDF' }, { id: user.id, name: user.name });
    // In P2: just log the intent; actual PDF generation ships in P5
    alert('PDF export logged. Generation ships in P5.');
  }

  const isRedacted = customer.name === '[Redacted]';

  return (
    <>
      <div className="mb-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-muted mb-4">
          <a href="/customers" className="hover:text-ink-primary transition-colors">Customers</a>
          <span aria-hidden="true">›</span>
          <span className={cn(isRedacted && 'italic')}>{customer.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center font-mono text-xl font-medium text-white">
              {isRedacted ? '?' : customer.avatar}
            </div>
            <div>
              <h1 className={cn('text-[28px] font-semibold leading-[1.25] text-ink-primary', isRedacted && 'text-ink-muted italic')}>
                {customer.name}
              </h1>
              <div className="flex flex-col gap-0.5 mt-1 text-sm text-ink-muted">
                {!isRedacted && (
                  <>
                    <span className="flex items-center gap-1">
                      {contact.email || '—'}
                      {contact.isMasked && !!customer.email && (
                        <span title="Confidential — full contact requires R19+ access" className="inline-flex">
                          <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      {contact.phone || '—'}
                      {contact.isMasked && !!customer.phone && (
                        <span title="Confidential — full contact requires R19+ access" className="inline-flex">
                          <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                  </>
                )}
                <span className="capitalize">
                  {customer.preferredCity} · Member since {new Date(customer.memberSince).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line',
                'bg-bg-canvas text-sm text-ink-secondary hover:bg-bg-subtle transition-colors',
              )}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export PDF
            </button>

            <Gate role={['R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setErasureOpen(true)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3 rounded-md',
                  'border border-[rgb(var(--state-danger)/0.3)] text-[rgb(var(--state-danger))] text-sm',
                  'hover:bg-[rgb(var(--state-danger)/0.05)] transition-colors',
                )}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Erasure
              </button>
            </Gate>
          </div>
        </div>
      </div>

      <RightToErasureDialog
        open={erasureOpen}
        customer={customer}
        onClose={() => setErasureOpen(false)}
      />
    </>
  );
}
