'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import {
  selectVisibleVehicles,
} from '@/src/lib/portal/portal-vehicle-adapter';
import { OwnedVehiclesGrid } from '@/src/components/portal/vehicles/owned-vehicles-grid';
import {
  jobCards,
  warrantyClaims,
  ownershipRows,
  vehicleModuleCustomers,
} from '@dms/mocks/fixtures';

// ─── Staff directory stub ─────────────────────────────────────────────────────

const STAFF_DIRECTORY = {
  'staff-r09-001': { status: 'active' as const, displayName: 'Priya Sharma' },
  'staff-r09-002': { status: 'active' as const, displayName: 'Rajesh Kumar' },
  'staff-r09-003': { status: 'active' as const, displayName: 'Deepa Nair' },
};

// Customer name map (first name + last name only — for joint peer display)
const CUSTOMER_NAME_MAP: Record<string, string> = Object.fromEntries(
  vehicleModuleCustomers.map((c) => [c.id, c.name]),
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const t = useTranslations('portal.vehicles');
  const { customerId } = usePortalAuth();
  const store = usePortalVehiclesStore();

  // Ensure store is hydrated (hydrator is in layout, but guard here too)
  React.useEffect(() => {
    store.hydrate();
  }, [store]);

  const now = new Date().toISOString();

  const vehicles = React.useMemo(() => {
    if (!store.hydrated) return [];
    return selectVisibleVehicles(
      store,
      customerId,
      now,
      jobCards,
      warrantyClaims,
      ownershipRows,
      STAFF_DIRECTORY,
      CUSTOMER_NAME_MAP,
    );
  }, [store, store.hydrated, customerId, now]);

  const claims = store.selectClaimsByCustomer(customerId);
  const hasClaims = claims.length > 0;

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="px-6 md:px-12 lg:px-16 pt-10 pb-8 border-b border-line">
        <h1 className="font-display text-3xl md:text-4xl text-ink-primary leading-tight mb-2">
          {t('title')}
        </h1>
        <p className="text-sm text-ink-secondary max-w-xl">{t('subtitle')}</p>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 lg:px-16 py-10">
        {!store.hydrated ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {t('loading')}
            </p>
          </div>
        ) : (
          <OwnedVehiclesGrid vehicles={vehicles} hasClaims={hasClaims} />
        )}
      </div>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
