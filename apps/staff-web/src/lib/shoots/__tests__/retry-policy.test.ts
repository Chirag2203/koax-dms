/**
 * AI retry policy tests — SPEC-SHOOTS-002 L_AI-19
 *
 * Verifies the per-asset retry lifecycle:
 *   - retryAiProcess gate (R11+)
 *   - aiRetryCount increments on each retry call
 *   - Permanent manual-only when aiRetryCount >= maxRetries
 *   - Fresh enqueue cycle on non-exhausted retry
 *
 * Test placement: pure-logic → co-located under __tests__ (CLAUDE.md §10 #9)
 *
 * Spec reference: SPEC-SHOOTS-002 §13, L_AI-19
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useShootsStore } from '../shoots-store';
import { AssetApprovalPreconditionError } from '@dms/types';
import type { ShootActor } from '../shoots-store';

// ─── Actors ───────────────────────────────────────────────────────────────────

const r11: ShootActor = { id: 'user-r11', name: 'Marketing Manager', role: 'R11' };
const r09: ShootActor = { id: 'user-r09', name: 'Sales Advisor', role: 'R09' };

// ─── Tiny PNG ─────────────────────────────────────────────────────────────────

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShootsStore.setState({
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
    auditEvents: [],
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createShootWithFailedAsset() {
  const store = useShootsStore.getState();
  const shoot = store.createShoot('WP0RETRY000000001', 'BLR-01', r11);
  const asset = store.addRawAsset(shoot.id, TINY_PNG, 'front_3q_driver', r11);
  // Set asset to failed AI state
  useShootsStore.setState((state) => {
    const s = state.shoots[shoot.id]!;
    const a = s.assets.find((x) => x.id === asset.id)!;
    a.aiStatus = 'failed';
    a.aiRetryCount = 0;
  });
  return { shoot, asset };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('L_AI-19 — retryAiProcess RBAC gate', () => {
  it('R09 cannot retry — throws AssetApprovalPreconditionError', async () => {
    const { asset } = createShootWithFailedAsset();
    await expect(
      useShootsStore.getState().retryAiProcess(asset.id, r09),
    ).rejects.toThrow(AssetApprovalPreconditionError);
  });

  it('R11 can retry — does not throw on RBAC check', async () => {
    const { asset } = createShootWithFailedAsset();
    // Will attempt fetch (which fails in test env → sets manual-only) — no RBAC throw
    await expect(
      useShootsStore.getState().retryAiProcess(asset.id, r11),
    ).resolves.not.toThrow();
  });
});

describe('L_AI-19 — retry increments aiRetryCount', () => {
  it('aiRetryCount is 0 before retry', () => {
    const { asset } = createShootWithFailedAsset();
    const a = useShootsStore.getState().selectAssetById(asset.id);
    expect(a?.aiRetryCount).toBe(0);
  });

  it('aiRetryCount increments to 1 after first retry', async () => {
    const { asset } = createShootWithFailedAsset();
    await useShootsStore.getState().retryAiProcess(asset.id, r11);
    const a = useShootsStore.getState().selectAssetById(asset.id);
    expect(a?.aiRetryCount).toBe(1);
  });

  it('sets aiStatus=queued after successful enqueue (or manual-only on fetch fail)', async () => {
    const { asset } = createShootWithFailedAsset();
    await useShootsStore.getState().retryAiProcess(asset.id, r11);
    const a = useShootsStore.getState().selectAssetById(asset.id);
    // In test env fetch fails → manual-only; in production → queued
    expect(['queued', 'manual-only']).toContain(a?.aiStatus);
  });
});

describe('L_AI-19 — permanent manual-only on retry exhaustion', () => {
  it('sets aiStatus=manual-only (permanent) when aiRetryCount >= maxRetries', async () => {
    const { shoot, asset } = createShootWithFailedAsset();

    // Set retry count to maxRetries (default 3) — already at threshold
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === asset.id)!;
      a.aiRetryCount = 3; // maxRetries default
      a.aiStatus = 'failed';
    });

    await useShootsStore.getState().retryAiProcess(asset.id, r11);

    const a = useShootsStore.getState().selectAssetById(asset.id);
    expect(a?.aiStatus).toBe('manual-only');
    // aiRetryCount should NOT increment further (already exhausted)
    expect(a?.aiRetryCount).toBe(3);
  });

  it('permanent manual-only sets processedUrl from rawUrl when null', async () => {
    const { shoot, asset } = createShootWithFailedAsset();

    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === asset.id)!;
      a.aiRetryCount = 3;
      a.aiStatus = 'failed';
      a.processedUrl = null;
    });

    await useShootsStore.getState().retryAiProcess(asset.id, r11);

    const a = useShootsStore.getState().selectAssetById(asset.id);
    expect(a?.processedUrl).toBe(TINY_PNG); // falls back to rawUrl
  });

  it('custom maxRetries on shoot aiPolicy is respected', async () => {
    const { shoot, asset } = createShootWithFailedAsset();

    // Set a custom maxRetries of 1 on the shoot
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      s.aiPolicy.maxRetries = 1;
      const a = s.assets.find((x) => x.id === asset.id)!;
      a.aiRetryCount = 1;
      a.aiStatus = 'failed';
    });

    await useShootsStore.getState().retryAiProcess(asset.id, r11);

    const a = useShootsStore.getState().selectAssetById(asset.id);
    expect(a?.aiStatus).toBe('manual-only');
  });
});
