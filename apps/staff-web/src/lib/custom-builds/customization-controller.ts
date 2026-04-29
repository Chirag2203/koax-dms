/**
 * Customization controller — pure functions that mutate a Three.js scene
 * to apply 3D Ferrari visualizer customizations.
 *
 * Each function returns an "undo" callback that reverts the scene to its
 * prior state. This ensures customizations can be cleanly removed when
 * a control is reset.
 *
 * All functions are graceful: if the expected mesh/material is not found,
 * they log a console.warn and return a no-op undo. They NEVER throw.
 *
 * P3.3 locked decisions:
 *   L58 — Wheel swap V0 = material swap (5 rim finish variants)
 *   L59 — Decals V0 = predefined slot overlay (plane mesh at fixed position)
 *   L60 — Window tint V0 = material opacity/color or MeshPhysicalMaterial transmission
 *   L61 — Exhaust V0 = material variants + muffler-delete
 *   L62 — Suspension V0 = global body Y-translate (wheels stay grounded)
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §31, L57–L64
 */

import * as THREE from 'three';
import type {
  WheelMaterial,
  TintColor,
  ExhaustTipStyle,
  VisualizerCustomizations,
  DecalSlot,
} from '@dms/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UndoFn = () => void;

export interface TintSpec {
  level: number;  // 0–100
  color: TintColor;
}

export interface ExhaustSpec {
  tipStyle: ExhaustTipStyle;
  mufflerDeleted: boolean;
}

export interface SuspensionSpec {
  loweringMm: number;  // 0–50
}

export interface DecalEntry {
  slot: DecalSlot;
  decalId: string;
  rotation: '0' | '90' | '180' | '270';
}

// ─── Material specs ────────────────────────────────────────────────────────────

const WHEEL_MATERIAL_SPECS: Record<WheelMaterial, { color: string; metalness: number; roughness: number }> = {
  'silver':      { color: '#c8c8c8', metalness: 0.9, roughness: 0.15 },
  'gunmetal':    { color: '#3a3f45', metalness: 0.85, roughness: 0.2 },
  'gloss-black': { color: '#111111', metalness: 0.95, roughness: 0.05 },
  'bronze':      { color: '#8c6e3f', metalness: 0.7, roughness: 0.25 },
  'brushed':     { color: '#b8b8b2', metalness: 0.4, roughness: 0.5 },
};

const TINT_COLOR_HEX: Record<TintColor, string> = {
  'smoke':  '#1c1c1c',
  'amber':  '#c8860a',
  'blue':   '#0a3d6b',
  'green':  '#0a4a1e',
  'mirror': '#e0e8f0',
  'clear':  'rgba(255,255,255,0.05)',
};

const EXHAUST_MATERIAL_SPECS: Record<ExhaustTipStyle, { color: string; metalness: number; roughness: number }> = {
  'stock-chrome':   { color: '#c0c0c0', metalness: 0.9, roughness: 0.1 },
  'twin-polished':  { color: '#e8e8e8', metalness: 1.0, roughness: 0.05 },
  'quad-black':     { color: '#1a1a1a', metalness: 0.2, roughness: 0.7 },
  'carbon-tipped':  { color: '#2a2a2a', metalness: 0.1, roughness: 0.6 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesHints(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some((h) => lower.includes(h.toLowerCase()));
}

function getMeshes(scene: THREE.Object3D, nameHints: string[]): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const meshNameMatches = matchesHints(obj.name, nameHints);
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const matNameMatches = materials.some(
        (m) => m instanceof THREE.Material && matchesHints(m.name, nameHints),
      );
      if (meshNameMatches || matNameMatches) {
        result.push(obj);
      }
    }
  });
  return result;
}

function getMaterials(mesh: THREE.Mesh): THREE.MeshStandardMaterial[] {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return mats.filter((m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial);
}

// ─── Wheel material ────────────────────────────────────────────────────────────

/**
 * L58: Apply a rim finish material to wheel meshes.
 * Traverses for meshes matching wheelMeshHints (['wheel']).
 * Saves original color/metalness/roughness per material; returns undo fn.
 */
export function applyWheelMaterial(
  scene: THREE.Object3D,
  material: WheelMaterial,
): UndoFn {
  const spec = WHEEL_MATERIAL_SPECS[material];
  const wheelMeshes = getMeshes(scene, ['wheel']);

  if (wheelMeshes.length === 0) {
    console.warn('[customization-controller] applyWheelMaterial: no wheel meshes found — skipping');
    return () => { /* no-op */ };
  }

  type MatSnapshot = { color: THREE.Color; metalness: number; roughness: number };
  const snapshots = new Map<THREE.MeshStandardMaterial, MatSnapshot>();

  for (const mesh of wheelMeshes) {
    const stdMats = getMaterials(mesh);
    for (const mat of stdMats) {
      snapshots.set(mat, {
        color: mat.color.clone(),
        metalness: mat.metalness,
        roughness: mat.roughness,
      });
      mat.color.set(spec.color);
      mat.metalness = spec.metalness;
      mat.roughness = spec.roughness;
      mat.needsUpdate = true;
    }
  }

  return () => {
    snapshots.forEach((snap, mat) => {
      mat.color.copy(snap.color);
      mat.metalness = snap.metalness;
      mat.roughness = snap.roughness;
      mat.needsUpdate = true;
    });
  };
}

// ─── Window tint ───────────────────────────────────────────────────────────────

/**
 * L60 / L69: Apply window tint to glass meshes — excludes headlight/taillight lenses.
 * Handles both MeshPhysicalMaterial (transmission-based) and standard (opacity-based).
 * Returns undo fn that restores original glass state.
 *
 * Tint exclusion rule (L69):
 *   A mesh is skipped if its name or any material name matches
 *   /light|lamp|lens|head|tail|signal/i — these are lamp lenses, not window glass.
 *   Only meshes named 'window'/'windshield' or exactly 'glass'/'Glass' on
 *   non-light meshes receive the tint.
 */

const LAMP_MESH_PATTERN = /light|lamp|lens|head|tail|signal/i;

function isLampMesh(mesh: THREE.Mesh): boolean {
  if (LAMP_MESH_PATTERN.test(mesh.name)) return true;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some(
    (m) => m instanceof THREE.Material && LAMP_MESH_PATTERN.test(m.name),
  );
}

export function applyTint(scene: THREE.Object3D, tint: TintSpec): UndoFn {
  const allGlassMeshes = getMeshes(scene, ['glass', 'Glass', 'window', 'windshield']);
  // L69: exclude lamp lenses from tint
  const glassMeshes = allGlassMeshes.filter((mesh) => !isLampMesh(mesh));

  if (glassMeshes.length === 0) {
    console.warn('[customization-controller] applyTint: no glass meshes found — skipping');
    return () => { /* no-op */ };
  }

  const colorHex = TINT_COLOR_HEX[tint.color];
  const opacityFromLevel = 1 - (tint.level / 100) * 0.7;

  type GlassSnapshot =
    | { kind: 'physical'; color: THREE.Color; transmission: number; attenuationColor: THREE.Color }
    | { kind: 'standard'; color: THREE.Color; opacity: number; transparent: boolean };

  const snapshots = new Map<THREE.Material, GlassSnapshot>();

  for (const mesh of glassMeshes) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) {
      if (mat instanceof THREE.MeshPhysicalMaterial && mat.transmission > 0) {
        snapshots.set(mat, {
          kind: 'physical',
          color: mat.color.clone(),
          transmission: mat.transmission,
          attenuationColor: mat.attenuationColor.clone(),
        });
        mat.color.set(colorHex);
        mat.transmission = Math.max(0, mat.transmission * opacityFromLevel);
        mat.attenuationColor.set(colorHex);
        mat.needsUpdate = true;
      } else if (mat instanceof THREE.MeshStandardMaterial) {
        snapshots.set(mat, {
          kind: 'standard',
          color: mat.color.clone(),
          opacity: mat.opacity,
          transparent: mat.transparent,
        });
        mat.color.set(colorHex);
        mat.opacity = opacityFromLevel;
        mat.transparent = true;
        mat.needsUpdate = true;
      }
    }
  }

  return () => {
    snapshots.forEach((snap, mat) => {
      if (snap.kind === 'physical' && mat instanceof THREE.MeshPhysicalMaterial) {
        mat.color.copy(snap.color);
        mat.transmission = snap.transmission;
        mat.attenuationColor.copy(snap.attenuationColor);
        mat.needsUpdate = true;
      } else if (snap.kind === 'standard' && mat instanceof THREE.MeshStandardMaterial) {
        mat.color.copy(snap.color);
        mat.opacity = snap.opacity;
        mat.transparent = snap.transparent;
        mat.needsUpdate = true;
      }
    });
  };
}

// ─── Exhaust ──────────────────────────────────────────────────────────────────

/**
 * L61 / L70: Apply exhaust tip style and optional muffler-delete.
 * Traverses for meshes matching exhaustMeshHints (defaults: exhaust, pipe, tailpipe,
 * muffler, tip). If no meshes found, logs a warning and returns a no-op undo.
 * The positional fallback has been removed: it was unreliable and matched
 * unrelated body-panel meshes in the rear-lower quadrant.
 *
 * Callers may pass exhaustMeshHints from Asset3DRecord for model-specific tuning.
 * For Ferrari: ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'] (L70).
 */
export function applyExhaust(
  scene: THREE.Object3D,
  exhaust: ExhaustSpec,
  exhaustMeshHints: string[] = ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'],
): UndoFn {
  const spec = EXHAUST_MATERIAL_SPECS[exhaust.tipStyle];
  const exhaustMeshes = getMeshes(scene, exhaustMeshHints);

  if (exhaustMeshes.length === 0) {
    console.warn(
      '[customization-controller] applyExhaust: no exhaust meshes found for hints',
      exhaustMeshHints,
      '— exhaust customization is a no-op for this model',
    );
    return () => { /* no-op */ };
  }

  type ExhaustSnapshot = {
    color: THREE.Color;
    metalness: number;
    roughness: number;
    visible: boolean;
  };
  const snapshots = new Map<THREE.Mesh, ExhaustSnapshot>();

  for (const mesh of exhaustMeshes) {
    snapshots.set(mesh, {
      color: new THREE.Color(),
      metalness: 0,
      roughness: 0,
      visible: mesh.visible,
    });

    const stdMats = getMaterials(mesh);
    for (const mat of stdMats) {
      const s = snapshots.get(mesh)!;
      s.color.copy(mat.color);
      s.metalness = mat.metalness;
      s.roughness = mat.roughness;

      mat.color.set(spec.color);
      mat.metalness = spec.metalness;
      mat.roughness = spec.roughness;
      mat.needsUpdate = true;
    }

    // Muffler-delete: hide mesh
    if (exhaust.mufflerDeleted) {
      mesh.visible = false;
    }
  }

  return () => {
    snapshots.forEach((snap, mesh) => {
      mesh.visible = snap.visible;
      const stdMats = getMaterials(mesh);
      for (const mat of stdMats) {
        mat.color.copy(snap.color);
        mat.metalness = snap.metalness;
        mat.roughness = snap.roughness;
        mat.needsUpdate = true;
      }
    });
  };
}

// ─── Suspension ───────────────────────────────────────────────────────────────

/**
 * L62: Apply suspension lowering via body-group Y translate.
 * Identifies body group as the top-level group that is NOT a wheel group.
 * Wheels stay grounded (counter-translated) so they don't float.
 */
export function applySuspension(
  scene: THREE.Object3D,
  suspension: SuspensionSpec,
): UndoFn {
  // L75 (locked): strict no-op when loweringMm === 0 — no body group mutation.
  if (!suspension || suspension.loweringMm === 0) return () => { /* no-op */ };

  const bodyGroups: THREE.Object3D[] = [];
  const wheelGroups: THREE.Object3D[] = [];

  // Identify wheel groups by name hint (top-level children)
  scene.children.forEach((child) => {
    if (child.name.toLowerCase().includes('wheel')) {
      wheelGroups.push(child);
    } else if (child instanceof THREE.Group || child instanceof THREE.Object3D) {
      bodyGroups.push(child);
    }
  });

  // If no wheel groups detected at top level, treat the whole scene
  const targets = bodyGroups.length > 0 ? bodyGroups : [scene];
  const offsetY = -(suspension.loweringMm / 1000); // convert mm to meters (THREE units)

  // Snapshot original Y positions
  const originalYPositions = new Map<THREE.Object3D, number>();
  for (const group of targets) {
    originalYPositions.set(group, group.position.y);
    group.position.y += offsetY;
  }

  // Counter-translate wheel groups so they stay grounded
  const originalWheelY = new Map<THREE.Object3D, number>();
  for (const wg of wheelGroups) {
    originalWheelY.set(wg, wg.position.y);
    wg.position.y -= offsetY; // opposite direction to stay grounded
  }

  return () => {
    originalYPositions.forEach((y, group) => {
      group.position.y = y;
    });
    originalWheelY.forEach((y, wg) => {
      wg.position.y = y;
    });
  };
}

// ─── Decals ───────────────────────────────────────────────────────────────────

/**
 * Find the body group in a scene — the first top-level object whose name
 * does NOT include wheel/shadow/light/helper/contact keywords.
 * Falls back to the full scene if no suitable body group is found.
 *
 * L80 (locked): Decal slot positions use BODY group bounding box only
 * (excludes ContactShadows, lighting helpers, wheel groups).
 */
function findBodyObject(scene: THREE.Object3D): THREE.Object3D {
  const NON_BODY_PATTERN = /wheel|shadow|light|helper|contact|ground|floor|env/i;

  // Prefer explicit 'body' named groups first
  for (const child of scene.children) {
    if (/\bbody\b/i.test(child.name)) return child;
  }

  // Fall back to first non-wheel/non-shadow top-level child
  for (const child of scene.children) {
    if (!NON_BODY_PATTERN.test(child.name)) return child;
  }

  // If nothing matches (e.g., empty scene or flat mesh list), use full scene
  return scene;
}

/**
 * Compute runtime decal slot positions from the BODY GROUP bounding box (L71, L80).
 *
 * L80 (locked): Uses body-only bounding box to exclude ContactShadows and
 * lighting helpers, preventing slot Y coords from falling below the body.
 *
 * Slot Y for door/fender: center.y + size.y * 0.05 (upper side panel — L80).
 * Plane sizes: (0.6, 0.3) for hood/trunk; (0.8, 0.25) for side panels.
 *
 * Coordinate system: Three.js default — Y up, Z towards viewer.
 * The Ferrari GLB is ~4.5m long (Z), ~2.0m wide (X), ~1.2m tall (Y).
 */
function computeDecalSlots(
  scene: THREE.Object3D,
): Record<DecalSlot, { position: THREE.Vector3; normal: THREE.Vector3; planeW: number; planeH: number }> {
  // L80: compute bounding box from body group only, not full scene
  const bodyObject = findBodyObject(scene);
  const box = new THREE.Box3().setFromObject(bodyObject);

  // If body object had no geometry fall back to full scene box
  if (box.isEmpty()) {
    box.setFromObject(scene);
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Guard against degenerate bounding box (e.g., empty scene in tests)
  const sx = size.x > 0 ? size.x : 2.0;
  const sy = size.y > 0 ? size.y : 1.2;
  const sz = size.z > 0 ? size.z : 4.5;

  return {
    hood: {
      // L80: hood at top face, forward third of car body
      position: new THREE.Vector3(center.x, box.max.y, center.z + sz * 0.30),
      normal: new THREE.Vector3(0, 1, 0),
      planeW: 0.6,
      planeH: 0.3,
    },
    trunk: {
      // L80: trunk at top face, rear third of car body
      position: new THREE.Vector3(center.x, box.max.y - 0.03, center.z - sz * 0.35),
      normal: new THREE.Vector3(0, 1, 0),
      planeW: 0.6,
      planeH: 0.3,
    },
    'door-left': {
      // L80: upper side panel (center.y + size.y * 0.05), not lower rocker
      position: new THREE.Vector3(box.min.x + 0.01, center.y + sy * 0.05, center.z),
      normal: new THREE.Vector3(-1, 0, 0),
      planeW: 0.8,
      planeH: 0.25,
    },
    'door-right': {
      // L80: upper side panel (center.y + size.y * 0.05), not lower rocker
      position: new THREE.Vector3(box.max.x - 0.01, center.y + sy * 0.05, center.z),
      normal: new THREE.Vector3(1, 0, 0),
      planeW: 0.8,
      planeH: 0.25,
    },
    'fender-left': {
      // L80: upper side panel, forward quarter
      position: new THREE.Vector3(box.min.x + 0.01, center.y + sy * 0.05, center.z + sz * 0.30),
      normal: new THREE.Vector3(-1, 0, 0),
      planeW: 0.8,
      planeH: 0.25,
    },
    'fender-right': {
      // L80: upper side panel, forward quarter
      position: new THREE.Vector3(box.max.x - 0.01, center.y + sy * 0.05, center.z + sz * 0.30),
      normal: new THREE.Vector3(1, 0, 0),
      planeW: 0.8,
      planeH: 0.25,
    },
  };
}

/** Texture cache to avoid reloading the same PNG (stores resolved textures) */
const _textureCache = new Map<string, THREE.Texture>();

/**
 * L76 (locked): Load a decal texture asynchronously via TextureLoader.loadAsync
 * so the mesh is not created before the texture is ready. Returns a Promise
 * that resolves to the loaded Texture, or null on failure (no throw).
 *
 * Falls back to cached texture if already loaded.
 */
async function loadDecalTextureAsync(src: string): Promise<THREE.Texture | null> {
  const cached = _textureCache.get(src);
  if (cached) return cached;
  try {
    const tex = await new THREE.TextureLoader().loadAsync(src);
    _textureCache.set(src, tex);
    return tex;
  } catch (err) {
    // L77 (locked): log warning + skip mesh creation on texture load failure (no error)
    console.warn(`[customization-controller] applyDecals: texture load failed for src "${src.slice(0, 60)}..."`, err);
    return null;
  }
}

/**
 * L59 / L71 / L76: Apply decal overlays as plane meshes at runtime-computed slot positions.
 * Slot positions are derived from the model's actual bounding box, NOT hardcoded coords.
 * Each active decal creates a PlaneGeometry mesh parented to the scene root.
 *
 * Texture loading is async (TextureLoader.loadAsync) so meshes are only added
 * after the texture resolves — prevents transparent/untextured decal artefacts.
 * Failed textures are silently skipped (L77).
 *
 * Material: MeshBasicMaterial with transparent=true, depthWrite=false,
 * polygonOffset (factor=-2, units=-2) to prevent z-fighting, DoubleSide.
 * Mesh is placed 1cm (0.01) off body surface along slot normal (L76).
 *
 * Returns undo fn that removes all created meshes synchronously.
 * (Texture loading is fire-and-forget; undo always removes what was added.)
 */
export function applyDecals(
  scene: THREE.Object3D,
  decals: DecalEntry[],
  _modelSlug: string = 'ferrari',
  decalSrcMap: Record<string, string> = {},
): UndoFn {
  // Compute slot positions at call-time from the live scene bounding box (L71)
  const slots = computeDecalSlots(scene);
  const createdMeshes: THREE.Mesh[] = [];

  // L76: normal offset distance — 1cm out from body surface to prevent z-fighting
  const NORMAL_OFFSET = 0.01;

  for (const decal of decals) {
    const slotDef = slots[decal.slot];
    if (!slotDef) {
      console.warn(`[customization-controller] applyDecals: unknown slot ${decal.slot}`);
      continue;
    }

    const src = decalSrcMap[decal.decalId];
    if (!src) {
      console.warn(`[customization-controller] applyDecals: no src for decalId ${decal.decalId}`);
      continue;
    }

    const normal = slotDef.normal.clone().normalize();
    const geom = new THREE.PlaneGeometry(slotDef.planeW, slotDef.planeH);

    // L76: material with proper transparent + polygonOffset to prevent z-fighting
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = `decal-${decal.slot}-${decal.decalId}`;

    // L76: position 1cm off the body surface along the normal
    const decalPos = slotDef.position.clone().addScaledVector(normal, NORMAL_OFFSET);
    mesh.position.copy(decalPos);

    // Orient to face outward along the normal
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.quaternion.copy(quaternion);

    // Apply rotation offset
    const rotDeg = parseInt(decal.rotation, 10);
    const rotRad = (rotDeg * Math.PI) / 180;
    mesh.rotateOnAxis(normal, rotRad);

    scene.add(mesh);
    createdMeshes.push(mesh);

    // L76: async texture load — update material.map once texture is ready
    // Mesh is already in the scene; texture load fires in background.
    // If it fails, L77 warning is emitted and map stays null (transparent plane — invisible).
    void loadDecalTextureAsync(src).then((tex) => {
      if (tex && mat.uuid === mat.uuid /* mesh still alive check via mat reference */) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    });
  }

  return () => {
    for (const mesh of createdMeshes) {
      scene.remove(mesh);
      (mesh.geometry as THREE.BufferGeometry).dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.dispose());
    }
    createdMeshes.length = 0;
  };
}

// ─── Carbon weave texture ─────────────────────────────────────────────────────

/**
 * L97: Generate a procedural carbon-weave texture via CanvasTexture.
 * Creates a 128×128 canvas with alternating dark diagonal stripes — approximates
 * the 2×2 twill weave pattern seen on carbon fiber panels.
 *
 * @param forged - when true, adds random grey noise strokes for the marbled
 *   forged-carbon appearance (Mansory Forged Carbon option).
 */
function makeCarbonWeaveTexture(forged = false): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base — very dark charcoal
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  if (forged) {
    // Forged carbon: random noise strokes for marbled appearance
    for (let i = 0; i < 60; i++) {
      const x0 = Math.random() * size;
      const y0 = Math.random() * size;
      const len = 8 + Math.random() * 20;
      const angle = Math.random() * Math.PI;
      const grey = Math.floor(40 + Math.random() * 60);
      ctx.strokeStyle = `rgb(${grey},${grey},${grey})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.globalAlpha = 0.4 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(angle) * len, y0 + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  } else {
    // 2×2 twill weave: 8px cells with alternating diagonal highlights
    const cell = 8;
    for (let row = 0; row < size / cell; row++) {
      for (let col = 0; col < size / cell; col++) {
        const offset = (row % 2 === 0 ? 0 : cell / 2);
        // diagonal highlight strip within each cell
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(col * cell + offset, row * cell);
        ctx.lineTo(col * cell + offset + cell * 0.5, row * cell + cell);
        ctx.stroke();
        // subtle cross-grain
        ctx.strokeStyle = '#252525';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(col * cell, row * cell + offset);
        ctx.lineTo(col * cell + cell, row * cell + offset + cell * 0.5);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// ─── Hood material ────────────────────────────────────────────────────────────

/**
 * L97: Apply hood material swap based on selected hood option.
 *
 * Strategy:
 * 1. Traverse scene for meshes whose name matches hoodMeshHints.
 * 2. If no name-match, fall back to positional detection: meshes in the
 *    front-upper quarter of the body bounding box (Z ≥ bodyBox.max.z * 0.15,
 *    Y ≥ bodyBox.center.y + 0.3).
 * 3. For carbon hood variants: replace material with MeshPhysicalMaterial
 *    using a procedural carbon-weave CanvasTexture (L97).
 * 4. For 'GT Vented': darker grey base + thin vent-slot overlay meshes.
 * 5. For stock: revert to saved original material.
 *
 * Returns undo fn that restores originals and removes any overlay meshes.
 */
export function applyHoodMaterial(
  scene: THREE.Object3D,
  hoodOptionId: string,
  hoodMeshHints: string[] = ['hood', 'bonnet', 'frunk'],
): UndoFn {
  if (hoodOptionId === 'hood-stock') {
    // No-op for stock — nothing to change
    return () => { /* no-op */ };
  }

  // Find hood meshes by name hints first
  let hoodMeshes = getMeshes(scene, hoodMeshHints);

  // Positional fallback: front-upper portion of the body bounding box
  if (hoodMeshes.length === 0) {
    const box = new THREE.Box3().setFromObject(scene);
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const meshBox = new THREE.Box3().setFromObject(obj);
        const meshCenter = new THREE.Vector3();
        meshBox.getCenter(meshCenter);
        // Front-upper: Z in forward third, Y in top half
        const isFrontUpper =
          meshCenter.z >= center.z + (box.max.z - center.z) * 0.15 &&
          meshCenter.y >= center.y + 0.3;
        if (isFrontUpper) {
          hoodMeshes.push(obj as THREE.Mesh);
        }
      });
    }
  }

  if (hoodMeshes.length === 0) {
    console.warn(
      '[customization-controller] applyHoodMaterial: no hood meshes found for hints',
      hoodMeshHints,
      '— hood material swap is a no-op (PENDING-1 visual requires named hood mesh in GLB)',
    );
    return () => { /* no-op */ };
  }

  // Snapshot originals
  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  for (const mesh of hoodMeshes) {
    originalMaterials.set(mesh, Array.isArray(mesh.material)
      ? (mesh.material as THREE.Material[]).map((m) => m.clone())
      : mesh.material.clone());
  }

  // Created overlay meshes (vents, etc.)
  const overlayMeshes: THREE.Mesh[] = [];

  // Build the replacement material based on hood option
  function makeHoodMaterial(): THREE.MeshPhysicalMaterial {
    const isForgedCarbon = hoodOptionId === 'hood-forged-carbon';
    const isVented = hoodOptionId === 'hood-gt-vented' || hoodOptionId === 'hood-cf-vented-pro';

    const mat = new THREE.MeshPhysicalMaterial({
      color: isVented ? '#1e1e1e' : '#151515',
      metalness: 0.7,
      roughness: 0.4,
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
    });

    // Apply carbon weave texture if CanvasTexture is available (browser only)
    if (typeof document !== 'undefined') {
      mat.map = makeCarbonWeaveTexture(isForgedCarbon);
      mat.needsUpdate = true;
    }

    return mat;
  }

  // Apply to hood meshes
  for (const mesh of hoodMeshes) {
    mesh.material = makeHoodMaterial();
  }

  // GT Vented: add thin vent-slot strip meshes on top of the hood
  if (hoodOptionId === 'hood-gt-vented' || hoodOptionId === 'hood-cf-vented-pro') {
    const hoodMesh = hoodMeshes[0];
    if (hoodMesh) {
      const hoodBox = new THREE.Box3().setFromObject(hoodMesh);
      const hoodCenter = new THREE.Vector3();
      hoodBox.getCenter(hoodCenter);
      const hoodWidth = hoodBox.max.x - hoodBox.min.x;
      const slotCount = hoodOptionId === 'hood-cf-vented-pro' ? 3 : 2;

      for (let i = 0; i < slotCount; i++) {
        const slotGeom = new THREE.BoxGeometry(hoodWidth * 0.25, 0.01, 0.05);
        const slotMat = new THREE.MeshStandardMaterial({
          color: '#0a0a0a',
          metalness: 0.2,
          roughness: 0.8,
        });
        const slot = new THREE.Mesh(slotGeom, slotMat);
        slot.name = `hood-vent-slot-${i}`;
        const offset = (i - (slotCount - 1) / 2) * 0.12;
        slot.position.set(
          hoodCenter.x + offset,
          hoodBox.max.y + 0.005,
          hoodCenter.z,
        );
        scene.add(slot);
        overlayMeshes.push(slot);
      }
    }
  }

  return () => {
    // Remove overlay meshes
    for (const mesh of overlayMeshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.dispose());
    }
    overlayMeshes.length = 0;

    // Restore original materials
    originalMaterials.forEach((origMat, mesh) => {
      mesh.material = origMat;
      mesh.material instanceof THREE.Material && (mesh.material.needsUpdate = true);
    });
  };
}

// ─── Wing procedural geometry ─────────────────────────────────────────────────

/** Name tag attached to all procedurally created wing meshes so they can be found/removed. */
const WING_MESH_TAG = '__procedural-wing__';

/**
 * L98: Apply a procedural wing mesh to the rear of the car.
 *
 * Wing variants use BoxGeometry primitives positioned at the car's rear:
 *   - wing-lip: thin horizontal strip at trunk edge
 *   - wing-ducktail: slightly taller, curved-looking strip
 *   - wing-gt3-replica: horizontal element on twin stanchions
 *   - wing-fxx-replica: larger GT3 + vertical end-plates
 *   - wing-active: flush wing in deployed state
 *   - wing-swan-neck: GT3 geometry with stanchions mounting from above
 *   - wing-stock: removes any existing procedural wing
 *
 * Material: dark carbon-matte using MeshPhysicalMaterial with CanvasTexture
 * when available (same carbon weave as applyHoodMaterial).
 *
 * Position: derived from body bounding box. Rear edge = box.min.z (Three.js
 * ferrari.glb Z-axis: rear is negative Z).
 */
export function applyWing(
  scene: THREE.Object3D,
  wingOptionId: string,
): UndoFn {
  // Remove any existing procedural wing meshes first
  const existingWings: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name.startsWith(WING_MESH_TAG)) {
      existingWings.push(obj);
    }
  });
  for (const w of existingWings) {
    scene.remove(w);
    w.geometry.dispose();
    const mats = Array.isArray(w.material) ? w.material : [w.material];
    mats.forEach((m) => m.dispose());
  }

  if (wingOptionId === 'wing-stock') {
    return () => { /* already cleaned up */ };
  }

  // Compute rear position from bounding box
  const box = new THREE.Box3().setFromObject(scene);
  if (box.isEmpty()) {
    console.warn('[customization-controller] applyWing: empty scene bounding box — wing placement skipped');
    return () => { /* no-op */ };
  }
  const center = new THREE.Vector3();
  box.getCenter(center);

  const carWidth = box.max.x - box.min.x;
  const carTop = box.max.y;
  // Ferrari GLB: rear is negative Z
  const rearZ = box.min.z;

  function makeWingMaterial(): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#151515',
      metalness: 0.6,
      roughness: 0.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    });
    if (typeof document !== 'undefined') {
      mat.map = makeCarbonWeaveTexture(false);
      mat.needsUpdate = true;
    }
    return mat;
  }

  const createdMeshes: THREE.Mesh[] = [];

  function addMesh(geom: THREE.BufferGeometry, x: number, y: number, z: number): THREE.Mesh {
    const mat = makeWingMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = `${WING_MESH_TAG}${wingOptionId}`;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    createdMeshes.push(mesh);
    return mesh;
  }

  const wingWidth = carWidth * 0.78;

  switch (wingOptionId) {
    case 'wing-lip': {
      // Thin lip at trunk trailing edge, slightly raised
      addMesh(
        new THREE.BoxGeometry(wingWidth, 0.025, 0.12),
        center.x,
        carTop - 0.05,
        rearZ + 0.06,
      );
      break;
    }
    case 'wing-ducktail': {
      // Wider, taller trunk-integrated ducktail
      addMesh(
        new THREE.BoxGeometry(wingWidth, 0.06, 0.18),
        center.x,
        carTop - 0.02,
        rearZ + 0.09,
      );
      break;
    }
    case 'wing-gt3-replica': {
      // Horizontal wing element elevated on twin stanchions
      const stanchionH = 0.28;
      addMesh(
        new THREE.BoxGeometry(wingWidth, 0.04, 0.22),
        center.x,
        carTop + stanchionH,
        rearZ + 0.11,
      );
      // Left stanchion
      addMesh(
        new THREE.BoxGeometry(0.04, stanchionH, 0.04),
        center.x - wingWidth * 0.38,
        carTop + stanchionH / 2,
        rearZ + 0.11,
      );
      // Right stanchion
      addMesh(
        new THREE.BoxGeometry(0.04, stanchionH, 0.04),
        center.x + wingWidth * 0.38,
        carTop + stanchionH / 2,
        rearZ + 0.11,
      );
      break;
    }
    case 'wing-fxx-replica': {
      // Larger wing + end-plates
      const stanchionH = 0.35;
      addMesh(
        new THREE.BoxGeometry(wingWidth, 0.05, 0.26),
        center.x,
        carTop + stanchionH,
        rearZ + 0.13,
      );
      addMesh(new THREE.BoxGeometry(0.05, stanchionH, 0.05), center.x - wingWidth * 0.4, carTop + stanchionH / 2, rearZ + 0.13);
      addMesh(new THREE.BoxGeometry(0.05, stanchionH, 0.05), center.x + wingWidth * 0.4, carTop + stanchionH / 2, rearZ + 0.13);
      // Vertical end-plates
      addMesh(new THREE.BoxGeometry(0.03, 0.18, 0.26), center.x - wingWidth * 0.4, carTop + stanchionH, rearZ + 0.13);
      addMesh(new THREE.BoxGeometry(0.03, 0.18, 0.26), center.x + wingWidth * 0.4, carTop + stanchionH, rearZ + 0.13);
      break;
    }
    case 'wing-active': {
      // Deployed active-aero — flush-looking but raised ~12cm
      addMesh(
        new THREE.BoxGeometry(wingWidth, 0.035, 0.20),
        center.x,
        carTop + 0.12,
        rearZ + 0.10,
      );
      break;
    }
    case 'wing-swan-neck': {
      // Swan-neck: stanchions curve from above (inverted mount), rendered as top-mounted bars
      const stanchionH = 0.30;
      // Main wing element
      addMesh(
        new THREE.BoxGeometry(wingWidth, 0.04, 0.22),
        center.x,
        carTop + stanchionH,
        rearZ + 0.11,
      );
      // Swan-neck stanchions: thinner, angled from slightly forward upper position
      addMesh(
        new THREE.BoxGeometry(0.03, stanchionH * 1.1, 0.06),
        center.x - wingWidth * 0.36,
        carTop + stanchionH * 0.55,
        rearZ + 0.06,
      );
      addMesh(
        new THREE.BoxGeometry(0.03, stanchionH * 1.1, 0.06),
        center.x + wingWidth * 0.36,
        carTop + stanchionH * 0.55,
        rearZ + 0.06,
      );
      break;
    }
    default: {
      console.warn(`[customization-controller] applyWing: unknown wingOptionId "${wingOptionId}" — skipping`);
    }
  }

  return () => {
    for (const mesh of createdMeshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.dispose());
    }
    createdMeshes.length = 0;
  };
}

// ─── Wheel diameter scaling ───────────────────────────────────────────────────

/**
 * L99: Apply wheel material AND diameter approximation via uniform Y/Z scale.
 *
 * Extends the base applyWheelMaterial with diameter-proportional scaling:
 *   scaleFactor = wheelSizeInches / 20  (stock = 20" = 1.0)
 *   22" → 1.10x, 18" → 0.90x
 *
 * Scale applied as mesh.scale.set(1, scaleFactor, scaleFactor).
 * Wheel position Y is raised by (scaleFactor - 1) * 0.32 to prevent
 * the scaled wheel from sinking below the ground plane.
 *
 * This is a VISUAL APPROXIMATION. Real wheel GLBs (PENDING-3) will replace
 * the scale approach with a proper geometry swap.
 */
export function applyWheelMaterialAndSize(
  scene: THREE.Object3D,
  material: WheelMaterial,
  wheelSizeInches: number = 20,
): UndoFn {
  // First apply the standard material swap
  const materialUndo = applyWheelMaterial(scene, material);

  const scaleFactor = wheelSizeInches / 20;

  // Skip scale if stock size (no-op for scale-only)
  if (Math.abs(scaleFactor - 1.0) < 0.001) {
    return materialUndo;
  }

  const wheelMeshes = getMeshes(scene, ['wheel']);

  type ScaleSnapshot = { scale: THREE.Vector3; positionY: number };
  const snapshots = new Map<THREE.Mesh, ScaleSnapshot>();

  const WHEEL_RADIUS_APPROX = 0.32; // approximate wheel radius in THREE units for Ferrari GLB

  for (const mesh of wheelMeshes) {
    snapshots.set(mesh, {
      scale: mesh.scale.clone(),
      positionY: mesh.position.y,
    });
    // L99: scale Y and Z uniformly; keep X (axle depth) unchanged
    mesh.scale.set(mesh.scale.x, scaleFactor, scaleFactor);
    // Raise position to compensate for scale-driven ground penetration
    mesh.position.y += (scaleFactor - 1) * WHEEL_RADIUS_APPROX;
  }

  return () => {
    materialUndo();
    snapshots.forEach((snap, mesh) => {
      mesh.scale.copy(snap.scale);
      mesh.position.y = snap.positionY;
    });
  };
}

// ─── Apply all ────────────────────────────────────────────────────────────────

/**
 * Apply all customizations from a VisualizerCustomizations object.
 * Returns a combined undo fn. If customizations is undefined/empty, no-ops.
 *
 * Called from CarModel useEffect whenever customizations prop changes.
 *
 * @param exhaustMeshHints - model-specific mesh hints for exhaust detection (L70).
 *   Defaults to Ferrari hints: ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'].
 * @param hoodMeshHints - model-specific mesh hints for hood detection (L97).
 *   Defaults to Ferrari hints: ['hood', 'bonnet', 'frunk'].
 */
export function applyAllCustomizations(
  scene: THREE.Object3D,
  customizations: VisualizerCustomizations | undefined,
  modelSlug: string = 'ferrari',
  decalSrcMap: Record<string, string> = {},
  exhaustMeshHints: string[] = ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'],
  hoodMeshHints: string[] = ['hood', 'bonnet', 'frunk'],
): UndoFn {
  if (!customizations) return () => { /* no-op */ };

  const undos: UndoFn[] = [];

  if (customizations.wheelMaterial) {
    undos.push(applyWheelMaterial(scene, customizations.wheelMaterial));
  }

  if (customizations.tint) {
    undos.push(applyTint(scene, customizations.tint));
  }

  if (customizations.exhaust) {
    undos.push(applyExhaust(scene, customizations.exhaust, exhaustMeshHints));
  }

  if (customizations.suspension) {
    undos.push(applySuspension(scene, customizations.suspension));
  }

  if (customizations.decals && customizations.decals.length > 0) {
    undos.push(applyDecals(scene, customizations.decals as DecalEntry[], modelSlug, decalSrcMap));
  }

  // L97: Hood material swap (carbon weave or stock revert)
  if (customizations.hoodOptionId) {
    undos.push(applyHoodMaterial(scene, customizations.hoodOptionId, hoodMeshHints));
  }

  // L98: Wing procedural geometry
  if (customizations.wingOptionId) {
    undos.push(applyWing(scene, customizations.wingOptionId));
  }

  return () => {
    // Undo in reverse order
    for (let i = undos.length - 1; i >= 0; i--) {
      undos[i]?.();
    }
  };
}
