/**
 * RBAC Matrix — SPEC-SETTINGS-001 §6.4
 * L4: Read-only in v1. 24 roles × ~79 actions grouped by domain.
 */

import { RbacMatrixView } from '@/src/components/settings/rbac/rbac-matrix-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

export default function RbacMatrixPage() {
  return (
    <>
      <SettingsStoreHydrator />
      <RbacMatrixView />
    </>
  );
}
