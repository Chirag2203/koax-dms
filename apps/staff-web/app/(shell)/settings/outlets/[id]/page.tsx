/**
 * Outlet detail — SPEC-SETTINGS-001 §6.3
 * Dynamic route resolves [id] = 'blr' | 'mum' | 'che'
 * ?edit=1 query param opens the edit dialog directly.
 */

import { OutletDetailView } from '@/src/components/settings/outlets/outlet-detail-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

interface OutletDetailPageProps {
  params: { id: string };
  searchParams: { edit?: string };
}

export default function OutletDetailPage({ params, searchParams }: OutletDetailPageProps) {
  const defaultEdit = searchParams.edit === '1';
  return (
    <>
      <SettingsStoreHydrator />
      <OutletDetailView outletId={params.id} defaultEdit={defaultEdit} />
    </>
  );
}
