/**
 * Settings hub — SPEC-SETTINGS-001 §6.1
 * L15: Gated at R12+ at the route level.
 */

import { SettingsHubView } from '@/src/components/settings/settings-hub-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

export default function SettingsPage() {
  return (
    <>
      <SettingsStoreHydrator />
      <SettingsHubView />
    </>
  );
}
