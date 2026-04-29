/**
 * Customization catalog tests — SPEC-CUSTOM-BUILDS-001 §36, L78–L82
 *
 * Tests catalog integrity, cost computation, GST, and schema changes.
 *
 * Coverage:
 *   §36 L78: Each catalog has at least 1 stock (₹0) + 3 paid options
 *   §36 L78: Specific option lookups resolve correctly
 *   §36 L81: Cost computation with multiple categories sums correctly
 *   §36 L81: GST 18% additive on customization subtotal
 *   §36 L78: Selecting an option updates schema correctly (OptionId fields)
 *   §36 L80: Decal slot Y-positions are at or above center.y (no floating below body)
 *   §36 L79: Hood + Wing catalogs exist with stock + paid options
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L78–L82
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  WHEEL_OPTIONS,
  TINT_OPTIONS,
  EXHAUST_OPTIONS,
  SUSPENSION_OPTIONS,
  HOOD_OPTIONS,
  WING_OPTIONS,
  DECAL_PRICE_PER_UNIT,
  computeCustomizationCost,
} from '../customization-catalog';
import { VisualizationCustomizationsSchema } from '@dms/types';
import { applyDecals } from '../customization-controller';
import type { DecalEntry } from '../customization-controller';

// ─── Catalog integrity tests ──────────────────────────────────────────────────

describe('WHEEL_OPTIONS catalog integrity (L78)', () => {
  it('has at least 1 stock (₹0) option', () => {
    const stockOptions = WHEEL_OPTIONS.filter((o) => o.price === 0);
    expect(stockOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 paid options', () => {
    const paidOptions = WHEEL_OPTIONS.filter((o) => o.price > 0);
    expect(paidOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('resolves wheel-bronze option correctly (L85 — HRE P101SC 21" Forged Bronze)', () => {
    const opt = WHEEL_OPTIONS.find((o) => o.id === 'wheel-bronze');
    expect(opt).toBeDefined();
    expect(opt?.name).toBe('21" Forged Bronze');
    expect(opt?.price).toBe(245000);
    expect(opt?.finish).toBe('bronze');
    expect(opt?.brand).toBe('HRE P101SC');
    expect(opt?.size).toBe('21"');
  });

  it('resolves wheel-stock as price 0', () => {
    const opt = WHEEL_OPTIONS.find((o) => o.id === 'wheel-stock');
    expect(opt?.price).toBe(0);
  });

  it('first option is stock (₹0) — L82', () => {
    expect(WHEEL_OPTIONS[0]?.price).toBe(0);
  });
});

describe('TINT_OPTIONS catalog integrity (L78)', () => {
  it('has at least 1 stock (₹0) option', () => {
    const stockOptions = TINT_OPTIONS.filter((o) => o.price === 0);
    expect(stockOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 paid options', () => {
    const paidOptions = TINT_OPTIONS.filter((o) => o.price > 0);
    expect(paidOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('resolves tint-dark-smoke correctly', () => {
    const opt = TINT_OPTIONS.find((o) => o.id === 'tint-dark-smoke');
    expect(opt).toBeDefined();
    expect(opt?.price).toBe(32000);
    expect(opt?.level).toBe(70);
  });

  it('first option is stock (₹0) — L82', () => {
    expect(TINT_OPTIONS[0]?.price).toBe(0);
  });
});

describe('EXHAUST_OPTIONS catalog integrity (L78)', () => {
  it('has at least 1 stock (₹0) option', () => {
    const stockOptions = EXHAUST_OPTIONS.filter((o) => o.price === 0);
    expect(stockOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 paid options', () => {
    const paidOptions = EXHAUST_OPTIONS.filter((o) => o.price > 0);
    expect(paidOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('resolves exh-akrapovic with mufflerDeleted=true (L87 — Akrapovic Race)', () => {
    const opt = EXHAUST_OPTIONS.find((o) => o.id === 'exh-akrapovic');
    expect(opt).toBeDefined();
    expect(opt?.mufflerDeleted).toBe(true);
    expect(opt?.price).toBe(485000);
    expect(opt?.brand).toBe('Akrapovic');
  });

  it('first option is stock (₹0) — L82', () => {
    expect(EXHAUST_OPTIONS[0]?.price).toBe(0);
  });
});

describe('SUSPENSION_OPTIONS catalog integrity (L78)', () => {
  it('has at least 1 stock (₹0) option', () => {
    const stockOptions = SUSPENSION_OPTIONS.filter((o) => o.price === 0);
    expect(stockOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 paid options', () => {
    const paidOptions = SUSPENSION_OPTIONS.filter((o) => o.price > 0);
    expect(paidOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('resolves susp-coilovers-40 correctly', () => {
    const opt = SUSPENSION_OPTIONS.find((o) => o.id === 'susp-coilovers-40');
    expect(opt).toBeDefined();
    expect(opt?.price).toBe(285000);
    expect(opt?.loweringMm).toBe(40);
  });

  it('first option is stock (₹0) — L82', () => {
    expect(SUSPENSION_OPTIONS[0]?.price).toBe(0);
  });
});

describe('HOOD_OPTIONS catalog integrity (L79)', () => {
  it('has at least 1 stock (₹0) option', () => {
    const stockOptions = HOOD_OPTIONS.filter((o) => o.price === 0);
    expect(stockOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 paid options', () => {
    const paidOptions = HOOD_OPTIONS.filter((o) => o.price > 0);
    expect(paidOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('resolves hood-carbon-twill correctly (L83 — Capristo Twill Carbon)', () => {
    const opt = HOOD_OPTIONS.find((o) => o.id === 'hood-carbon-twill');
    expect(opt).toBeDefined();
    expect(opt?.name).toBe('Twill Carbon Bonnet');
    expect(opt?.price).toBe(285000);
    expect(opt?.brand).toBe('Capristo');
    expect(opt?.weightSavingKg).toBe(8.5);
  });

  it('first option is stock (₹0) — L82', () => {
    expect(HOOD_OPTIONS[0]?.price).toBe(0);
  });
});

describe('WING_OPTIONS catalog integrity (L79)', () => {
  it('has at least 1 stock (₹0) option', () => {
    const stockOptions = WING_OPTIONS.filter((o) => o.price === 0);
    expect(stockOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 3 paid options', () => {
    const paidOptions = WING_OPTIONS.filter((o) => o.price > 0);
    expect(paidOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('resolves wing-gt3-replica correctly (L84 — Misha Designs GT3-Style)', () => {
    const opt = WING_OPTIONS.find((o) => o.id === 'wing-gt3-replica');
    expect(opt).toBeDefined();
    expect(opt?.name).toBe('GT3-Style Adjustable Wing');
    expect(opt?.price).toBe(285000);
    expect(opt?.brand).toBe('Misha Designs');
    expect(opt?.adjustable).toBe(true);
    expect(opt?.downforceKgAt200).toBe(18);
  });

  it('first option is stock (₹0) — L82', () => {
    expect(WING_OPTIONS[0]?.price).toBe(0);
  });
});

// ─── Cost computation tests ────────────────────────────────────────────────────

describe('computeCustomizationCost (L81)', () => {
  it('returns all-zero when no options selected', () => {
    const result = computeCustomizationCost({});
    expect(result.subtotal).toBe(0);
    expect(result.gst).toBe(0);
    expect(result.total).toBe(0);
  });

  it('computes correct subtotal for 3 categories (L85/L83)', () => {
    // wheel-bronze: 245000, tint-dark-smoke: 32000, hood-carbon-twill: 285000
    const result = computeCustomizationCost({
      wheelOptionId: 'wheel-bronze',
      tintOptionId: 'tint-dark-smoke',
      hoodOptionId: 'hood-carbon-twill',
    });
    const expectedSubtotal = 245000 + 32000 + 285000;
    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.wheelPrice).toBe(245000);
    expect(result.tintPrice).toBe(32000);
    expect(result.hoodPrice).toBe(285000);
  });

  it('GST is 18% of subtotal (rounded to integer)', () => {
    const result = computeCustomizationCost({
      wheelOptionId: 'wheel-bronze', // 245000
    });
    const expectedGst = Math.round(245000 * 0.18);
    expect(result.gst).toBe(expectedGst);
  });

  it('total = subtotal + gst', () => {
    const result = computeCustomizationCost({
      exhaustOptionId: 'exh-akrapovic', // 485000
      suspensionOptionId: 'susp-coilovers-clubsport', // 425000
    });
    expect(result.total).toBe(result.subtotal + result.gst);
  });

  it('decal cost = count * DECAL_PRICE_PER_UNIT', () => {
    const result = computeCustomizationCost({ decalCount: 3 });
    expect(result.decalPrice).toBe(3 * DECAL_PRICE_PER_UNIT);
    expect(result.subtotal).toBe(3 * DECAL_PRICE_PER_UNIT);
  });

  it('paint price flows into subtotal', () => {
    const result = computeCustomizationCost({ paintPrice: 65000 });
    expect(result.paintPrice).toBe(65000);
    expect(result.subtotal).toBe(65000);
  });

  it('stock options (₹0) contribute zero to subtotal', () => {
    const result = computeCustomizationCost({
      wheelOptionId: 'wheel-stock',
      tintOptionId: 'tint-stock',
      exhaustOptionId: 'exh-stock',
      suspensionOptionId: 'susp-stock',
      hoodOptionId: 'hood-stock',
      wingOptionId: 'wing-stock',
    });
    expect(result.subtotal).toBe(0);
  });

  it('full build — all categories selected — totals correctly (L89)', () => {
    // paint: 65000, wheel-bronze: 245000, tint-dark-smoke: 32000,
    // exh-carbon: 165000, susp-coilovers-40: 285000,
    // hood-carbon-twill: 285000, wing-gt3-replica: 285000, decals x2: 10000
    const result = computeCustomizationCost({
      paintPrice: 65000,
      wheelOptionId: 'wheel-bronze',
      tintOptionId: 'tint-dark-smoke',
      exhaustOptionId: 'exh-carbon',
      suspensionOptionId: 'susp-coilovers-40',
      hoodOptionId: 'hood-carbon-twill',
      wingOptionId: 'wing-gt3-replica',
      decalCount: 2,
    });
    const expectedSubtotal = 65000 + 245000 + 32000 + 165000 + 285000 + 285000 + 285000 + 10000;
    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.gst).toBe(Math.round(expectedSubtotal * 0.18));
    expect(result.total).toBe(result.subtotal + result.gst);
  });
});

// ─── Schema tests for new optionId fields ─────────────────────────────────────

describe('VisualizationCustomizationsSchema — new optionId fields (L78)', () => {
  it('parses wheelOptionId, tintOptionId, exhaustOptionId correctly', () => {
    const result = VisualizationCustomizationsSchema.safeParse({
      wheelOptionId: 'wheel-bronze',
      tintOptionId: 'tint-dark-smoke',
      exhaustOptionId: 'exh-akrapovic',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wheelOptionId).toBe('wheel-bronze');
      expect(result.data.tintOptionId).toBe('tint-dark-smoke');
      expect(result.data.exhaustOptionId).toBe('exh-akrapovic');
    }
  });

  it('parses hoodOptionId and wingOptionId (P3.3.6 — L83, L84)', () => {
    const result = VisualizationCustomizationsSchema.safeParse({
      hoodOptionId: 'hood-carbon-twill',
      wingOptionId: 'wing-gt3-replica',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hoodOptionId).toBe('hood-carbon-twill');
      expect(result.data.wingOptionId).toBe('wing-gt3-replica');
    }
  });

  it('backward-compatible: parses empty object (all optionIds undefined)', () => {
    const result = VisualizationCustomizationsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hoodOptionId).toBeUndefined();
      expect(result.data.wingOptionId).toBeUndefined();
      expect(result.data.wheelOptionId).toBeUndefined();
    }
  });

  it('parses aero object with hood + wing (L83, L84)', () => {
    const result = VisualizationCustomizationsSchema.safeParse({
      aero: { hood: 'hood-carbon-twill', wing: 'wing-gt3-replica' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aero?.hood).toBe('hood-carbon-twill');
      expect(result.data.aero?.wing).toBe('wing-gt3-replica');
    }
  });
});

// ─── Decal slot Y-position test (Bug 1 regression — L80) ─────────────────────

describe('applyDecals — slot Y-positions at or above body center (L80)', () => {
  const mockSrcMap: Record<string, string> = {
    'bn-logo': 'data:image/svg+xml;base64,PHN2Zy8+',
  };

  function makeBodyOnlyScene(height = 1.2, length = 4.5, width = 2.0): THREE.Group {
    // Build a scene that ONLY has the body mesh — no contact shadows, lights etc.
    // Body mesh centered at origin, bottom at Y=0
    const scene = new THREE.Group();
    const geom = new THREE.BoxGeometry(width, height, length);
    const mat = new THREE.MeshStandardMaterial({ name: 'body_paint' });
    const bodyMesh = new THREE.Mesh(geom, mat);
    bodyMesh.name = 'body';
    bodyMesh.position.set(0, height / 2, 0); // center at height/2
    scene.add(bodyMesh);
    return scene;
  }

  function makeSceneWithShadow(height = 1.2, length = 4.5, width = 2.0): THREE.Group {
    // Simulate what R3F scene looks like: body mesh + a shadow plane at Y=-0.05
    const scene = new THREE.Group();

    const bodyGeom = new THREE.BoxGeometry(width, height, length);
    const bodyMat = new THREE.MeshStandardMaterial({ name: 'body_paint' });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.name = 'body';
    bodyMesh.position.set(0, height / 2, 0);
    scene.add(bodyMesh);

    // Contact shadow — large flat plane at Y=-0.05 (below ground)
    const shadowGeom = new THREE.PlaneGeometry(20, 20);
    const shadowMat = new THREE.MeshBasicMaterial({ name: 'contact_shadow' });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.name = 'contact_shadows_helper';
    shadowMesh.position.set(0, -0.05, 0);
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);

    return scene;
  }

  it('door-left decal Y >= body center Y (not below body)', () => {
    const scene = makeBodyOnlyScene(1.2);
    const decals: DecalEntry[] = [{ slot: 'door-left', decalId: 'bn-logo', rotation: '0' }];
    applyDecals(scene, decals, 'ferrari', mockSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-door-left')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    // Body center.y = 0.6 (height/2). Decal should be at or above center.y
    // L80: position is center.y + sy * 0.05, so 0.6 + 0.06 = 0.66
    expect(decalMesh!.position.y).toBeGreaterThanOrEqual(0.6);
  });

  it('door-right decal Y >= body center Y', () => {
    const scene = makeBodyOnlyScene(1.2);
    const decals: DecalEntry[] = [{ slot: 'door-right', decalId: 'bn-logo', rotation: '0' }];
    applyDecals(scene, decals, 'ferrari', mockSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-door-right')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    expect(decalMesh!.position.y).toBeGreaterThanOrEqual(0.6);
  });

  it('door slots are at upper panel not lower rocker — Y above scene center', () => {
    // With body centered at height/2, decal Y should be above height/2 (upper panel)
    const height = 1.2;
    const scene = makeBodyOnlyScene(height);
    const decals: DecalEntry[] = [{ slot: 'door-left', decalId: 'bn-logo', rotation: '0' }];
    applyDecals(scene, decals, 'ferrari', mockSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-door-left')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    // Should be above body center (height/2 = 0.6)
    expect(decalMesh!.position.y).toBeGreaterThan(height / 2);
  });

  it('with ContactShadow in scene — slot positions still land on body (body group isolation)', () => {
    // This is the Bug 1 regression test: even with a large shadow plane in the scene,
    // decals should be placed on the body, not below it.
    const height = 1.2;
    const scene = makeSceneWithShadow(height);

    // Without Bug 1 fix, setFromObject(scene) would include shadow at Y=-0.05,
    // making center.y lower and placing decals below the car.
    // With fix, we use body group bounding box only.
    const decals: DecalEntry[] = [{ slot: 'door-left', decalId: 'bn-logo', rotation: '0' }];
    applyDecals(scene, decals, 'ferrari', mockSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-door-left')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    // Decal must be on the body, not below ground (Y > 0)
    expect(decalMesh!.position.y).toBeGreaterThan(0);
    // And above body center
    expect(decalMesh!.position.y).toBeGreaterThanOrEqual(height / 2);
  });

  it('hood decal Y >= box.max.y - 0.1 (near top of body)', () => {
    const height = 1.2;
    const scene = makeBodyOnlyScene(height);
    const decals: DecalEntry[] = [{ slot: 'hood', decalId: 'bn-logo', rotation: '0' }];
    applyDecals(scene, decals, 'ferrari', mockSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-hood')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    // Hood should be near top of body (Y close to max.y = 1.2)
    expect(decalMesh!.position.y).toBeGreaterThan(height * 0.8);
  });
});

// ─── §37 Expanded catalog count tests (L83–L88) ───────────────────────────────

describe('§37 L83: HOOD_OPTIONS expanded to 6 options', () => {
  it('has exactly 6 options', () => {
    expect(HOOD_OPTIONS.length).toBe(6);
  });

  it('stock option (₹0) is first', () => {
    expect(HOOD_OPTIONS[0]?.price).toBe(0);
    expect(HOOD_OPTIONS[0]?.id).toBe('hood-stock');
  });

  it('all options have brand field', () => {
    for (const opt of HOOD_OPTIONS) {
      expect(opt.brand, `${opt.id} is missing brand`).toBeTruthy();
    }
  });
});

describe('§37 L84: WING_OPTIONS expanded to 7 options', () => {
  it('has exactly 7 options', () => {
    expect(WING_OPTIONS.length).toBe(7);
  });

  it('stock option (₹0) is first', () => {
    expect(WING_OPTIONS[0]?.price).toBe(0);
    expect(WING_OPTIONS[0]?.id).toBe('wing-stock');
  });

  it('all options have brand field', () => {
    for (const opt of WING_OPTIONS) {
      expect(opt.brand, `${opt.id} is missing brand`).toBeTruthy();
    }
  });

  it('swan-neck GT wing has raceSpec + adjustable flags', () => {
    const opt = WING_OPTIONS.find((o) => o.id === 'wing-swan-neck');
    expect(opt).toBeDefined();
    expect(opt?.raceSpec).toBe(true);
    expect(opt?.adjustable).toBe(true);
    expect(opt?.brand).toBe('APR Performance');
    expect(opt?.downforceKgAt200).toBe(35);
  });
});

describe('§37 L85: WHEEL_OPTIONS expanded to 8 options', () => {
  it('has exactly 8 options', () => {
    expect(WHEEL_OPTIONS.length).toBe(8);
  });

  it('stock option (₹0) is first', () => {
    expect(WHEEL_OPTIONS[0]?.price).toBe(0);
    expect(WHEEL_OPTIONS[0]?.id).toBe('wheel-stock');
  });

  it('all options have brand and size fields', () => {
    for (const opt of WHEEL_OPTIONS) {
      expect(opt.brand, `${opt.id} is missing brand`).toBeTruthy();
      expect(opt.size, `${opt.id} is missing size`).toBeTruthy();
    }
  });

  it('Michelin set has tireSet flag', () => {
    const opt = WHEEL_OPTIONS.find((o) => o.id === 'wheel-michelin-pilot');
    expect(opt?.tireSet).toBe(true);
    expect(opt?.brand).toBe('Michelin');
  });
});

describe('§37 L86: TINT_OPTIONS expanded to 9 options with VLT field', () => {
  it('has exactly 9 options', () => {
    expect(TINT_OPTIONS.length).toBe(9);
  });

  it('stock option (₹0) is first', () => {
    expect(TINT_OPTIONS[0]?.price).toBe(0);
    expect(TINT_OPTIONS[0]?.id).toBe('tint-stock');
  });

  it('all tint options have VLT field', () => {
    for (const opt of TINT_OPTIONS) {
      expect(opt.vlt, `${opt.id} is missing vlt`).toBeDefined();
      expect(typeof opt.vlt).toBe('number');
    }
  });

  it('stock tint has VLT 100%', () => {
    const stock = TINT_OPTIONS.find((o) => o.id === 'tint-stock');
    expect(stock?.vlt).toBe(100);
  });

  it('XPel PPF combo has includesPpf flag', () => {
    const opt = TINT_OPTIONS.find((o) => o.id === 'tint-ppf-clear');
    expect(opt?.includesPpf).toBe(true);
    expect(opt?.brand).toBe('XPel Stealth');
  });
});

describe('§37 L87: EXHAUST_OPTIONS expanded to 8 options', () => {
  it('has exactly 8 options', () => {
    expect(EXHAUST_OPTIONS.length).toBe(8);
  });

  it('stock option (₹0) is first', () => {
    expect(EXHAUST_OPTIONS[0]?.price).toBe(0);
    expect(EXHAUST_OPTIONS[0]?.id).toBe('exh-stock');
  });

  it('all options have brand field', () => {
    for (const opt of EXHAUST_OPTIONS) {
      expect(opt.brand, `${opt.id} is missing brand`).toBeTruthy();
    }
  });

  it('iPE Innotech has valvetronic flag', () => {
    const opt = EXHAUST_OPTIONS.find((o) => o.id === 'exh-iPE');
    expect(opt?.valvetronic).toBe(true);
    expect(opt?.brand).toBe('iPE Innotech');
  });

  it('Akrapovic Evolution does NOT have mufflerDeleted', () => {
    const opt = EXHAUST_OPTIONS.find((o) => o.id === 'exh-akrapovic-evolution');
    expect(opt?.mufflerDeleted).toBe(false);
    expect(opt?.brand).toBe('Akrapovic');
    expect(opt?.weightSavingKg).toBe(16);
  });
});

describe('§37 L88: SUSPENSION_OPTIONS expanded to 7 options', () => {
  it('has exactly 7 options', () => {
    expect(SUSPENSION_OPTIONS.length).toBe(7);
  });

  it('stock option (₹0) is first', () => {
    expect(SUSPENSION_OPTIONS[0]?.price).toBe(0);
    expect(SUSPENSION_OPTIONS[0]?.id).toBe('susp-stock');
  });

  it('all options have brand field', () => {
    for (const opt of SUSPENSION_OPTIONS) {
      expect(opt.brand, `${opt.id} is missing brand`).toBeTruthy();
    }
  });

  it('Air Lift 3P has airRide flag', () => {
    const opt = SUSPENSION_OPTIONS.find((o) => o.id === 'susp-airride');
    expect(opt?.airRide).toBe(true);
    expect(opt?.brand).toBe('Air Lift');
    expect(opt?.adjustable).toBe(true);
  });

  it('KW Clubsport has raceSpec + adjustable flags', () => {
    const opt = SUSPENSION_OPTIONS.find((o) => o.id === 'susp-coilovers-clubsport');
    expect(opt?.raceSpec).toBe(true);
    expect(opt?.adjustable).toBe(true);
    expect(opt?.brand).toBe('KW Suspensions');
  });
});

describe('§37 L89: computeCustomizationCost aggregates ALL categories (full customization total)', () => {
  it('sums all 6 catalog categories + paint + decals correctly', () => {
    // Use first paid option from each catalog
    const result = computeCustomizationCost({
      paintPrice: 42000,
      wheelOptionId: 'wheel-gunmetal',      // 145000
      tintOptionId: 'tint-light-smoke',      // 18000
      exhaustOptionId: 'exh-twin-polished',  // 95000
      suspensionOptionId: 'susp-eibach-15',  // 65000
      hoodOptionId: 'hood-carbon-twill',     // 285000
      wingOptionId: 'wing-lip',              // 65000
      decalCount: 1,                         // 5000
    });
    const expectedSubtotal = 42000 + 145000 + 18000 + 95000 + 65000 + 285000 + 65000 + 5000;
    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.total).toBe(result.subtotal + Math.round(result.subtotal * 0.18));
  });

  it('returns zero total when only stock options selected', () => {
    const result = computeCustomizationCost({
      wheelOptionId: 'wheel-stock',
      tintOptionId: 'tint-stock',
      exhaustOptionId: 'exh-stock',
      suspensionOptionId: 'susp-stock',
      hoodOptionId: 'hood-stock',
      wingOptionId: 'wing-stock',
      decalCount: 0,
    });
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});
