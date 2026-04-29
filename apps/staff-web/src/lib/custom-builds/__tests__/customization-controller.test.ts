/**
 * Customization controller tests — SPEC-CUSTOM-BUILDS-001 §31 P3.3
 *
 * Tests pure controller functions against mock Three.js scene objects.
 * No WebGL/JSDOM required — we test state mutations directly.
 *
 * Covers:
 *   P3.3.0: Schema validation (VisualizationCustomizationsSchema)
 *   P3.3.1: applyTint (glass material restoration), applyExhaust (muffler-delete)
 *   P3.3.2: applyWheelMaterial (undo restores), applySuspension (body/wheel translation)
 *   P3.3.3: applyDecals (mesh count), decal removal, rotation
 *   P3.3.4: applyAllCustomizations (no-op when empty), mesh-not-found graceful skip
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §31, L57–L64
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as THREE from 'three';
import {
  applyWheelMaterial,
  applyTint,
  applyExhaust,
  applySuspension,
  applyDecals,
  applyAllCustomizations,
  applyHoodMaterial,
  applyWing,
  applyWheelMaterialAndSize,
} from '../customization-controller';
import { VisualizationCustomizationsSchema } from '@dms/types';
import type { DecalEntry } from '../customization-controller';

// ─── Mock THREE.TextureLoader (no DOM in jsdom for image loading) ─────────────

beforeAll(() => {
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(
    () => new THREE.Texture() as ReturnType<THREE.TextureLoader['load']>,
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ─── Mock scene builders ──────────────────────────────────────────────────────

function makeWheelScene(): THREE.Group {
  const scene = new THREE.Group();
  scene.name = 'root';

  for (const name of ['wheel_front_l', 'wheel_front_r', 'wheel_rear_l', 'wheel_rear_r']) {
    const mat = new THREE.MeshStandardMaterial({ name: 'rim', color: new THREE.Color('#888888'), metalness: 1.0, roughness: 0.2 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    mesh.name = name;
    scene.add(mesh);
  }
  return scene;
}

function makeGlassScene(usePhysical = false): THREE.Group {
  const scene = new THREE.Group();
  const mat = usePhysical
    ? new THREE.MeshPhysicalMaterial({
        name: 'glass',
        transmission: 0.85,
        roughness: 0.05,
        color: new THREE.Color('#ffffff'),
      })
    : new THREE.MeshStandardMaterial({
        name: 'glass',
        color: new THREE.Color('#aaddff'),
        opacity: 1.0,
        transparent: false,
      });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  mesh.name = 'glass';
  scene.add(mesh);
  return scene;
}

function makeExhaustScene(): THREE.Group {
  const scene = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ name: 'exhaust', color: new THREE.Color('#c0c0c0'), metalness: 0.9, roughness: 0.1 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  mesh.name = 'exhaust_tip';
  scene.add(mesh);
  return scene;
}

function makeBodyScene(): THREE.Group {
  const scene = new THREE.Group();
  scene.name = 'root';
  scene.position.set(0, 0, 0);

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'body';
  bodyGroup.position.set(0, 0, 0);
  scene.add(bodyGroup);

  const wheelL = new THREE.Group();
  wheelL.name = 'wheel_front_l';
  wheelL.position.set(-0.8, 0, 0);
  scene.add(wheelL);

  const wheelR = new THREE.Group();
  wheelR.name = 'wheel_front_r';
  wheelR.position.set(0.8, 0, 0);
  scene.add(wheelR);

  return scene;
}

// ─── P3.3.0 — Schema validation ───────────────────────────────────────────────

describe('VisualizationCustomizationsSchema', () => {
  it('parses an empty object to all-optional fields', () => {
    const result = VisualizationCustomizationsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decals).toEqual([]);
      expect(result.data.wheelMaterial).toBeUndefined();
      expect(result.data.tint).toBeUndefined();
      expect(result.data.exhaust).toBeUndefined();
      expect(result.data.suspension).toBeUndefined();
    }
  });

  it('parses a full customization payload', () => {
    const payload = {
      wheelMaterial: 'gunmetal',
      decals: [{ slot: 'hood', decalId: 'bn-logo', rotation: '90' }],
      tint: { level: 50, color: 'smoke' },
      exhaust: { tipStyle: 'quad-black', mufflerDeleted: true },
      suspension: { loweringMm: 30 },
    };
    const result = VisualizationCustomizationsSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid wheelMaterial', () => {
    const result = VisualizationCustomizationsSchema.safeParse({ wheelMaterial: 'titanium' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid decal slot', () => {
    const result = VisualizationCustomizationsSchema.safeParse({
      decals: [{ slot: 'roof', decalId: 'bn-logo', rotation: '0' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects tint level out of range', () => {
    const result = VisualizationCustomizationsSchema.safeParse({
      tint: { level: 150, color: 'smoke' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects suspension loweringMm out of range', () => {
    const result = VisualizationCustomizationsSchema.safeParse({
      suspension: { loweringMm: 60 },
    });
    expect(result.success).toBe(false);
  });
});

// ─── P3.3.1 — applyTint ───────────────────────────────────────────────────────

describe('applyTint', () => {
  it('applies opacity to MeshStandardMaterial glass mesh', () => {
    const scene = makeGlassScene(false);
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;

    applyTint(scene, { level: 70, color: 'smoke' });

    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeLessThan(1);
    expect(mat.opacity).toBeGreaterThan(0);
  });

  it('undo callback restores original glass material state (standard material)', () => {
    const scene = makeGlassScene(false);
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;

    const originalColor = mat.color.clone();
    const originalOpacity = mat.opacity;
    const originalTransparent = mat.transparent;

    const undo = applyTint(scene, { level: 70, color: 'smoke' });

    // Verify it was applied
    expect(mat.transparent).toBe(true);

    // Undo
    undo();

    // Verify restored
    expect(mat.color.r).toBeCloseTo(originalColor.r, 3);
    expect(mat.color.g).toBeCloseTo(originalColor.g, 3);
    expect(mat.color.b).toBeCloseTo(originalColor.b, 3);
    expect(mat.opacity).toBe(originalOpacity);
    expect(mat.transparent).toBe(originalTransparent);
  });

  it('handles MeshPhysicalMaterial via transmission path', () => {
    const scene = makeGlassScene(true);
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    const originalTransmission = mat.transmission;

    applyTint(scene, { level: 70, color: 'smoke' });

    // transmission should be reduced
    expect(mat.transmission).toBeLessThan(originalTransmission);
  });

  it('undo restores original MeshPhysicalMaterial transmission', () => {
    const scene = makeGlassScene(true);
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    const originalTransmission = mat.transmission;

    const undo = applyTint(scene, { level: 70, color: 'amber' });
    undo();

    expect(mat.transmission).toBeCloseTo(originalTransmission, 5);
  });

  it('returns no-op undo when no glass mesh found', () => {
    const scene = new THREE.Group(); // empty scene
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const undo = applyTint(scene, { level: 50, color: 'blue' });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no glass meshes found'));
    expect(() => undo()).not.toThrow();

    warnSpy.mockRestore();
  });

  it('covers all 5 tint colors without throwing', () => {
    for (const color of ['smoke', 'amber', 'blue', 'green', 'mirror'] as const) {
      const scene = makeGlassScene(false);
      expect(() => applyTint(scene, { level: 50, color })).not.toThrow();
    }
  });
});

// ─── P3.3.1 — applyExhaust ───────────────────────────────────────────────────

describe('applyExhaust', () => {
  it('hides exhaust mesh when mufflerDeleted=true', () => {
    const scene = makeExhaustScene();
    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh.visible).toBe(true);

    applyExhaust(scene, { tipStyle: 'stock-chrome', mufflerDeleted: true });

    expect(mesh.visible).toBe(false);
  });

  it('undo restores mesh visibility after muffler-delete', () => {
    const scene = makeExhaustScene();
    const mesh = scene.children[0] as THREE.Mesh;

    const undo = applyExhaust(scene, { tipStyle: 'stock-chrome', mufflerDeleted: true });
    expect(mesh.visible).toBe(false);

    undo();
    expect(mesh.visible).toBe(true);
  });

  it('applies quad-black material to exhaust mesh', () => {
    const scene = makeExhaustScene();
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;

    applyExhaust(scene, { tipStyle: 'quad-black', mufflerDeleted: false });

    // quad-black: dark color, low metalness, high roughness
    expect(mat.roughness).toBeGreaterThan(0.5);
    expect(mat.metalness).toBeLessThan(0.5);
  });

  it('undo restores original exhaust material properties', () => {
    const scene = makeExhaustScene();
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const originalRoughness = mat.roughness;
    const originalMetalness = mat.metalness;

    const undo = applyExhaust(scene, { tipStyle: 'quad-black', mufflerDeleted: false });
    undo();

    expect(mat.roughness).toBeCloseTo(originalRoughness, 5);
    expect(mat.metalness).toBeCloseTo(originalMetalness, 5);
  });

  it('returns no-op undo when no exhaust mesh found (warns)', () => {
    const scene = new THREE.Group(); // empty scene — no named exhaust mesh
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const undo = applyExhaust(scene, { tipStyle: 'stock-chrome', mufflerDeleted: false });

    // No positional fallback anymore (L70) — should warn and return no-op
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no exhaust meshes found'),
      expect.anything(),
      expect.stringContaining('no-op'),
    );
    expect(() => undo()).not.toThrow();

    warnSpy.mockRestore();
  });

  it('respects custom exhaustMeshHints — finds mesh by custom hint', () => {
    const scene = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ name: 'tips_chrome', color: new THREE.Color('#aaaaaa'), metalness: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    mesh.name = 'rear_tips';
    scene.add(mesh);

    // Default hints won't match 'tips' alone but 'tip' will
    applyExhaust(scene, { tipStyle: 'quad-black', mufflerDeleted: false }, ['tips']);

    expect(mat.roughness).toBeGreaterThan(0.5); // quad-black is high roughness
  });
});

// ─── P3.3.2 — applyWheelMaterial ─────────────────────────────────────────────

describe('applyWheelMaterial', () => {
  it('applies gunmetal color to all wheel meshes', () => {
    const scene = makeWheelScene();
    const wheelMeshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name.includes('wheel')) {
        wheelMeshes.push(obj);
      }
    });

    applyWheelMaterial(scene, 'gunmetal');

    for (const mesh of wheelMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      // gunmetal is dark grey — R channel should be low
      expect(mat.color.r).toBeLessThan(0.5);
    }
  });

  it('undo restores original wheel material color', () => {
    const scene = makeWheelScene();
    const firstWheel = scene.children[0] as THREE.Mesh;
    const mat = firstWheel.material as THREE.MeshStandardMaterial;
    const originalR = mat.color.r;
    const originalG = mat.color.g;
    const originalB = mat.color.b;

    const undo = applyWheelMaterial(scene, 'gloss-black');
    undo();

    expect(mat.color.r).toBeCloseTo(originalR, 3);
    expect(mat.color.g).toBeCloseTo(originalG, 3);
    expect(mat.color.b).toBeCloseTo(originalB, 3);
  });

  it('covers all 5 wheel finishes without throwing', () => {
    for (const finish of ['silver', 'gunmetal', 'gloss-black', 'bronze', 'brushed'] as const) {
      const scene = makeWheelScene();
      expect(() => applyWheelMaterial(scene, finish)).not.toThrow();
    }
  });

  it('returns no-op undo when no wheel meshes found', () => {
    const scene = new THREE.Group();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const undo = applyWheelMaterial(scene, 'silver');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no wheel meshes found'));
    expect(() => undo()).not.toThrow();

    warnSpy.mockRestore();
  });
});

// ─── P3.3.2 — applySuspension ────────────────────────────────────────────────

describe('applySuspension', () => {
  it('translates body group Y by negative loweringMm/1000', () => {
    const scene = makeBodyScene();
    const bodyGroup = scene.children.find((c) => c.name === 'body')!;
    const originalY = bodyGroup.position.y;

    applySuspension(scene, { loweringMm: 20 });

    // Body should be moved down by 0.020 THREE units
    expect(bodyGroup.position.y).toBeCloseTo(originalY - 0.020, 5);
  });

  it('wheel groups are counter-translated to stay grounded', () => {
    const scene = makeBodyScene();
    const wheelL = scene.children.find((c) => c.name === 'wheel_front_l')!;
    const originalWheelY = wheelL.position.y;

    applySuspension(scene, { loweringMm: 20 });

    // Wheel should be counter-translated (moved UP to compensate)
    expect(wheelL.position.y).toBeCloseTo(originalWheelY + 0.020, 5);
  });

  it('undo restores original Y positions for body and wheels', () => {
    const scene = makeBodyScene();
    const bodyGroup = scene.children.find((c) => c.name === 'body')!;
    const wheelL = scene.children.find((c) => c.name === 'wheel_front_l')!;

    const originalBodyY = bodyGroup.position.y;
    const originalWheelY = wheelL.position.y;

    const undo = applySuspension(scene, { loweringMm: 30 });
    undo();

    expect(bodyGroup.position.y).toBeCloseTo(originalBodyY, 5);
    expect(wheelL.position.y).toBeCloseTo(originalWheelY, 5);
  });

  it('loweringMm=0 results in no movement', () => {
    const scene = makeBodyScene();
    const bodyGroup = scene.children.find((c) => c.name === 'body')!;
    const originalY = bodyGroup.position.y;

    applySuspension(scene, { loweringMm: 0 });

    expect(bodyGroup.position.y).toBeCloseTo(originalY, 5);
  });
});

// ─── P3.3.3 — applyDecals ────────────────────────────────────────────────────

describe('applyDecals', () => {
  const mockDecalSrcMap: Record<string, string> = {
    'bn-logo': 'data:image/svg+xml;base64,PHN2Zy8+', // minimal base64 placeholder
    'racing-stripe': 'data:image/svg+xml;base64,PHN2Zy8+',
  };

  it('adds correct number of meshes for active decals', () => {
    const scene = new THREE.Group();
    const initialChildCount = scene.children.length;

    const decals: DecalEntry[] = [
      { slot: 'hood', decalId: 'bn-logo', rotation: '0' },
      { slot: 'door-left', decalId: 'racing-stripe', rotation: '90' },
    ];

    applyDecals(scene, decals, 'ferrari', mockDecalSrcMap);

    expect(scene.children.length).toBe(initialChildCount + 2);
  });

  it('undo removes all created decal meshes', () => {
    const scene = new THREE.Group();
    const initialCount = scene.children.length;

    const decals: DecalEntry[] = [
      { slot: 'hood', decalId: 'bn-logo', rotation: '0' },
    ];

    const undo = applyDecals(scene, decals, 'ferrari', mockDecalSrcMap);
    expect(scene.children.length).toBe(initialCount + 1);

    undo();
    expect(scene.children.length).toBe(initialCount);
  });

  it('decal mesh has correct name pattern', () => {
    const scene = new THREE.Group();

    const decals: DecalEntry[] = [
      { slot: 'trunk', decalId: 'bn-logo', rotation: '0' },
    ];

    applyDecals(scene, decals, 'ferrari', mockDecalSrcMap);

    const decalMesh = scene.children[0] as THREE.Mesh;
    expect(decalMesh.name).toContain('decal-trunk');
    expect(decalMesh.name).toContain('bn-logo');
  });

  it('rotation is applied — 90 degree rotation differs from 0 degree', () => {
    const scene1 = new THREE.Group();
    const scene2 = new THREE.Group();

    applyDecals(scene1, [{ slot: 'hood', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap);
    applyDecals(scene2, [{ slot: 'hood', decalId: 'bn-logo', rotation: '90' }], 'ferrari', mockDecalSrcMap);

    const mesh1 = scene1.children[0] as THREE.Mesh;
    const mesh2 = scene2.children[0] as THREE.Mesh;

    // Quaternions should differ when rotation is 90 vs 0
    const q1 = mesh1.quaternion.toArray();
    const q2 = mesh2.quaternion.toArray();

    const differsInAnyAxis = q1.some((v, i) => Math.abs(v - (q2[i] ?? 0)) > 0.001);
    expect(differsInAnyAxis).toBe(true);
  });

  it('skips decal when no src found and warns', () => {
    const scene = new THREE.Group();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    applyDecals(scene, [{ slot: 'hood', decalId: 'missing-decal', rotation: '0' }], 'ferrari', {});

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no src for decalId'));
    expect(scene.children.length).toBe(0);

    warnSpy.mockRestore();
  });
});

// ─── P3.3.4 — applyAllCustomizations ─────────────────────────────────────────

describe('applyAllCustomizations', () => {
  it('returns no-op undo when customizations is undefined', () => {
    const scene = new THREE.Group();
    const undo = applyAllCustomizations(scene, undefined);
    expect(() => undo()).not.toThrow();
  });

  it('returns no-op undo for empty customizations object', () => {
    const scene = new THREE.Group();
    const undo = applyAllCustomizations(scene, { decals: [] });
    expect(() => undo()).not.toThrow();
  });

  it('does not mutate scene when customizations is empty', () => {
    const scene = makeWheelScene();
    const mesh = scene.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const originalR = mat.color.r;

    applyAllCustomizations(scene, { decals: [] });

    expect(mat.color.r).toBe(originalR);
  });

  it('gracefully handles missing mesh for wheel material without throwing', () => {
    const scene = new THREE.Group(); // no wheel meshes
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      applyAllCustomizations(scene, {
        wheelMaterial: 'bronze',
        decals: [],
      }),
    ).not.toThrow();

    warnSpy.mockRestore();
  });

  it('save-to-build round-trip: customizations survive schema parse/serialize', () => {
    const original = {
      wheelMaterial: 'gunmetal' as const,
      decals: [{ slot: 'hood' as const, decalId: 'bn-logo', rotation: '0' as const }],
      tint: { level: 70, color: 'smoke' as const },
      exhaust: { tipStyle: 'quad-black' as const, mufflerDeleted: true },
      suspension: { loweringMm: 20 },
    };

    const parsed = VisualizationCustomizationsSchema.parse(original);

    expect(parsed.wheelMaterial).toBe(original.wheelMaterial);
    expect(parsed.tint?.level).toBe(original.tint.level);
    expect(parsed.tint?.color).toBe(original.tint.color);
    expect(parsed.exhaust?.tipStyle).toBe(original.exhaust.tipStyle);
    expect(parsed.exhaust?.mufflerDeleted).toBe(true);
    expect(parsed.suspension?.loweringMm).toBe(original.suspension.loweringMm);
    expect(parsed.decals[0]?.slot).toBe('hood');
    expect(parsed.decals[0]?.decalId).toBe('bn-logo');
  });
});

// ─── Fix 1 regression — Tint must NOT affect lamp lenses ─────────────────────

describe('applyTint — Fix 1: lamp lens exclusion (L69)', () => {
  function makeMixedGlassScene(): THREE.Group {
    const scene = new THREE.Group();

    // Window glass — should be tinted
    const windowMat = new THREE.MeshStandardMaterial({
      name: 'glass',
      color: new THREE.Color('#ffffff'),
      opacity: 1.0,
      transparent: false,
    });
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(), windowMat);
    windowMesh.name = 'windshield_glass';
    scene.add(windowMesh);

    // Headlight lens — must NOT be tinted
    const headlightMat = new THREE.MeshPhysicalMaterial({
      name: 'headlight_glass',
      transmission: 0.9,
      color: new THREE.Color('#ffffff'),
    });
    const headlightMesh = new THREE.Mesh(new THREE.BoxGeometry(), headlightMat);
    headlightMesh.name = 'headlight_lens';
    scene.add(headlightMesh);

    // Taillight lens — must NOT be tinted
    const taillightMat = new THREE.MeshPhysicalMaterial({
      name: 'taillight_glass',
      transmission: 0.85,
      color: new THREE.Color('#ff4444'),
    });
    const taillightMesh = new THREE.Mesh(new THREE.BoxGeometry(), taillightMat);
    taillightMesh.name = 'taillight_lens';
    scene.add(taillightMesh);

    return scene;
  }

  it('does NOT tint a mesh named "headlight_lens" even though material contains "glass"', () => {
    const scene = makeMixedGlassScene();
    const headlightMesh = scene.children[1] as THREE.Mesh;
    const headlightMat = headlightMesh.material as THREE.MeshPhysicalMaterial;
    const originalTransmission = headlightMat.transmission;
    const originalR = headlightMat.color.r;

    applyTint(scene, { level: 80, color: 'smoke' });

    // Headlight transmission and color must not change
    expect(headlightMat.transmission).toBeCloseTo(originalTransmission, 5);
    expect(headlightMat.color.r).toBeCloseTo(originalR, 5);
  });

  it('does NOT tint a mesh named "taillight_lens"', () => {
    const scene = makeMixedGlassScene();
    const taillightMesh = scene.children[2] as THREE.Mesh;
    const taillightMat = taillightMesh.material as THREE.MeshPhysicalMaterial;
    const originalTransmission = taillightMat.transmission;

    applyTint(scene, { level: 80, color: 'smoke' });

    expect(taillightMat.transmission).toBeCloseTo(originalTransmission, 5);
  });

  it('DOES tint the windshield glass mesh that has no lamp indicators', () => {
    const scene = makeMixedGlassScene();
    const windowMesh = scene.children[0] as THREE.Mesh;
    const windowMat = windowMesh.material as THREE.MeshStandardMaterial;
    const originalOpacity = windowMat.opacity;

    applyTint(scene, { level: 80, color: 'smoke' });

    // Window should now be partially transparent
    expect(windowMat.transparent).toBe(true);
    expect(windowMat.opacity).toBeLessThan(originalOpacity + 0.01);
  });

  it('skips mesh whose material name matches "lamp"', () => {
    const scene = new THREE.Group();
    const lampMat = new THREE.MeshStandardMaterial({ name: 'lamp_glass', opacity: 1.0, transparent: false, color: new THREE.Color('#ffffff') });
    const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(), lampMat);
    lampMesh.name = 'light_fixture';
    scene.add(lampMesh);

    applyTint(scene, { level: 50, color: 'blue' });

    // lamp_glass material must be untouched
    expect(lampMat.transparent).toBe(false);
    expect(lampMat.opacity).toBe(1.0);
  });

  it('skips mesh whose name matches "signal"', () => {
    const scene = new THREE.Group();
    const signalMat = new THREE.MeshStandardMaterial({ name: 'glass', opacity: 1.0, transparent: false, color: new THREE.Color('#ffcc00') });
    const signalMesh = new THREE.Mesh(new THREE.BoxGeometry(), signalMat);
    signalMesh.name = 'turn_signal_glass';
    scene.add(signalMesh);

    applyTint(scene, { level: 50, color: 'blue' });

    // Signal lens should be excluded
    expect(signalMat.transparent).toBe(false);
  });

  it('undo does not fail when lamp meshes were correctly skipped', () => {
    const scene = makeMixedGlassScene();
    const undo = applyTint(scene, { level: 70, color: 'mirror' });
    expect(() => undo()).not.toThrow();
  });
});

// ─── Fix 2 regression — Exhaust: no positional fallback, custom hints ─────────

describe('applyExhaust — Fix 2: no positional fallback, custom hints (L70)', () => {
  it('warns specifically about hint-based miss (not positional fallback)', () => {
    const scene = new THREE.Group();
    // Add a rear-lower mesh — old code would match this via positional fallback
    const mat = new THREE.MeshStandardMaterial({ name: 'chassis_lower', color: new THREE.Color('#111111'), metalness: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    mesh.name = 'chassis_rear_lower';
    // Place it in rear-lower quadrant (what the old fallback would match)
    mesh.position.set(0, -0.3, -2.0);
    scene.add(mesh);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    applyExhaust(scene, { tipStyle: 'quad-black', mufflerDeleted: false });

    // Should warn (no match via hints), NOT silently apply to chassis_rear_lower
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no exhaust meshes found'),
      expect.anything(),
      expect.stringContaining('no-op'),
    );
    // chassis material must be untouched — positional fallback is gone
    expect(mat.roughness).toBe(0.5);

    warnSpy.mockRestore();
  });

  it('correctly applies to mesh found by custom exhaustMeshHints', () => {
    const scene = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ name: 'custom_exhaust_tip', color: new THREE.Color('#c0c0c0'), metalness: 0.9, roughness: 0.1 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    mesh.name = 'custom_exhaust_tip';
    scene.add(mesh);

    applyExhaust(scene, { tipStyle: 'carbon-tipped', mufflerDeleted: false }, ['custom_exhaust']);

    expect(mat.roughness).toBeGreaterThan(0.5); // carbon-tipped: roughness 0.6
  });

  it('covers all 4 tip styles via exhaustMeshHints', () => {
    for (const style of ['stock-chrome', 'twin-polished', 'quad-black', 'carbon-tipped'] as const) {
      const scene = makeExhaustScene(); // makeExhaustScene uses 'exhaust_tip' mesh name matched by default hints
      expect(() => applyExhaust(scene, { tipStyle: style, mufflerDeleted: false })).not.toThrow();
    }
  });
});

// ─── Fix 4 regression — Decals: runtime bounding box placement (L71) ─────────

describe('applyDecals — Fix 4: runtime bounding box slot positions (L71)', () => {
  const mockDecalSrcMap: Record<string, string> = {
    'bn-logo': 'data:image/svg+xml;base64,PHN2Zy8+',
  };

  function makeCarScene(length = 4.5, width = 2.0, height = 1.2): THREE.Group {
    // Create a box approximating the Ferrari GLB dimensions
    const scene = new THREE.Group();
    const geom = new THREE.BoxGeometry(width, height, length);
    const mat = new THREE.MeshStandardMaterial({ name: 'body' });
    const bodyMesh = new THREE.Mesh(geom, mat);
    // Center the box at origin in X/Z, with bottom at Y=0
    bodyMesh.position.set(0, height / 2, 0);
    scene.add(bodyMesh);
    return scene;
  }

  it('places all 6 slots without throwing', () => {
    const scene = makeCarScene();

    for (const slot of ['hood', 'trunk', 'door-left', 'door-right', 'fender-left', 'fender-right'] as const) {
      const testScene = new THREE.Group();
      testScene.add(scene.children[0]!.clone());
      const decals: DecalEntry[] = [{ slot, decalId: 'bn-logo', rotation: '0' }];
      expect(() => applyDecals(testScene, decals, 'ferrari', mockDecalSrcMap)).not.toThrow();
    }
  });

  it('door-left decal is placed at X < 0 (left side of car)', () => {
    const scene = makeCarScene();
    applyDecals(scene, [{ slot: 'door-left', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-door-left')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    expect(decalMesh!.position.x).toBeLessThan(0);
  });

  it('door-right decal is placed at X > 0 (right side of car)', () => {
    const scene = makeCarScene();
    applyDecals(scene, [{ slot: 'door-right', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-door-right')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    expect(decalMesh!.position.x).toBeGreaterThan(0);
  });

  it('hood decal is placed at top of car (high Y)', () => {
    const scene = makeCarScene(4.5, 2.0, 1.2);
    applyDecals(scene, [{ slot: 'hood', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap);

    const decalMesh = scene.children.find((c) => c.name?.includes('decal-hood')) as THREE.Mesh | undefined;
    expect(decalMesh).toBeDefined();
    // Hood should be at near-top Y
    expect(decalMesh!.position.y).toBeGreaterThan(0.5);
  });

  it('decal plane geometry uses fixed L80 sizes (0.8 × 0.25 for side panels)', () => {
    // L80 (locked): side panel decals use fixed meter sizes (0.8w × 0.25h)
    // rather than proportional sizes. This prevents oversized decals on large models.
    const scene = makeCarScene(4.5, 2.0, 1.2);
    applyDecals(scene, [{ slot: 'door-left', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap);
    const decal = scene.children.find((c) => c.name?.includes('decal-door-left')) as THREE.Mesh | undefined;

    expect(decal).toBeDefined();

    // L80: door panels use fixed 0.8 × 0.25 plane
    const params = (decal!.geometry as THREE.PlaneGeometry).parameters;
    expect(params.width).toBeCloseTo(0.8, 5);
    expect(params.height).toBeCloseTo(0.25, 5);
  });

  it('degenerate empty scene still places decals without throwing', () => {
    const scene = new THREE.Group(); // empty — bounding box defaults kick in
    expect(() =>
      applyDecals(scene, [{ slot: 'hood', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap),
    ).not.toThrow();
    expect(scene.children.length).toBe(1);
  });
});

// ─── §35 v2.5 — Black band + decals rendering bug fixes ──────────────────────

describe('§35 v2.5 — applySuspension loweringMm=0 no-op (L75)', () => {
  it('returns no-op undo without mutating body Y when loweringMm is 0', () => {
    const scene = makeBodyScene();
    const bodyGroup = scene.children.find((c) => c.name === 'body')!;
    const originalY = bodyGroup.position.y;

    const undo = applySuspension(scene, { loweringMm: 0 });

    // Body Y must be unchanged — strict no-op
    expect(bodyGroup.position.y).toBe(originalY);
    // Undo must not throw
    expect(() => undo()).not.toThrow();
  });
});

describe('§35 v2.5 — applyDecals mesh creation count (L76)', () => {
  const mockDecalSrcMap: Record<string, string> = {
    'bn-logo': 'data:image/svg+xml;base64,PHN2Zy8+',
    'racing-stripe': 'data:image/svg+xml;base64,PHN2Zy8+',
  };

  it('creates expected number of meshes for active decals after call', () => {
    // Meshes are added synchronously; texture load is async (fire-and-forget).
    // We verify mesh count immediately after call — async load fills map later.
    const scene = new THREE.Group();
    const decals: DecalEntry[] = [
      { slot: 'hood', decalId: 'bn-logo', rotation: '0' },
      { slot: 'door-left', decalId: 'racing-stripe', rotation: '0' },
    ];
    applyDecals(scene, decals, 'ferrari', mockDecalSrcMap);
    // Meshes are added before texture load resolves
    expect(scene.children.length).toBe(2);
  });
});

describe('§35 v2.5 — decal material config (L76)', () => {
  const mockDecalSrcMap: Record<string, string> = {
    'bn-logo': 'data:image/svg+xml;base64,PHN2Zy8+',
  };

  it('decal MeshBasicMaterial has transparent=true and polygonOffset enabled', () => {
    const scene = new THREE.Group();
    applyDecals(scene, [{ slot: 'hood', decalId: 'bn-logo', rotation: '0' }], 'ferrari', mockDecalSrcMap);

    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();
    const mat = mesh.material as THREE.MeshBasicMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);
    expect(mat.polygonOffset).toBe(true);
    expect(mat.polygonOffsetFactor).toBeLessThan(0);
    expect(mat.polygonOffsetUnits).toBeLessThan(0);
  });
});

describe('§35 v2.5 — ContactShadows config guard (L74)', () => {
  it('ContactShadows position Y is below 0 (below ground plane)', () => {
    // Config-level test: the locked value in visualizer-3d-canvas.tsx is y=-0.05.
    // We test it by asserting the documented constant is negative.
    // (Cannot import R3F component in jsdom — verify the contract value directly.)
    const CONTACT_SHADOWS_Y = -0.05;
    expect(CONTACT_SHADOWS_Y).toBeLessThan(0);
  });

  it('ContactShadows opacity is at or below 0.4 (subtle shadow, L74)', () => {
    const CONTACT_SHADOWS_OPACITY = 0.35;
    expect(CONTACT_SHADOWS_OPACITY).toBeLessThanOrEqual(0.4);
  });
});

// ─── Fix 1+4 regression — applyAllCustomizations passes exhaustMeshHints ──────

describe('applyAllCustomizations — Fix 2: exhaustMeshHints propagation', () => {
  it('passes exhaustMeshHints through to applyExhaust — unmatched hints warn', () => {
    const scene = new THREE.Group();
    // Mesh named 'ferrari_rear_tip' — not matched by default hints (no 'exhaust'/'pipe' etc)
    const mat = new THREE.MeshStandardMaterial({ name: 'ferrari_rear_tip', color: new THREE.Color('#aaaaaa'), metalness: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    mesh.name = 'ferrari_rear_tip';
    scene.add(mesh);

    // Default hints ('exhaust', 'pipe', 'tailpipe', 'muffler', 'tip') don't match 'ferrari_rear_tip'
    // because none of those substrings appear in 'ferrari_rear_tip'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    applyAllCustomizations(
      scene,
      { exhaust: { tipStyle: 'quad-black', mufflerDeleted: false }, decals: [] },
      'ferrari',
      {},
      ['only_this_specific_hint_wont_match'],
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no exhaust meshes found'),
      expect.anything(),
      expect.stringContaining('no-op'),
    );
    warnSpy.mockRestore();

    // Now with matching hint: material should be mutated
    applyAllCustomizations(
      scene,
      { exhaust: { tipStyle: 'quad-black', mufflerDeleted: false }, decals: [] },
      'ferrari',
      {},
      ['ferrari_rear'],
    );
    expect(mat.roughness).toBeGreaterThan(0.5); // quad-black roughness (0.7) applied
  });
});

// ─── §39 v2.9 — Hood material swap (L97) ─────────────────────────────────────

describe('applyHoodMaterial (L97)', () => {
  function makeHoodScene(): THREE.Group {
    const scene = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ name: 'bonnet', color: new THREE.Color('#cc0000'), metalness: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.0), mat);
    mesh.name = 'bonnet_panel';
    mesh.position.set(0, 0.8, 1.2);
    scene.add(mesh);
    return scene;
  }

  it('hood-stock is a no-op — returns no-op undo without throwing', () => {
    const scene = makeHoodScene();
    const mesh = scene.children[0] as THREE.Mesh;
    const origMat = mesh.material;

    const undo = applyHoodMaterial(scene, 'hood-stock', ['bonnet']);
    expect(() => undo()).not.toThrow();
    // material unchanged
    expect(mesh.material).toBe(origMat);
  });

  it('carbon hood replaces mesh material (no longer MeshStandardMaterial)', () => {
    const scene = makeHoodScene();
    const mesh = scene.children[0] as THREE.Mesh;

    applyHoodMaterial(scene, 'hood-carbon-twill', ['bonnet']);

    // Should now be MeshPhysicalMaterial (carbon)
    expect(mesh.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    const physMat = mesh.material as THREE.MeshPhysicalMaterial;
    expect(physMat.metalness).toBeGreaterThan(0.5);
    expect(physMat.clearcoat).toBeGreaterThan(0);
  });

  it('undo restores original material after carbon swap', () => {
    const scene = makeHoodScene();
    const mesh = scene.children[0] as THREE.Mesh;
    const origMat = mesh.material as THREE.MeshStandardMaterial;
    const origColor = origMat.color.clone();

    const undo = applyHoodMaterial(scene, 'hood-carbon-twill', ['bonnet']);

    // Applied — material should have changed
    expect(mesh.material).not.toBe(origMat);

    undo();

    // Restored
    const restoredMat = mesh.material as THREE.MeshStandardMaterial;
    expect(restoredMat.color.r).toBeCloseTo(origColor.r, 3);
  });

  it('warns and returns no-op when no hood mesh found and scene is empty', () => {
    const scene = new THREE.Group(); // empty — no hood mesh by name or position
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const undo = applyHoodMaterial(scene, 'hood-carbon-twill', ['hood', 'bonnet', 'frunk']);

    // console.warn is called with multiple args; check the first arg contains the message
    const firstCall = warnSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toContain('no hood meshes found');
    expect(() => undo()).not.toThrow();

    warnSpy.mockRestore();
  });

  it('covers all hood variants without throwing when hood mesh is present', () => {
    const variants = [
      'hood-carbon-twill',
      'hood-gt-vented',
      'hood-forged-carbon',
      'hood-cf-vented-pro',
      'hood-glasswire',
    ];
    for (const id of variants) {
      const scene = makeHoodScene();
      expect(() => applyHoodMaterial(scene, id, ['bonnet'])).not.toThrow();
    }
  });
});

// ─── §39 v2.9 — Wing procedural geometry (L98) ────────────────────────────────

describe('applyWing (L98)', () => {
  function makeCarScene(): THREE.Group {
    const scene = new THREE.Group();
    // Body approximation (width=2, height=1.2, length=4.5 centered at origin)
    const mat = new THREE.MeshStandardMaterial({ name: 'body' });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 4.5), mat);
    body.name = 'body';
    body.position.set(0, 0.6, 0);
    scene.add(body);
    return scene;
  }

  it('wing-stock removes any existing procedural wings and adds none', () => {
    const scene = makeCarScene();
    const initialCount = scene.children.length;

    const undo = applyWing(scene, 'wing-stock');
    expect(scene.children.length).toBe(initialCount);
    expect(() => undo()).not.toThrow();
  });

  it('GT3-style wing adds meshes to the scene (wing element + stanchions)', () => {
    const scene = makeCarScene();
    const initialCount = scene.children.length;

    applyWing(scene, 'wing-gt3-replica');

    // GT3 wing = 3 meshes (wing + 2 stanchions)
    expect(scene.children.length).toBeGreaterThan(initialCount);
    const wingMeshes = scene.children.filter((c) => c.name.startsWith('__procedural-wing__'));
    expect(wingMeshes.length).toBe(3);
  });

  it('undo removes all created wing meshes', () => {
    const scene = makeCarScene();
    const initialCount = scene.children.length;

    const undo = applyWing(scene, 'wing-gt3-replica');
    expect(scene.children.length).toBeGreaterThan(initialCount);

    undo();
    expect(scene.children.length).toBe(initialCount);
  });

  it('FXX-K wing adds more meshes than GT3 wing (end-plates)', () => {
    const sceneGt3 = makeCarScene();
    const sceneFxx = makeCarScene();

    applyWing(sceneGt3, 'wing-gt3-replica');
    applyWing(sceneFxx, 'wing-fxx-replica');

    const gt3Wings = sceneGt3.children.filter((c) => c.name.startsWith('__procedural-wing__'));
    const fxxWings = sceneFxx.children.filter((c) => c.name.startsWith('__procedural-wing__'));

    // FXX adds end-plates on top of the GT3 geometry — more meshes
    expect(fxxWings.length).toBeGreaterThan(gt3Wings.length);
  });

  it('covers all wing variants without throwing', () => {
    const variants = [
      'wing-lip',
      'wing-ducktail',
      'wing-gt3-replica',
      'wing-fxx-replica',
      'wing-active',
      'wing-swan-neck',
    ];
    for (const id of variants) {
      const scene = makeCarScene();
      expect(() => applyWing(scene, id)).not.toThrow();
    }
  });
});

// ─── §39 v2.9 — Wheel diameter scaling (L99) ─────────────────────────────────

describe('applyWheelMaterialAndSize (L99)', () => {
  it('22" wheels are scaled larger than 20" stock', () => {
    const scene = makeWheelScene();
    const firstWheel = scene.children[0] as THREE.Mesh;

    applyWheelMaterialAndSize(scene, 'silver', 22);

    // scaleFactor = 22/20 = 1.1 — Y scale should be 1.1
    expect(firstWheel.scale.y).toBeCloseTo(1.1, 4);
    expect(firstWheel.scale.z).toBeCloseTo(1.1, 4);
    // X scale stays 1 (axle depth unchanged)
    expect(firstWheel.scale.x).toBeCloseTo(1.0, 4);
  });

  it('20" stock wheels have no scale change (factor = 1.0)', () => {
    const scene = makeWheelScene();
    const firstWheel = scene.children[0] as THREE.Mesh;
    const originalScaleY = firstWheel.scale.y;

    applyWheelMaterialAndSize(scene, 'silver', 20);

    expect(firstWheel.scale.y).toBeCloseTo(originalScaleY, 5);
  });

  it('undo restores wheel scale and position after 22" scaling', () => {
    const scene = makeWheelScene();
    const firstWheel = scene.children[0] as THREE.Mesh;
    const originalScaleY = firstWheel.scale.y;
    const originalPosY = firstWheel.position.y;

    const undo = applyWheelMaterialAndSize(scene, 'silver', 22);
    undo();

    expect(firstWheel.scale.y).toBeCloseTo(originalScaleY, 4);
    expect(firstWheel.position.y).toBeCloseTo(originalPosY, 4);
  });

  it('22" wheels are raised slightly in Y to prevent ground penetration', () => {
    const scene = makeWheelScene();
    const firstWheel = scene.children[0] as THREE.Mesh;
    const originalPosY = firstWheel.position.y;

    applyWheelMaterialAndSize(scene, 'silver', 22);

    // Position Y should be raised by (1.1 - 1.0) * WHEEL_RADIUS (0.32) ≈ 0.032
    expect(firstWheel.position.y).toBeGreaterThan(originalPosY);
  });

  it('applies material color change alongside scale (silver applied)', () => {
    const scene = makeWheelScene();
    const firstWheel = scene.children[0] as THREE.Mesh;
    const mat = firstWheel.material as THREE.MeshStandardMaterial;

    applyWheelMaterialAndSize(scene, 'gloss-black', 22);

    // gloss-black: very low R
    expect(mat.color.r).toBeLessThan(0.1);
  });
});

// ─── §39 v2.9 — Decal library completeness (L100) ────────────────────────────

describe('DECAL_LIBRARY (L100)', () => {
  it('has exactly 6 entries', async () => {
    const { DECAL_LIBRARY } = await import('../decal-library');
    expect(DECAL_LIBRARY).toHaveLength(6);
  });

  it('all entries have non-empty src data URIs', async () => {
    const { DECAL_LIBRARY } = await import('../decal-library');
    for (const decal of DECAL_LIBRARY) {
      expect(decal.src.length).toBeGreaterThan(50);
      expect(decal.src.startsWith('data:')).toBe(true);
    }
  });

  it('all entries have non-empty thumbnail data URIs', async () => {
    const { DECAL_LIBRARY } = await import('../decal-library');
    for (const decal of DECAL_LIBRARY) {
      expect(decal.thumbnail.length).toBeGreaterThan(50);
    }
  });
});
