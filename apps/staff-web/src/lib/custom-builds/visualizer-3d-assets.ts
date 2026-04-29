/**
 * Visualizer 3D asset registry — SPEC-CUSTOM-BUILDS-001 §30–§31 (P3.2–P3.3)
 *
 * L57 (locked): V0 supports ONLY Ferrari. All other vehicles (Porsche 911,
 *   BMW M4, Audi RS5, Mercedes-AMG GT, Audi R8) use 2D fallback with a
 *   "3D coming soon" banner. This supersedes L52 which used Porsche 911 as
 *   the canonical 3D car. The Ferrari GLB (Three.js examples) IS a genuine
 *   Ferrari model and is now used as such.
 *
 * L53 (locked): GLTF asset source: Ferrari GLB from Three.js examples
 *   (https://threejs.org/examples/models/gltf/ferrari.glb). License: MIT/BSD —
 *   part of the official three.js examples repository. Permissive use for
 *   development and demo purposes.
 *
 * Ferrari GLB mesh structure (from Three.js webgl_materials_car demo):
 *   Body materials: "body", "body_paint", "car_paint" — matched via paintMaterialHints
 *   Wheel meshes: "wheel_front_l", "wheel_front_r", "wheel_rear_l", "wheel_rear_r"
 *   Glass mesh: "glass", "Glass_Interior", "Glass_Exterior" — used for tint in P3.3.1
 *   Exhaust mesh: typically nameless / under "chassis" group — matched via "exhaust"/"pipe"
 *
 * To add new 3D models: drop a .glb into public/assets/3d/{model-slug}.glb
 * and register it in ASSET_3D_REGISTRY below.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §30 (P3.2), §31 (P3.3), L51–L57
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Asset3DRecord {
  /** Absolute URL or relative /public path to the GLB file. */
  modelUrl: string;
  /** Human-readable display name. */
  displayName: string;
  /**
   * Material name fragments to search for when applying paint color.
   * Case-insensitive partial match against THREE.Material.name.
   */
  paintMaterialHints: string[];
  /**
   * Material name fragments to search for when scaling wheel meshes.
   * If empty, wheel size changes are a no-op for this model.
   */
  wheelMeshHints: string[];
  /**
   * L70: Mesh name fragments to search for when applying exhaust customizations.
   * Model-specific — the Ferrari GLB uses ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'].
   * If the model has no named exhaust meshes, leave empty to disable the exhaust tab.
   */
  exhaustMeshHints: string[];
  /**
   * L97: Mesh name fragments to search for the hood region.
   * Used by applyHoodMaterial for material swap on hood customization.
   * Falls back to positional detection (front-upper body area) if no mesh name matches.
   */
  hoodMeshHints: string[];
  /** License information for this asset. */
  license: string;
}

export interface Resolved3DAsset extends Asset3DRecord {
  supported: true;
}

export interface Fallback3DAsset {
  supported: false;
  /** Display name (from slug or record). */
  displayName: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Registry of 3D-capable vehicles.
 * Key = modelSlug (matches visualizer-assets.ts SUPPORTED_VEHICLES + Ferrari fixture).
 *
 * L57: Only 'ferrari' returns supported=true in v0.
 * L53: Ferrari GLB from Three.js examples — used as genuine Ferrari demo model.
 *
 * Mesh/material structure of ferrari.glb (Three.js webgl_materials_car demo):
 *   Body:    materials "body", "body_paint" (MeshStandardMaterial, mapped via paintMaterialHints)
 *   Wheels:  objects "wheel_front_l", "wheel_front_r", "wheel_rear_l", "wheel_rear_r"
 *   Glass:   material/mesh "glass" or "Glass" (used for tint in P3.3.1)
 *   Chrome:  material "chrome" (decorative trim)
 *   Details: material "details" (interior/grille accents)
 *
 * Other cars (Porsche 911, BMW M4, Audi RS5, Mercedes-AMG GT, Audi R8) are intentionally
 * NOT registered here. They fall back to the 2D SVG viewer until real licensed GLB assets
 * are sourced for P3.3+ phases.
 */
const ASSET_3D_REGISTRY: Record<string, Asset3DRecord> = {
  ferrari: {
    modelUrl: 'https://threejs.org/examples/models/gltf/ferrari.glb',
    displayName: 'Ferrari (Demo)',
    paintMaterialHints: ['body', 'paint', 'exterior', 'car_paint'],
    wheelMeshHints: ['wheel'],
    // L70: Ferrari GLB exhaust mesh hints — named exhaust/pipe/tip meshes in the
    // Three.js example model. If none match at runtime the exhaust tab is no-op.
    exhaustMeshHints: ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'],
    // L97: Ferrari GLB hood mesh hints — bonnet/hood/frunk. Falls back to positional
    // detection (front-upper bounding-box region) when no name matches.
    hoodMeshHints: ['hood', 'bonnet', 'frunk'],
    license:
      'Three.js Ferrari GLB — MIT/BSD. Source: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf. Genuine Ferrari demo model from Three.js official examples.',
  },
};

// ─── Exported access functions ────────────────────────────────────────────────

/**
 * Look up the 3D asset for a given model slug.
 * Returns supported=true with full record if the model has a 3D asset,
 * or supported=false for models not yet in the 3D registry.
 *
 * L57: Only 'ferrari' returns supported=true in v0.
 */
export function get3DAsset(
  modelSlug: string,
): Resolved3DAsset | Fallback3DAsset {
  const record = ASSET_3D_REGISTRY[modelSlug];
  if (record) {
    return { ...record, supported: true };
  }
  // Derive display name from slug for unknown models
  const displayName = modelSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { supported: false, displayName };
}

/** True if the model has a registered 3D GLB asset. */
export function has3DAsset(modelSlug: string): boolean {
  return modelSlug in ASSET_3D_REGISTRY;
}

/** All model slugs that have 3D assets. Used for testing and future expansion. */
export function get3DSupportedSlugs(): string[] {
  return Object.keys(ASSET_3D_REGISTRY);
}
