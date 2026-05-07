/**
 * AiVendorAdapter — typed interface for AI vendor integrations.
 *
 * Spec reference: SPEC-SHOOTS-002 §11, L_AI-15
 * Plan reference: PLAN-SHOOTS-AI-002 §1.1
 *
 * Three implementations ship in v2.1:
 *   - noneAdapter    → pass-through; sets processedDataUrl = rawUrl
 *   - mockSpyneAdapter → seeded RNG, shape-realistic mock (L_AI-17)
 *   - customAdapter  → placeholder slot, throws until wired
 *
 * Production swap = drop in real Spyne adapter when L_AI-13 DPA is signed.
 * Route handler and store action signatures are unchanged across adapters.
 *
 * L_AI-15: zero vendor lock-in at the call-site level.
 */

// ─── Enqueue request ─────────────────────────────────────────────────────────

export interface AiEnqueueRequest {
  shootId: string;
  assetId: string;
  rawUrl: string;
  kind: string;
  outletId: string;
  actorId: string;
  actorRole: string;
}

// ─── Poll result ──────────────────────────────────────────────────────────────

export interface AiPollResult {
  vendorJobId: string;
  status: 'processing' | 'succeeded' | 'failed';
  /** Populated when status === 'succeeded'. Mock: rawUrl echoed (or tinted). */
  processedDataUrl?: string;
  /** Populated when status === 'failed'. */
  errorMessage?: string;
}

// ─── Adapter interface ────────────────────────────────────────────────────────

export interface AiVendorAdapter {
  readonly vendorId: 'NONE' | 'SPYNE_AI' | 'CUSTOM';

  /**
   * Enqueue an asset for AI processing.
   * Returns a vendorJobId to poll against.
   * Must be synchronous-or-fast (< 500 ms) in mock implementations.
   *
   * L_AI-16: POST → 202 → vendorJobId pipeline shape.
   */
  enqueue(req: AiEnqueueRequest): Promise<{ vendorJobId: string; status: 'accepted' }>;

  /**
   * Poll the vendor for the job result.
   * Returns 'processing' until the job is terminal.
   * Returns 'succeeded' with processedDataUrl OR 'failed' with errorMessage.
   *
   * L_AI-16: GET poll, 1.5s × 8 attempts max.
   */
  poll(vendorJobId: string): Promise<AiPollResult>;
}
