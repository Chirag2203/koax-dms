'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, VinBadge, StateChip } from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import type { OwnershipClaim, Customer } from '@dms/types';
import { useCustomersStore } from '@/src/lib/customers/customers-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimsTableProps {
  claims: OwnershipClaim[];
  onReview: (claim: OwnershipClaim) => void;
}

// ─── Claim state → chip ───────────────────────────────────────────────────────

const CLAIM_CHIP: Record<string, StateChipStatus> = {
  PENDING: 'claim-pending',
  AUTO_APPROVED: 'claim-auto-approved',
  APPROVED: 'claim-approved',
  REJECTED: 'claim-rejected',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ClaimsTable({ claims, onReview }: ClaimsTableProps) {
  const customers = useCustomersStore((s) => s.customers);
  const nameOf = (id: string): string =>
    (customers as Record<string, Customer>)[id]?.name ?? id;
  const columns = useMemo<ColumnDef<OwnershipClaim>[]>(() => [
    {
      id: 'vin',
      header: 'VIN',
      accessorFn: (r) => r.vin,
      cell: ({ row }) => <VinBadge vin={row.original.vin} size="sm" />,
      size: 200,
    },
    {
      id: 'claimant',
      header: 'Claimant',
      accessorFn: (r) => nameOf(r.claimantCustomerId),
      cell: ({ row }) => (
        <span className="text-sm text-ink-primary">
          {nameOf(row.original.claimantCustomerId)}
        </span>
      ),
    },
    {
      id: 'submitted',
      header: 'Submitted',
      accessorFn: (r) => r.submittedAt,
      cell: ({ row }) => (
        <span className="text-sm text-ink-secondary font-mono tabular-nums">
          {new Date(row.original.submittedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'autoMatch',
      header: 'Auto-match',
      accessorFn: (r) => (r.autoMatchHit ? 'Yes' : 'No'),
      cell: ({ row }) => (
        <span className={`text-sm font-medium ${row.original.autoMatchHit ? 'text-[rgb(var(--state-listed))]' : 'text-ink-muted'}`}>
          {row.original.autoMatchHit ? 'Yes' : 'No'}
        </span>
      ),
      size: 100,
    },
    {
      id: 'state',
      header: 'State',
      accessorFn: (r) => r.state,
      cell: ({ row }) => (
        <StateChip status={CLAIM_CHIP[row.original.state] ?? 'claim-pending'} />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        row.original.state === 'PENDING' ? (
          <button
            type="button"
            onClick={() => onReview(row.original)}
            className="text-xs text-accent hover:underline focus-visible:outline-none"
          >
            Review
          </button>
        ) : null
      ),
      size: 80,
    },
  ], [onReview]);

  return (
    <DataTable
      columns={columns}
      data={claims}
      density="default"
      emptyState={<span className="text-sm text-ink-muted">No pending claims.</span>}
    />
  );
}
