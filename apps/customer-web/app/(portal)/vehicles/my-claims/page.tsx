'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import { MyClaimsList } from '@/src/components/portal/vehicles/my-claims-list';

export default function MyClaimsPage() {
  const t = useTranslations('portal.vehicles');
  const { customerId } = usePortalAuth();
  const store = usePortalVehiclesStore();

  React.useEffect(() => {
    store.hydrate();
  }, [store]);

  const claims = React.useMemo(
    () => store.selectClaimsByCustomer(customerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, store.hydrated, customerId],
  );

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="px-6 md:px-12 lg:px-16 pt-10 pb-8 border-b border-line">
        <h1 className="font-display text-3xl md:text-4xl text-ink-primary leading-tight mb-2">
          {t('myClaimsTitle')}
        </h1>
        <p className="text-sm text-ink-secondary max-w-xl">{t('myClaimsSubtitle')}</p>
      </div>

      {/* List */}
      <div className="px-6 md:px-12 lg:px-16 py-10">
        {!store.hydrated ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {t('loading')}
            </p>
          </div>
        ) : (
          <MyClaimsList claims={claims} />
        )}
      </div>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
