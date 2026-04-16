import * as React from 'react';
import Image from 'next/image';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnershipCostCardProps {
  vehicle: Vehicle;
  className?: string;
}

interface OwnershipCosts {
  service: number;
  tyres: number;
  insurance: number;
}

// ─── Cost lookup ─────────────────────────────────────────────────────────────

const OWNERSHIP_COSTS: Record<string, OwnershipCosts> = {
  Porsche: { service: 145000, tyres: 280000, insurance: 310000 },
  'Mercedes-Benz': { service: 95000, tyres: 180000, insurance: 250000 },
  BMW: { service: 85000, tyres: 160000, insurance: 220000 },
  Audi: { service: 80000, tyres: 150000, insurance: 200000 },
  'Land Rover': { service: 110000, tyres: 200000, insurance: 280000 },
  Jaguar: { service: 100000, tyres: 190000, insurance: 260000 },
  Volvo: { service: 65000, tyres: 120000, insurance: 180000 },
};

const DEFAULT_COSTS: OwnershipCosts = {
  service: 80000,
  tyres: 140000,
  insurance: 190000,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CostLineProps {
  label: string;
  value: number;
  isTotal?: boolean;
}

function CostLine({ label, value, isTotal = false }: CostLineProps) {
  if (isTotal) {
    return (
      <div className="flex justify-between items-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted font-semibold">
          Estimated Yearly Total
        </span>
        <span className="font-display text-2xl text-accent tabular-nums">
          {formatINR(value)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <span className="font-mono text-sm text-ink-primary tabular-nums">
        {formatINR(value)}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipCostCard({ vehicle, className }: OwnershipCostCardProps) {
  const costs = OWNERSHIP_COSTS[vehicle.make] ?? DEFAULT_COSTS;
  const yearlyTotal = costs.service + costs.tyres + costs.insurance;

  return (
    <section
      className={cn(
        'bg-bg-paper py-16 md:py-24 px-6 md:px-12 lg:px-24',
        className,
      )}
      aria-labelledby="ownership-economics-heading"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Left column */}
          <div className="flex-1 w-full">
            <h2
              id="ownership-economics-heading"
              className="font-display text-3xl md:text-[48px] tracking-[-0.04em] mb-4 md:mb-6 text-ink-primary"
            >
              Ownership Economics
            </h2>
            <p className="text-ink-secondary mb-6 md:mb-8 leading-relaxed">
              Transparency is the core of our service. Understand the true cost
              of maintaining this vehicle.
            </p>

            {/* Cost card */}
            <div className="bg-bg-elevated p-6 md:p-8 rounded-sm border border-line shadow-sm">
              <CostLine label="Annual Service Estimate" value={costs.service} />
              <CostLine label="Tyre Replacement (Full Set)" value={costs.tyres} />
              <CostLine label="Comprehensive Insurance" value={costs.insurance} />

              <div className="border-t border-line pt-4 mt-4">
                <CostLine
                  label="Estimated Yearly Total"
                  value={yearlyTotal}
                  isTotal
                />
              </div>

              <p className="font-mono text-[10px] text-ink-muted mt-4 leading-relaxed">
                Estimates based on {vehicle.make} authorised service schedule.
                Actual costs vary by usage, age, and location.
              </p>
            </div>
          </div>

          {/* Right column — workshop image */}
          <div className="flex-1 w-full">
            <div className="rounded-sm overflow-hidden h-[300px] md:h-[400px] relative">
              <Image
                src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80"
                alt="Clean workshop interior — precision service environment"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
