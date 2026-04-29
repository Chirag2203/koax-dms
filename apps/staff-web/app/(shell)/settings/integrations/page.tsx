/**
 * Integrations overview — SPEC-SETTINGS-001 §6.5
 * R22+ or R02+ required.
 */

import { IntegrationsListView } from '@/src/components/settings/integrations/integrations-list-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

export default function IntegrationsPage() {
  return (
    <>
      <SettingsStoreHydrator />
      <IntegrationsListView />
    </>
  );
}
