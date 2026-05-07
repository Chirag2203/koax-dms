/**
 * Vendor adapter tests — SPEC-SHOOTS-002 L_AI-15, L_AI-16, L_AI-17
 *
 * Verifies the AiVendorAdapter interface and concrete implementations:
 *   - noneAdapter: pass-through, returns rawUrl as processedDataUrl
 *   - mockSpyneAdapter: seeded RNG failure injection, job lifecycle
 *   - getAdapter factory routing
 *
 * Test placement: pure-logic → co-located under __tests__ (CLAUDE.md §10 #9)
 *
 * Spec reference: SPEC-SHOOTS-002 §11, L_AI-15, L_AI-16, L_AI-17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAdapter } from '../ai-adapters/index';
import { noneAdapter } from '../ai-adapters/none-adapter';
import { mockSpyneAdapter, enqueueWithPolicy } from '../ai-adapters/mock-spyne-adapter';
import type { AiEnqueueRequest } from '../ai-adapters/types';

// ─── Base request helper ──────────────────────────────────────────────────────

const baseReq = (shootId: string, assetId: string): AiEnqueueRequest => ({
  shootId,
  assetId,
  rawUrl: 'data:image/png;base64,abc123',
  kind: 'front_3q_driver',
  outletId: 'BLR-01',
  actorId: 'test-actor',
  actorRole: 'R11',
});

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockSpyneAdapter._clearJobs();
});

// ─── noneAdapter ──────────────────────────────────────────────────────────────

describe('noneAdapter — pass-through (L_AI-15)', () => {
  it('vendorId is NONE', () => {
    expect(noneAdapter.vendorId).toBe('NONE');
  });

  it('enqueue returns accepted status with a vendorJobId', async () => {
    const result = await noneAdapter.enqueue(baseReq('shoot-001', 'asset-001'));
    expect(result.status).toBe('accepted');
    expect(typeof result.vendorJobId).toBe('string');
    expect(result.vendorJobId.length).toBeGreaterThan(0);
  });

  it('poll returns succeeded immediately with processedDataUrl = rawUrl', async () => {
    const enqueueResult = await noneAdapter.enqueue(baseReq('shoot-001', 'asset-001'));
    const pollResult = await noneAdapter.poll(enqueueResult.vendorJobId);
    expect(pollResult.status).toBe('succeeded');
    expect(pollResult.processedDataUrl).toBe('data:image/png;base64,abc123');
  });

  it('poll on unknown vendorJobId returns failed', async () => {
    const result = await noneAdapter.poll('none-job-unknown-xyz');
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBeTruthy();
  });
});

// ─── mockSpyneAdapter ─────────────────────────────────────────────────────────

describe('mockSpyneAdapter — seeded mock (L_AI-15, L_AI-17)', () => {
  it('vendorId is SPYNE_AI', () => {
    expect(mockSpyneAdapter.vendorId).toBe('SPYNE_AI');
  });

  it('enqueue returns accepted with a spyne-prefixed vendorJobId', async () => {
    const result = await mockSpyneAdapter.enqueue(baseReq('shoot-001', 'asset-001'));
    expect(result.status).toBe('accepted');
    expect(result.vendorJobId).toMatch(/^spyne-/);
  });

  it('first 2 poll calls return processing (L_AI-16 mock latency)', async () => {
    const { vendorJobId } = await enqueueWithPolicy({
      ...baseReq('shoot-001', 'asset-001'),
      failureRate: 0,
      failureSeed: 0,
    });
    const poll1 = await mockSpyneAdapter.poll(vendorJobId);
    expect(poll1.status).toBe('processing');
    const poll2 = await mockSpyneAdapter.poll(vendorJobId);
    expect(poll2.status).toBe('processing');
  });

  it('3rd poll returns terminal status (L_AI-16: mock latency ≈ 3 polls)', async () => {
    const { vendorJobId } = await enqueueWithPolicy({
      ...baseReq('shoot-001', 'asset-001'),
      failureRate: 0,
      failureSeed: 0,
    });
    await mockSpyneAdapter.poll(vendorJobId); // 1st
    await mockSpyneAdapter.poll(vendorJobId); // 2nd
    const terminal = await mockSpyneAdapter.poll(vendorJobId); // 3rd
    expect(['succeeded', 'failed']).toContain(terminal.status);
  });

  it('failureRate=0 always succeeds on 3rd poll', async () => {
    for (let i = 0; i < 5; i++) {
      mockSpyneAdapter._clearJobs();
      const { vendorJobId } = await enqueueWithPolicy({
        ...baseReq(`shoot-${i}`, `asset-${i}`),
        failureRate: 0,
        failureSeed: 0,
      });
      await mockSpyneAdapter.poll(vendorJobId);
      await mockSpyneAdapter.poll(vendorJobId);
      const result = await mockSpyneAdapter.poll(vendorJobId);
      expect(result.status).toBe('succeeded');
      expect(typeof result.processedDataUrl).toBe('string');
    }
  });

  it('failureRate=100 always fails on 3rd poll', async () => {
    for (let i = 0; i < 5; i++) {
      mockSpyneAdapter._clearJobs();
      const { vendorJobId } = await enqueueWithPolicy({
        ...baseReq(`shoot-${i}`, `asset-${i}`),
        failureRate: 100,
        failureSeed: 0,
      });
      await mockSpyneAdapter.poll(vendorJobId);
      await mockSpyneAdapter.poll(vendorJobId);
      const result = await mockSpyneAdapter.poll(vendorJobId);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBeTruthy();
    }
  });

  it('failure is deterministic for same seed (polyHash property — L_AI-17)', async () => {
    // Same shootId:assetId:failureSeed → same result on 3rd poll
    const results: string[] = [];
    for (let run = 0; run < 3; run++) {
      mockSpyneAdapter._clearJobs();
      const { vendorJobId } = await enqueueWithPolicy({
        ...baseReq('shoot-det', 'asset-det'),
        failureRate: 50,
        failureSeed: 42,
      });
      await mockSpyneAdapter.poll(vendorJobId);
      await mockSpyneAdapter.poll(vendorJobId);
      const terminal = await mockSpyneAdapter.poll(vendorJobId);
      results.push(terminal.status);
    }
    // All 3 runs with the same seed must produce the same outcome
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });

  it('poll on unknown vendorJobId returns failed', async () => {
    const result = await mockSpyneAdapter.poll('spyne-000000000000');
    expect(result.status).toBe('failed');
  });
});

// ─── getAdapter factory ───────────────────────────────────────────────────────

describe('getAdapter factory routing (L_AI-15)', () => {
  it('returns noneAdapter for NONE', () => {
    const adapter = getAdapter('NONE');
    expect(adapter.vendorId).toBe('NONE');
  });

  it('returns mockSpyneAdapter for SPYNE_AI', () => {
    const adapter = getAdapter('SPYNE_AI');
    expect(adapter.vendorId).toBe('SPYNE_AI');
  });

  it('throws for CUSTOM (not yet implemented)', () => {
    expect(() => getAdapter('CUSTOM')).toThrow();
  });
});
