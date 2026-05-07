/**
 * mockSpyneAdapter — shape-realistic Spyne.ai mock adapter.
 *
 * Behaviour:
 *   enqueue:
 *     - Returns a vendorJobId = first 12 chars of a deterministic polynomial
 *       hash of `${shootId}:${assetId}:${timestamp}`. No real SHA-1 dependency.
 *     - Stores the job in a module-level Map for poll() to consume.
 *
 *   poll:
 *     - First 2 calls for a given vendorJobId: return 'processing'.
 *       (Mock latency ≈ 3–4.5 s when polled every 1.5 s — L_AI-16.)
 *     - 3rd call: terminal status determined by aiPolicy.failureRate + seed.
 *       seed = polyHash(`${shootId}:${assetId}:${failureSeed}`)
 *       fails = (seed % 100) < failureRate (default 10 → 10%)
 *     - On success: processedDataUrl = rawUrl (mock; real Spyne would return
 *       an AI-processed image URL). A marker comment is appended in test env.
 *     - On fail:  errorMessage = 'Mock Spyne — simulated processing failure (seeded)'
 *
 * TODO: Real Spyne.ai network call lands when L_AI-13 DPA is signed.
 *       Replace enqueue/poll with real Spyne REST calls:
 *         POST https://api.spyne.ai/v2/enhance  → { jobId }
 *         GET  https://api.spyne.ai/v2/status/<jobId> → { status, imageUrl }
 *       This adapter file is the single swap point (L_AI-15).
 *
 * Spec reference: SPEC-SHOOTS-002 §11, L_AI-15, L_AI-16, L_AI-17
 * Plan reference: PLAN-SHOOTS-AI-002 §1.1, §1.2, §1.3
 */

import type { AiVendorAdapter, AiEnqueueRequest, AiPollResult } from './types';

// ─── Deterministic polynomial hash (no crypto dep) ───────────────────────────

/**
 * Fast, deterministic polynomial hash of a string.
 * Returns a non-negative 32-bit integer.
 * Used as a reproducible seed for mock failure injection (L_AI-17).
 */
function polyHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    // h = ((h << 5) + h) + charCode  (Dan Bernstein djb2 variant)
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; // >>> 0 keeps it uint32
  }
  return h;
}

// ─── vendorJobId builder ──────────────────────────────────────────────────────

function makeVendorJobId(shootId: string, assetId: string, timestamp: number): string {
  const raw = `${shootId}:${assetId}:${timestamp}`;
  const hash = polyHash(raw).toString(16).padStart(8, '0');
  // Prefix 'spyne-' + first 12 hex chars of hash (no real SHA-1 needed)
  const suffix = (hash + polyHash(hash + raw).toString(16).padStart(8, '0')).slice(0, 12);
  return `spyne-${suffix}`;
}

// ─── Job state ────────────────────────────────────────────────────────────────

interface PendingJob {
  vendorJobId: string;
  shootId: string;
  assetId: string;
  rawUrl: string;
  failureRate: number;
  failureSeed: number;
  pollCount: number;
}

// Module-level job map — persists across poll calls within one process lifetime.
// Tests clear this via mockSpyneAdapter.clearJobs() (test-only API).
const pendingJobs = new Map<string, PendingJob>();

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const mockSpyneAdapter: AiVendorAdapter & {
  /** Test-only: clear all pending jobs. */
  _clearJobs(): void;
} = {
  vendorId: 'SPYNE_AI',

  async enqueue(req: AiEnqueueRequest) {
    const vendorJobId = makeVendorJobId(req.shootId, req.assetId, Date.now());
    pendingJobs.set(vendorJobId, {
      vendorJobId,
      shootId: req.shootId,
      assetId: req.assetId,
      rawUrl: req.rawUrl,
      // failureRate + failureSeed are passed via AiEnqueueRequest extensions.
      // We default here; the caller (store action) passes them from shoot.aiPolicy.
      failureRate: 10,
      failureSeed: 0,
      pollCount: 0,
    });
    return { vendorJobId, status: 'accepted' };
  },

  async poll(vendorJobId: string): Promise<AiPollResult> {
    const job = pendingJobs.get(vendorJobId);

    if (!job) {
      // Unknown job — treat as failed (e.g. server restart between enqueue and poll)
      return {
        vendorJobId,
        status: 'failed',
        errorMessage: 'Mock Spyne — vendorJobId not found (server may have restarted)',
      };
    }

    job.pollCount += 1;

    // First 2 polls: processing (L_AI-16 mock latency ≈ 3–4.5 s at 1.5 s poll interval)
    if (job.pollCount < 3) {
      return { vendorJobId, status: 'processing' };
    }

    // 3rd poll: terminal — determine success/failure via seeded RNG (L_AI-17)
    const seed = polyHash(`${job.shootId}:${job.assetId}:${job.failureSeed}`);
    const fails = (seed % 100) < job.failureRate;

    // Clean up
    pendingJobs.delete(vendorJobId);

    if (fails) {
      return {
        vendorJobId,
        status: 'failed',
        errorMessage: 'Mock Spyne — simulated processing failure (seeded)',
      };
    }

    // Success: echo rawUrl as processedDataUrl
    // TODO (L_AI-13): when real Spyne is wired, this becomes the Spyne CDN URL
    // of the AI-processed image. For mock purposes rawUrl is echoed unchanged.
    return {
      vendorJobId,
      status: 'succeeded',
      processedDataUrl: job.rawUrl,
    };
  },

  _clearJobs() {
    pendingJobs.clear();
  },
};

/**
 * Enqueue with explicit aiPolicy fields — used by route handler (T04).
 * Mutates the pending job's failureRate and failureSeed after enqueue.
 */
export function enqueueWithPolicy(
  req: AiEnqueueRequest & { failureRate?: number; failureSeed?: number },
): Promise<{ vendorJobId: string; status: 'accepted' }> {
  return mockSpyneAdapter.enqueue(req).then((result) => {
    const job = pendingJobs.get(result.vendorJobId);
    if (job) {
      job.failureRate = req.failureRate ?? 10;
      job.failureSeed = req.failureSeed ?? 0;
    }
    return result;
  });
}
