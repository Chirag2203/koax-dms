/**
 * Wizard Step 5 — Pick vendor (optional).
 *
 * Shows active vendors. Optional step — can skip.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 P1.1 Issue 6 Step 5
 */

'use client';

import { Check, Star } from 'lucide-react';
import { cn } from '@dms/ui';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import type { WizardData } from './new-build-wizard';

interface Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

export function WizardStepVendor({ data, onUpdate }: Props) {
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const activeVendors = vendors.filter((v) => v.active);

  const handleSelect = (id: string) => {
    onUpdate({ ...data, vendorId: data.vendorId === id ? '' : id });
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-primary">Assign Vendor <span className="text-[13px] text-ink-muted font-normal">(optional)</span></h2>
        <p className="text-[13px] text-ink-muted mt-0.5">Select the vendor who will perform this build. You can change this later.</p>
      </div>

      <div className="rounded-md border border-line divide-y divide-line max-h-96 overflow-y-auto">
        {/* None option */}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, vendorId: '' })}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
            !data.vendorId ? 'bg-accent/10' : 'hover:bg-bg-hover',
          )}
          aria-pressed={!data.vendorId}
        >
          <span className="text-[13px] text-ink-secondary italic">Skip — assign vendor later</span>
          {!data.vendorId && <Check size={15} className="text-accent ml-auto shrink-0" aria-hidden="true" />}
        </button>

        {activeVendors.map((vendor) => (
          <button
            key={vendor.id}
            type="button"
            onClick={() => handleSelect(vendor.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
              data.vendorId === vendor.id ? 'bg-accent/10' : 'hover:bg-bg-hover',
            )}
            aria-pressed={data.vendorId === vendor.id}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink-primary">{vendor.name}</p>
              <p className="text-[11px] text-ink-muted">{vendor.city} · {vendor.specialties.slice(0, 2).join(', ')}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map((i) => (
                  <Star
                    key={i}
                    size={9}
                    className={i <= Math.round(vendor.rating) ? 'text-[rgb(var(--state-in-refurb))] fill-current' : 'text-ink-muted'}
                    aria-hidden="true"
                  />
                ))}
                <span className="ml-1 font-mono text-[10px] text-ink-secondary">{vendor.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-[11px] text-ink-secondary tabular-nums">₹{(vendor.dayRate/1000).toFixed(1)}k/day</p>
              <p className="text-[10px] text-ink-muted">{vendor.onTimePct}% on-time</p>
            </div>
            {data.vendorId === vendor.id && (
              <Check size={15} className="text-accent shrink-0 ml-2" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
