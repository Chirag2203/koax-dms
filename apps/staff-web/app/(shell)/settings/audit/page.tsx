/**
 * Settings audit log — SPEC-SETTINGS-001 §6.8
 * L7: Every mutation produces a SettingsAuditEvent.
 * L14: 3-year retention. R12+ readable.
 */

import { SettingsAuditView } from '@/src/components/settings/audit/settings-audit-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

export default function SettingsAuditPage() {
  return (
    <>
      <SettingsStoreHydrator />
      <SettingsAuditView />
    </>
  );
}
