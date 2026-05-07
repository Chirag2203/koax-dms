/**
 * noneAdapter — pass-through AI vendor adapter.
 *
 * Behaviour:
 *   enqueue: returns a stub vendorJobId immediately.
 *   poll:    immediately returns 'succeeded' with processedDataUrl = rawUrl.
 *            This maps to the existing P1-stub "manual-only" semantics in the
 *            store: no actual transformation is applied; the store sets
 *            processedUrl = rawUrl for manual-review approval.
 *
 * Used when Shoot.aiVendor === 'NONE'.
 *
 * Spec reference: SPEC-SHOOTS-002 §11, L_AI-15
 */

import type { AiVendorAdapter, AiEnqueueRequest, AiPollResult } from './types';

// Module-level map: vendorJobId → rawUrl (for poll pass-through)
const pendingJobs = new Map<string, string>();

function makeJobId(assetId: string): string {
  return `none-${assetId}-${Date.now()}`;
}

export const noneAdapter: AiVendorAdapter = {
  vendorId: 'NONE',

  async enqueue(req: AiEnqueueRequest) {
    const vendorJobId = makeJobId(req.assetId);
    // Store the rawUrl so poll can echo it back
    pendingJobs.set(vendorJobId, req.rawUrl);
    return { vendorJobId, status: 'accepted' };
  },

  async poll(vendorJobId: string): Promise<AiPollResult> {
    const rawUrl = pendingJobs.get(vendorJobId);
    if (!rawUrl) {
      // Job unknown — treat as failed (edge case: double-poll after result consumed)
      return {
        vendorJobId,
        status: 'failed',
        errorMessage: 'noneAdapter: unknown vendorJobId',
      };
    }
    // Clean up and return succeeded immediately
    pendingJobs.delete(vendorJobId);
    return {
      vendorJobId,
      status: 'succeeded',
      // Pass-through: processedDataUrl echoes rawUrl (manual-only semantics)
      processedDataUrl: rawUrl,
    };
  },
};
