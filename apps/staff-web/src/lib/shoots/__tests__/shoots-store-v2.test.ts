/**
 * Shoots store v2 unit tests — SPEC-SHOOTS-002 Phase 1
 *
 * Covers store actions, RBAC, LP precondition, 4-state transitions, error classes,
 * LISTED guard, and v1→v2 schema migration.
 *
 * Test placement per CLAUDE.md §10 #9:
 *   Pure-logic / store tests → co-located with the code under test.
 *
 * Spec reference: SPEC-SHOOTS-002 §10, §19.2
 * Scenarios: SC-1, SC-2, SC-3, SC-4, SC-5, SC-6, SC-7, SC-11, SC-12, SC-22, SC-23, SC-24, SC-25
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useShootsStore } from '../shoots-store';
import { assertShootComplete } from '../shoots-listed-guard';
import {
  LpRedactionRequiredError,
  AssetApprovalPreconditionError,
  ShootSlotIncompleteError,
  ShootIncompleteError,
} from '@dms/types';
import type { ShootActor } from '../shoots-store';
import { getRequiredSlots } from '../asset-slot-definitions';

// ─── Test actor helpers ───────────────────────────────────────────────────────

const r11: ShootActor = { id: 'user-r11', name: 'Marketing Manager', role: 'R11' };
const r12: ShootActor = { id: 'user-r12', name: 'Sales Manager', role: 'R12' };
const r09: ShootActor = { id: 'user-r09', name: 'Sales Advisor', role: 'R09' };
const r19: ShootActor = { id: 'user-r19', name: 'General Manager', role: 'R19' };

// 1×1 transparent PNG data URL (well within 2 MB)
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ─── Reset store before each test ────────────────────────────────────────────

beforeEach(() => {
  useShootsStore.setState({
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
    auditEvents: [],
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTestShoot(vin = 'WP0AB2A91MS247831') {
  return useShootsStore.getState().createShoot(vin, 'BLR-01', r11, {
    vehicleMake: 'Porsche',
    vehicleModel: 'Cayenne',
    vehicleYear: 2022,
  });
}

function addRawExterior(shootId: string) {
  return useShootsStore.getState().addRawAsset(
    shootId,
    TINY_PNG,
    'front_3q_driver',
    r11,
  );
}

// ─── SC-1: addRawAsset creates asset, slot uniqueness enforced ────────────────

describe('SC-1: addRawAsset', () => {
  it('creates a ShootAsset with correct initial state', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    expect(asset.kind).toBe('front_3q_driver');
    expect(asset.aiStatus).toBe('pending');
    expect(asset.approved).toBe(false);
    expect(asset.lpRedacted).toBe(false);
    expect(asset.forceApprovedWithoutRedaction).toBe(false);
    expect(asset.rawUrl).toBe(TINY_PNG);
    expect(asset.processedUrl).toBeNull();

    const updatedShoot = useShootsStore.getState().shoots[shoot.id]!;
    expect(updatedShoot.assets).toHaveLength(1);
  });

  it('enforces slot uniqueness — second addRawAsset for same kind throws', () => {
    const shoot = createTestShoot();
    addRawExterior(shoot.id);

    expect(() => addRawExterior(shoot.id)).toThrow(AssetApprovalPreconditionError);
  });

  it('allows different kinds in the same shoot', () => {
    const shoot = createTestShoot();
    useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'front_3q_driver', r11);
    useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'rear_3q_driver', r11);

    const updatedShoot = useShootsStore.getState().shoots[shoot.id]!;
    expect(updatedShoot.assets).toHaveLength(2);
  });

  it('emits shoot_asset_uploaded audit event', () => {
    const shoot = createTestShoot();
    addRawExterior(shoot.id);

    const events = useShootsStore.getState().auditEvents;
    const uploaded = events.find((e) => e.eventKind === 'shoot_asset_uploaded');
    expect(uploaded).toBeDefined();
    expect(uploaded?.actorRole).toBe('R11');
    expect(uploaded?.extra?.kind).toBe('front_3q_driver');
  });

  it('rejects an oversized asset (>2 MB)', () => {
    const shoot = createTestShoot();
    // Create a string longer than 2MB / 0.75 = ~2.67M chars
    const bigDataUrl = 'data:image/png;base64,' + 'A'.repeat(3_000_000);

    expect(() =>
      useShootsStore.getState().addRawAsset(shoot.id, bigDataUrl, 'dashboard', r11),
    ).toThrow(AssetApprovalPreconditionError);
  });
});

// ─── SC-7: R09 attempts addRawAsset → store rejects ──────────────────────────

describe('SC-7: R09 cannot addRawAsset', () => {
  it('throws AssetApprovalPreconditionError when R09 calls addRawAsset', () => {
    const shoot = createTestShoot();

    expect(() =>
      useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'front_3q_driver', r09),
    ).toThrow(AssetApprovalPreconditionError);
  });

  it('includes role name in error message', () => {
    const shoot = createTestShoot();

    let err: AssetApprovalPreconditionError | null = null;
    try {
      useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'front_3q_driver', r09);
    } catch (e) {
      err = e as AssetApprovalPreconditionError;
    }

    expect(err?.reason).toContain('R09');
  });
});

// ─── SC-2: requestAiProcess (v2.1 async) ─────────────────────────────────────
// requestAiProcess is async (L_AI-16). In test env the fetch fails → manual-only fallback.

describe('SC-2: requestAiProcess v2.1', () => {
  it('sets aiStatus=manual-only for all pending assets when fetch fails (test env fallback)', async () => {
    const shoot = createTestShoot();
    useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'front_3q_driver', r11);
    useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'dashboard', r11);

    // Fetch will fail in Vitest (no server) → fallback to manual-only
    await useShootsStore.getState().requestAiProcess(shoot.id, r11);

    const updated = useShootsStore.getState().shoots[shoot.id]!;
    for (const asset of updated.assets) {
      expect(asset.aiStatus).toBe('manual-only');
      expect(asset.processedUrl).toBe(TINY_PNG); // rawUrl copied to processedUrl on fallback
    }
  });

  it('rejects requestAiProcess for ranks below R11 (R09 SA)', async () => {
    const shoot = createTestShoot();
    await expect(
      useShootsStore.getState().requestAiProcess(shoot.id, r09),
    ).rejects.toThrow(AssetApprovalPreconditionError);
  });

  it('permits requestAiProcess for R24 (CEO, rank > R11) per user direction 2026-05-08', async () => {
    const shoot = createTestShoot();
    const r24: ShootActor = { id: 'user-r24', name: 'CEO', role: 'R24' };
    await expect(
      useShootsStore.getState().requestAiProcess(shoot.id, r24),
    ).resolves.not.toThrow();
  });
});

// ─── SC-3: redactLicensePlate sets lpRedacted + processedUrl ─────────────────

describe('SC-3: redactLicensePlate', () => {
  it('sets lpRedacted=true, redactedAt, redactedBy, and updates processedUrl', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    const redactedUrl = 'data:image/png;base64,REDACTED';
    useShootsStore.getState().redactLicensePlate(asset.id, redactedUrl, r11);

    const updatedAsset = useShootsStore.getState().selectAssetById(asset.id);
    expect(updatedAsset?.lpRedacted).toBe(true);
    expect(updatedAsset?.redactedBy).toBe('user-r11');
    expect(updatedAsset?.redactedAt).toBeTruthy();
    expect(updatedAsset?.processedUrl).toBe(redactedUrl);
  });

  it('emits shoot_asset_redacted event with actorRole', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    useShootsStore.getState().redactLicensePlate(asset.id, TINY_PNG, r11);

    const events = useShootsStore.getState().auditEvents;
    const redactEvent = events.find((e) => e.eventKind === 'shoot_asset_redacted');
    expect(redactEvent?.actorRole).toBe('R11');
  });

  it('rejects redactLicensePlate if actor is not R11', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    expect(() =>
      useShootsStore.getState().redactLicensePlate(asset.id, TINY_PNG, r09),
    ).toThrow(AssetApprovalPreconditionError);
  });
});

// ─── SC-4: approveAsset on redacted exterior succeeds ────────────────────────

describe('SC-4: approveAsset on redacted exterior', () => {
  it('transitions from processed to approved', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    // First: AI process (sets manual-only + processedUrl)
    useShootsStore.getState().requestAiProcess(shoot.id, r11);
    // Then: redact
    useShootsStore.getState().redactLicensePlate(asset.id, TINY_PNG, r11);
    // Then: approve
    useShootsStore.getState().approveAsset(asset.id, r11);

    const updatedAsset = useShootsStore.getState().selectAssetById(asset.id);
    expect(updatedAsset?.approved).toBe(true);
    expect(updatedAsset?.approvedAt).toBeTruthy();
    expect(updatedAsset?.approvedBy).toBe('user-r11');
  });

  it('emits shoot_asset_approved with actorRole', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    useShootsStore.getState().requestAiProcess(shoot.id, r11);
    useShootsStore.getState().redactLicensePlate(asset.id, TINY_PNG, r11);
    useShootsStore.getState().approveAsset(asset.id, r11);

    const events = useShootsStore.getState().auditEvents;
    const approvedEvent = events.find((e) => e.eventKind === 'shoot_asset_approved');
    expect(approvedEvent?.actorRole).toBe('R11');
  });
});

// ─── SC-5: approveAsset on unredacted exterior throws ────────────────────────

describe('SC-5: approveAsset on unredacted exterior throws LpRedactionRequiredError', () => {
  it('throws LpRedactionRequiredError', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);
    // Set aiStatus to manual-only so the AI check passes
    useShootsStore.getState().requestAiProcess(shoot.id, r11);
    // Do NOT redact

    expect(() =>
      useShootsStore.getState().approveAsset(asset.id, r11),
    ).toThrow(LpRedactionRequiredError);
  });

  it('LpRedactionRequiredError carries vin, assetId, kind', () => {
    const vin = 'WP0AB2A91MS247831';
    const shoot = createTestShoot(vin);
    const asset = addRawExterior(shoot.id);
    useShootsStore.getState().requestAiProcess(shoot.id, r11);

    let err: LpRedactionRequiredError | null = null;
    try {
      useShootsStore.getState().approveAsset(asset.id, r11);
    } catch (e) {
      err = e as LpRedactionRequiredError;
    }

    expect(err?.vin).toBe(vin);
    expect(err?.assetId).toBe(asset.id);
    expect(err?.kind).toBe('front_3q_driver');
  });

  it('does not emit shoot_asset_approved on rejection', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);
    useShootsStore.getState().requestAiProcess(shoot.id, r11);

    try {
      useShootsStore.getState().approveAsset(asset.id, r11);
    } catch {
      // expected
    }

    const events = useShootsStore.getState().auditEvents;
    const approvedEvent = events.find((e) => e.eventKind === 'shoot_asset_approved');
    expect(approvedEvent).toBeUndefined();
  });
});

// ─── SC-6: forceApproveOverride bypasses LP precondition ─────────────────────

describe('SC-6: forceApproveOverride', () => {
  it('sets approved=true and forceApprovedWithoutRedaction=true', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);
    useShootsStore.getState().requestAiProcess(shoot.id, r11);

    useShootsStore.getState().forceApproveOverride(
      asset.id,
      'Vehicle needs urgent listing, plate review confirmed',
      r12,
    );

    const updatedAsset = useShootsStore.getState().selectAssetById(asset.id);
    expect(updatedAsset?.approved).toBe(true);
    expect(updatedAsset?.forceApprovedWithoutRedaction).toBe(true);
    expect(updatedAsset?.forceApprovedBy).toBe('user-r12');
    expect(updatedAsset?.forceApprovedReason).toBe(
      'Vehicle needs urgent listing, plate review confirmed',
    );
  });

  it('emits both shoot_force_approved and audit:force_approved_lp_unredacted', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);
    useShootsStore.getState().requestAiProcess(shoot.id, r11);
    useShootsStore
      .getState()
      .forceApproveOverride(asset.id, 'Verified manually by GM', r19);

    const events = useShootsStore.getState().auditEvents;
    const forceEvent = events.find((e) => e.eventKind === 'shoot_force_approved');
    const auditEvent = events.find(
      (e) => e.eventKind === 'audit:force_approved_lp_unredacted',
    );
    expect(forceEvent?.actorRole).toBe('R19');
    expect(auditEvent?.extra?.lpUnredacted).toBe(true);
  });
});

// ─── SC-23: R11 attempts forceApproveOverride → rejected ─────────────────────

describe('SC-23: R11 cannot forceApproveOverride', () => {
  it('throws AssetApprovalPreconditionError with rank < R12 message', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);
    useShootsStore.getState().requestAiProcess(shoot.id, r11);

    expect(() =>
      useShootsStore
        .getState()
        .forceApproveOverride(asset.id, 'Trying to force approve', r11),
    ).toThrow(AssetApprovalPreconditionError);
  });

  it('error reason mentions R12 threshold', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);
    useShootsStore.getState().requestAiProcess(shoot.id, r11);

    let err: AssetApprovalPreconditionError | null = null;
    try {
      useShootsStore
        .getState()
        .forceApproveOverride(asset.id, 'Trying to force approve', r11);
    } catch (e) {
      err = e as AssetApprovalPreconditionError;
    }

    expect(err?.reason).toContain('R12');
  });
});

// ─── SC-24: approveAsset on aiStatus='failed' → rejected ─────────────────────

describe('SC-24: approveAsset on failed AI asset', () => {
  it('throws AssetApprovalPreconditionError with ai failed message', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    // Manually set aiStatus to 'failed' + lpRedacted to simulate a failed AI scenario
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === asset.id)!;
      a.aiStatus = 'failed';
      a.lpRedacted = true; // so LP check doesn't interfere
      a.processedUrl = TINY_PNG;
    });

    expect(() =>
      useShootsStore.getState().approveAsset(asset.id, r11),
    ).toThrow(AssetApprovalPreconditionError);
  });

  it('error reason mentions ai failed', () => {
    const shoot = createTestShoot();
    const asset = addRawExterior(shoot.id);

    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === asset.id)!;
      a.aiStatus = 'failed';
      a.lpRedacted = true;
      a.processedUrl = TINY_PNG;
    });

    let err: AssetApprovalPreconditionError | null = null;
    try {
      useShootsStore.getState().approveAsset(asset.id, r11);
    } catch (e) {
      err = e as AssetApprovalPreconditionError;
    }
    expect(err?.reason).toContain('ai failed');
  });
});

// ─── SC-11: LISTED guard succeeds when all 11 required slots approved ─────────

describe('SC-11: LISTED guard — all 11 required slots approved', () => {
  it('passes assertShootComplete without throwing', () => {
    const vin = 'WP0AB2A91MS247831';
    const shoot = createTestShoot(vin);
    const store = useShootsStore.getState();

    // Add + process + redact (exterior) + approve all required slots
    const requiredSlots = getRequiredSlots();
    for (const slot of requiredSlots) {
      const asset = store.addRawAsset(shoot.id, TINY_PNG, slot.kind, r11);
      // Set manual-only directly on this asset
      useShootsStore.setState((state) => {
        const s = state.shoots[shoot.id]!;
        const a = s.assets.find((x) => x.id === asset.id)!;
        a.aiStatus = 'manual-only';
        a.processedUrl = TINY_PNG;
        if (slot.lpRedactionRequired) {
          a.lpRedacted = true;
        }
      });

      if (slot.kind === 'video_walkaround') {
        store.approveAsset(asset.id, r12, 'I have reviewed the walkaround video');
      } else {
        store.approveAsset(asset.id, r11);
      }
    }

    expect(() => assertShootComplete(vin, false)).not.toThrow();
  });
});

// ─── SC-12: LISTED guard fails with ShootSlotIncompleteError ─────────────────

describe('SC-12: LISTED guard — missing required slots', () => {
  it('throws ShootSlotIncompleteError with missingKinds enumerated', () => {
    const vin = 'WP0ZZZ97ZNS112045';
    const shoot = createTestShoot(vin);
    const store = useShootsStore.getState();

    // Only add dashboard and rear_seats — not all required slots
    const dashAsset = store.addRawAsset(shoot.id, TINY_PNG, 'dashboard', r11);
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === dashAsset.id)!;
      a.aiStatus = 'manual-only';
      a.processedUrl = TINY_PNG;
    });
    store.approveAsset(dashAsset.id, r11);

    expect(() => assertShootComplete(vin, false)).toThrow(ShootSlotIncompleteError);
  });

  it('missingKinds array contains the specific missing kinds', () => {
    const vin = 'WDD2221971A012345';
    const shoot = createTestShoot(vin);
    const store = useShootsStore.getState();

    // Add dashboard only — all other required slots missing
    const dashAsset = store.addRawAsset(shoot.id, TINY_PNG, 'dashboard', r11);
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === dashAsset.id)!;
      a.aiStatus = 'manual-only';
      a.processedUrl = TINY_PNG;
    });
    store.approveAsset(dashAsset.id, r11);

    let err: ShootSlotIncompleteError | null = null;
    try {
      assertShootComplete(vin, false);
    } catch (e) {
      err = e as ShootSlotIncompleteError;
    }

    expect(err?.missingKinds).toContain('front_3q_driver');
    expect(err?.missingKinds).toContain('video_walkaround');
    expect(err?.missingKinds).toContain('odometer');
    expect(err?.missingKinds).not.toContain('dashboard'); // dashboard IS approved
  });

  it('grandfather rule: already-listed vehicle skips guard', () => {
    const vin = 'WP1ZZZ9YZPS034789';
    createTestShoot(vin); // shoot with no approved assets

    // currentlyListed=true → grandfather rule → no error
    expect(() => assertShootComplete(vin, true)).not.toThrow();
  });
});

// ─── SC-22: v1 fixture round-trips through schema ────────────────────────────
// L_AI-20: _seed strips deprecated fields (assetCount, videoCount, assetUrls).
// v1 fixtures are fully migrated to v2 shape — no back-compat retention.

describe('SC-22: v1 → v2 schema migration', () => {
  it('v1 fixture with assetUrls gets assets=[] after _seed and deprecated fields stripped', () => {
    const v1Shoot = {
      id: 'shoot-test-v1',
      vin: 'WBA5U5C08MCF12345',
      photographerId: null,
      scheduledAt: null,
      completedAt: null,
      status: 'completed' as const,
      assetCount: 2,
      videoCount: 0,
      assetUrls: ['https://cdn.bn.example/shoots/WBA5U5C08MCF12345/1.jpg'],
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'staff-r10-001',
      notes: '',
      outletId: 'BLR-01' as const,
      // No v2 fields — simulates v1 fixture
    };

    // _seed normalizes v1 fixtures by adding v2 defaults and stripping removed fields (L_AI-20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Shoot as any]);

    const seeded = useShootsStore.getState().shoots['shoot-test-v1'];
    expect(seeded).toBeDefined();
    expect(seeded?.assets).toEqual([]);
    expect(seeded?.coverAssetId).toBeNull();
    expect(seeded?.aiVendor).toBe('NONE');
    // L_AI-20: deprecated fields stripped by _seed — must be undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((seeded as any)?.assetUrls).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((seeded as any)?.assetCount).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((seeded as any)?.videoCount).toBeUndefined();
  });

  it('v1 fixture with multiple assetUrls has them stripped; assets remains empty', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([{
      id: 'shoot-test-v1b',
      vin: 'WBAJY0C03MCG78901',
      photographerId: null,
      scheduledAt: null,
      completedAt: null,
      status: 'completed' as const,
      assetCount: 3,
      videoCount: 1,
      assetUrls: ['url1', 'url2', 'url3', 'video1'],
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'staff-r10-001',
      notes: '',
      outletId: 'BLR-01' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any]);

    const shoot = useShootsStore.getState().shoots['shoot-test-v1b'];
    // L_AI-20: assetUrls is deleted by _seed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((shoot as any)?.assetUrls).toBeUndefined();
    // v2 assets array is the authoritative source
    expect(shoot?.assets).toEqual([]);
  });
});

// ─── SC-25: LISTED guard with all required slots present but one unredacted ───

describe('SC-25: LISTED guard fails with unredacted asset (uploaded but not approvable)', () => {
  it('throws ShootSlotIncompleteError because unredacted asset cannot be approved', () => {
    const vin = 'WDD1900761A789012';
    const shoot = createTestShoot(vin);
    const store = useShootsStore.getState();
    const requiredSlots = getRequiredSlots();

    // Add all required slots
    const assetMap: Record<string, string> = {};
    for (const slot of requiredSlots) {
      const asset = store.addRawAsset(shoot.id, TINY_PNG, slot.kind, r11);
      assetMap[slot.kind] = asset.id;
      // Set manual-only
      useShootsStore.setState((state) => {
        const s = state.shoots[shoot.id]!;
        const a = s.assets.find((x) => x.id === asset.id)!;
        a.aiStatus = 'manual-only';
        a.processedUrl = TINY_PNG;
      });
    }

    // Approve all EXCEPT front_3q_driver — leave it unredacted (cannot approve)
    for (const slot of requiredSlots) {
      if (slot.kind === 'front_3q_driver') continue; // deliberately skip
      const assetId = assetMap[slot.kind]!;
      if (slot.lpRedactionRequired) {
        useShootsStore.setState((state) => {
          const s = state.shoots[shoot.id]!;
          const a = s.assets.find((x) => x.id === assetId)!;
          a.lpRedacted = true;
        });
      }
      if (slot.kind === 'video_walkaround') {
        store.approveAsset(assetId, r12, 'I have reviewed the walkaround video');
      } else {
        store.approveAsset(assetId, r11);
      }
    }

    // front_3q_driver exists but is NOT approved (unredacted) → LISTED should fail
    let err: ShootSlotIncompleteError | null = null;
    try {
      assertShootComplete(vin, false);
    } catch (e) {
      err = e as ShootSlotIncompleteError;
    }

    expect(err).toBeInstanceOf(ShootSlotIncompleteError);
    expect(err?.missingKinds).toContain('front_3q_driver');
  });
});

// ─── Additional: selectStorefrontGalleryForVin status values ─────────────────

describe('selectStorefrontGalleryForVin', () => {
  it('returns status unavailable when no shoot exists for VIN', () => {
    const result = useShootsStore
      .getState()
      .selectStorefrontGalleryForVin('NONEXISTENT12345678');

    expect(result.status).toBe('unavailable');
    expect(result.coverUrl).toBeNull();
    expect(result.gallery).toHaveLength(0);
  });

  it('returns status pending when shoot exists but not enough approved exteriors', () => {
    const vin = 'WP0AB2A91MS247831';
    const shoot = createTestShoot(vin);
    const store = useShootsStore.getState();

    // Add 2 approved exterior assets (threshold requires ≥4 + cover)
    for (const kind of ['front_3q_driver', 'front_3q_passenger'] as const) {
      const asset = store.addRawAsset(shoot.id, TINY_PNG, kind, r11);
      useShootsStore.setState((state) => {
        const s = state.shoots[shoot.id]!;
        const a = s.assets.find((x) => x.id === asset.id)!;
        a.aiStatus = 'manual-only';
        a.processedUrl = TINY_PNG;
        a.lpRedacted = true;
      });
      store.approveAsset(asset.id, r11);
    }

    const result = useShootsStore.getState().selectStorefrontGalleryForVin(vin);
    expect(result.status).toBe('pending');
  });

  it('excludes force-approved-unredacted assets from gallery', () => {
    const vin = 'WP0ZZZ97ZNS112045';
    const shoot = createTestShoot(vin);
    const store = useShootsStore.getState();

    const asset = store.addRawAsset(shoot.id, TINY_PNG, 'front_3q_driver', r11);
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id]!;
      const a = s.assets.find((x) => x.id === asset.id)!;
      a.aiStatus = 'manual-only';
      a.processedUrl = TINY_PNG;
    });
    // Force approve without redaction
    store.forceApproveOverride(asset.id, 'Urgent listing required', r12);

    const result = useShootsStore.getState().selectStorefrontGalleryForVin(vin);
    // Force-approved assets EXCLUDED from gallery (B2)
    expect(result.gallery).toHaveLength(0);
    expect(result.coverUrl).toBeNull();
  });

  it('v1 shoot migrated via _seed still returns pending (assets[] is empty after migration)', () => {
    // L_AI-20: _seed strips assetCount/videoCount/assetUrls; assets=[] is authoritative.
    // A "completed" v1 shoot with assetUrls still gets assets=[], so gallery shows pending.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([{
      id: 'shoot-v1-gallery-test',
      vin: 'WDD2050301R567890',
      photographerId: null,
      scheduledAt: null,
      completedAt: '2026-01-01T00:00:00.000Z',
      status: 'completed' as const,
      assetCount: 14,
      videoCount: 1,
      assetUrls: ['url1', 'url2'],
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'staff-r10-001',
      notes: '',
      outletId: 'BLR-01' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any]);

    // v1 shoot has assets=[] after migration → gallery returns pending (shoot exists, no assets)
    const result = useShootsStore
      .getState()
      .selectStorefrontGalleryForVin('WDD2050301R567890');
    // No approved assets → pending (shoot exists)
    expect(result.status).toBe('pending');
  });
});
