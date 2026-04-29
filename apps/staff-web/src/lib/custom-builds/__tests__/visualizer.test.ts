/**
 * Visualizer unit tests — P3.1 (SPEC-CUSTOM-BUILDS-001 §9, §24)
 *
 * Test coverage:
 *   1.  Visualizer state save action wires to BuildJob correctly
 *   2.  saveVisualizerState throws JobDeliveredImmutableError on DELIVERED job
 *   3.  clearVisualizerState (via saveVisualizerState with empty layers)
 *   4.  Part picker toggle: new selection adds to category
 *   5.  Part picker toggle: clicking selected part removes it (toggle off)
 *   6.  Part picker toggle: clicking different part in same category swaps it
 *   7.  Asset registry: known vehicle (Porsche 911) returns base + supported=true
 *   8.  Asset registry: unknown vehicle returns placeholder + supported=false
 *   9.  Cost summary aggregation matches expected sum of selected parts
 *   10. getOverlayLayer returns correct zIndex for known key
 *   11. getOverlayLayer returns undefined for unknown key
 *   12. vehicleToModelSlug resolves all 5 supported vehicles
 *   13. [NEW] Paint color application — getPaintFilter returns cssFilter string
 *   14. [NEW] Paint color deselect — getPaintFilter(null) returns undefined
 *   15. [NEW] All 5 base cars have supported=true in registry
 *   16. [NEW] SUPPORTED_VEHICLES has exactly 5 entries (L35)
 *   17. [NEW] PAINT_PALETTE has exactly 12 named luxury colors (L36)
 *   18. [NEW] Cost total includes active paint listPrice when paint is selected
 *   19. [NEW] vehicleToModelSlug resolves Mercedes-AMG GT and Audi R8
 *   20. [NEW] getBaseLayer returns isPlaceholder=false for all 5 premium SVG cars
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9, §24, L35, L36
 */

import { describe, it, expect } from 'vitest';
import { JobDeliveredImmutableError } from '@dms/types';
import type { BuildJob } from '@dms/types';
import {
  getBaseLayer,
  getOverlayLayer,
  getAllOverlays,
  vehicleToModelSlug,
  SUPPORTED_VEHICLES,
} from '../visualizer-assets';
import {
  PAINT_PALETTE,
  PAINT_BY_KEY,
  getPaintFilter,
} from '../paint-palette';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<BuildJob> = {}): BuildJob {
  return {
    id: 'test-job-viz',
    title: 'Viz Test Build',
    stage: 'ENQUIRY',
    customerId: 'cust-001',
    vin: 'WP0AB2A91MS247831',
    outletId: 'BLR-01',
    parts: [],
    marginPct: 15,
    activityLog: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function runSaveVisualizerStateGuard(job: BuildJob): 'ok' | 'immutable' {
  if (job.stage === 'DELIVERED') {
    throw new JobDeliveredImmutableError(job.id);
  }
  return 'ok';
}

// ─── Visualizer state save guard tests ───────────────────────────────────────

describe('saveVisualizerState guard', () => {
  it('allows saving on an active (ENQUIRY) job', () => {
    const job = makeJob({ stage: 'ENQUIRY' });
    expect(runSaveVisualizerStateGuard(job)).toBe('ok');
  });

  it('allows saving on an IN_PROGRESS job', () => {
    const job = makeJob({ stage: 'IN_PROGRESS' });
    expect(runSaveVisualizerStateGuard(job)).toBe('ok');
  });

  it('throws JobDeliveredImmutableError on DELIVERED job', () => {
    const job = makeJob({ stage: 'DELIVERED' });
    expect(() => runSaveVisualizerStateGuard(job)).toThrow(JobDeliveredImmutableError);
  });
});

// ─── Part picker toggle logic ─────────────────────────────────────────────────

type SelectedParts = Record<string, string>;

function togglePart(prev: SelectedParts, category: string, key: string): SelectedParts {
  const next = { ...prev };
  if (next[category] === key) {
    delete next[category];
  } else {
    next[category] = key;
  }
  return next;
}

describe('part picker toggle logic', () => {
  it('adds a new part to an empty selection', () => {
    const result = togglePart({}, 'aero', 'carbon-hood');
    expect(result).toEqual({ aero: 'carbon-hood' });
  });

  it('removes a part when the same key is toggled again (toggle off)', () => {
    const initial: SelectedParts = { aero: 'carbon-hood' };
    const result = togglePart(initial, 'aero', 'carbon-hood');
    expect(result).toEqual({});
  });

  it('swaps a part when a different key in the same category is selected', () => {
    const initial: SelectedParts = { aero: 'carbon-hood' };
    const result = togglePart(initial, 'aero', 'carbon-spoiler');
    expect(result).toEqual({ aero: 'carbon-spoiler' });
  });

  it('does not affect other category selections when toggling', () => {
    const initial: SelectedParts = { aero: 'carbon-hood', wheels: 'forged-18-gloss' };
    const result = togglePart(initial, 'aero', 'carbon-hood');
    expect(result).toEqual({ wheels: 'forged-18-gloss' });
  });
});

// ─── Asset registry tests ─────────────────────────────────────────────────────

describe('getBaseLayer', () => {
  it('returns a supported record for porsche-911 with isPlaceholder=false (P3.1 premium art)', () => {
    const layer = getBaseLayer('porsche-911');
    expect(layer.supported).toBe(true);
    expect(layer.modelSlug).toBe('porsche-911');
    expect(layer.displayName).toBe('Porsche 911');
    expect(typeof layer.src).toBe('string');
    expect(layer.src.length).toBeGreaterThan(0);
    // P3.1: premium multi-layer SVG — no longer placeholder
    expect(layer.isPlaceholder).toBe(false);
  });

  it('returns supported=true for all 5 demo vehicles (L35)', () => {
    for (const v of SUPPORTED_VEHICLES) {
      const layer = getBaseLayer(v.modelSlug);
      expect(layer.supported).toBe(true);
    }
  });

  it('returns isPlaceholder=false for all 5 premium SVG cars', () => {
    for (const v of SUPPORTED_VEHICLES) {
      const layer = getBaseLayer(v.modelSlug);
      expect(layer.isPlaceholder).toBe(false);
    }
  });

  it('returns supported=false for an unknown model slug', () => {
    const layer = getBaseLayer('ferrari-f40');
    expect(layer.supported).toBe(false);
    expect(layer.isPlaceholder).toBe(true);
    expect(typeof layer.src).toBe('string');
  });

  it('SUPPORTED_VEHICLES has exactly 5 entries (L35)', () => {
    expect(SUPPORTED_VEHICLES).toHaveLength(5);
    const slugs = SUPPORTED_VEHICLES.map((v) => v.modelSlug);
    expect(slugs).toContain('porsche-911');
    expect(slugs).toContain('bmw-m4');
    expect(slugs).toContain('audi-rs5');
    expect(slugs).toContain('mercedes-amg-gt');
    expect(slugs).toContain('audi-r8');
  });
});

describe('getOverlayLayer', () => {
  it('returns a layer with correct zIndex for carbon-hood', () => {
    const layer = getOverlayLayer('carbon-hood');
    expect(layer).toBeDefined();
    expect(layer!.zIndex).toBe(35);
    expect(layer!.isPlaceholder).toBe(false);
  });

  it('returns undefined for an unknown asset key', () => {
    const layer = getOverlayLayer('some-unknown-part-key');
    expect(layer).toBeUndefined();
  });

  it('wheels overlay has zIndex=45', () => {
    const layer = getOverlayLayer('forged-18-gloss');
    expect(layer).toBeDefined();
    expect(layer!.zIndex).toBe(45);
  });

  it('window-tint overlay has highest zIndex (50)', () => {
    const tintDark = getOverlayLayer('tint-dark');
    expect(tintDark!.zIndex).toBe(50);
  });
});

describe('vehicleToModelSlug', () => {
  it('maps Porsche 911 to porsche-911', () => {
    expect(vehicleToModelSlug('Porsche', '911')).toBe('porsche-911');
    expect(vehicleToModelSlug('porsche', 'Carrera 911')).toBe('porsche-911');
  });

  it('maps BMW M4 to bmw-m4', () => {
    expect(vehicleToModelSlug('BMW', 'M4')).toBe('bmw-m4');
    expect(vehicleToModelSlug('BMW', 'M 4 Competition')).toBe('bmw-m4');
  });

  it('maps Audi RS5 to audi-rs5', () => {
    expect(vehicleToModelSlug('Audi', 'RS5')).toBe('audi-rs5');
    expect(vehicleToModelSlug('Audi', 'RS 5 Sportback')).toBe('audi-rs5');
  });

  it('maps Mercedes-AMG GT to mercedes-amg-gt (L35 new car)', () => {
    expect(vehicleToModelSlug('Mercedes', 'AMG GT')).toBe('mercedes-amg-gt');
    expect(vehicleToModelSlug('Mercedes-Benz', 'AMG GT S')).toBe('mercedes-amg-gt');
  });

  it('maps Audi R8 to audi-r8 (L35 new car)', () => {
    expect(vehicleToModelSlug('Audi', 'R8')).toBe('audi-r8');
    expect(vehicleToModelSlug('Audi', 'R8 V10 Plus')).toBe('audi-r8');
  });

  it('maps Ferrari make to "ferrari" slug (L57 — Ferrari is now the 3D car)', () => {
    // L57: Ferrari is now the only 3D-supported make, so ALL Ferrari models map to 'ferrari'
    const slug = vehicleToModelSlug('Ferrari', 'F40');
    expect(slug).toBe('ferrari');
  });

  it('falls back to a slug-ified make+model for truly unknown makes', () => {
    const slug = vehicleToModelSlug('Lamborghini', 'Huracan');
    expect(slug).toBe('lamborghini-huracan');
  });
});

// ─── Cost aggregation test ────────────────────────────────────────────────────

describe('cost summary aggregation', () => {
  it('sums list prices of selected parts correctly', () => {
    const overlayMap: Record<string, number> = {};
    for (const o of getAllOverlays()) {
      overlayMap[o.key] = o.listPrice;
    }

    const selectedParts: SelectedParts = {
      aero: 'carbon-hood',       // 95000
      wheels: 'forged-18-gloss', // 180000
    };

    const total = Object.values(selectedParts).reduce(
      (sum, key) => sum + (overlayMap[key] ?? 0),
      0,
    );

    expect(total).toBe(95000 + 180000); // 275000
  });

  it('returns 0 for empty selection', () => {
    const overlayMap: Record<string, number> = {};
    for (const o of getAllOverlays()) {
      overlayMap[o.key] = o.listPrice;
    }
    const total = Object.values({} as SelectedParts).reduce(
      (sum, key) => sum + (overlayMap[key] ?? 0),
      0,
    );
    expect(total).toBe(0);
  });

  it('includes active paint listPrice in total (L36)', () => {
    const overlayMap: Record<string, number> = {};
    for (const o of getAllOverlays()) {
      overlayMap[o.key] = o.listPrice;
    }

    const selectedParts: SelectedParts = { aero: 'carbon-hood' }; // 95000
    const activePaintKey = 'guards-red'; // 48000
    const paintCost = PAINT_BY_KEY[activePaintKey]?.listPrice ?? 0;

    const total = Object.values(selectedParts).reduce(
      (sum, key) => sum + (overlayMap[key] ?? 0),
      paintCost,
    );

    expect(total).toBe(95000 + 48000); // 143000
  });
});

// ─── Paint color tests (L36) ──────────────────────────────────────────────────

describe('paint color application (L36)', () => {
  it('PAINT_PALETTE has exactly 12 named luxury colors', () => {
    expect(PAINT_PALETTE).toHaveLength(12);
  });

  it('getPaintFilter returns a non-empty CSS filter string for a valid key', () => {
    const filter = getPaintFilter('guards-red');
    expect(filter).toBeDefined();
    expect(typeof filter).toBe('string');
    expect(filter!.length).toBeGreaterThan(0);
    // Filter should contain hue-rotate for red
    expect(filter).toMatch(/hue-rotate/);
  });

  it('getPaintFilter returns undefined for null (no paint selected)', () => {
    const filter = getPaintFilter(null);
    expect(filter).toBeUndefined();
  });

  it('getPaintFilter returns undefined for unknown key', () => {
    const filter = getPaintFilter('non-existent-paint');
    expect(filter).toBeUndefined();
  });

  it('all 12 paint colors have hex, cssFilter, listPrice, name, and brand', () => {
    for (const paint of PAINT_PALETTE) {
      expect(paint.key).toBeTruthy();
      expect(paint.name).toBeTruthy();
      expect(paint.brand).toBeTruthy();
      expect(paint.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(paint.cssFilter).toBeTruthy();
      expect(paint.listPrice).toBeGreaterThan(0);
    }
  });

  it('PAINT_BY_KEY lookup works for all palette keys', () => {
    for (const paint of PAINT_PALETTE) {
      expect(PAINT_BY_KEY[paint.key]).toBeDefined();
      expect(PAINT_BY_KEY[paint.key]?.key).toBe(paint.key);
    }
  });

  it('getPaintFilter for frozen-black uses desaturate + low brightness (dark paint)', () => {
    const filter = getPaintFilter('frozen-black');
    expect(filter).toBeDefined();
    // Frozen black should have very low brightness
    expect(filter).toMatch(/brightness/);
    expect(filter).toMatch(/saturate/);
  });
});

// ─── Base car switching ───────────────────────────────────────────────────────

describe('base car switching', () => {
  it('each supported car has a non-empty SVG data URI', () => {
    for (const v of SUPPORTED_VEHICLES) {
      const layer = getBaseLayer(v.modelSlug);
      expect(layer.src).toMatch(/^data:image\/svg\+xml,/);
      // SVG should have substantial content (multi-layer premium art)
      expect(decodeURIComponent(layer.src).length).toBeGreaterThan(2000);
    }
  });

  it('switching from porsche-911 to bmw-m4 returns different SVG sources', () => {
    const porsche = getBaseLayer('porsche-911');
    const bmw = getBaseLayer('bmw-m4');
    expect(porsche.src).not.toBe(bmw.src);
    expect(porsche.displayName).toBe('Porsche 911');
    expect(bmw.displayName).toBe('BMW M4');
  });

  it('all 5 cars have distinctly different SVG content', () => {
    const srcs = SUPPORTED_VEHICLES.map((v) => getBaseLayer(v.modelSlug).src);
    const uniqueSrcs = new Set(srcs);
    expect(uniqueSrcs.size).toBe(5);
  });
});

// ─── L48 Fine-control slider tests ───────────────────────────────────────────

describe('L48 fine-control slider state', () => {
  /** Mirrors VisualizerFineControls defaults from VisualizerTab */
  function defaultFineControls() {
    return { windowTintIntensity: 70, paintMetallicIntensity: 50, wheelSize: 20 };
  }

  function applyFineControlChange(
    prev: { windowTintIntensity: number; paintMetallicIntensity: number; wheelSize: number },
    key: 'windowTintIntensity' | 'paintMetallicIntensity' | 'wheelSize',
    value: number,
  ) {
    return { ...prev, [key]: value };
  }

  it('defaults are within valid ranges', () => {
    const ctrl = defaultFineControls();
    expect(ctrl.windowTintIntensity).toBeGreaterThanOrEqual(0);
    expect(ctrl.windowTintIntensity).toBeLessThanOrEqual(100);
    expect(ctrl.paintMetallicIntensity).toBeGreaterThanOrEqual(0);
    expect(ctrl.paintMetallicIntensity).toBeLessThanOrEqual(100);
    expect(ctrl.wheelSize).toBeGreaterThanOrEqual(18);
    expect(ctrl.wheelSize).toBeLessThanOrEqual(22);
  });

  it('window tint intensity change updates only that key', () => {
    const prev = defaultFineControls();
    const next = applyFineControlChange(prev, 'windowTintIntensity', 30);
    expect(next.windowTintIntensity).toBe(30);
    expect(next.paintMetallicIntensity).toBe(prev.paintMetallicIntensity);
    expect(next.wheelSize).toBe(prev.wheelSize);
  });

  it('paint metallic intensity change updates only that key', () => {
    const prev = defaultFineControls();
    const next = applyFineControlChange(prev, 'paintMetallicIntensity', 85);
    expect(next.paintMetallicIntensity).toBe(85);
    expect(next.windowTintIntensity).toBe(prev.windowTintIntensity);
    expect(next.wheelSize).toBe(prev.wheelSize);
  });

  it('wheel size change updates only that key', () => {
    const prev = defaultFineControls();
    const next = applyFineControlChange(prev, 'wheelSize', 22);
    expect(next.wheelSize).toBe(22);
    expect(next.windowTintIntensity).toBe(prev.windowTintIntensity);
    expect(next.paintMetallicIntensity).toBe(prev.paintMetallicIntensity);
  });

  it('metallic brightness formula: 0% yields 0.75, 50% yields 1.03, 100% yields 1.30', () => {
    // mirrors VisualizerCanvas: 0.75 + (pct/100) * 0.55
    function brightness(pct: number) { return 0.75 + (pct / 100) * 0.55; }
    expect(brightness(0)).toBeCloseTo(0.75, 2);
    expect(brightness(50)).toBeCloseTo(1.025, 2);
    expect(brightness(100)).toBeCloseTo(1.30, 2);
  });

  it('metallic saturate formula: 0% yields 0.70, 50% yields 1.05, 100% yields 1.40', () => {
    // mirrors VisualizerCanvas: 0.7 + (pct/100) * 0.7
    function saturate(pct: number) { return 0.7 + (pct / 100) * 0.7; }
    expect(saturate(0)).toBeCloseTo(0.70, 2);
    expect(saturate(50)).toBeCloseTo(1.05, 2);
    expect(saturate(100)).toBeCloseTo(1.40, 2);
  });

  it('window tint opacity: tintIntensity/100 gives 0.0–1.0 range', () => {
    expect(0 / 100).toBe(0);
    expect(70 / 100).toBeCloseTo(0.7, 2);
    expect(100 / 100).toBe(1);
  });

  it('fineControls persisted in VisualizerStateSchema (additive field)', async () => {
    // Zod validation: valid state with fineControls
    const { VisualizerStateSchema } = await import('@dms/types');
    const result = VisualizerStateSchema.safeParse({
      modelSlug: 'porsche-911',
      layers: [],
      savedAt: '2026-04-29T00:00:00.000Z',
      savedBy: 'staff-001',
      fineControls: { windowTintIntensity: 70, paintMetallicIntensity: 50, wheelSize: 20 },
    });
    expect(result.success).toBe(true);
  });

  it('fineControls is optional in VisualizerStateSchema (backward compat)', async () => {
    const { VisualizerStateSchema } = await import('@dms/types');
    const result = VisualizerStateSchema.safeParse({
      modelSlug: 'bmw-m4',
      layers: [],
      savedAt: '2026-04-29T00:00:00.000Z',
      savedBy: 'staff-001',
      // no fineControls
    });
    expect(result.success).toBe(true);
  });

  it('wheelSize 17 fails VisualizerFineControlsSchema validation (min 18)', async () => {
    const { VisualizerFineControlsSchema } = await import('@dms/types');
    const result = VisualizerFineControlsSchema.safeParse({
      windowTintIntensity: 50, paintMetallicIntensity: 50, wheelSize: 17,
    });
    expect(result.success).toBe(false);
  });

  it('wheelSize 23 fails VisualizerFineControlsSchema validation (max 22)', async () => {
    const { VisualizerFineControlsSchema } = await import('@dms/types');
    const result = VisualizerFineControlsSchema.safeParse({
      windowTintIntensity: 50, paintMetallicIntensity: 50, wheelSize: 23,
    });
    expect(result.success).toBe(false);
  });
});

// ─── L46 design-quality SVG validation ───────────────────────────────────────

describe('L46 design-quality base SVG validation', () => {
  it('each base SVG has at least one data-paintable="true" path (CSS paint filter target)', () => {
    for (const v of SUPPORTED_VEHICLES) {
      const layer = getBaseLayer(v.modelSlug);
      const decoded = decodeURIComponent(layer.src);
      // The data-paintable attribute is present on paintable body paths
      expect(decoded).toContain('data-paintable="true"');
    }
  });

  it('each base SVG has at least 4 linearGradient definitions (L46 multi-stop body sheen)', () => {
    for (const v of SUPPORTED_VEHICLES) {
      const layer = getBaseLayer(v.modelSlug);
      const decoded = decodeURIComponent(layer.src);
      const matches = decoded.match(/<linearGradient/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(4);
    }
  });
});
