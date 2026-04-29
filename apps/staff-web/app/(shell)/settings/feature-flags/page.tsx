/**
 * Feature flags — SPEC-SETTINGS-001 §6.7
 * L6: In-memory toggle only in v1.
 * L12: Reads exclusively from registry.
 * R02+ toggle; R12 read-only.
 */

import { FlagsListView } from '@/src/components/settings/feature-flags/flags-list-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

export default function FeatureFlagsPage() {
  return (
    <>
      <SettingsStoreHydrator />
      <FlagsListView />
    </>
  );
}
