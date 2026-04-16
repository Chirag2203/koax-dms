'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@dms/ui';
import { StateChip } from '@/src/components/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryRow {
  vin: string;
  maskedVin: string;
  make: string;
  model: string;
  status: 'listed' | 'reserved' | 'in-refurb' | 'stale' | 'sold' | 'draft' | 'pending';
  days: number;
  price: number;
  imageUrl?: string;
}

export interface InventorySnapshotPanelProps {
  rows: InventoryRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

function daysColor(days: number): string {
  if (days < 30) return 'text-[rgb(var(--state-listed))]';
  if (days < 60) return 'text-[rgb(var(--state-pending))]';
  return 'text-[rgb(var(--state-overdue))]';
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Ageing bar ───────────────────────────────────────────────────────────────

function AgeingBar({ rows }: { rows: InventoryRow[] }) {
  const bands = [
    { label: '0–30d', min: 0, max: 30, color: 'bg-[rgb(var(--state-listed))]' },
    { label: '30–60d', min: 30, max: 60, color: 'bg-[rgb(var(--state-pending))]' },
    { label: '60–90d', min: 60, max: 90, color: 'bg-[rgb(var(--state-reserved))]' },
    { label: '90d+', min: 90, max: Infinity, color: 'bg-[rgb(var(--state-overdue))]' },
  ];

  const total = rows.length || 1;
  const counts = bands.map((b) => ({
    ...b,
    count: rows.filter((r) => r.days >= b.min && r.days < b.max).length,
  }));

  return (
    <div className="mt-3 pt-3 border-t border-[rgb(var(--line))]">
      <span className="text-[10px] uppercase tracking-widest text-ink-muted font-medium">
        Ageing distribution
      </span>
      <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
        {counts.map((b) =>
          b.count > 0 ? (
            <div
              key={b.label}
              className={cn('h-full transition-all', b.color)}
              style={{ width: `${(b.count / total) * 100}%` }}
              title={`${b.label}: ${b.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {counts.map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', b.color)} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventorySnapshotPanel({ rows }: InventorySnapshotPanelProps) {
  return (
    <div className="bg-bg-surface border border-[rgb(var(--line))] rounded-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--line))]">
        <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary">
          Inventory
        </h2>
        <Link
          href="/inventory"
          className="text-xs text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-hover))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] rounded"
        >
          View all →
        </Link>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--line))]">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.06em] font-medium text-ink-muted w-12">
                &nbsp;
              </th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.06em] font-medium text-ink-muted">
                Vehicle
              </th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.06em] font-medium text-ink-muted">
                Status
              </th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.06em] font-medium text-ink-muted">
                Days
              </th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.06em] font-medium text-ink-muted">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.vin}
                className={cn(
                  'hover:bg-bg-hover transition-colors',
                  idx % 2 === 1 && 'bg-bg-subtle',
                )}
              >
                {/* Photo */}
                <td className="px-3 py-2">
                  <div className="relative h-9 w-12 overflow-hidden rounded bg-bg-subtle flex-shrink-0">
                    {row.imageUrl ? (
                      <Image
                        src={row.imageUrl}
                        alt={`${row.make} ${row.model}`}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-[10px] text-ink-muted font-mono">
                          {row.make.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* VIN + Make/Model */}
                <td className="px-3 py-2">
                  <div className="font-medium text-[13px] text-ink-primary leading-tight">
                    {row.make} {row.model}
                  </div>
                  <div className="font-mono text-[11px] text-ink-muted mt-0.5">
                    {maskVin(row.vin)}
                  </div>
                </td>

                {/* Status chip */}
                <td className="px-3 py-2">
                  <StateChip status={row.status as Parameters<typeof StateChip>[0]['status']} />
                </td>

                {/* Days */}
                <td className={cn('px-3 py-2 text-right font-mono text-[12px]', daysColor(row.days))}>
                  {row.days}
                </td>

                {/* Price */}
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[12px] text-ink-primary">
                  {formatINR(row.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ageing bar */}
      <div className="px-4 pb-3">
        <AgeingBar rows={rows} />
      </div>
    </div>
  );
}
