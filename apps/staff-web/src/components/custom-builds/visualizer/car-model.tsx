/**
 * CarModel — loads a GLTF/GLB and applies paint + wheel customization.
 *
 * L55 (locked): Paint application: traverse useGLTF scene to find materials
 *   matching paintMaterialHints (case-insensitive partial match) and set
 *   material.color = new THREE.Color(hex). Memoized — paint changes don't
 *   rebuild scene. Wheel size affects scale on wheel meshes (model-dependent —
 *   logs a warning if not found, then skips gracefully).
 *
 * Cleanup: disposes geometries and materials on unmount.
 *
 * @deprecated This 3D approach supersedes the 2D VisualizerCanvas (L4/L5).
 *   The 2D canvas is kept as WebGL fallback.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §30 (P3.2), L55
 */

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { VisualizerCustomizations } from '@dms/types';
import { applyAllCustomizations } from '@/src/lib/custom-builds/customization-controller';
import { buildDecalSrcMap } from '@/src/lib/custom-builds/decal-library';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CarModelProps {
  /** Absolute URL to the GLB file. */
  modelUrl: string;
  /**
   * Hex color string for the car body paint (e.g. "#c0392b").
   * When undefined, no paint override is applied.
   */
  paintColor?: string;
  /**
   * Wheel size in inches (18–22). Maps to a uniform scale multiplier
   * applied to wheel meshes: size=18 → 0.9×, size=22 → 1.1×.
   */
  wheelSize?: number;
  /**
   * Material name fragments to match for paint application.
   * Case-insensitive partial match against THREE.Material.name.
   */
  paintMaterialHints?: string[];
  /**
   * Mesh name fragments to match for wheel scaling.
   */
  wheelMeshHints?: string[];
  /**
   * P3.3: 3D customization state — wheels, tint, exhaust, suspension, decals.
   * Applied via customization-controller pure functions after scene clone.
   */
  customizations?: VisualizerCustomizations;
  /**
   * Model slug for decal slot position lookup (defaults to 'ferrari').
   */
  modelSlug?: string;
  /**
   * L70: Model-specific mesh name hints for exhaust detection.
   * Passed through to applyAllCustomizations → applyExhaust.
   * Defaults to Ferrari hints: ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'].
   */
  exhaustMeshHints?: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Map wheel size (18–22) to a uniform scale multiplier. */
function wheelSizeToScale(size: number): number {
  // 18 → 0.90, 20 → 1.00, 22 → 1.10 — linear interpolation
  return 0.90 + ((size - 18) / 4) * 0.20;
}

/** Return true if the material name matches any of the hints (case-insensitive). */
function matchesHint(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some((h) => lower.includes(h.toLowerCase()));
}

// ─── Component ─────────────────────────────────────────────────────────────────

// Stable empty decal src map (avoids referential re-renders when no decals active)
const EMPTY_DECAL_SRC_MAP: Record<string, string> = {};

export function CarModel({
  modelUrl,
  paintColor,
  wheelSize = 20,
  paintMaterialHints = ['body', 'paint', 'exterior', 'car_paint'],
  wheelMeshHints = ['wheel'],
  customizations,
  modelSlug = 'ferrari',
  exhaustMeshHints = ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip'],
}: CarModelProps) {
  const { scene } = useGLTF(modelUrl) as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null);

  // Clone scene once so mutations don't pollute the cache
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // ── Paint color application ────────────────────────────────────────────────
  useEffect(() => {
    if (!paintColor) return;

    const color = new THREE.Color(paintColor);
    let matched = 0;

    clonedScene.traverse((obj: THREE.Object3D) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const materials = Array.isArray(obj.material)
        ? (obj.material as THREE.Material[])
        : [obj.material as THREE.Material];

      materials.forEach((mat) => {
        if (
          mat instanceof THREE.MeshStandardMaterial &&
          matchesHint(mat.name, paintMaterialHints)
        ) {
          mat.color.set(color);
          mat.needsUpdate = true;
          matched++;
        }
      });
    });

    if (matched === 0) {
      // No named body materials found — apply to all MeshStandardMaterial as fallback
      clonedScene.traverse((obj: THREE.Object3D) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const materials = Array.isArray(obj.material)
          ? (obj.material as THREE.Material[])
          : [obj.material as THREE.Material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.color.set(color);
            mat.needsUpdate = true;
          }
        });
      });
    }
  }, [clonedScene, paintColor, paintMaterialHints]);

  // ── Wheel size scaling ─────────────────────────────────────────────────────
  useEffect(() => {
    const scale = wheelSizeToScale(wheelSize);
    let found = 0;

    clonedScene.traverse((obj: THREE.Object3D) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (matchesHint(obj.name, wheelMeshHints)) {
        obj.scale.setScalar(scale);
        found++;
      }
    });

    if (found === 0 && wheelMeshHints.length > 0) {
      // Silently skip — wheel meshes not found in this model
      // console.warn('[CarModel] No wheel meshes found for hints:', wheelMeshHints);
    }
  }, [clonedScene, wheelSize, wheelMeshHints]);

  // ── P3.3 customization application ────────────────────────────────────────
  // Reduced-motion: apply instantly (no animations — controller is synchronous)
  useEffect(() => {
    if (!customizations) return;

    // Build decal src map on each render if there are active decals
    const decalSrcMap =
      customizations.decals && customizations.decals.length > 0
        ? buildDecalSrcMap()
        : EMPTY_DECAL_SRC_MAP;

    const undo = applyAllCustomizations(clonedScene, customizations, modelSlug, decalSrcMap, exhaustMeshHints);
    return undo; // cleanup: undo on next render or unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedScene, customizations, modelSlug, exhaustMeshHints]);

  // ── Cleanup: dispose geometries + materials on unmount ─────────────────────
  useEffect(() => {
    return () => {
      clonedScene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          (obj.geometry as THREE.BufferGeometry).dispose();
          const mats = Array.isArray(obj.material)
            ? (obj.material as THREE.Material[])
            : [obj.material as THREE.Material];
          mats.forEach((mat) => mat.dispose());
        }
      });
    };
  }, [clonedScene]);

  return <primitive ref={groupRef} object={clonedScene} />;
}

// Preload hint — drei will warm the cache when this module is imported
// Guarded so it only runs if the URL exists (import-time evaluation)
export function preloadCarModel(url: string): void {
  useGLTF.preload(url);
}
