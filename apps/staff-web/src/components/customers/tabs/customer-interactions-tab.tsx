'use client';

import { useMemo } from 'react';
import { Wrench, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { cn } from '@dms/ui';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerInteractionsTabProps {
  customer: Customer;
}

type InteractionRow =
  | { type: 'service'; date: string; id: string; label: string; subLabel: string; href: string }
  | { type: 'ownership'; date: string; id: string; label: string; subLabel: string; href: string }
  | { type: 'sale'; date: string; id: string; label: string; subLabel: string; href: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerInteractionsTab({ customer }: CustomerInteractionsTabProps) {
  const jobCards = useServiceStore((s) => s.jobCards);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);
  const events = useVehiclesStore((s) => s.events);

  // All ownership rows for this customer (any-time)
  const customerOwnerships = useMemo(() => {
    const ids = ownershipIdByCustomer[customer.id] ?? [];
    return ids.map((id) => ownerships[id]).filter((o): o is NonNullable<typeof o> => Boolean(o));
  }, [ownerships, ownershipIdByCustomer, customer.id]);

  // VINs owned by this customer (all-time) — used for JC lookup
  const customerVins = useMemo(() => {
    return new Set(customerOwnerships.map((o) => o.vin));
  }, [customerOwnerships]);

  // Ownership change events where this customer is actor or subject
  const ownershipEvents = useMemo(() => {
    return events.filter(
      (e) => e.actorId === customer.id ||
        customerOwnerships.some((o) => o.id === e.ownershipId),
    );
  }, [events, customer.id, customerOwnerships]);

  // Build chronological merged interaction rows
  const interactions = useMemo<InteractionRow[]>(() => {
    const rows: InteractionRow[] = [];

    // Service JCs — filter by direct customerId OR by VIN owned by this customer
    const jcs = jobCards.filter(
      (jc) => jc.customerId === customer.id || (jc.vin && customerVins.has(jc.vin)),
    );
    for (const jc of jcs) {
      rows.push({
        type: 'service',
        date: jc.receivedAt,
        id: jc.id,
        label: `Job Card ${jc.jobNo}`,
        subLabel: `${jc.vin ? jc.vin.slice(-6) : ''} · ${jc.status}`,
        href: `/service/jobcards/${jc.id}`,
      });
    }

    // Ownership open/close events
    for (const evt of ownershipEvents) {
      const ownRow = evt.ownershipId ? ownerships[evt.ownershipId] : undefined;
      const vinSuffix = ownRow?.vin.slice(-6) ?? '';
      rows.push({
        type: 'ownership',
        date: evt.at,
        id: evt.id,
        label: `Ownership ${evt.kind}`,
        subLabel: vinSuffix ? `VIN …${vinSuffix}` : 'Ownership event',
        href: ownRow ? `/vehicles/${ownRow.vin}` : '/vehicles',
      });
    }

    // Sales interactions stub — Sales module will integrate fully in v2
    // (salesOrders with buyerId === customer.id would go here)

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [jobCards, customer.id, customerVins, ownershipEvents, ownerships]);

  if (interactions.length === 0) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
        <p className="text-sm text-ink-muted">No interactions found for this customer.</p>
        <p className="text-xs text-ink-muted mt-2">
          Sales interactions will appear here when the Sales store ships in v2.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-sm font-semibold text-ink-primary">
            Interactions ({interactions.length})
          </h3>
        </div>
        <div className="divide-y divide-line">
          {interactions.map((row) => (
            <div key={row.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0',
                    row.type === 'service' && 'bg-[rgb(var(--state-progress)/0.15)]',
                    row.type === 'ownership' && 'bg-[rgb(var(--state-success)/0.12)]',
                    row.type === 'sale' && 'bg-[rgb(var(--state-info)/0.12)]',
                  )}
                >
                  {row.type === 'service' && (
                    <Wrench className="h-3 w-3 text-[rgb(var(--state-progress))]" aria-hidden="true" />
                  )}
                  {row.type === 'ownership' && (
                    <ShieldCheck className="h-3 w-3 text-[rgb(var(--state-success))]" aria-hidden="true" />
                  )}
                  {row.type === 'sale' && (
                    <ArrowRightLeft className="h-3 w-3 text-[rgb(var(--state-info))]" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-primary">{row.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {formatDate(row.date)} · {row.subLabel}
                  </p>
                </div>
              </div>
              <a
                href={row.href}
                className="text-xs text-accent hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                View
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
