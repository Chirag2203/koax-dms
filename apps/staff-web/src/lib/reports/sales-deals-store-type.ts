/**
 * Minimal SalesDealsStore type for reports selectors.
 * Spec reference: SPEC-REPORTS-001 §6.1
 */

import type { Deal } from '@dms/types';

export interface SalesDealsStore {
  deals: Record<string, Deal>;
}
