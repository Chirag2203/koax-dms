'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { maskedContactFor } from '@dms/vehicles-core';
import { ROLE_RANK } from '@/src/lib/vehicles/state-machine';
import type { Customer } from '@dms/types';
import { CustomerRowActions } from './customer-row-actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomersTableProps {
  customers: Customer[];
  vehicleCountByCustomer?: Record<string, number>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomersTable({
  customers,
  vehicleCountByCustomer = {},
}: CustomersTableProps) {
  const router = useRouter();
  const { user } = useStaffAuth();
  const viewerRank = ROLE_RANK[user?.role ?? ''] ?? 0;

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (r) => r.name,
      cell: ({ row }) => {
        const c = row.original;
        const contact = maskedContactFor(c, viewerRank);
        return (
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-accent/80 flex items-center justify-center font-mono text-[11px] font-medium text-white shrink-0">
              {c.avatar}
            </span>
            <div>
              <div className="text-sm font-medium text-ink-primary">{c.name}</div>
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                {contact.email || '—'}
                {contact.isMasked && !!c.email && (
                  <span title="Confidential — full contact requires R19+ access" className="inline-flex">
                    <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'phone',
      header: 'Phone',
      accessorFn: (r) => r.phone,
      cell: ({ row }) => {
        const c = row.original;
        const contact = maskedContactFor(c, viewerRank);
        return (
          <span className="flex items-center gap-1 text-sm font-mono text-ink-secondary">
            {contact.phone || '—'}
            {contact.isMasked && !!c.phone && (
              <span title="Confidential — full contact requires R19+ access" className="inline-flex">
                <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: 'city',
      header: 'City',
      accessorFn: (r) => r.preferredCity,
      cell: ({ row }) => (
        <span className="text-sm text-ink-secondary capitalize">{row.original.preferredCity}</span>
      ),
      size: 120,
    },
    {
      id: 'memberSince',
      header: 'Member Since',
      accessorFn: (r) => r.memberSince,
      cell: ({ row }) => (
        <span className="text-sm font-mono tabular-nums text-ink-secondary">
          {new Date(row.original.memberSince).getFullYear()}
        </span>
      ),
      size: 120,
    },
    {
      id: 'vehicles',
      header: 'Vehicles',
      accessorFn: (r) => vehicleCountByCustomer[r.id] ?? 0,
      cell: ({ row }) => {
        const count = vehicleCountByCustomer[row.original.id] ?? 0;
        return (
          <span className="text-sm font-mono tabular-nums text-ink-secondary">
            {count}
          </span>
        );
      },
      size: 90,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <CustomerRowActions
          customerId={row.original.id}
          onView={() => router.push(`/customers/${row.original.id}`)}
        />
      ),
      size: 60,
    },
  ], [router, vehicleCountByCustomer, viewerRank]);

  return (
    <DataTable
      columns={columns}
      data={customers}
      density="default"
      onRowClick={(c) => router.push(`/customers/${c.id}`)}
      emptyState={<span className="text-sm text-ink-muted">No customers match your filters.</span>}
    />
  );
}
