'use client';

import Link from 'next/link';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BaySlot {
  id: number;
  occupied: boolean;
  abbrev?: string;
  statusColor?: string;
}

interface Appointment {
  time: string;
  description: string;
  vehicle: string;
  person: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BAY_SLOTS: BaySlot[] = [
  { id: 1, occupied: true, abbrev: 'PAN', statusColor: 'border-t-[rgb(var(--state-listed))]' },
  { id: 2, occupied: true, abbrev: 'X5', statusColor: 'border-t-[rgb(var(--state-pending))]' },
  { id: 3, occupied: true, abbrev: 'GLE', statusColor: 'border-t-[rgb(var(--state-refurb))]' },
  { id: 4, occupied: false },
  { id: 5, occupied: true, abbrev: 'RS7', statusColor: 'border-t-[rgb(var(--state-listed))]' },
  { id: 6, occupied: true, abbrev: 'Q8', statusColor: 'border-t-[rgb(var(--state-overdue))]' },
  { id: 7, occupied: false },
  { id: 8, occupied: false },
];

const APPOINTMENTS: Appointment[] = [
  {
    time: '10:00',
    description: 'Annual service',
    vehicle: 'Audi RS e-tron GT',
    person: 'Arjun M.',
  },
  {
    time: '11:30',
    description: 'Pre-delivery inspection',
    vehicle: 'Range Rover',
    person: 'Priya K.',
  },
  {
    time: '14:00',
    description: 'Body shop',
    vehicle: 'BMW 7 Series',
    person: 'Walk-in',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceBayPanel() {
  return (
    <div className="bg-bg-surface border border-[rgb(var(--line))] rounded-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--line))]">
        <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary">
          Service
        </h2>
        <Link
          href="/service"
          className="text-xs text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-hover))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] rounded"
        >
          View all →
        </Link>
      </div>

      {/* Bay grid 4x2 */}
      <div className="px-4 pt-3">
        <span className="text-[10px] uppercase tracking-widest text-ink-muted font-medium">
          Bay status
        </span>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {BAY_SLOTS.map((bay) =>
            bay.occupied ? (
              <div
                key={bay.id}
                className={cn(
                  'aspect-square rounded border border-[rgb(var(--line-strong))] border-t-2 bg-bg-subtle',
                  'flex items-center justify-center',
                  bay.statusColor,
                )}
                title={`Bay ${bay.id} — ${bay.abbrev}`}
              >
                <span className="font-mono text-[11px] font-medium text-ink-primary">
                  {bay.abbrev}
                </span>
              </div>
            ) : (
              <div
                key={bay.id}
                className="aspect-square rounded border border-dashed border-[rgb(var(--line-strong))] flex items-center justify-center"
                title={`Bay ${bay.id} — Empty`}
              >
                <span className="text-[9px] text-ink-muted uppercase tracking-wide">
                  Empty
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="px-4 pt-3 pb-3 mt-2 border-t border-[rgb(var(--line))]">
        <span className="text-[10px] uppercase tracking-widest text-ink-muted font-medium">
          Today's appointments
        </span>
        <ul className="mt-2 flex flex-col gap-2">
          {APPOINTMENTS.map((appt) => (
            <li
              key={appt.time}
              className="flex items-start gap-2 text-[12px]"
            >
              <span className="font-mono tabular-nums text-ink-muted shrink-0 w-10">
                {appt.time}
              </span>
              <span className="text-ink-secondary leading-tight">
                {appt.description}{' '}
                <span className="text-ink-primary">{appt.vehicle}</span>
                {' '}&middot;{' '}
                <span className="text-ink-muted">{appt.person}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
