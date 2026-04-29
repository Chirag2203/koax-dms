/**
 * Query slice — selectors for Build Jobs.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14.2
 */

import type { BuildJobStage } from '@dms/types';
import type { BuildJobQueryActions, CustomBuildsSlice } from '../types';

export const createQuerySlice: CustomBuildsSlice<BuildJobQueryActions> = (_set, get) => ({
  selectByCustomer(customerId) {
    return get().jobs.filter((j) => j.customerId === customerId);
  },

  selectByVin(vin) {
    return get().jobs.filter((j) => j.vin === vin);
  },

  selectByStage(stage: BuildJobStage) {
    return get().jobs.filter((j) => j.stage === stage);
  },
});
