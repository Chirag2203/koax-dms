/**
 * Insurance provider slice.
 *
 * Spec reference: SPEC-INSURANCE-001 §6 (getProviders action)
 */

import type { InsuranceProvider } from '@dms/types';
import type { InsuranceSlice, ProviderActions } from '../types';

export const createProviderSlice: InsuranceSlice<ProviderActions> = (_, get) => ({
  getProviders(): InsuranceProvider[] {
    return get().providers.filter((p) => p.active);
  },
});
