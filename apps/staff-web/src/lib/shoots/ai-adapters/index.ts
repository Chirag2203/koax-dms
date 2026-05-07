/**
 * AI vendor adapter registry.
 *
 * Returns the correct AiVendorAdapter implementation for a given vendorId.
 * Call sites never instantiate adapters directly — always go through getAdapter().
 *
 * Spec reference: SPEC-SHOOTS-002 §11, L_AI-15
 * Plan reference: PLAN-SHOOTS-AI-002 §1.1
 */

import type { AiVendorAdapter } from './types';
import { noneAdapter } from './none-adapter';
import { mockSpyneAdapter } from './mock-spyne-adapter';

export { noneAdapter } from './none-adapter';
export { mockSpyneAdapter } from './mock-spyne-adapter';
export type { AiVendorAdapter, AiEnqueueRequest, AiPollResult } from './types';

type VendorId = 'NONE' | 'SPYNE_AI' | 'CUSTOM';

/**
 * Get the AiVendorAdapter for the given vendor.
 *
 * - NONE     → noneAdapter (pass-through, manual-only semantics)
 * - SPYNE_AI → mockSpyneAdapter (seeded RNG, shape-realistic mock; real network
 *              lands when L_AI-13 DPA is signed — see TODO in mock-spyne-adapter.ts)
 * - CUSTOM   → throws (placeholder slot, not yet wired)
 *
 * L_AI-15: production swap = register real Spyne adapter here.
 */
export function getAdapter(vendorId: VendorId): AiVendorAdapter {
  switch (vendorId) {
    case 'NONE':
      return noneAdapter;
    case 'SPYNE_AI':
      return mockSpyneAdapter;
    case 'CUSTOM':
      throw new Error(
        'CUSTOM AI adapter is not implemented. Register your adapter in ai-adapters/index.ts (L_AI-15).',
      );
    default: {
      // TypeScript exhaustive check
      const _exhaustive: never = vendorId;
      throw new Error(`Unknown AI vendor: ${String(_exhaustive)}`);
    }
  }
}
