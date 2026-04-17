'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, Package, CreditCard, type LucideIcon } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertItem {
  id: string;
  icon: LucideIcon;
  text: string;
  chipLabel: string;
  chipClass: string;
  href: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALERT_ITEMS: AlertItem[] = [
  {
    id: 'alert-01',
    icon: AlertTriangle,
    text: '3 vehicles aged >90 days',
    chipLabel: 'Stale',
    chipClass: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
    href: '/inventory?ageing=90',
  },
  {
    id: 'alert-02',
    icon: Clock,
    text: 'TCS filing due 7 May',
    chipLabel: 'Overdue',
    chipClass: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
    href: '/finance?tab=tcs',
  },
  {
    id: 'alert-03',
    icon: Package,
    text: '2 GRNs pending approval',
    chipLabel: 'Pending',
    chipClass: 'bg-[rgb(var(--state-refurb)/0.1)] text-[rgb(var(--state-refurb))]',
    href: '/parts?tab=grn',
  },
  {
    id: 'alert-04',
    icon: CreditCard,
    text: 'Floor-plan interest allocation due',
    chipLabel: 'Pending',
    chipClass: 'bg-[rgb(var(--state-refurb)/0.1)] text-[rgb(var(--state-refurb))]',
    href: '/finance?tab=floor-plan',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertsTasksPanel() {
  return (
    <div className="bg-bg-surface border border-line rounded-md flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-line">
        <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary">
          Alerts &amp; tasks
        </h2>
      </div>

      {/* Alert list */}
      <ul className="flex-1 divide-y divide-line">
        {ALERT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  'hover:bg-bg-hover transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                )}
              >
                <Icon
                  size={16}
                  className="text-ink-muted shrink-0"
                  aria-hidden="true"
                />
                <span className="flex-1 text-[13px] text-ink-secondary leading-snug">
                  {item.text}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded px-2 py-0.5',
                    'font-mono text-[10px] uppercase tracking-widest shrink-0',
                    item.chipClass,
                  )}
                >
                  {item.chipLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
