'use client';

import { useState, useCallback } from 'react';
import { Download, Trash2, Lock } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { maskedContactFor } from '@dms/vehicles-core';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import { printC360Pdf } from '@/src/lib/customers/print-c360-pdf';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import type { Customer, CustomerLifecycleStage } from '@dms/types';
import { RightToErasureDialog } from './dialogs/right-to-erasure-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer360HeaderProps {
  customer: Customer;
}

// ─── Lifecycle chip inline ─────────────────────────────────────────────────────

const LIFECYCLE_CHIP: Record<CustomerLifecycleStage, string> = {
  PROSPECT: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  ACTIVE: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  DORMANT: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  CHURNED: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Customer360Header({ customer }: Customer360HeaderProps) {
  const [erasureOpen, setErasureOpen] = useState(false);
  const { user } = useStaffAuth();
  const logAuditExport = useCustomersStore((s) => s.logAuditExport);
  const consents = useCustomersStore((s) => s.consents);
  const { toasts, toast, dismiss } = useToast();

  // Quick-stats: count ownerships belonging to this customer
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const customerOwnershipIds = ownershipIdByCustomer[customer.id] ?? [];
  const totalVehicles = customerOwnershipIds.length;
  const activeVehicles = customerOwnershipIds.filter(
    (id) => ownerships[id]?.state === 'ACTIVE',
  ).length;

  const viewerRank = ROLE_RANK[user?.role ?? ''] ?? 0;
  const contact = maskedContactFor(customer, viewerRank);

  const handleExport = useCallback(() => {
    if (!user) return;
    const actor = { id: user.id, name: user.name, role: user.role ?? '' };

    // Build VIN rows from ownerships
    const vinRows = customerOwnershipIds.map((id) => {
      const o = ownerships[id];
      return o ? { vin: o.vin, state: o.state, kmAtOpen: o.kmAtOpen } : null;
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    // Build consent summary
    const consentSummary = Object.values(consents)
      .filter((e) => e.customerId === customer.id)
      .map((e) => ({
        purpose: e.purpose,
        active: !e.revokedAt,
        capturedAt: e.capturedAt,
      }));

    // Log the audit event first (even if print is blocked)
    logAuditExport(customer.id, { target: 'C360_PDF' }, actor);

    printC360Pdf(
      {
        customerName: customer.name,
        customerPhone: contact.phone || '—',
        customerId: customer.id,
        preferredCity: customer.preferredCity,
        memberSince: customer.memberSince,
        lifecycleStage: customer.lifecycleStage,
        segment: customer.segment,
        vinRows,
        consentSummary,
        actorName: actor.name,
        actorRole: actor.role,
      },
      () => {
        // Popup blocked
        toast('Allow popups for PDF export', 'warning');
      },
    );
  }, [user, customer, customerOwnershipIds, ownerships, consents, logAuditExport, contact.phone, toast]);

  const isRedacted = customer.name === '[Redacted]';

  return (
    <>
      <div className="mb-6">
        {/* Breadcrumb — spec §2: Staff › Customers › {name} */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-muted mb-4">
          <a href="/staff" className="hover:text-ink-primary transition-colors">Staff</a>
          <span aria-hidden="true">›</span>
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
              {/* Name + lifecycle chip */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={cn('text-[28px] font-semibold leading-[1.25] text-ink-primary', isRedacted && 'text-ink-muted italic')}>
                  {customer.name}
                </h1>
                {!isRedacted && customer.lifecycleStage && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5',
                      'font-mono text-[10px] uppercase tracking-widest',
                      LIFECYCLE_CHIP[customer.lifecycleStage],
                    )}
                  >
                    {customer.lifecycleStage}
                  </span>
                )}
              </div>

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

        {/* Quick-stats row — spec §7 */}
        <div className="mt-4 flex items-center gap-6 text-sm text-ink-muted">
          <span>
            <span className="font-semibold text-ink-primary">{totalVehicles}</span>
            {' '}vehicle{totalVehicles !== 1 ? 's' : ''} owned
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <span className="font-semibold text-ink-primary">{activeVehicles}</span>
            {' '}active
          </span>
        </div>
      </div>

      <RightToErasureDialog
        open={erasureOpen}
        customer={customer}
        onClose={() => setErasureOpen(false)}
      />

      {/* Toast for popup-blocker warning */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
