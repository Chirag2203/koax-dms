/**
 * Vendor slice — create, update, deactivate vendors.
 *
 * L11: Vendor management is R12+ (create/edit/deactivate).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §8, L11
 */

import { InsufficientRoleError } from '@dms/types';
import type { CustomBuildVendor } from '@dms/types';
import { hasRank } from '../../state-machine';
import type { VendorActions, CustomBuildsSlice } from '../types';
import { makeVendorId, nowIso } from '../id-helpers';

export const createVendorSlice: CustomBuildsSlice<VendorActions> = (set, get) => ({
  createVendor(input, actor) {
    if (!hasRank(actor.role, 'R12')) {
      throw new InsufficientRoleError('R12', actor.role);
    }

    const vendor: CustomBuildVendor = {
      ...input,
      id: makeVendorId(),
    };

    set((state) => {
      state.vendors.push(vendor);
    });

    return vendor;
  },

  updateVendor(id, patch, actor) {
    if (!hasRank(actor.role, 'R12')) {
      throw new InsufficientRoleError('R12', actor.role);
    }

    set((state) => {
      const v = state.vendors.find((x) => x.id === id);
      if (!v) return;
      Object.assign(v, patch);
    });
  },

  deactivateVendor(id, actor) {
    if (!hasRank(actor.role, 'R12')) {
      throw new InsufficientRoleError('R12', actor.role);
    }

    set((state) => {
      const v = state.vendors.find((x) => x.id === id);
      if (!v) return;
      v.active = false;
    });

    void get; // suppress unused warning
  },
});
