/**
 * Outlet list — SPEC-SETTINGS-001 §6.2
 * L1: Always 3 rows (BLR, MUM, CHE). No "Add Outlet" CTA.
 */

import { OutletListView } from '@/src/components/settings/outlets/outlet-list-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

export default function OutletsPage() {
  return (
    <>
      <SettingsStoreHydrator />
      <OutletListView />
    </>
  );
}
