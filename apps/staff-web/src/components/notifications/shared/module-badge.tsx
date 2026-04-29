/**
 * ModuleBadge — source module identifier chip.
 * SPEC-NOTIFICATIONS-001 §6.1
 * SPEC-ARCH-UI-001 §3.12
 */

'use client';

import type { NotificationModule } from '@dms/types';

interface ModuleBadgeProps {
  module: NotificationModule;
}

const MODULE_CONFIG: Record<
  NotificationModule,
  { label: string; chip: string }
> = {
  INSURANCE: {
    label: 'Insurance',
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
  },
  SERVICE_BOOKING: {
    label: 'Service',
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
  },
  CUSTOM_BUILDS: {
    label: 'Builds',
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
  },
  CUSTOMERS: {
    label: 'Customers',
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
  },
  STAFF: {
    label: 'Staff',
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
  },
  SALES: {
    label: 'Sales',
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
  },
};

export function ModuleBadge({ module }: ModuleBadgeProps) {
  const config = MODULE_CONFIG[module];

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${config.chip}`}
    >
      {config.label}
    </span>
  );
}
