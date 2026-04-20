'use client';

/**
 * AddCarModeChooser — Step 1 of the /inventory/new Add Car flow.
 *
 * Shows two large option cards:
 *   - "Existing BN vehicle" → vehicle already in our lifetime ledger
 *   - "New to BN"           → first time this VIN touches BN; full intake form
 *
 * Mode is persisted in the URL via ?mode=existing | ?mode=new so the browser
 * back-button returns to the chooser without re-mounting the outer page.
 *
 * PLAN-VEHICLES-002 §C — Part 2, Step 1
 */

import { cn } from '@dms/ui';
import { Car, PlusCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddCarMode = 'existing' | 'new';

export interface AddCarModeChooserProps {
  onSelect: (mode: AddCarMode) => void;
}

// ─── Mode cards config ────────────────────────────────────────────────────────

interface ModeCard {
  mode: AddCarMode;
  icon: React.ElementType;
  title: string;
  description: string;
}

const MODES: ModeCard[] = [
  {
    mode: 'existing',
    icon: Car,
    title: 'Existing BN vehicle',
    description:
      'This VIN is already in our lifetime ledger. Pick it from the list and add sale-floor details.',
  },
  {
    mode: 'new',
    icon: PlusCircle,
    title: 'New to BN',
    description:
      'First time this vehicle touches BN. Capture owner details, vehicle specs, and sale-floor pricing in one go.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AddCarModeChooser({ onSelect }: AddCarModeChooserProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
      {/* Page header — matches the canonical detail-page shell used across staff-web. */}
      <div className="border-b border-line pb-5 mb-8">
        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
          Add a car to Sale Inventory
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Choose how this vehicle is coming onto the sale floor.
        </p>
      </div>

      {/* Option cards — left-aligned within the 1440px container. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px]">
        {MODES.map(({ mode, icon: Icon, title, description }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className={cn(
              'flex flex-col text-left gap-4 rounded-md border border-line',
              'bg-bg-surface p-6 cursor-pointer',
              'hover:border-accent hover:bg-accent/5 hover:shadow-sm',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10">
              <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-ink-primary mb-1.5">
                {title}
              </span>
              <span className="block text-[13px] text-ink-secondary leading-relaxed">
                {description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
