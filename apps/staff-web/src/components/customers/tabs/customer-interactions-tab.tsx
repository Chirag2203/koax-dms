'use client';

import { useMemo } from 'react';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerInteractionsTabProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerInteractionsTab({ customer }: CustomerInteractionsTabProps) {
  const jobCards = useServiceStore((s) => s.jobCards);
  const ownerships = useVehiclesStore((s) => s.ownerships);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);

  // Find VINs owned by this customer (all-time)
  const customerVins = useMemo(() => {
    const ids = ownershipIdByCustomer[customer.id] ?? [];
    return new Set(ids.map((id) => ownerships[id]?.vin).filter(Boolean));
  }, [ownerships, ownershipIdByCustomer, customer.id]);

  // JCs for those VINs
  const relatedJcs = useMemo(() => {
    return jobCards
      .filter((jc) => jc.vin && customerVins.has(jc.vin))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }, [jobCards, customerVins]);

  if (relatedJcs.length === 0) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
        <p className="text-sm text-ink-muted">No service interactions found for this customer.</p>
        <p className="text-xs text-ink-muted mt-2">
          Sales interactions and communications will appear here in P3.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-sm font-semibold text-ink-primary">Service History ({relatedJcs.length})</h3>
        </div>
        <div className="divide-y divide-line">
          {relatedJcs.map((jc) => (
            <div key={jc.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-primary font-mono">{jc.jobNo}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {new Date(jc.receivedAt).toLocaleDateString('en-IN')} ·
                  {jc.vin && <span className="font-mono ml-1">{jc.vin.slice(-6)}</span>}
                  · {jc.status}
                </p>
              </div>
              <a href={`/service/jobcards/${jc.id}`} className="text-xs text-accent hover:underline shrink-0">
                View JC
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
