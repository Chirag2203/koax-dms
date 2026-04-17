/**
 * PartStockDistribution — per-outlet plain table (3 rows max).
 *
 * Not a DataTable (small fixed row set, no pagination/sort needed).
 * Spec reference: PLAN-PARTS-003 §9
 */

'use client';

import type { Part } from '@dms/types';
import { StateChip, OutletPill } from '@/src/components/primitives';
import {
  OUTLET_ORDER,
  outletIdToCode,
  stockStatusFor,
  stockStatusToChip,
} from '../helpers';

export interface PartStockDistributionProps {
  part: Part;
}

export function PartStockDistribution({ part }: PartStockDistributionProps) {
  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Stock Distribution
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] text-left border-collapse">
          <thead>
            <tr className="bg-bg-subtle border-b border-line">
              <Th>Outlet</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Reorder Level</Th>
              <Th>Location</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {OUTLET_ORDER.map((outletId) => {
              const row = part.stock.find((s) => s.outletId === outletId);
              // Evaluate status scoped to this single outlet row
              const status = stockStatusFor(part, outletId);
              return (
                <tr
                  key={outletId}
                  className="h-11 border-b border-line last:border-b-0"
                >
                  <Td>
                    <OutletPill outlet={outletIdToCode(outletId)} />
                  </Td>
                  <Td className="font-mono tabular-nums text-right text-ink-primary">
                    {row ? row.qty : 0}
                  </Td>
                  <Td className="font-mono tabular-nums text-right text-ink-secondary">
                    {row ? row.reorderLevel : '—'}
                  </Td>
                  <Td className="font-mono text-ink-secondary">
                    {row?.location ?? '—'}
                  </Td>
                  <Td>
                    <StateChip status={stockStatusToChip(status)} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-ink-muted font-medium ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 ${className}`}>{children}</td>;
}
