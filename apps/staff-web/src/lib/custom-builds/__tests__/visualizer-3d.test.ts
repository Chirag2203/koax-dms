/**
 * Visualizer 3D tests — SPEC-CUSTOM-BUILDS-001 §30 (P3.2) + §31 (P3.3 scope reduction)
 *
 * 3D testing in jsdom (no WebGL) — we test the asset registry, component
 * exports, and module structure rather than visual output.
 *
 * Test coverage:
 *   1.  visualizer-3d-assets: get3DAsset('ferrari') returns supported=true (L57)
 *   2.  visualizer-3d-assets: get3DAsset('ferrari') returns the ferrari.glb URL (L53)
 *   3.  visualizer-3d-assets: get3DAsset for porsche-911 returns supported=false (L57 scope reduction)
 *   4.  visualizer-3d-assets: has3DAsset('ferrari') returns true
 *   5.  visualizer-3d-assets: has3DAsset('porsche-911') returns false (no longer 3D in v0)
 *   6.  visualizer-3d-assets: get3DSupportedSlugs returns only ['ferrari'] in v0 (L57)
 *   7.  visualizer-3d-assets: Resolved3DAsset has paintMaterialHints array
 *   8.  visualizer-3d-assets: fallback displayName is slug-ified version of model name
 *   9.  car-model.tsx exports CarModel function
 *   10. visualizer-3d-canvas.tsx exports Visualizer3DCanvas function
 *   11. vehicleToModelSlug maps Ferrari make to 'ferrari' slug (L57)
 *   12. vehicleToModelSlug maps other makes to non-ferrari slugs
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §30 (P3.2), §31 (P3.3), L51–L57
 */

import { describe, it, expect } from 'vitest';
import {
  get3DAsset,
  has3DAsset,
  get3DSupportedSlugs,
} from '../visualizer-3d-assets';
import { vehicleToModelSlug } from '../visualizer-assets';

// ─── Asset registry tests ─────────────────────────────────────────────────────

describe('3D asset registry', () => {
  it('get3DAsset returns supported=true for ferrari (L57)', () => {
    const asset = get3DAsset('ferrari');
    expect(asset.supported).toBe(true);
    expect(asset.displayName).toBe('Ferrari (Demo)');
  });

  it('get3DAsset for ferrari points to Three.js Ferrari GLB (L53)', () => {
    const asset = get3DAsset('ferrari');
    expect(asset.supported).toBe(true);
    if (asset.supported) {
      expect(asset.modelUrl).toBe(
        'https://threejs.org/examples/models/gltf/ferrari.glb',
      );
    }
  });

  it('get3DAsset for porsche-911 returns supported=false after scope reduction (L57)', () => {
    // L57: porsche-911 is no longer the 3D car — Ferrari is.
    const asset = get3DAsset('porsche-911');
    expect(asset.supported).toBe(false);
  });

  it('get3DAsset for unknown vehicle returns supported=false for bmw-m4', () => {
    const asset = get3DAsset('bmw-m4');
    expect(asset.supported).toBe(false);
  });

  it('get3DAsset for unknown vehicle returns supported=false for audi-rs5', () => {
    const asset = get3DAsset('audi-rs5');
    expect(asset.supported).toBe(false);
  });

  it('has3DAsset returns true for ferrari (L57)', () => {
    expect(has3DAsset('ferrari')).toBe(true);
  });

  it('has3DAsset returns false for porsche-911 after scope reduction (L57)', () => {
    expect(has3DAsset('porsche-911')).toBe(false);
  });

  it('has3DAsset returns false for bmw-m4 (non-3D in v0)', () => {
    expect(has3DAsset('bmw-m4')).toBe(false);
  });

  it('has3DAsset returns false for audi-rs5 (non-3D in v0)', () => {
    expect(has3DAsset('audi-rs5')).toBe(false);
  });

  it('has3DAsset returns false for mercedes-amg-gt (non-3D in v0)', () => {
    expect(has3DAsset('mercedes-amg-gt')).toBe(false);
  });

  it('has3DAsset returns false for audi-r8 (non-3D in v0)', () => {
    expect(has3DAsset('audi-r8')).toBe(false);
  });

  it('get3DSupportedSlugs returns only ["ferrari"] in v0 (L57)', () => {
    const slugs = get3DSupportedSlugs();
    expect(slugs).toHaveLength(1);
    expect(slugs).toContain('ferrari');
  });

  it('Resolved3DAsset has paintMaterialHints with body/paint hints (L55)', () => {
    const asset = get3DAsset('ferrari');
    expect(asset.supported).toBe(true);
    if (asset.supported) {
      expect(Array.isArray(asset.paintMaterialHints)).toBe(true);
      expect(asset.paintMaterialHints.length).toBeGreaterThan(0);
      // Must include at least "body" as a hint
      expect(
        asset.paintMaterialHints.some((h) => h.toLowerCase().includes('body')),
      ).toBe(true);
    }
  });

  it('Resolved3DAsset has wheelMeshHints array (L55)', () => {
    const asset = get3DAsset('ferrari');
    if (asset.supported) {
      expect(Array.isArray(asset.wheelMeshHints)).toBe(true);
    }
  });

  it('Resolved3DAsset has license information (L53)', () => {
    const asset = get3DAsset('ferrari');
    if (asset.supported) {
      expect(asset.license.length).toBeGreaterThan(0);
      // License note should mention the source
      expect(asset.license.toLowerCase()).toContain('three.js');
    }
  });

  it('Fallback displayName is a readable string for unknown slug', () => {
    const asset = get3DAsset('bmw-m4');
    expect(asset.supported).toBe(false);
    expect(asset.displayName).toBeTruthy();
    expect(asset.displayName.length).toBeGreaterThan(0);
  });
});

// ─── vehicleToModelSlug Ferrari routing tests ─────────────────────────────────

describe('vehicleToModelSlug Ferrari routing (L57)', () => {
  it('maps Ferrari make to "ferrari" slug (case-insensitive contains match)', () => {
    expect(vehicleToModelSlug('Ferrari', '488 GTB')).toBe('ferrari');
  });

  it('maps "ferrari" lowercase to "ferrari" slug', () => {
    expect(vehicleToModelSlug('ferrari', '488 Spider')).toBe('ferrari');
  });

  it('maps "Ferrari S.p.A" variant to "ferrari" slug', () => {
    expect(vehicleToModelSlug('Ferrari S.p.A', 'F8 Tributo')).toBe('ferrari');
  });

  it('does not map Porsche to ferrari', () => {
    expect(vehicleToModelSlug('Porsche', '911')).toBe('porsche-911');
  });

  it('does not map BMW to ferrari', () => {
    expect(vehicleToModelSlug('BMW', 'M4')).toBe('bmw-m4');
  });
});

// ─── Module export tests ──────────────────────────────────────────────────────

describe('3D component exports', () => {
  it('car-model.tsx exports CarModel as a function', async () => {
    // Dynamic import avoids R3F/WebGL from failing in jsdom
    const mod = await import('../../../components/custom-builds/visualizer/car-model');
    expect(typeof mod.CarModel).toBe('function');
  });

  it('car-model.tsx exports preloadCarModel as a function', async () => {
    const mod = await import('../../../components/custom-builds/visualizer/car-model');
    expect(typeof mod.preloadCarModel).toBe('function');
  });

  it('visualizer-3d-canvas.tsx exports Visualizer3DCanvas as a function', async () => {
    // R3F Canvas requires browser WebGL — skip render, just check export exists
    const mod = await import(
      '../../../components/custom-builds/visualizer/visualizer-3d-canvas'
    );
    expect(typeof mod.Visualizer3DCanvas).toBe('function');
  });
});
