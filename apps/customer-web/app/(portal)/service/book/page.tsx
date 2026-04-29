'use client';

/**
 * /(portal)/service/book — Service booking wizard page.
 *
 * Entry point for the 5-step service booking flow.
 * Vehicle data is fetched from the portal vehicles store.
 * Service types are fetched from the shared fixture (@dms/mocks).
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §8.1, §21 P1
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import {
  selectVisibleVehicles,
} from '@/src/lib/portal/portal-vehicle-adapter';
import { ServiceBookingWizard } from '@/src/components/portal/service/booking-wizard';
import {
  serviceTypes,
  jobCards,
  warrantyClaims,
  ownershipRows,
  vehicleModuleCustomers,
} from '@dms/mocks/fixtures';

const STAFF_DIRECTORY = {
  'staff-r09-001': { status: 'active' as const, displayName: 'Priya Sharma' },
  'staff-r09-002': { status: 'active' as const, displayName: 'Rajesh Kumar' },
  'staff-r09-003': { status: 'active' as const, displayName: 'Deepa Nair' },
};

const CUSTOMER_NAME_MAP: Record<string, string> = Object.fromEntries(
  vehicleModuleCustomers.map((c) => [c.id, c.name]),
);

export default function ServiceBookPage() {
  const t = useTranslations('portal.serviceBooking.book');
  const { customerId } = usePortalAuth();
  const store = usePortalVehiclesStore();

  React.useEffect(() => {
    store.hydrate();
  }, [store]);

  const now = new Date().toISOString();

  const ownedVehicleViews = React.useMemo(() => {
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

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
          {t('title')}
        </h1>
        <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* Wizard */}
      <section className="px-6 md:px-12 lg:px-16 pb-16">
        {!store.hydrated ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
              Loading…
            </p>
          </div>
        ) : (
          <ServiceBookingWizard
            ownedVehicleViews={ownedVehicleViews}
            serviceTypes={serviceTypes}
          />
        )}
      </section>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
