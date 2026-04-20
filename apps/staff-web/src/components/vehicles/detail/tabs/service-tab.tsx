'use client';

import { useMemo } from 'react';
import { cn } from '@dms/ui';
import { useServiceStore } from '@/src/lib/service/service-store';
import type { VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceTabProps {
  vehicle: VehicleMaster;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceTab({ vehicle }: ServiceTabProps) {
  const jobCards = useServiceStore((s) => s.jobCards);

  const vinCards = useMemo(() => {
    return jobCards.filter((jc) => jc.vin === vehicle.vin);
  }, [jobCards, vehicle.vin]);

  if (vinCards.length === 0) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
        <p className="text-sm text-ink-muted">No service records for this vehicle.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-sm font-semibold text-ink-primary">
            Service Records ({vinCards.length})
          </h3>
        </div>
        <div className="divide-y divide-line">
          {vinCards.map((jc) => (
            <div key={jc.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink-primary font-mono">{jc.jobNo}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {new Date(jc.receivedAt).toLocaleDateString('en-IN')} · {jc.status}
                </p>
              </div>
              <a
                href={`/service/jobcards/${jc.id}`}
                className={cn(
                  'text-xs text-accent hover:underline shrink-0',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                )}
              >
                View JC
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
